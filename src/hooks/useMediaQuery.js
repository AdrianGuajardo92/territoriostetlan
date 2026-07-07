import { useEffect, useState } from 'react';

/**
 * Suscripción a una media query CSS. Útil para habilitar UX solo en desktop.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    setMatches(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export function useIsDesktop() {
  return useMediaQuery('(pointer: fine) and (min-width: 1024px)');
}
