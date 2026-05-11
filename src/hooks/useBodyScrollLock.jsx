import { useLayoutEffect } from 'react';

let activeLocks = 0;
let savedState = null;
let restoreFrame = null;
let pendingScrollBehavior = null;

const getCurrentScrollY = () => (
  window.scrollY ||
  window.pageYOffset ||
  document.documentElement.scrollTop ||
  document.body.scrollTop ||
  0
);

const scrollToSavedPosition = (scrollY, scrollBehavior) => {
  const root = document.documentElement;
  root.style.scrollBehavior = 'auto';

  try {
    window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' });
  } catch {
    window.scrollTo(0, scrollY);
  }

  if (restoreFrame) {
    window.cancelAnimationFrame(restoreFrame);
  }

  pendingScrollBehavior = scrollBehavior;
  restoreFrame = window.requestAnimationFrame(() => {
    try {
      window.scrollTo({ top: scrollY, left: 0, behavior: 'instant' });
    } catch {
      window.scrollTo(0, scrollY);
    }

    root.style.scrollBehavior = scrollBehavior;
    restoreFrame = null;
    pendingScrollBehavior = null;
  });
};

export const useBodyScrollLock = (isLocked) => {
  useLayoutEffect(() => {
    if (!isLocked || typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    const body = document.body;
    const root = document.documentElement;

    if (restoreFrame) {
      window.cancelAnimationFrame(restoreFrame);
      restoreFrame = null;
      root.style.scrollBehavior = pendingScrollBehavior ?? root.style.scrollBehavior;
      pendingScrollBehavior = null;
    }

    if (activeLocks === 0) {
      const scrollY = getCurrentScrollY();

      savedState = {
        scrollY,
        body: {
          overflow: body.style.overflow,
          position: body.style.position,
          top: body.style.top,
          left: body.style.left,
          right: body.style.right,
          width: body.style.width,
          touchAction: body.style.touchAction,
          overscrollBehavior: body.style.overscrollBehavior
        },
        root: {
          scrollBehavior: root.style.scrollBehavior,
          overscrollBehavior: root.style.overscrollBehavior
        }
      };

      root.style.scrollBehavior = 'auto';
      root.style.overscrollBehavior = 'none';
      body.style.overflow = 'hidden';
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      body.style.touchAction = 'none';
      body.style.overscrollBehavior = 'none';
    }

    activeLocks += 1;

    return () => {
      activeLocks = Math.max(0, activeLocks - 1);

      if (activeLocks > 0 || !savedState) {
        return;
      }

      const stateToRestore = savedState;
      savedState = null;

      body.style.overflow = stateToRestore.body.overflow;
      body.style.position = stateToRestore.body.position;
      body.style.top = stateToRestore.body.top;
      body.style.left = stateToRestore.body.left;
      body.style.right = stateToRestore.body.right;
      body.style.width = stateToRestore.body.width;
      body.style.touchAction = stateToRestore.body.touchAction;
      body.style.overscrollBehavior = stateToRestore.body.overscrollBehavior;
      root.style.overscrollBehavior = stateToRestore.root.overscrollBehavior;

      scrollToSavedPosition(stateToRestore.scrollY, stateToRestore.root.scrollBehavior);
    };
  }, [isLocked]);
};

export default useBodyScrollLock;
