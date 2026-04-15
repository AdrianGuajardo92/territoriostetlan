import { useEffect, useRef } from 'react';
import { useBackStack } from '../context/BackStackContext';

/**
 * Hook centralizado para que cualquier overlay (modal, panel, vista pantalla-completa,
 * ConfirmDialog) intercepte el botón físico "atrás" del celular.
 *
 * Uso:
 *   useBackHandler({ isOpen, onClose, id: 'unique-stable-id' });
 *
 * Comportamiento:
 * - Cuando isOpen pasa de false→true: registra en el back stack + pushState.
 * - Cuando usuario presiona back físico: el Provider llama a onClose.
 * - Cuando el componente cierra programáticamente (X, Escape, onSuccess):
 *   el hook unregistra y sincroniza el history stack con history.back().
 * - Cuando el componente se desmonta mientras está abierto: cleanup seguro.
 *
 * Regla anti doble-registro:
 * - Si el componente usa <Modal modalId="..."> internamente, ese Modal ya
 *   llama useBackHandler por ti. NO duplicar en el padre.
 * - Solo llama useBackHandler en el padre cuando renderices portales/overlays
 *   custom que NO pasan por <Modal>.
 *
 * Opt-out: si `id` es null/undefined/'', el hook no hace nada. Útil para
 * componentes que heredan un Modal pero no quieren registrarse (raro).
 */
export function useBackHandler({ isOpen, onClose, id }) {
  const backStack = useBackStack();

  // Guardamos la última versión de onClose en un ref para que el efecto de
  // apertura no se re-ejecute cada vez que el padre crea un nuevo callback.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Recuerda si este hook registró la entry (para manejar el cleanup).
  const wasRegisteredRef = useRef(false);

  useEffect(() => {
    // Opt-out
    if (!id) return;

    if (isOpen && !wasRegisteredRef.current) {
      // Apertura: registrar en el stack + pushState.
      backStack.register({
        id,
        onClose: () => {
          // Indirección vía ref para siempre invocar la última versión.
          if (typeof onCloseRef.current === 'function') {
            onCloseRef.current();
          }
        },
      });
      wasRegisteredRef.current = true;
    } else if (!isOpen && wasRegisteredRef.current) {
      // Cierre: verificar si fue programático o por back físico.
      const stillInStack = backStack.unregisterIfPresent(id);
      wasRegisteredRef.current = false;

      if (stillInStack) {
        // El popstate NO lo popeó → cierre programático (X/Escape/onSuccess).
        // Sincronizamos el browser history con un back programático.
        backStack.programmaticBack();
      }
      // else: popstate ya popeó la entry → no hace falta history.back().
    }
  }, [isOpen, id, backStack]);

  // Cleanup final: componente se desmonta mientras sigue abierto.
  useEffect(() => {
    return () => {
      if (!id) return;
      if (wasRegisteredRef.current) {
        const stillInStack = backStack.unregisterIfPresent(id);
        wasRegisteredRef.current = false;
        if (stillInStack) {
          backStack.programmaticBack();
        }
      }
    };
  }, [id, backStack]);
}

export default useBackHandler;
