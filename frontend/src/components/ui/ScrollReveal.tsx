// ScrollReveal.tsx - 卷轴展开动画
// 每次会话首次进入族谱页时短暂展开古风卷轴（约 1.8 秒），
// 之后本会话内不再播放；开启「减弱动效」时直接跳过。
import { useEffect, useState } from 'react';

const SESSION_KEY = 'zupu-scroll-intro-played';

export function ScrollReveal({ children, duration = 4500 }: { children: React.ReactNode; duration?: number }) {
  const [opened, setOpened] = useState(false);
  const [closed, setClosed] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || closed) {
      setOpened(true);
      setClosed(true);
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* ignore */ }
      return;
    }
    // 封面展示时长收窄：最长 1 秒后开始展开，1 秒后收起
    const openDelay = Math.min(duration, 1000);
    const t1 = setTimeout(() => setOpened(true), openDelay);
    const t2 = setTimeout(() => {
      setClosed(true);
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* ignore */ }
    }, openDelay + 900);
    return () => { clearTimeout(t1); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (closed) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
        {/* 左卷轴 */}
        <div
          className="absolute inset-y-0 left-0 transition-transform"
          style={{
            transform: opened ? 'translateX(-100%)' : 'translateX(0)',
            transitionDuration: '900ms',
            transitionTimingFunction: 'cubic-bezier(0.65, 0, 0.35, 1)',
            width: '50%',
          }}
        >
          <ScrollPanel side="left" />
        </div>
        {/* 右卷轴 */}
        <div
          className="absolute inset-y-0 right-0 transition-transform"
          style={{
            transform: opened ? 'translateX(100%)' : 'translateX(0)',
            transitionDuration: '900ms',
            transitionTimingFunction: 'cubic-bezier(0.65, 0, 0.35, 1)',
            width: '50%',
          }}
        >
          <ScrollPanel side="right" />
        </div>
        {/* 标题文字 */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            opacity: opened ? 0 : 1,
            transition: 'opacity 500ms ease-out 300ms',
          }}
        >
          <h1 className="font-serif text-4xl font-bold text-amber-100 sm:text-6xl">
            谱
          </h1>
        </div>
      </div>
      {children}
    </div>
  );
}

function ScrollPanel({ side }: { side: 'left' | 'right' }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-amber-100 via-amber-50 to-amber-100 dark:from-amber-950 dark:via-amber-900 dark:to-amber-950">
      {/* 卷轴主体纹理 */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 6px, rgba(180, 140, 80, 0.15) 6px, rgba(180, 140, 80, 0.15) 7px)',
        }}
      />
      {/* 卷轴顶/底轴 */}
      <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-amber-700 to-amber-600 dark:from-amber-800 dark:to-amber-700 shadow-md" />
      <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-amber-700 to-amber-600 dark:from-amber-800 dark:to-amber-700 shadow-md" />
      {/* 卷轴侧纹理（内） */}
      <div
        className={`absolute inset-y-0 ${side === 'left' ? 'right-0' : 'left-0'} w-2 bg-amber-800/40`}
      />
      {/* 印章（左侧） */}
      {side === 'left' && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2 rotate-[-8deg]">
          <div className="flex h-16 w-16 items-center justify-center rounded border-2 border-rose-700 bg-rose-100/40 font-serif text-2xl text-rose-700 opacity-70">
            谱
          </div>
        </div>
      )}
    </div>
  );
}
