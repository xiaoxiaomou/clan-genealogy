// MigrationPaths.tsx
// 展示家族成员出生地 → 逝世地的迁徙路径列表 + 流动 SVG 动画
import { ArrowRight, MapPin, Sparkles } from 'lucide-react';

interface Path {
  member: string;
  gender?: 'male' | 'female' | null;
  from: string;
  to: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
}

interface Props {
  paths: Path[];
}

export function MigrationPaths({ paths }: Props) {
  if (paths.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-1 rounded-xl border border-border/40 bg-card/50 text-sm text-muted-foreground">
        <Sparkles className="h-6 w-6 opacity-30" aria-hidden="true" />
        <p>暂无迁徙路径</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {paths.map((p, i) => (
        <li
          key={i}
          className="group rounded-xl border border-border/40 bg-card/50 p-3 transition-colors hover:bg-card/80"
        >
          <div className="mb-2 flex items-center gap-2 text-sm">
            <span className={`font-medium ${p.gender === 'female' ? 'text-pink-500' : 'text-blue-500'}`}>
              {p.member}
            </span>
            <span className="text-xs text-muted-foreground">迁徙轨迹</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <div className="flex min-w-0 flex-1 items-center gap-1">
              <MapPin className="h-3 w-3 flex-shrink-0 text-blue-500" aria-hidden="true" />
              <span className="truncate">{p.from || '未标注'}</span>
            </div>
            <ArrowRight className="h-3 w-3 flex-shrink-0 text-amber-500" aria-hidden="true" />
            <div className="flex min-w-0 flex-1 items-center gap-1">
              <MapPin className="h-3 w-3 flex-shrink-0 text-gray-500" aria-hidden="true" />
              <span className="truncate">{p.to || '未标注'}</span>
            </div>
          </div>

          {/* 流动路径 SVG */}
          <div className="mt-2 h-6 overflow-hidden rounded bg-gradient-to-r from-blue-500/10 via-amber-500/10 to-gray-500/10">
            <svg viewBox="0 0 100 12" className="h-full w-full" aria-hidden="true">
              <defs>
                <linearGradient id={`grad-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#6b7280" />
                </linearGradient>
              </defs>
              <line
                x1="2" y1="6" x2="98" y2="6"
                stroke={`url(#grad-${i})`}
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="4 3"
                className="migration-line"
                style={{ animation: 'dashflow 1.5s linear infinite' }}
              />
              <circle cx="2" cy="6" r="3" fill="#3b82f6" />
              <circle cx="98" cy="6" r="3" fill="#6b7280" />
            </svg>
          </div>
        </li>
      ))}

      <style>{`
        @keyframes dashflow {
          to { stroke-dashoffset: -14; }
        }
      `}</style>
    </ul>
  );
}
