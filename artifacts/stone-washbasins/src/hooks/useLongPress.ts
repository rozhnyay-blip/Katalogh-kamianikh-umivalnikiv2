import { useEffect, useRef, type PointerEvent, type MouseEvent } from 'react';

/** Open an action menu, not a file picker: mobile pickers need a fresh tap. */
export function useLongPress(onHold: () => void, enabled: boolean) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const callback = useRef(onHold);
  callback.current = onHold;
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  };
  useEffect(() => clear, []);
  useEffect(() => { if (!enabled) clear(); }, [enabled]);

  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      clear();
      if (!enabled || !event.isPrimary || event.button !== 0 ||
          (event.target as HTMLElement).closest('button, a, input')) return;
      start.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
      timer.current = setTimeout(() => {
        clear();
        callback.current();
      }, 600);
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const origin = start.current;
      if (origin && (origin.pointerId !== event.pointerId ||
          Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 12)) clear();
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onPointerLeave: clear,
    onContextMenu(event: MouseEvent<HTMLElement>) {
      if (!enabled || (event.target as HTMLElement).closest('button, a, input')) return;
      event.preventDefault();
      clear();
      callback.current();
    },
  };
}