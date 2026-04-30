/**
 * Copia texto al portapapeles con fallbacks en cascada para entornos restringidos.
 *
 * 1. Primario: navigator.clipboard.writeText (requiere HTTPS/localhost y permiso).
 * 2. Fallback 1: document.execCommand('copy') sobre un textarea temporal.
 *    Sigue funcionando dentro de iframes sandboxed como Claude Preview o PWAs
 *    donde el permiso clipboard-write no está disponible.
 * 3. Fallback 2: si ambos fallan, despacha el CustomEvent `clipboard:manual-copy`.
 *    Un listener global (ClipboardFallbackModal montado en App.jsx) muestra un
 *    modal con el texto seleccionado para que el usuario haga Ctrl+C manual.
 *
 * @param {string|number} texto
 * @returns {Promise<boolean>} true si copió automáticamente, false si quedó en modal manual.
 */
export async function copiarAlPortapapeles(texto) {
  if (texto == null) return false;
  const str = String(texto);
  if (!str) return false;

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(str);
      return true;
    } catch {
      // iframe sin allow="clipboard-write" u otro rechazo → fallback
    }
  }

  if (typeof document === 'undefined') {
    dispararCopiaManual(str);
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = str;
  textarea.setAttribute('readonly', '');
  textarea.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;';
  document.body.appendChild(textarea);

  let ok = false;
  try {
    textarea.select();
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  } finally {
    document.body.removeChild(textarea);
  }

  if (!ok) dispararCopiaManual(str);
  return ok;
}

function dispararCopiaManual(texto) {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('clipboard:manual-copy', { detail: { texto } }));
  } catch {
    // Si CustomEvent falla (entorno muy viejo), no hay mucho que hacer
  }
}
