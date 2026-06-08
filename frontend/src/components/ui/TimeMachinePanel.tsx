// TimeMachinePanel.tsx
// 时光机模式 - 时间滑块：拖动到任意历史时间点，
// 树会根据 birth_date / death_date 隐藏未出生或已故的成员
import { useState, useEffect, useMemo } from 'react';
import { Clock, Play, Pause, SkipBack, SkipForward } from 'lucide-react';

interface MemberLite {
  id: number;
  name: string;
  birth_date?: string | null;
  death_date?: string | null;
  is_alive?: boolean;
}

interface Props {
  members: MemberLite[];
  open: boolean;
  onClose: () => void;
  /** 处于某时间点时该成员是否「在场」 */
  isMemberAliveAt: (m: MemberLite, year: number) => boolean;
}

function parseYear(s?: string | null): number | null {
  if (!s) return null;
  const m = s.toString().match(/(-?\d{1,4})/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  return y > 0 ? y : null;
}

export function TimeMachinePanel({ members, open, onClose, isMemberAliveAt }: Props) {
  const range = useMemo(() => {
    const years: number[] = [];
    for (const m of members) {
      const by = parseYear(m.birth_date);
      const dy = parseYear(m.death_date);
      if (by) years.push(by);
      if (dy) years.push(dy);
    }
    if (years.length === 0) {
      const thisYear = new Date().getFullYear();
      return { min: thisYear - 100, max: thisYear };
    }
    const min = Math.min(...years, new Date().getFullYear() - 100);
    const max = Math.max(...years, new Date().getFullYear());
    return { min, max };
  }, [members]);

  const [year, setYear] = useState<number>(range.max);
  const [playing, setPlaying] = useState(false);

  useEffect(() => { setYear(range.max); }, [range.min, range.max]);

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setYear((y) => {
        if (y >= range.max) {
          setPlaying(false);
          return range.max;
        }
        return y + 1;
      });
    }, 200);
    return () => clearInterval(t);
  }, [playing, range.max]);

  const visibleCount = useMemo(
    () => members.filter((m) => isMemberAliveAt(m, year)).length,
    [members, year, isMemberAliveAt],
  );

  if (!open) return null;

  return (
    <div className="fixed bottom-20 left-1/2 z-40 w-[min(90vw,640px)] -translate-x-1/2 rounded-xl border border-border/40 bg-card/95 p-4 shadow-2xl backdrop-blur">
      <div className="mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-amber-600" aria-hidden="true" />
        <h3 className="text-sm font-semibold">时光机模式</h3>
        <span className="ml-auto rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
          {year} 年 · 在世 {visibleCount}/{members.length}
        </span>
        <button
          onClick={onClose}
          className="ml-1 rounded p-1 text-muted-foreground hover:bg-foreground/5"
          aria-label="关闭时光机"
        >
          ×
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setYear(range.min)}
          className="rounded p-1.5 text-muted-foreground hover:bg-foreground/5"
          aria-label="最早"
        >
          <SkipBack className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
        <button
          onClick={() => setPlaying((p) => !p)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white transition-colors hover:bg-amber-600"
          aria-label={playing ? '暂停' : '播放'}
        >
          {playing ? <Pause className="h-3.5 w-3.5" aria-hidden="true" /> : <Play className="h-3.5 w-3.5 translate-x-[1px]" aria-hidden="true" />}
        </button>
        <button
          onClick={() => setYear(range.max)}
          className="rounded p-1.5 text-muted-foreground hover:bg-foreground/5"
          aria-label="最晚"
        >
          <SkipForward className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        <input
          type="range"
          min={range.min}
          max={range.max}
          step={1}
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="flex-1 accent-amber-500"
          aria-label="时间滑块"
        />
        <input
          type="number"
          value={year}
          min={range.min}
          max={range.max}
          onChange={(e) => {
            const v = parseInt(e.target.value);
            if (!isNaN(v) && v >= range.min && v <= range.max) setYear(v);
          }}
          className="h-8 w-16 rounded-md border border-border/40 bg-background px-2 text-center text-sm tabular-nums"
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        拖动时间滑块查看不同年份的家族成员分布（仅显示当年已出生且未去世的成员）。
      </p>
    </div>
  );
}
