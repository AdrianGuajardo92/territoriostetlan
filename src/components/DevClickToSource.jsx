import { useEffect, useState, useRef, useCallback } from 'react';
import { toBlob } from 'html-to-image';
import { copiarAlPortapapeles } from '../utils/clipboard';

/**
 * DevClickToSource - Inspector visual de elementos React (solo desarrollo).
 *
 * Activación:
 *  - Botón flotante esquina inferior derecha
 *  - Alt+Click sobre cualquier elemento de la app (atajo rápido: solo activa)
 *
 * Una vez activo:
 *  - Click sobre un elemento captura su info, copia una tarjeta imagen + texto y desactiva el inspector
 *  - Esc o el botón flotante desactiva el inspector
 */

// Mapa ComponentName → ruta del archivo (Vite glob)
const fileMap = {};
if (import.meta.env.DEV) {
  const modules = import.meta.glob('/src/**/*.{jsx,js}', { eager: false });
  for (const path of Object.keys(modules)) {
    const parts = path.split('/');
    const filename = parts.pop().replace(/\.(jsx|js)$/, '');
    const relPath = path.substring(1);
    fileMap[filename] = relPath;
    if (filename === 'index') {
      const folderName = parts[parts.length - 1];
      if (folderName) fileMap[folderName] = relPath;
    }
  }
}

// ─── Helpers de extracción del fiber ───
const getFiberFromElement = (el) => {
  const key = Object.keys(el).find(
    (k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
  );
  return key ? el[key] : null;
};

const findComponents = (fiber) => {
  let cur = fiber;
  const out = [];
  while (cur) {
    if ((cur.tag === 0 || cur.tag === 1) && cur.type) {
      const name = cur.type.displayName || cur.type.name;
      if (name && !name.startsWith('_') && name !== 'Fragment') out.push(name);
    }
    cur = cur.return;
  }
  return out;
};

const trunc = (s, n = 60) => {
  const clean = (s || '').replace(/\s+/g, ' ').trim();
  return clean.length > n ? clean.substring(0, n) + '…' : clean;
};

const getRelevantProps = (fiber) => {
  const props = new Set();
  let cur = fiber;
  let depth = 0;
  while (cur && depth < 4) {
    const p = cur.memoizedProps || cur.pendingProps;
    if (p) {
      if (p.onClick) props.add('onClick');
      if (p.onChange) props.add('onChange');
      if (p.onSubmit) props.add('onSubmit');
      if (p['data-testid']) props.add(`data-testid="${p['data-testid']}"`);
      if (p.name) props.add(`name="${p.name}"`);
      if (p.id) props.add(`id="${p.id}"`);
      if (p.role) props.add(`role="${p.role}"`);
      if (p.type && typeof p.type === 'string') props.add(`type="${p.type}"`);
      if (p.placeholder) props.add(`placeholder="${trunc(p.placeholder, 30)}"`);
    }
    if (cur.key != null && cur.key !== '') props.add(`key="${cur.key}"`);
    cur = cur.return;
    depth++;
  }
  return Array.from(props);
};

const ACTIONABLE_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[onclick]',
].join(',');

const findActionableElement = (el) => {
  if (!el?.closest) return el;
  return el.closest(ACTIONABLE_SELECTOR) || el;
};

const getReadableText = (el, max = 70) => {
  if (!el) return '';
  let direct = '';
  for (const node of el.childNodes || []) {
    if (node.nodeType === 3) direct += node.textContent;
  }
  direct = trunc(direct, max);
  if (direct) return direct;
  return trunc(el.textContent, max);
};

const describeElement = (el) => {
  if (!el) return '(none)';
  const tag = el.tagName?.toLowerCase() || '?';
  const text = getReadableText(el, 70);
  const aria = el.getAttribute?.('aria-label') || '';
  const role = el.getAttribute?.('role') || '';
  const dataTestId = el.getAttribute?.('data-testid') || '';
  const id = el.getAttribute?.('id') || '';
  const name = el.getAttribute?.('name') || '';
  const placeholder = el.getAttribute?.('placeholder') || '';

  const parts = [`<${tag}>`];
  if (text) parts.push(`text="${text}"`);
  if (aria) parts.push(`aria="${trunc(aria, 50)}"`);
  if (role) parts.push(`role="${role}"`);
  if (id) parts.push(`id="${id}"`);
  if (name) parts.push(`name="${name}"`);
  if (placeholder) parts.push(`placeholder="${trunc(placeholder, 40)}"`);
  if (dataTestId) parts.push(`data-testid="${dataTestId}"`);
  return parts.join(' ');
};

