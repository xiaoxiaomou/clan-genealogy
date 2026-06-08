// useFocusTrap.ts - 焦点陷阱 hook
// 用于模态/弹层：限制 Tab 在容器内循环
import { useEffect, useRef } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useFocusTrap(active: boolean = true) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((x) => x.offsetParent !== null || x === document.activeElement);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    el.addEventListener('keydown', onKey);

    // 自动聚焦第一个可聚焦元素
    const first = el.querySelector<HTMLElement>(FOCUSABLE);
    if (first) {
      requestAnimationFrame(() => first.focus());
    }

    return () => el.removeEventListener('keydown', onKey);
  }, [active]);

  return ref;
}
