import { useEffect, useRef } from 'react';
import { installBackNavigation, onEphemeralChange, readEntryCtx } from './back-navigation';

/**
 * React hook to capture and restore ephemeral UI state for back/forward navigation.
 * @param {{
 *   capture: () => import('./back-navigation').RestorableContext,
 *   restore: (ctx?: import('./back-navigation').RestorableContext) => void,
 *   deps: any[]
 * }} options
 */
export function useBackNavigation(options) {
  const { capture, restore, deps } = options;
  const debounceMs = 200;
  const timerRef = useRef(null);

  useEffect(() => {
    installBackNavigation();
    try { restore(readEntryCtx()); } catch {}
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => onEphemeralChange(capture), debounceMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}