const getElementHighlight = (el) => {
  if (!el?.getBoundingClientRect) return null;
  const rect = el.getBoundingClientRect();
  const tag = el.tagName.toLowerCase();
  const cls = Array.from(el.classList || []).slice(0, 2).join('.');
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    label: cls ? `<${tag}>.${cls}` : `<${tag}>`,
    labelPosition: rect.top < 28 ? 'below' : 'above',
  };
};

const getUnderlyingElementFromPoint = (x, y, overlayEl) => {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  const previousPointerEvents = overlayEl?.style.pointerEvents;
  if (overlayEl) overlayEl.style.pointerEvents = 'none';

  try {
    const elements = typeof document.elementsFromPoint === 'function'
      ? document.elementsFromPoint(x, y)
      : [document.elementFromPoint(x, y)];

    return elements.find((el) => el && !el.closest?.('[data-dev-inspector]')) || null;
  } finally {
    if (overlayEl) overlayEl.style.pointerEvents = previousPointerEvents || 'auto';
  }
};

const getInspectorRoute = () => {
  if (typeof window === 'undefined') return '';
  const params = new URLSearchParams(window.location.search);
  for (const key of Array.from(params.keys())) {
    if (key.startsWith('codexInspector')) params.delete(key);
  }
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ''}`;
};

// ─── Captura de imagen ───
// Prioridad: copiar exactamente el DOM seleccionado. La imagen original es solo fallback.
const findSingleImage = (el) => {
  if (!el) return null;
  if (el.tagName === 'IMG') return el;
  const imgs = el.querySelectorAll?.('img');
  if (imgs && imgs.length === 1) return imgs[0];
  return null;
};

const fetchImageAsBlob = async (src) => {
  if (!src) return null;
  try {
    const res = await fetch(src, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (blob.type === 'image/png') return blob;
    // Convertir a PNG vía canvas (algunos navegadores solo aceptan PNG en clipboard)
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = 'anonymous';
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
      return await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    console.warn('[Inspector] fetch de <img> falló:', err?.message || err);
    return null;
  }
};

const captureDomScreenshot = async (el) => {
  if (!document.contains(el)) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  if (rect.bottom < 0 || rect.top > window.innerHeight) {
    el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  }

  const filter = (node) => node?.dataset?.devInspector == null;
  const imagePlaceholder =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  const attempts = [
    { pixelRatio: 2, cacheBust: true, filter, skipAutoScale: true, skipFonts: true, imagePlaceholder },
    { pixelRatio: 1, cacheBust: true, filter, skipAutoScale: true, skipFonts: true, backgroundColor: '#0f172a', imagePlaceholder },
  ];
  for (let i = 0; i < attempts.length; i++) {
    try {
      const blob = await toBlob(el, attempts[i]);
      if (blob && blob.size > 0) return blob;
    } catch (err) {
      console.warn(`[Inspector] screenshot intento ${i + 1}:`, err?.message || err);
    }
  }
  return null;
};

const captureElementImage = async (el) => {
  const domBlob = await captureDomScreenshot(el);
  if (domBlob) return { blob: domBlob, source: 'dom-snapshot' };

  const img = findSingleImage(el);
  if (img?.src) {
    const blob = await fetchImageAsBlob(img.src);
    if (blob) return { blob, source: 'img-original' };
  }
  return null;
};

const isEmbeddedPreview = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

const isCodexLikePreview = () => {
  const userAgent = navigator?.userAgent || '';
  return isEmbeddedPreview() || /Electron|Codex|OpenAI/i.test(userAgent);
};

const getClipboardEnvironment = () => ({
  codexPreview: isCodexLikePreview(),
  embedded: isEmbeddedPreview(),
  userAgent: navigator?.userAgent || '',
  vendor: navigator?.vendor || '',
  platform: navigator?.platform || '',
  webdriver: Boolean(navigator?.webdriver),
});

const isInspectorDebugEnabled = () => {
  try {
    if (import.meta.env.VITE_CODEX_INSPECTOR_DEBUG === 'true') return true;
    const params = new URLSearchParams(window.location.search);
    const queryDebug = params.get('codexInspectorDebug');
    const storageDebug = window.localStorage?.getItem('codexInspectorDebug');
    return [queryDebug, storageDebug].some((value) =>
      ['1', 'true', 'on'].includes(String(value || '').toLowerCase())
    );
  } catch {
    return false;
  }
};

const logInspectorDebug = (...args) => {
  if (isInspectorDebugEnabled()) console.info(...args);
};

const copyImageBlobToClipboard = async (blob, text = '') => {
  if (!blob) return 'error';
  if (typeof navigator === 'undefined' || !navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    return 'unsupported';
  }
  if (ClipboardItem.supports && !ClipboardItem.supports('image/png')) return 'unsupported';
  if (isCodexLikePreview()) return 'codex-preview';

  const clipboardItems = { 'image/png': blob };
  if (text && (!ClipboardItem.supports || ClipboardItem.supports('text/plain'))) {
    clipboardItems['text/plain'] = new Blob([text], { type: 'text/plain' });
  }

  const writePromise = navigator.clipboard
    .write([new ClipboardItem(clipboardItems)])
    .then(() => 'ok')
    .catch((err) => {
      console.warn('[Inspector] clipboard image falló:', err?.name || err?.message || err);
      return 'blocked';
    });

  const timeoutPromise = new Promise((resolve) => {
    window.setTimeout(() => resolve('timeout'), 900);
  });

  const status = await Promise.race([writePromise, timeoutPromise]);
  if (status === 'timeout') {
    console.warn('[Inspector] clipboard image falló: timeout');
  }
  return status;
};

const loadImageFromBlob = async (blob) => {
  if (typeof createImageBitmap === 'function') return await createImageBitmap(blob);

  const url = URL.createObjectURL(blob);
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
};

const canvasToPngBlob = (canvas) => new Promise((resolve) => {
  canvas.toBlob((blob) => resolve(blob), 'image/png');
});

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const canUseNativeClipboardBridge = () => {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
};

const copyImageBlobToNativeClipboard = async (blob, text = '') => {
  if (!blob || !canUseNativeClipboardBridge()) return 'unsupported';

  try {
    const imageBase64 = await blobToDataUrl(blob);
    const response = await fetch('/api/dev-inspector-clipboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, text }),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data?.ok) return 'ok';
    console.warn('[Inspector] clipboard nativo falló:', data?.error || response.status);
    return 'blocked';
  } catch (err) {
    console.warn('[Inspector] clipboard nativo falló:', err?.message || err);
    return 'blocked';
  }
};

const copyHtmlImageToClipboard = async (blob, text) => {
  if (!blob || typeof document === 'undefined') return 'unsupported';

  try {
    const dataUrl = await blobToDataUrl(blob);
    const html = [
      '<!doctype html><html><body>',
      `<img src="${dataUrl}" alt="Inspector" style="display:block;max-width:100%;height:auto;" />`,
      '</body></html>',
    ].join('');

    const holder = document.createElement('div');
    holder.contentEditable = 'true';
    holder.setAttribute('aria-hidden', 'true');
    holder.style.cssText = 'position:fixed;left:-99999px;top:0;width:1px;height:1px;overflow:hidden;';
    holder.innerHTML = html;
    document.body.appendChild(holder);

    const selection = window.getSelection?.();
    const range = document.createRange();
    range.selectNodeContents(holder);
    selection?.removeAllRanges();
    selection?.addRange(range);

    const onCopy = (event) => {
      event.preventDefault();
      event.clipboardData?.setData('text/html', html);
      event.clipboardData?.setData('text/plain', text || '');
    };

    document.addEventListener('copy', onCopy, true);
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } finally {
      document.removeEventListener('copy', onCopy, true);
      selection?.removeAllRanges();
      holder.remove();
    }

    return ok ? 'ok' : 'blocked';
  } catch (err) {
    console.warn('[Inspector] clipboard HTML falló:', err?.name || err?.message || err);
    return 'blocked';
  }
};

const drawRoundRect = (ctx, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const splitLongToken = (ctx, token, maxWidth) => {
  const chunks = [];
  let current = '';
  for (const char of token) {
    const next = current + char;
    if (current && ctx.measureText(next).width > maxWidth) {
      chunks.push(current);
      current = char;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
};

const wrapCanvasLine = (ctx, line, maxWidth) => {
  if (!line) return [''];
  if (ctx.measureText(line).width <= maxWidth) return [line];

  const parts = String(line).split(/(\s+)/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const part of parts) {
    const next = current + part;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }

    if (current.trim()) lines.push(current.trimEnd());
    current = '';

    if (ctx.measureText(part).width <= maxWidth) {
      current = part.trimStart();
    } else {
      const chunks = splitLongToken(ctx, part, maxWidth);
      lines.push(...chunks.slice(0, -1));
      current = chunks[chunks.length - 1] || '';
    }
  }

  if (current.trim()) lines.push(current.trimEnd());
  return lines;
};

const wrapCanvasText = (ctx, text, maxWidth) => {
  const lines = [];
  for (const rawLine of String(text || '').split('\n')) {
    lines.push(...wrapCanvasLine(ctx, rawLine, maxWidth));
  }
  return lines;
};

const getLineColor = (line) => {
  if (line.startsWith('Archivo:')) return FILE_GREEN;
  if (line.startsWith('Props/handlers:')) return '#fbbf24';
  if (line.startsWith('Ruta:')) return TEXT_DIM;
  if (line.startsWith('Elemento:') || line.startsWith('Accionable:')) return TEXT_MUTED;
  return TEXT;
};

const buildInspectorCompositeImage = async (item, imageBlob) => {
  if (!item || !imageBlob) return null;

  const image = await loadImageFromBlob(imageBlob);
  const sourceWidth = image.width || image.naturalWidth || 1;
  const sourceHeight = image.height || image.naturalHeight || 1;
  const padding = 28;
  const gap = 22;
  const maxImageWidth = 1120;
  const maxImageHeight = 1400;
  const scale = Math.min(1, maxImageWidth / sourceWidth, maxImageHeight / sourceHeight);
  const imageWidth = Math.max(1, Math.round(sourceWidth * scale));
  const imageHeight = Math.max(1, Math.round(sourceHeight * scale));
  const canvasWidth = Math.max(680, imageWidth + padding * 2);
  const textMaxWidth = canvasWidth - padding * 2 - 28;

  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  measureCtx.font = '15px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  const infoLines = wrapCanvasText(measureCtx, item.compactText, textMaxWidth);
  const lineHeight = 22;
  const cardPadding = 18;
  const headerHeight = 28;
  const cardHeight = cardPadding * 2 + headerHeight + 8 + infoLines.length * lineHeight;
  const canvasHeight = padding + imageHeight + gap + cardHeight + padding;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = PANEL_BG;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const imageX = Math.round((canvasWidth - imageWidth) / 2);
  drawRoundRect(ctx, imageX - 1, padding - 1, imageWidth + 2, imageHeight + 2, 8);
  ctx.fillStyle = '#020617';
  ctx.fill();
  ctx.drawImage(image, imageX, padding, imageWidth, imageHeight);

  const cardY = padding + imageHeight + gap;
  drawRoundRect(ctx, padding, cardY, canvasWidth - padding * 2, cardHeight, 12);
  ctx.fillStyle = '#111827';
  ctx.fill();
  ctx.strokeStyle = PANEL_BORDER_STRONG;
  ctx.lineWidth = 1;
  ctx.stroke();

  const textX = padding + cardPadding;
  let y = cardY + cardPadding + 18;
  ctx.font = '800 14px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = ACCENT;
  ctx.fillText('INSPECTOR', textX, y);

  ctx.font = '700 18px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  ctx.fillStyle = TEXT;
  ctx.fillText(trunc(item.componentName, 42), textX + 96, y);

  y += headerHeight;
  ctx.font = '15px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
  for (const line of infoLines) {
    ctx.fillStyle = getLineColor(line);
    ctx.fillText(line, textX, y);
    y += lineHeight;
  }

  if (typeof image.close === 'function') image.close();
  return await canvasToPngBlob(canvas);
};

const captureInspectorCard = async (item) => {
  const result = await captureElementImage(item.captureTarget);
  if (!result?.blob) return null;

  const compositeBlob = await buildInspectorCompositeImage(item, result.blob);
  if (!compositeBlob) return null;

  return {
    blob: compositeBlob,
    source: result.source,
  };
};

const copyInspectorCardToClipboard = async (item) => {
  const card = await captureInspectorCard(item);
  if (!card?.blob) return { status: 'no-image', card: null };

  logInspectorDebug('[Inspector] tarjeta visual generada:', JSON.stringify({
    source: card.source,
    bytes: card.blob.size,
    type: card.blob.type,
  }));
  logInspectorDebug('[Inspector] entorno clipboard:', JSON.stringify(getClipboardEnvironment()));

  const nativeStatus = await copyImageBlobToNativeClipboard(card.blob, item.compactText);
  logInspectorDebug('[Inspector] clipboard nativo:', nativeStatus);
  if (nativeStatus === 'ok') return { status: 'native', card };

  const imageStatus = await copyImageBlobToClipboard(card.blob, item.compactText);
  if (imageStatus === 'ok') return { status: 'ok', card };

  const htmlStatus = await copyHtmlImageToClipboard(card.blob, item.compactText);
  logInspectorDebug('[Inspector] fallback HTML:', htmlStatus);
  if (htmlStatus === 'ok') return { status: 'html', card };

  return { status: `${imageStatus}/${htmlStatus}`, card };
};

// ─── Captura de info completa del elemento clickeado ───
const captureElement = (clickedEl) => {
  let element = clickedEl;
  let components = [];
  let firstFiber = null;
  while (element && components.length === 0) {
    const fiber = getFiberFromElement(element);
    if (fiber) {
      if (!firstFiber) firstFiber = fiber;
      components = findComponents(fiber);
    }
    element = element.parentElement;
  }
  if (components.length === 0) return null;

  const propsClicked = firstFiber ? getRelevantProps(firstFiber) : [];
  const actionableEl = findActionableElement(clickedEl);
  const actionableFiber = actionableEl !== clickedEl ? getFiberFromElement(actionableEl) : null;
  const propsActionable = actionableFiber ? getRelevantProps(actionableFiber) : [];
  const props = Array.from(new Set([...propsClicked, ...propsActionable]));

  let filePath = null;
  for (const c of components) {
    if (fileMap[c]) {
      filePath = fileMap[c];
      break;
    }
  }

  const componentName = components[0];
  const componentChain = components.slice(0, 5).join(' → ');
  const elementDesc = describeElement(clickedEl);
  const actionableDesc = actionableEl !== clickedEl ? describeElement(actionableEl) : null;
  const id = `${componentName}|${filePath || ''}|${elementDesc}|${actionableDesc || ''}`;

  // Texto plano para copiar (limpio, sin instrucciones extra)
  const lines = [`Componente: ${componentChain}`];
  if (filePath) lines.push(`Archivo: ${filePath}`);
  lines.push(`Elemento: ${elementDesc}`);
  if (actionableDesc) lines.push(`Accionable: ${actionableDesc}`);
  if (props.length) lines.push(`Props/handlers: ${props.join(', ')}`);
  lines.push(`Ruta: ${getInspectorRoute()}`);
  const compactText = lines.join('\n');

  return {
    id,
    componentName,
    componentChain,
    filePath,
    elementDesc,
    actionableDesc,
    props,
    compactText,
    element: clickedEl,
    actionableElement: actionableEl,
    captureTarget: actionableEl || clickedEl,
  };
};

// ─── Estilos compartidos ───
const PANEL_BG = '#0a0e14';
const PANEL_BORDER_STRONG = 'rgba(255,255,255,0.12)';
const ACCENT = '#22d3ee';
const TEXT = '#e2e8f0';
const TEXT_MUTED = '#94a3b8';
const TEXT_DIM = '#64748b';
const FILE_GREEN = '#86efac';

const DevClickToSource = () => {
  const [active, setActive] = useState(false);
  const [highlight, setHighlight] = useState(null);
  const [toast, setToast] = useState(null); // { text, x, y, kind }

  const activeRef = useRef(false);
  const toastTimerRef = useRef(null);
  const ignoreNextClickRef = useRef(false);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  const showToast = useCallback((text, e, kind = 'ok') => {
    clearTimeout(toastTimerRef.current);
    setToast({ text, x: e?.clientX ?? window.innerWidth - 200, y: e?.clientY ?? 60, kind });
    toastTimerRef.current = setTimeout(() => setToast(null), 1300);
  }, []);

  const deactivateInspector = useCallback(() => {
    activeRef.current = false;
    setActive(false);
    setHighlight(null);
  }, []);

  const closeInspector = useCallback(() => {
    deactivateInspector();
  }, [deactivateInspector]);

  const handleCapture = useCallback((info, e) => {
    if (!info) return;
    // El clic principal copia por defecto una sola imagen con captura + datos.
    // Si el navegador bloquea PNG directo, probamos HTML rico antes del texto plano.
    const text = info.compactText;
    try { window.focus(); } catch {
      // El foco puede fallar en algunos contenedores del navegador; la copia sigue igual.
    }
    Promise.resolve()
      .then(async () => {
        const { status: imageStatus } = await copyInspectorCardToClipboard(info);
        if (imageStatus === 'ok') return 'card';
        if (imageStatus === 'native') return 'card-native';
        if (imageStatus === 'html') return 'card-html';
        console.warn('[Inspector] copia de tarjeta imagen+texto no disponible:', imageStatus);

        const ok = await copiarAlPortapapeles(text);
        return ok !== false ? 'text' : 'blocked';
      })
      .then((status) => {
        showToast(
          status === 'card'
            ? 'Texto + imagen copiados'
            : status === 'card-native'
              ? 'Texto + imagen copiados'
            : status === 'card-html'
              ? 'Texto + imagen copiados'
            : status === 'text'
              ? 'Texto copiado'
            : 'Copia bloqueada por el navegador',
          e,
          status === 'blocked' ? 'err' : 'ok'
        );
      })
      .catch((err) => {
        console.warn('[Inspector] copia automática de tarjeta falló:', err?.message || err);
        showToast('Error al copiar', e, 'err');
      })
      .finally(() => {
        deactivateInspector();
      });
  }, [deactivateInspector, showToast]);

  // ─── Listeners globales ───
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    const isInspectorUI = (el) => el?.closest?.('[data-dev-inspector]');

    const onMouseMove = (e) => {
      if (!activeRef.current) return;
      const el = e.target;
      if (isInspectorUI(el)) {
        setHighlight(null);
        return;
      }
      setHighlight(getElementHighlight(el));
    };

    const onClick = (e) => {
      const el = e.target;
      if (isInspectorUI(el)) return;

      // Alt+Click: solo activa el inspector; el siguiente click izquierdo copia.
      if (e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        activeRef.current = true;
        setActive(true);
        setHighlight(null);
        return;
      }

      // Inspector ya activo: click copia y desactiva; ctrl/cmd+click agrega antes de copiar.
      if (activeRef.current) {
        e.preventDefault();
        e.stopPropagation();
        const info = captureElement(el);
        handleCapture(info, e);
      }
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && activeRef.current) {
        e.preventDefault();
        closeInspector();
      }
    };

    const onScroll = () => {
      if (activeRef.current) setHighlight(null);
    };

    document.addEventListener('pointermove', onMouseMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('pointermove', onMouseMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [closeInspector, handleCapture]);

  if (!import.meta.env.DEV) return null;

  return (
    <>
      {active && <style>{`* { cursor: crosshair !important; }`}</style>}

      {/* Overlay invisible: bloquea interacción con la app cuando el inspector está activo */}
      {active && (
        <div
          data-dev-inspector
          style={{ position: 'fixed', inset: 0, zIndex: 2147483646, cursor: 'crosshair' }}
          onWheel={(e) => {
            // Reenviar scroll al elemento real debajo
            e.currentTarget.style.pointerEvents = 'none';
            const target = document.elementFromPoint(e.clientX, e.clientY);
            e.currentTarget.style.pointerEvents = 'auto';
            if (!target) return;
            let el = target;
            while (el && el !== document.documentElement) {
              const s = getComputedStyle(el);
              if (((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) ||
                  ((s.overflowX === 'auto' || s.overflowX === 'scroll') && el.scrollWidth > el.clientWidth)) {
                el.scrollBy(e.deltaX, e.deltaY);
                return;
              }
              el = el.parentElement;
            }
            window.scrollBy(e.deltaX, e.deltaY);
          }}
          onPointerMove={(e) => {
            const el = getUnderlyingElementFromPoint(e.clientX, e.clientY, e.currentTarget);
            if (!el) {
              setHighlight(null);
              return;
            }
            setHighlight(getElementHighlight(el));
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const el = getUnderlyingElementFromPoint(e.clientX, e.clientY, e.currentTarget);
            setHighlight(getElementHighlight(el));
          }}
          onPointerUp={(e) => {
            if (e.pointerType !== 'touch' && e.pointerType !== 'pen') return;

            e.preventDefault();
            e.stopPropagation();
            ignoreNextClickRef.current = true;

            const el = getUnderlyingElementFromPoint(e.clientX, e.clientY, e.currentTarget);
            if (!el) return;
            setHighlight(getElementHighlight(el));
            const info = captureElement(el);
            handleCapture(info, e);
          }}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (ignoreNextClickRef.current) {
              ignoreNextClickRef.current = false;
              return;
            }

            const el = getUnderlyingElementFromPoint(e.clientX, e.clientY, e.currentTarget);
            if (!el) return;
            const info = captureElement(el);
            handleCapture(info, e);
          }}
        />
      )}

      {/* Botón flotante toggle */}
      <button
        data-dev-inspector
        onClick={() => {
          if (active) closeInspector();
          else {
            activeRef.current = true;
            setActive(true);
          }
        }}
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: `1px solid ${active ? ACCENT : PANEL_BORDER_STRONG}`,
          background: active ? 'rgba(34,211,238,0.15)' : PANEL_BG,
          color: active ? ACCENT : TEXT_MUTED,
          cursor: 'pointer',
          zIndex: 2147483647,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: active ? `0 0 12px rgba(34,211,238,0.25)` : '0 2px 8px rgba(0,0,0,0.4)',
          padding: 0,
          transition: 'all 0.15s',
        }}
        title={active
          ? 'Inspector activo - Click copia texto + imagen y desactiva, Esc cierra'
          : 'Activar inspector (Alt+Click también lo activa sin copiar)'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="3" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="21" />
          <line x1="3" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="21" y2="12" />
        </svg>
      </button>

      {/* Highlight del elemento bajo el cursor */}
      {active && highlight && (
        <div
          data-dev-inspector
          style={{
            position: 'fixed',
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
            border: `2px solid ${ACCENT}`,
            background: 'rgba(34,211,238,0.06)',
            pointerEvents: 'none',
            zIndex: 2147483645,
            transition: 'all 0.06s ease-out',
            borderRadius: 2,
          }}
        >
          <span style={{
            position: 'absolute',
            top: highlight.labelPosition === 'below' ? highlight.height + 4 : -22,
            left: 0,
            background: ACCENT,
            color: '#000',
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 4,
            fontFamily: 'ui-monospace, monospace',
            whiteSpace: 'nowrap',
            fontWeight: 700,
            maxWidth: 'calc(100vw - 12px)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {highlight.label}
          </span>
        </div>
      )}

      {/* Toast breve junto al cursor al copiar texto automáticamente */}
      {toast && (
        <div
          data-dev-inspector
          style={{
            position: 'fixed',
            left: Math.min(toast.x + 14, window.innerWidth - 220),
            top: Math.max(toast.y - 32, 8),
            background: PANEL_BG,
            border: `1px solid ${toast.kind === 'err' ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.5)'}`,
            borderRadius: 8,
            padding: '5px 11px',
            fontSize: 11,
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
            fontWeight: 600,
            color: toast.kind === 'err' ? '#fca5a5' : '#86efac',
            zIndex: 2147483647,
            pointerEvents: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            whiteSpace: 'nowrap',
          }}
        >
          {toast.kind === 'err' ? '✗' : '✓'} {toast.text}
        </div>
      )}
    </>
  );
};

export default DevClickToSource;
