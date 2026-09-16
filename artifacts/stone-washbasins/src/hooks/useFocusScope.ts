import { useEffect, useRef, type RefObject } from 'react';

/** Keep keyboard focus within the current form, including its success state. */
export function useFocusScope<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onClose: () => void,
  busy = false,
  active = true,
) {
  const latest = useRef({ onClose, busy });
  latest.current = { onClose, busy };

  useEffect(() => {
    const container = ref.current;
    if (!container || !active) return undefined;
    const previous = document.activeElement as HTMLElement | null;
    const controls = () => Array.from(container.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )).filter(element => !element.hasAttribute('disabled') && element.getClientRects().length > 0);
    controls()[0]?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !latest.current.busy) {
        event.preventDefault();
        latest.current.onClose();
      }
      if (event.key !== 'Tab') return;
      const items = controls();
      const first = items[0];
      const last = items[items.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (!container.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      previous?.focus();
    };
  }, [ref, active]);
}