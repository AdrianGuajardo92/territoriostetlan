import { useEffect, useRef, useCallback } from 'react';
import {
  touchSession,
  isSessionExpired,
  readSession
} from '../utils/sessionManager';

const ACTIVITY_THROTTLE_MS = 60 * 1000;

export const useSessionActivity = (currentUser, onSessionExpired) => {
  const lastTouchRef = useRef(0);
  const onExpiredRef = useRef(onSessionExpired);
  onExpiredRef.current = onSessionExpired;

  const handleActivity = useCallback(() => {
    if (!currentUser) return;

    const now = Date.now();
    if (now - lastTouchRef.current < ACTIVITY_THROTTLE_MS) return;

    lastTouchRef.current = now;
    touchSession();
  }, [currentUser]);

  const checkExpired = useCallback(() => {
    if (!currentUser) return;

    const session = readSession({ includeExpired: true });
    if (!session) return;

    if (isSessionExpired(session)) {
      onExpiredRef.current?.();
      return;
    }

    touchSession();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return undefined;

    const activityEvents = ['click', 'keydown', 'touchstart'];
    activityEvents.forEach((eventName) => {
      document.addEventListener(eventName, handleActivity, { passive: true });
    });

    window.addEventListener('focus', checkExpired);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkExpired();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      activityEvents.forEach((eventName) => {
        document.removeEventListener(eventName, handleActivity);
      });
      window.removeEventListener('focus', checkExpired);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, handleActivity, checkExpired]);
};
