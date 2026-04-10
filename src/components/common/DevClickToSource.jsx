import { useEffect, useState, useRef, useCallback } from 'react';
import { toPng, toBlob } from 'html-to-image';

// ─── Mini editor de anotaciones sobre screenshots ───
const ANNOTATION_TOOLS = [
  { id: 'rect', label: '▭', title: 'Rectángulo rojo' },
  { id: 'arrow', label: '→', title: 'Flecha' },
  { id: 'text', label: 'T', title: 'Texto (doble clic)' },
];

const AnnotatedScreenshot = ({ src, onExportBlob }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const [tool, setTool] = useState(null); // null = sin anotar, 'rect' | 'arrow' | 'text'
  const [annotations, setAnnotations] = useState([]);
  const [drawing, setDrawing] = useState(null); // anotación en curso
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [textInput, setTextInput] = useState(null); // { x, y, w, h } recuadro para input de texto

  // Sincronizar tamaño del canvas con la imagen
  const syncSize = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.clientWidth;
    const h = img.clientHeight;
    if (w > 0 && h > 0) setImgSize({ w, h });
  }, []);

  useEffect(() => {
    syncSize();
    window.addEventListener('resize', syncSize);
    return () => window.removeEventListener('resize', syncSize);
  }, [syncSize, src]);

  // Redibujar canvas cada vez que cambian las anotaciones
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || imgSize.w === 0) return;
    canvas.width = imgSize.w * 2; // 2x para nitidez
    canvas.height = imgSize.h * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, imgSize.w, imgSize.h);

    const allAnnotations = drawing ? [...annotations, drawing] : annotations;
    for (const ann of allAnnotations) {
      ctx.strokeStyle = '#ef4444';
      ctx.fillStyle = '#ef4444';
      ctx.lineWidth = 2;

      // Drawing en curso de texto: mostrar recuadro punteado como preview
      if (ann.type === 'text' && !ann.text) {
        const x = Math.min(ann.x1, ann.x2);
        const y = Math.min(ann.y1, ann.y2);
        const w = Math.abs(ann.x2 - ann.x1);
        const h = Math.abs(ann.y2 - ann.y1);
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
        continue;
      }

      if (ann.type === 'rect') {
        const x = Math.min(ann.x1, ann.x2);
        const y = Math.min(ann.y1, ann.y2);
        const w = Math.abs(ann.x2 - ann.x1);
        const h = Math.abs(ann.y2 - ann.y1);
        ctx.strokeRect(x, y, w, h);
      } else if (ann.type === 'arrow') {
        const dx = ann.x2 - ann.x1;
        const dy = ann.y2 - ann.y1;
        const angle = Math.atan2(dy, dx);
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 3) continue;
        // Línea
        ctx.beginPath();
        ctx.moveTo(ann.x1, ann.y1);
        ctx.lineTo(ann.x2, ann.y2);
        ctx.stroke();
        // Punta de flecha
        const headLen = Math.min(12, len * 0.3);
        ctx.beginPath();
        ctx.moveTo(ann.x2, ann.y2);
        ctx.lineTo(ann.x2 - headLen * Math.cos(angle - 0.4), ann.y2 - headLen * Math.sin(angle - 0.4));
        ctx.moveTo(ann.x2, ann.y2);
        ctx.lineTo(ann.x2 - headLen * Math.cos(angle + 0.4), ann.y2 - headLen * Math.sin(angle + 0.4));
        ctx.stroke();
      } else if (ann.type === 'text') {
        // Recuadro con fondo oscuro
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(ann.x, ann.y, ann.w, ann.h);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(ann.x, ann.y, ann.w, ann.h);
        // Texto dentro del recuadro, con word-wrap básico
        ctx.fillStyle = '#ef4444';
        const fontSize = Math.max(10, Math.min(14, ann.h * 0.6));
        ctx.font = `bold ${fontSize}px monospace`;
        const padding = 4;
        const maxW = ann.w - padding * 2;
        const words = ann.text.split(' ');
        let line = '';
        let lineY = ann.y + fontSize + padding;
        for (const word of words) {
          const test = line ? `${line} ${word}` : word;
          if (ctx.measureText(test).width > maxW && line) {
            ctx.fillText(line, ann.x + padding, lineY);
            line = word;
            lineY += fontSize + 2;
            if (lineY > ann.y + ann.h - padding) break;
          } else {
            line = test;
          }
        }
        if (line && lineY <= ann.y + ann.h) {
          ctx.fillText(line, ann.x + padding, lineY);
        }
      }
    }
  }, [annotations, drawing, imgSize]);

  // Ref estable para callback de export
  const onExportBlobRef = useRef(onExportBlob);
  onExportBlobRef.current = onExportBlob;

  // Exportar imagen fusionada (screenshot + anotaciones)
  useEffect(() => {
    if (!onExportBlobRef.current) return;
    if (annotations.length === 0) {
      onExportBlobRef.current(null); // Sin anotaciones, usar blob original
      return;
    }
    // Fusionar imagen + canvas
    const exportMerged = async () => {
      const img = imgRef.current;
      const canvas = canvasRef.current;
      if (!img || !canvas) return;
      const merged = document.createElement('canvas');
      merged.width = canvas.width;
      merged.height = canvas.height;
      const mctx = merged.getContext('2d');
      // Dibujar imagen de fondo
      mctx.drawImage(img, 0, 0, merged.width, merged.height);
      // Dibujar anotaciones encima
      mctx.drawImage(canvas, 0, 0);
      merged.toBlob((blob) => onExportBlobRef.current?.(blob), 'image/png');
    };
    exportMerged();
  }, [annotations, imgSize]);

  const getPos = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e) => {
    if (!tool) return;
    e.preventDefault();
    e.stopPropagation();
    const { x, y } = getPos(e);
    setDrawing({ type: tool, x1: x, y1: y, x2: x, y2: y });
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    setDrawing(prev => prev ? { ...prev, x2: x, y2: y } : null);
  };

  const handlePointerUp = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const final = { ...drawing, x2: x, y2: y };
    const dx = Math.abs(final.x2 - final.x1);
    const dy = Math.abs(final.y2 - final.y1);
    if (dx > 3 || dy > 3) {
      if (final.type === 'text') {
        // Abrir input dentro del recuadro dibujado
        setTextInput({
          x: Math.min(final.x1, final.x2),
          y: Math.min(final.y1, final.y2),
          w: Math.abs(final.x2 - final.x1),
          h: Math.abs(final.y2 - final.y1),
        });
      } else {
        setAnnotations(prev => [...prev, final]);
        setRedoStack([]);
      }
    }
    setDrawing(null);
  };

  const handleTextSubmit = (text) => {
    if (text && textInput) {
      setAnnotations(prev => [...prev, {
        type: 'text',
        x: textInput.x,
        y: textInput.y,
        w: textInput.w,
        h: textInput.h,
        text,
      }]);
      setRedoStack([]);
    }
    setTextInput(null);
  };

  const [redoStack, setRedoStack] = useState([]);
  const redoStackRef = useRef(redoStack);
  redoStackRef.current = redoStack;

  const undo = () => {
    setAnnotations(prev => {
      if (prev.length === 0) return prev;
      const removed = prev[prev.length - 1];
      setRedoStack(rs => [...rs, removed]);
      return prev.slice(0, -1);
    });
  };
  const redo = () => {
    setRedoStack(rs => {
      if (rs.length === 0) return rs;
      const restored = rs[rs.length - 1];
      setAnnotations(prev => [...prev, restored]);
      return rs.slice(0, -1);
    });
  };
  const clearAll = () => { setAnnotations([]); setRedoStack([]); setTool(null); };

  const undoRef = useRef(undo);
  const redoRef = useRef(redo);
  undoRef.current = undo;
  redoRef.current = redo;

  // Ctrl+Z deshacer, Ctrl+Y rehacer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (annotations.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          undoRef.current?.();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y' && !e.shiftKey) {
        if (redoStackRef.current.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          redoRef.current?.();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [annotations.length]);

  const toolBtnStyle = (active) => ({
    background: active ? 'rgba(239,68,68,0.25)' : 'rgba(148,163,184,0.1)',
    border: `1px solid ${active ? 'rgba(239,68,68,0.5)' : 'rgba(148,163,184,0.2)'}`,
    color: active ? '#ef4444' : '#94a3b8',
    fontSize: 11,
    padding: '2px 7px',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: 'monospace',
    fontWeight: 600,
    lineHeight: '18px',
  });

  return (
    <div style={{ marginTop: 10, position: 'relative' }}>
      {/* Toolbar */}
      <div data-dev-inspector style={{
        display: 'flex', gap: 3, marginBottom: 4, alignItems: 'center', flexWrap: 'wrap',
      }}>
        {ANNOTATION_TOOLS.map(t => (
          <button
            key={t.id}
            data-dev-inspector
            onClick={(e) => { e.stopPropagation(); setTool(tool === t.id ? null : t.id); }}
            style={toolBtnStyle(tool === t.id)}
            title={t.title}
          >
            {t.label}
          </button>
        ))}
        {annotations.length > 0 && (
          <>
            <button data-dev-inspector onClick={(e) => { e.stopPropagation(); undo(); }} style={toolBtnStyle(false)} title="Deshacer (Ctrl+Z)">↩</button>
            <button data-dev-inspector onClick={(e) => { e.stopPropagation(); redo(); }} style={{ ...toolBtnStyle(false), opacity: redoStack.length > 0 ? 1 : 0.35 }} title="Rehacer (Ctrl+Y)" disabled={redoStack.length === 0}>↪</button>
            <button data-dev-inspector onClick={(e) => { e.stopPropagation(); clearAll(); }} style={toolBtnStyle(false)} title="Borrar todo">✕</button>
            <span style={{ fontSize: 9, color: '#64748b', marginLeft: 2 }}>{annotations.length} anotación{annotations.length > 1 ? 'es' : ''}</span>
          </>
        )}
        {redoStack.length > 0 && annotations.length === 0 && (
          <button data-dev-inspector onClick={(e) => { e.stopPropagation(); redo(); }} style={toolBtnStyle(false)} title="Rehacer (Ctrl+Y)">↪</button>
        )}
      </div>

      {/* Imagen + canvas superpuesto */}
      <div ref={containerRef} style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
        <img
          ref={imgRef}
          src={src}
          alt="Preview"
          onLoad={syncSize}
          style={{
            maxWidth: '100%',
            borderRadius: 6,
            border: '1px solid #1e293b',
            display: 'block',
          }}
        />
        {imgSize.w > 0 && (
          <canvas
            ref={canvasRef}
            data-dev-inspector
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: imgSize.w,
              height: imgSize.h,
              borderRadius: 6,
              cursor: tool === 'text' ? 'text' : tool ? 'crosshair' : 'default',
              pointerEvents: tool ? 'auto' : 'none',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          />
        )}
        {/* Input de texto flotante dentro del recuadro dibujado */}
        {textInput && (
          <div
            data-dev-inspector
            style={{
              position: 'absolute',
              top: textInput.y,
              left: textInput.x,
              width: textInput.w,
              height: textInput.h,
              background: 'rgba(0,0,0,0.75)',
              border: '1.5px solid #ef4444',
              borderRadius: 2,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              padding: 4,
            }}
          >
            <textarea
              data-dev-inspector
              autoFocus
              rows={1}
              style={{
                width: '100%',
                height: '100%',
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                fontSize: Math.max(10, Math.min(14, textInput.h * 0.6)),
                fontFamily: 'monospace',
                fontWeight: 'bold',
                padding: 0,
                outline: 'none',
                resize: 'none',
                lineHeight: 1.2,
              }}
              placeholder="Escribe aquí..."
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTextSubmit(e.target.value);
                }
                if (e.key === 'Escape') setTextInput(null);
              }}
              onBlur={(e) => handleTextSubmit(e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Construir mapa de ComponentName → ruta del archivo usando Vite glob
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

// Colores para cada label del panel
const LABEL_COLORS = {
  Component: '#f59e0b',
  File: '#22c55e',
  Element: '#38bdf8',
  Props: '#fb923c',
  Path: '#94a3b8',
  Children: '#94a3b8',
  Context: '#a78bfa',
};

/**
 * DevClickToSource - Inspector visual de elementos React.
 * - Botón toggle para activar modo inspector con hover highlight
 * - Alt+Click como atajo rápido
 * - Ctrl+Click para multi-selección (agregar/quitar elementos)
 * - Esc para salir del inspector
 * Solo desarrollo. Compatible con React 19.
 */
const DevClickToSource = () => {
  const [inspecting, setInspecting] = useState(false);
  const [stickyMode, setStickyMode] = useState(false); // Modo sticky: panel no se desvanece
  const [highlight, setHighlight] = useState(null);
  const [selected, setSelected] = useState([]);
  const [screenshots, setScreenshots] = useState({});
  const [screenshotBlobs, setScreenshotBlobs] = useState({}); // Blobs para re-copiar imagen
  const [copyStatus, setCopyStatus] = useState(''); // 'text+image' | 'text-only'
  const [copyToast, setCopyToast] = useState(null); // { text, x, y } para toast breve
  const copyToastTimerRef = useRef(null);
  const [annotatedBlobs, setAnnotatedBlobs] = useState({}); // Blobs con anotaciones dibujadas
  const inspectingRef = useRef(false);
  const stickyModeRef = useRef(false);
  const ctrlHeldRef = useRef(false);
  const captureElementRef = useRef(null);
  const copyAllRef = useRef(null);
  const setScreenshotsRef = useRef(null);
  const setScreenshotBlobsRef = useRef(null);
  const setCopyStatusRef = useRef(null);

  // Sincronizar refs con state
  useEffect(() => {
    inspectingRef.current = inspecting;
  }, [inspecting]);
  useEffect(() => {
    stickyModeRef.current = stickyMode;
  }, [stickyMode]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    // --- Helpers ---
    const getFiberFromElement = (element) => {
      const key = Object.keys(element).find(
        k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
      );
      return key ? element[key] : null;
    };

    const findComponent = (fiber) => {
      let current = fiber;
      const components = [];
      while (current) {
        if ((current.tag === 0 || current.tag === 1) && current.type) {
          const name = current.type.displayName || current.type.name;
          if (name && !name.startsWith('_') && name !== 'Fragment') {
            components.push(name);
          }
        }
        current = current.return;
      }
      return components;
    };


    // Extraer props relevantes del fiber (las que ayudan a ubicar el elemento en código)
    const getRelevantProps = (fiber) => {
      const props = [];
      let current = fiber;
      while (current) {
        const p = current.memoizedProps || current.pendingProps;
        if (p) {
          if (p.onClick) props.push('onClick');
          if (p.onChange) props.push('onChange');
          if (p.onSubmit) props.push('onSubmit');
          if (p['data-testid']) props.push(`data-testid="${p['data-testid']}"`);
          // key no es accesible via props en React 19, usar fiber.key directamente
          if (p.name) props.push(`name="${p.name}"`);
          if (p.id) props.push(`id="${p.id}"`);
          if (p.role) props.push(`role="${p.role}"`);
          if (p.type && typeof p.type === 'string') props.push(`type="${p.type}"`);
          if (p.placeholder) props.push(`placeholder="${trunc(p.placeholder, 30)}"`);
          if (p.title && typeof p.title === 'string') props.push(`title="${trunc(p.title, 30)}"`);
          if (props.length > 0) break;
        }
        // key está en el fiber, no en props
        if (current.key != null && current.key !== '') props.push(`key="${current.key}"`);
        current = current.return;
      }
      return props;
    };

    const trunc = (s, n = 30) => {
      const clean = (s || '').replace(/\s+/g, ' ').trim();
      return clean.length > n ? clean.substring(0, n) + '...' : clean;
    };

    const sel = (el, maxCls = 2) => {
      const tag = el.tagName.toLowerCase();
      const cls = Array.from(el.classList || []).slice(0, maxCls).join('.');
      return cls ? `${tag}.${cls}` : tag;
    };

    const getDomPath = (el) => {
      const parts = [];
      let cur = el.parentElement;
      while (cur && cur !== document.body && parts.length < 5) {
        const s = sel(cur);
        const t = trunc(cur.textContent, 25);
        parts.unshift(t ? `${s}("${t}")` : s);
        cur = cur.parentElement;
      }
      return parts;
    };

    const getChildren = (el) => {
      const result = [];
      for (const child of el.children) {
        if (result.length >= 4) break;
        const s = sel(child);
        const t = trunc(child.textContent, 25);
        result.push(t ? `${s}("${t}")` : s);
      }
      return result;
    };

    const getContext = (el) => {
      const parts = [];
      const parent = el.parentElement;
      if (parent) {
        for (const sib of parent.children) {
          if (sib === el) continue;
          if (/^H[1-6]$/.test(sib.tagName)) {
            parts.push(`sibling-${sib.tagName.toLowerCase()}="${trunc(sib.textContent, 40)}"`);
          }
        }
      }
      const section = el.closest('section, [role="region"], [role="dialog"], [data-section]');
      if (section) {
        const label = section.getAttribute('aria-label') || section.getAttribute('title') || '';
        if (label) parts.push(`section="${trunc(label, 40)}"`);
      }
      let cur = el.parentElement;
      while (cur && cur !== document.body) {
        for (const child of cur.children) {
          if (/^H[1-6]$/.test(child.tagName) && !child.contains(el) && child !== el) {
            const ht = trunc(child.textContent, 40);
            const key = `heading-${child.tagName.toLowerCase()}="${ht}"`;
            if (!parts.includes(key)) parts.push(key);
            break;
          }
        }
        if (parts.length >= 3) break;
        cur = cur.parentElement;
      }
      return parts;
    };

    // --- Capturar info completa de un elemento ---
    const captureElement = (clickedEl) => {
      let element = clickedEl;
      let components = [];
      let firstFiber = null;
      while (element && components.length === 0) {
        const fiber = getFiberFromElement(element);
        if (fiber) {
          if (!firstFiber) firstFiber = fiber;
          components = findComponent(fiber);
        }
        element = element.parentElement;
      }
      if (components.length === 0) return null;

      // Props relevantes del fiber
      const relevantProps = firstFiber ? getRelevantProps(firstFiber) : [];

      let filePath = null;
      for (let i = 0; i < components.length; i++) {
        if (fileMap[components[i]]) {
          filePath = fileMap[components[i]];
          break;
        }
      }

      const tag = clickedEl.tagName?.toLowerCase() || '?';
      let directText = '';
      for (const node of clickedEl.childNodes) {
        if (node.nodeType === 3) directText += node.textContent;
      }
      directText = trunc(directText, 50);
      const fullText = !directText ? trunc(clickedEl.textContent, 50) : '';
      const ariaLabel = clickedEl.getAttribute('aria-label') || '';
      const dataTestId = clickedEl.getAttribute('data-testid') || '';
      const elId = clickedEl.getAttribute('id') || '';
      const elName = clickedEl.getAttribute('name') || '';
      const elPlaceholder = clickedEl.getAttribute('placeholder') || '';

      // Element: solo info semántica útil (NO clases Tailwind)
      let elemValue = `<${tag}>`;
      if (directText) elemValue += ` text="${directText}"`;
      else if (fullText) elemValue += ` text="${fullText}"`;
      if (ariaLabel) elemValue += ` aria="${ariaLabel}"`;
      if (dataTestId) elemValue += ` data-testid="${dataTestId}"`;
      if (elId) elemValue += ` id="${elId}"`;
      if (elName) elemValue += ` name="${elName}"`;
      if (elPlaceholder) elemValue += ` placeholder="${trunc(elPlaceholder, 30)}"`;

      const domPath = getDomPath(clickedEl);
      const children = getChildren(clickedEl);
      const ctx = getContext(clickedEl);

      // Structured lines for colored rendering (panel visual)
      const lines = [
        { label: 'Component', value: components.slice(0, 6).join(' \u2192 ') },
      ];
      if (filePath) lines.push({ label: 'File', value: filePath });
      lines.push({ label: 'Element', value: elemValue });
      if (relevantProps.length > 0) lines.push({ label: 'Props', value: relevantProps.join(', ') });
      lines.push(
        { label: 'Path', value: domPath.join(' > ') },
        { label: 'Children', value: children.length > 0 ? `[${children.join(', ')}]` : '(none)' },
      );
      if (ctx.length > 0) lines.push({ label: 'Context', value: ctx.join(' | ') });

      // Texto completo para el panel visual
      const text = lines.map(l => `${l.label}: ${l.value}`).join('\n');

      // Texto completo para copiar — mismo contenido que el panel visual
      const compactText = lines.map(l => `${l.label}: ${l.value}`).join('\n');
      // ID para dedup en multi-selección
      const id = `${components[0]}|${filePath || ''}|${elemValue}`;
      return { lines, text, compactText, id, element: clickedEl };
    };

    // Ignorar clics en nuestro propio UI
    const isInspectorUI = (el) => el.closest('[data-dev-inspector]');

    // Fallback: copiar texto con execCommand (no requiere document focus)
    const copyTextFallback = (text) => {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
      } catch { return false; }
    };

    // Capturar screenshot con html-to-image (más fiel que html2canvas)
    const takeScreenshot = async (el) => {
      // Verificar que el elemento siga en el DOM (puede desmontarse por re-render de React)
      if (!document.contains(el)) return null;

      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;

      // Asegurar que el elemento esté en el viewport
      const wasOutOfView = rect.bottom < 0 || rect.top > window.innerHeight;
      if (wasOutOfView) {
        el.scrollIntoView({ block: 'nearest', behavior: 'instant' });
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      }

      // Filtrar nodos del inspector para que no salgan en la captura
      const filter = (node) => {
        if (node?.dataset?.devInspector != null) return false;
        return true;
      };

      // Placeholder para imágenes que fallan por CORS (portadas de libros de CDNs externos)
      // Sin esto, toBlob explota si el elemento contiene <img> cross-origin
      const imagePlaceholder = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      // Intento 1: alta calidad con pixelRatio 2
      // skipFonts: evita error CORS al leer Google Fonts cross-origin
      const attempts = [
        { pixelRatio: 2, cacheBust: true, filter, skipAutoScale: true, skipFonts: true, imagePlaceholder },
        // Intento 2: calidad normal, más compatible
        { pixelRatio: 1, cacheBust: true, filter, skipAutoScale: true, skipFonts: true, backgroundColor: '#0f172a', imagePlaceholder },
      ];

      for (let i = 0; i < attempts.length; i++) {
        try {
          const blob = await toBlob(el, attempts[i]);
          if (blob && blob.size > 0) return blob;
        } catch (err) {
          console.warn(`[Inspector] Screenshot intento ${i + 1}:`, err?.message || err);
        }
      }
      return null;
    };

    // Copiar al clipboard texto + imagen del elemento
    // Clic normal → solo texto | Shift+Clic → texto + imagen (ambos)
    const copyAll = async (items, includeImage = false) => {
      const allText = items.map(s => s.compactText).join('\n\n---\n\n');
      let capturedBlob = null;

      // Capturar screenshot solo si se necesita (Shift+Click)
      if (includeImage) {
        try {
          const lastItem = items[items.length - 1];
          const lastEl = lastItem?.element;
          if (lastEl) {
            const blob = await takeScreenshot(lastEl);
            if (blob) capturedBlob = blob;
          }
        } catch (err) {
          console.warn('[Inspector] Screenshot falló:', err?.message || err);
        }
      }

      // Shift+Clic: copiar texto + imagen en un solo ClipboardItem
      if (includeImage && capturedBlob) {
        try {
          window.focus();
          await new Promise(r => setTimeout(r, 50));
          await navigator.clipboard.write([
            new ClipboardItem({
              'text/plain': new Blob([allText], { type: 'text/plain' }),
              'image/png': capturedBlob,
            })
          ]);
          setCopyStatusRef.current?.('text+image');
          return;
        } catch {
          // Si falla el write combinado, intentar solo texto
        }
      }

      // Por defecto: copiar solo texto
      try {
        await navigator.clipboard.writeText(allText);
      } catch {
        copyTextFallback(allText);
      }
      setCopyStatusRef.current?.('text-only');
    };

    // Exponer funciones vía refs para el overlay JSX
    captureElementRef.current = captureElement;
    copyAllRef.current = copyAll;
    setScreenshotsRef.current = setScreenshots;
    setScreenshotBlobsRef.current = setScreenshotBlobs;
    setCopyStatusRef.current = setCopyStatus;

    // --- Event handlers ---
    const handleMouseMove = (e) => {
      if (!inspectingRef.current) return;
      const el = e.target;
      if (isInspectorUI(el)) {
        setHighlight(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      const tag = el.tagName.toLowerCase();
      const cls = Array.from(el.classList || []).slice(0, 2).join('.');
      setHighlight({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        label: cls ? `<${tag}>.${cls}` : `<${tag}>`,
      });
    };

    const handleClick = (e) => {
      const el = e.target;
      if (isInspectorUI(el)) return;

      // Alt+Click siempre toggle inspector (con sticky por defecto)
      if (e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        const next = !inspectingRef.current;
        inspectingRef.current = next;
        stickyModeRef.current = next;
        setInspecting(next);
        setStickyMode(next);
        if (!next) {
          setHighlight(null);
          setSelected([]);
        }
        return;
      }

      // Click normal en modo inspector → capturar y copiar texto (sin panel)
      if (inspectingRef.current) {
        e.preventDefault();
        e.stopPropagation();
        const info = captureElement(el);
        if (!info) return;
        const includeImage = e.shiftKey;

        // Copiar texto (o texto+imagen con Shift) y mostrar toast
        const items = [info];
        copyAll(items, includeImage).then(() => {
          const label = includeImage ? '📋 Texto + imagen copiados' : '📋 Texto copiado';
          clearTimeout(copyToastTimerRef.current);
          setCopyToast({ text: label, x: e.clientX, y: e.clientY });
          copyToastTimerRef.current = setTimeout(() => setCopyToast(null), 1000);
        });
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Control') ctrlHeldRef.current = true;
      if (e.key === 'Escape' && inspectingRef.current) {
        inspectingRef.current = false;
        stickyModeRef.current = false;
        setInspecting(false);
        setStickyMode(false);
        setHighlight(null);
        setSelected([]);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Control') ctrlHeldRef.current = false;
    };

    // Alt-tab con Ctrl presionado: resetear ref para evitar estado stale
    const handleBlur = () => { ctrlHeldRef.current = false; };

    const handleScroll = () => {
      if (inspectingRef.current) setHighlight(null);
    };

    // Bloquear TODOS los eventos que podrían cerrar menús/modals/dropdowns
    // cuando el inspector está activo
    const blockEvent = (e) => {
      if (!inspectingRef.current) return;
      if (isInspectorUI(e.target)) return;
      if (e.altKey) return; // Permitir Alt+Click para toggle
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    // Bloquear focus/blur que causan cierre de menús
    const blockFocusEvent = (e) => {
      if (!inspectingRef.current) return;
      if (isInspectorUI(e.target)) return;
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    document.addEventListener('pointermove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('mousedown', blockEvent, true);
    document.addEventListener('pointerdown', blockEvent, true);
    document.addEventListener('mouseup', blockEvent, true);
    document.addEventListener('focusin', blockFocusEvent, true);
    document.addEventListener('focusout', blockFocusEvent, true);
    document.addEventListener('blur', blockFocusEvent, true);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('pointermove', handleMouseMove, true);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('mousedown', blockEvent, true);
      document.removeEventListener('pointerdown', blockEvent, true);
      document.removeEventListener('mouseup', blockEvent, true);
      document.removeEventListener('focusin', blockFocusEvent, true);
      document.removeEventListener('focusout', blockFocusEvent, true);
      document.removeEventListener('blur', blockFocusEvent, true);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  // Auto-dismiss: espera a que Ctrl se suelte, luego 1.5s para cerrar
  // En modo sticky: NO auto-dismiss
  useEffect(() => {
    if (selected.length === 0) {
      setScreenshots({});
      setScreenshotBlobs({});
      setCopyStatus('');
      return;
    }

    // Limpiar blobs/screenshots de items que ya no están seleccionados
    const selectedIds = new Set(selected.map(s => s.id));
    setScreenshots(prev => {
      if (Object.keys(prev).every(id => selectedIds.has(id))) return prev;
      const next = {};
      for (const id of Object.keys(prev)) {
        if (selectedIds.has(id)) next[id] = prev[id];
      }
      return next;
    });
    setScreenshotBlobs(prev => {
      if (Object.keys(prev).every(id => selectedIds.has(id))) return prev;
      const next = {};
      for (const id of Object.keys(prev)) {
        if (selectedIds.has(id)) next[id] = prev[id];
      }
      return next;
    });

    // Sticky mode: el panel permanece visible
    if (stickyMode) return;

    let timer = null;
    let interval = null;

    const tryDismiss = () => {
      if (!ctrlHeldRef.current) {
        if (interval) clearInterval(interval);
        timer = setTimeout(() => setSelected([]), 1500);
      }
    };

    tryDismiss();
    // Si Ctrl está presionado, re-chequear cada 200ms (cubre alt-tab + blur)
    if (ctrlHeldRef.current) interval = setInterval(tryDismiss, 200);

    return () => {
      if (timer) clearTimeout(timer);
      if (interval) clearInterval(interval);
    };
  }, [selected, stickyMode]);

  if (!import.meta.env.DEV) return null;

  return (
    <>
      {/* Modo inspector: cursor crosshair + congelar el DOM para que nada se cierre */}
      {inspecting && <style>{`
        * { cursor: crosshair !important; }
      `}</style>}

      {/* Overlay invisible que captura clicks sobre elementos disabled */}
      {inspecting && (
        <div
          data-dev-inspector
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2147483647,
            cursor: 'crosshair',
          }}
          onWheel={(e) => {
            // Reenviar scroll al contenido debajo del overlay
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
            // Ocultar overlay momentáneamente para ver qué hay debajo
            e.currentTarget.style.pointerEvents = 'none';
            const el = document.elementFromPoint(e.clientX, e.clientY);
            e.currentTarget.style.pointerEvents = 'auto';
            if (!el || el.closest('[data-dev-inspector]')) {
              setHighlight(null);
              return;
            }
            const rect = el.getBoundingClientRect();
            const tag = el.tagName.toLowerCase();
            const cls = Array.from(el.classList || []).slice(0, 2).join('.');
            setHighlight({
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
              label: cls ? `<${tag}>.${cls}` : `<${tag}>`,
            });
          }}
          onMouseDown={(e) => {
            // Bloquear mousedown para que nada debajo reaccione
            e.preventDefault();
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Alt+Click: desactivar inspector + sticky
            if (e.altKey) {
              inspectingRef.current = false;
              stickyModeRef.current = false;
              setInspecting(false);
              setStickyMode(false);
              setHighlight(null);
              setSelected([]);
              return;
            }
            // Ocultar overlay para encontrar el elemento real debajo
            e.currentTarget.style.pointerEvents = 'none';
            const el = document.elementFromPoint(e.clientX, e.clientY);
            e.currentTarget.style.pointerEvents = 'auto';
            if (!el || el.closest('[data-dev-inspector]')) return;
            const info = captureElementRef.current?.(el);
            if (!info) return;
            const includeImage = e.shiftKey;
            // Copiar texto (o texto+imagen con Shift) y mostrar toast
            copyAllRef.current?.([info], includeImage)?.then?.(() => {
              const label = includeImage ? '📋 Texto + imagen copiados' : '📋 Texto copiado';
              clearTimeout(copyToastTimerRef.current);
              setCopyToast({ text: label, x: e.clientX, y: e.clientY });
              copyToastTimerRef.current = setTimeout(() => setCopyToast(null), 1000);
            });
          }}
        />
      )}

      {/* Botón toggle inspector — Click: modo sticky (default), Right-click: modo temporal */}
      <button
        data-dev-inspector
        onClick={() => {
          // Toggle inspector con sticky (modo principal)
          if (inspecting) {
            setStickyMode(false);
            stickyModeRef.current = false;
            setInspecting(false);
            inspectingRef.current = false;
            setHighlight(null);
            setSelected([]);
          } else {
            setStickyMode(true);
            stickyModeRef.current = true;
            setInspecting(true);
            inspectingRef.current = true;
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          // Right-click: modo temporal (sin sticky, panel desaparece solo)
          if (inspecting) {
            setInspecting(false);
            inspectingRef.current = false;
            setStickyMode(false);
            stickyModeRef.current = false;
            setHighlight(null);
            setSelected([]);
          } else {
            setStickyMode(false);
            stickyModeRef.current = false;
            setInspecting(true);
            inspectingRef.current = true;
          }
        }}
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          width: 34,
          height: 34,
          borderRadius: '50%',
          border: `2px solid ${stickyMode ? '#dc2626' : inspecting ? '#22d3ee' : '#475569'}`,
          background: stickyMode ? 'rgba(220,38,38,0.15)' : inspecting ? 'rgba(34,211,238,0.15)' : '#1e293b',
          color: stickyMode ? '#dc2626' : inspecting ? '#22d3ee' : '#64748b',
          cursor: 'pointer',
          zIndex: 2147483647,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          transition: 'all 0.2s',
          boxShadow: stickyMode
            ? '0 0 12px rgba(220,38,38,0.3)'
            : inspecting
              ? '0 0 12px rgba(34,211,238,0.3)'
              : '0 2px 8px rgba(0,0,0,0.3)',
          padding: 0,
          lineHeight: 1,
        }}
        title={stickyMode
          ? 'Inspector STICKY activo — panel persiste (Click para apagar | Right-click para modo normal)'
          : inspecting
            ? 'Inspector activo (Click=texto | Shift+Click=texto+imagen | Ctrl+Click=multi | Esc salir)'
            : 'Activar inspector (Alt+Click) | Right-click = modo temporal'}
      >
        {stickyMode ? (
          // Icono de pin/ancla para sticky mode
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L12 6" fill="none" strokeWidth="2" />
            <path d="M8 6h8l1 6H7l1-6z" />
            <path d="M7 12h10v2H7z" />
            <path d="M12 14v8" fill="none" strokeWidth="2" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        )}
      </button>

      {/* Hover highlight overlay */}
      {inspecting && highlight && (
        <div
          data-dev-inspector
          style={{
            position: 'fixed',
            top: highlight.top,
            left: highlight.left,
            width: highlight.width,
            height: highlight.height,
            border: `2px solid ${stickyMode ? '#dc2626' : '#22d3ee'}`,
            background: stickyMode ? 'rgba(34, 211, 238, 0.08)' : 'rgba(220, 38, 38, 0.08)',
            pointerEvents: 'none',
            zIndex: 2147483646,
            transition: 'all 0.06s ease-out',
          }}
        >
          <span style={{
            position: 'absolute',
            top: -20,
            left: 0,
            background: stickyMode ? '#dc2626' : '#22d3ee',
            color: '#000',
            fontSize: 10,
            padding: '1px 6px',
            borderRadius: 3,
            fontFamily: 'monospace',
            whiteSpace: 'nowrap',
            fontWeight: 600,
          }}>
            {highlight.label}
          </span>
        </div>
      )}

      {/* Toast de copiado */}
      {copyToast && (
        <div
          data-dev-inspector
          style={{
            position: 'fixed',
            left: Math.min(copyToast.x, window.innerWidth - 220),
            top: copyToast.y - 40,
            background: '#0f172a',
            border: '1px solid #22d3ee',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: 12,
            fontFamily: 'monospace',
            fontWeight: 600,
            color: '#22d3ee',
            zIndex: 2147483647,
            pointerEvents: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            animation: 'fadeIn 0.15s ease-out',
            whiteSpace: 'nowrap',
          }}
        >
          {copyToast.text}
        </div>
      )}

      {/* Panel de info — soporta multi-selección */}
      {selected.length > 0 && (
        <div
          data-dev-inspector
          style={{
            position: 'fixed',
            bottom: 60,
            right: 16,
            background: '#0f172a',
            border: stickyMode ? '1px solid rgba(220,38,38,0.3)' : '1px solid #1e293b',
            borderRadius: 10,
            padding: 0,
            fontSize: 11,
            fontFamily: 'monospace',
            color: '#e2e8f0',
            zIndex: 2147483647,
            maxWidth: 520,
            minWidth: 340,
            maxHeight: '60vh',
            overflow: 'hidden',
            boxShadow: stickyMode ? '0 8px 32px rgba(220,38,38,0.1)' : '0 8px 32px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '6px 12px',
            borderBottom: '1px solid #1e293b',
            background: stickyMode ? '#150c0c' : '#0c1a22',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            gap: 8,
          }}>
            <span style={{ color: stickyMode ? '#dc2626' : '#22d3ee', fontWeight: 700, fontSize: 10, letterSpacing: '0.05em' }}>
              {stickyMode ? '📌 STICKY' : 'INSPECTOR'} — {selected.length === 1
                ? (copyStatus === 'text-recopied' ? '¡texto copiado!'
                  : copyStatus === 'text+image' ? '📋 texto + imagen copiados — Ctrl+V para pegar'
                  : copyStatus === 'image-copied' ? '🖼️ imagen copiada — Ctrl+V para pegar'
                  : copyStatus === 'text-only' ? '📝 texto copiado — Ctrl+V para pegar'
                  : 'capturando...')
                : `${selected.length} elementos`}
            </span>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {selected.length > 1 && (
                <button
                  data-dev-inspector
                  onClick={() => setSelected([])}
                  style={{
                    background: 'rgba(239,68,68,0.15)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: '#f87171',
                    fontSize: 9,
                    padding: '2px 8px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                  }}
                >
                  Limpiar ({selected.length})
                </button>
              )}
              {/* Botón cerrar en modo sticky */}
              {stickyMode && (
                <button
                  data-dev-inspector
                  onClick={() => setSelected([])}
                  style={{
                    background: 'rgba(148,163,184,0.15)',
                    border: '1px solid rgba(148,163,184,0.3)',
                    color: '#94a3b8',
                    fontSize: 12,
                    padding: '0 5px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    lineHeight: '18px',
                  }}
                  title="Cerrar panel (el inspector sigue activo)"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Items */}
          <div style={{ overflowY: 'auto', maxHeight: 'calc(60vh - 32px)' }}>
            {selected.map((item, idx) => (
              <div key={item.id + idx} style={{
                padding: '10px 12px',
                lineHeight: 1.7,
                borderBottom: idx < selected.length - 1 ? '1px solid #1e293b' : 'none',
                position: 'relative',
              }}>
                {/* Badge de número para multi-selección */}
                {selected.length > 1 && (
                  <span style={{
                    position: 'absolute',
                    top: 6,
                    right: 8,
                    background: 'rgba(34,211,238,0.2)',
                    color: '#22d3ee',
                    fontSize: 9,
                    fontWeight: 700,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {idx + 1}
                  </span>
                )}
                {item.lines.map(({ label, value }) => (
                  <div key={label} style={{ wordBreak: 'break-word' }}>
                    <span style={{
                      color: LABEL_COLORS[label] || '#94a3b8',
                      fontWeight: 600,
                    }}>
                      {label}:
                    </span>{' '}
                    <span style={{ color: label === 'File' ? '#22c55e' : '#cbd5e1' }}>
                      {value}
                    </span>
                  </div>
                ))}
                {/* Preview del screenshot con anotaciones */}
                {screenshots[item.id] && (
                  <>
                    <AnnotatedScreenshot
                      src={screenshots[item.id]}
                      onExportBlob={(blob) => {
                        setAnnotatedBlobs(prev => {
                          if (blob) return { ...prev, [item.id]: blob };
                          const next = { ...prev };
                          delete next[item.id];
                          return next;
                        });
                      }}
                    />
                    {/* Botones copiar texto/imagen — visibles en sticky mode */}
                    {stickyMode && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                        <button
                          data-dev-inspector
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await navigator.clipboard.writeText(item.compactText);
                              setCopyStatus('text-recopied');
                              setTimeout(() => setCopyStatus(''), 1200);
                            } catch {
                              copyTextFallback(item.compactText);
                              setCopyStatus('text-recopied');
                              setTimeout(() => setCopyStatus(''), 1200);
                            }
                          }}
                          style={{
                            background: 'rgba(34,197,94,0.12)',
                            border: '1px solid rgba(34,197,94,0.3)',
                            color: '#22c55e',
                            fontSize: 10,
                            padding: '4px 10px',
                            borderRadius: 5,
                            cursor: 'pointer',
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                          title="Copiar texto conciso al portapapeles"
                        >
                          📋 {copyStatus === 'text-recopied' ? '¡Copiado!' : 'Texto'}
                        </button>
                        {(screenshotBlobs[item.id] || annotatedBlobs[item.id]) && (
                          <button
                            data-dev-inspector
                            onClick={async (e) => {
                              e.stopPropagation();
                              // Usar blob anotado si existe, sino el original
                              const blob = annotatedBlobs[item.id] || screenshotBlobs[item.id];
                              if (!blob) return;
                              try {
                                await navigator.clipboard.write([
                                  new ClipboardItem({ 'image/png': blob })
                                ]);
                                setCopyStatus('image-copied');
                                setTimeout(() => setCopyStatus(''), 1200);
                              } catch {
                                window.focus();
                                await new Promise(r => setTimeout(r, 100));
                                try {
                                  await navigator.clipboard.write([
                                    new ClipboardItem({ 'image/png': blob })
                                  ]);
                                  setCopyStatus('image-copied');
                                  setTimeout(() => setCopyStatus(''), 1200);
                                } catch { /* no se pudo copiar */ }
                              }
                            }}
                            style={{
                              background: annotatedBlobs[item.id] ? 'rgba(239,68,68,0.15)' : 'rgba(220,38,38,0.12)',
                              border: `1px solid ${annotatedBlobs[item.id] ? 'rgba(239,68,68,0.4)' : 'rgba(220,38,38,0.3)'}`,
                              color: annotatedBlobs[item.id] ? '#f87171' : '#dc2626',
                              fontSize: 10,
                              padding: '4px 10px',
                              borderRadius: 5,
                              cursor: 'pointer',
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            title={annotatedBlobs[item.id] ? 'Copiar imagen CON anotaciones' : 'Copiar imagen original'}
                          >
                            📋 {copyStatus === 'image-copied' ? '¡Copiada!' : annotatedBlobs[item.id] ? 'Imagen + notas' : 'Imagen'}
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </>
  );
};

export default DevClickToSource;
