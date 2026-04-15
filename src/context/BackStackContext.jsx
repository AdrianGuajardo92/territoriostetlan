import React, { createContext, useContext, useRef, useCallback, useEffect } from 'react';

/**
 * BackStackContext: coordinador único del botón físico "atrás" del celular
 * con todos los overlays de la app (modales, vistas overlay, paneles, ConfirmDialog).
 *
 * Arquitectura:
 * - Un único window.addEventListener('popstate', ...) en toda la app.
 * - Stack LIFO en useRef (no re-renderiza en cada push/pop).
 * - Cada entry pushea una marca { backstack: true, id } al window.history.
 * - Distingue cierre por back físico vs cierre programático con 2 flags,
 *   para evitar loops popstate ↔ history.back().
 *
 * Uso: NO se consume directamente. Usa el hook `useBackHandler` en su lugar.
 */

const BackStackContext = createContext(null);

export function BackStackProvider({ children }) {
  // Stack de entries { id, onClose }. Top = último abierto = primero en cerrarse.
  const stackRef = useRef([]);

  // true mientras el Provider está ejecutando un onClose disparado por popstate.
  // Si durante ese onClose algún hook intenta hacer history.back() adicional
  // (migración incompleta), se ignora.
  const isHandlingBackRef = useRef(false);

  // true cuando el hook disparó history.back() desde un cierre programático
  // (X, Escape, onSuccess). El listener de popstate consume el flag y no
  // vuelve a llamar onClose.
  const isProgrammaticCloseRef = useRef(false);

  /**
   * Registra una entry y añade una marca al history.
   */
  const register = useCallback(({ id, onClose }) => {
    if (typeof id !== 'string' || !id) {
      console.warn('[BackStack] register: id inválido', id);
      return;
    }

    // De-dup defensiva: si ya existe el id, reemplaza el onClose
    // (puede pasar si un componente se re-monta mientras seguía open).
    const existing = stackRef.current.findIndex((e) => e.id === id);
    if (existing !== -1) {
      stackRef.current[existing].onClose = onClose;
      return;
    }

    stackRef.current.push({ id, onClose });

    try {
      window.history.pushState(
        { backstack: true, id },
        '',
        window.location.href
      );
    } catch (err) {
      console.warn('[BackStack] pushState falló', err);
    }
  }, []);

  /**
   * Des-registra por id. Retorna true si había entry; false si ya no estaba
   * (p. ej. fue popeada por el listener de popstate).
   */
  const unregisterIfPresent = useCallback((id) => {
    const idx = stackRef.current.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    stackRef.current.splice(idx, 1);
    return true;
  }, []);

  /**
   * Dispara history.back() de forma programática. El listener popstate
   * verá el flag y no ejecutará onClose (ya fue ejecutado o va a serlo).
   */
  const programmaticBack = useCallback(() => {
    isProgrammaticCloseRef.current = true;
    try {
      window.history.back();
    } catch (err) {
      console.warn('[BackStack] history.back falló', err);
      isProgrammaticCloseRef.current = false;
    }
  }, []);

  const peek = useCallback(() => {
    return stackRef.current[stackRef.current.length - 1] || null;
  }, []);

  const stackSize = useCallback(() => stackRef.current.length, []);

  /**
   * Handler único de popstate. Registrado una sola vez al montar el provider.
   */
  useEffect(() => {
    const handlePopState = (event) => {
      // Caso 1: cierre programático en curso. El back() lo disparó el hook
      // para sincronizar el stack del browser. Solo consumimos el flag.
      if (isProgrammaticCloseRef.current) {
        isProgrammaticCloseRef.current = false;
        return;
      }

      // Caso 2: stack vacío → dejamos navegación nativa
      // (refresh, link externo, user canceló salir, etc.).
      if (stackRef.current.length === 0) {
        return;
      }

      // Caso 3: back físico del usuario con entries en el stack.
      // Cerramos el top (LIFO). El onClose actualiza isOpen=false en el
      // componente; el hook detecta que su id YA no está en stack y NO
      // dispara history.back() adicional (evita loop).
      isHandlingBackRef.current = true;
      const entry = stackRef.current.pop();
      try {
        if (entry && typeof entry.onClose === 'function') {
          entry.onClose();
        }
      } catch (err) {
        console.error('[BackStack] error en onClose de', entry?.id, err);
      } finally {
        isHandlingBackRef.current = false;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Exponemos funciones estables — nunca cambian de referencia.
  const value = useRef({
    register,
    unregisterIfPresent,
    programmaticBack,
    peek,
    stackSize,
  }).current;

  return (
    <BackStackContext.Provider value={value}>
      {children}
    </BackStackContext.Provider>
  );
}

export function useBackStack() {
  const ctx = useContext(BackStackContext);
  if (!ctx) {
    throw new Error('useBackStack debe usarse dentro de <BackStackProvider>');
  }
  return ctx;
}

export default BackStackContext;
