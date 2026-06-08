// useAnnouncer.ts - 屏幕阅读器播报
import { useCallback, useRef } from 'react';

let liveRegion: HTMLDivElement | null = null;

function getRegion(): HTMLDivElement {
  if (liveRegion) return liveRegion;
  const el = document.createElement('div');
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  el.className = 'sr-only';
  el.id = 'a11y-announcer';
  document.body.appendChild(el);
  liveRegion = el;
  return el;
}

export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const el = getRegion();
  el.setAttribute('aria-live', priority);
  // 重复内容也播报：先清空再写入
  el.textContent = '';
  requestAnimationFrame(() => {
    el.textContent = message;
  });
}

export function useAnnouncer() {
  const lastMsg = useRef('');
  return useCallback((msg: string, priority?: 'polite' | 'assertive') => {
    if (msg === lastMsg.current) {
      // 强制清空再播报（解决重复触发问题）
      liveRegion && (liveRegion.textContent = '');
    }
    lastMsg.current = msg;
    announce(msg, priority);
  }, []);
}
