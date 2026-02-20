import { useEffect, useRef, useCallback } from 'react';

/**
 * Runs `fn` immediately, then every `intervalMs`.
 * Stops when the component unmounts or `active` becomes false.
 */
export default function usePolling(fn, intervalMs = 3000, active = true) {
  const savedFn  = useRef(fn);
  const timerRef = useRef(null);

  useEffect(() => { savedFn.current = fn; }, [fn]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!active) { stop(); return; }
    savedFn.current();                                  // immediate first call
    timerRef.current = setInterval(() => savedFn.current(), intervalMs);
    return stop;
  }, [active, intervalMs, stop]);
}
