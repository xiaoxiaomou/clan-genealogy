// MemorialRemindersSection.tsx
// 列出本家族未来祭日 + 管理员手动触发 + 日历视图
import { useState, useEffect, useMemo } from 'react';
import { Calendar, Bell, AlertCircle, Send, RefreshCw } from 'lucide-react';
import { api, type MemorialReminder } from '../../lib/api';

interface Props {
  familyId: number;
  isAdmin?: boolean;
}

export function MemorialRemindersSection({ familyId, isAdmin = false }: Props) {
  const [days, setDays] = useState(180);
  const [items, setItems] = useState<MemorialReminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [trigging, setTrigging] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const r = await api.listMemorialReminders(familyId, days);
      setItems(r.items);
    } catch (e) {
      setMessage('加载失败：' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [familyId, days]);

  const trigger = async () => {
    setTrigging(true);
    setMessage(null);
    try {
      const r = await api.triggerMemorialCheck();
      setMessage(r.message || '已触发');
      await load();
    } catch (e) {
      setMessage('触发失败：' + (e as Error).message);
    } finally {
      setTrigging(false);
    }
  };

  const grouped = useMemo(() => {
    const now = new Date();
    const today = items.filter(i => i.days_until === 0);
    const week = items.filter(i => i.days_until > 0 && i.days_until <= 7);
    const month = items.filter(i => i.days_until > 7 && i.days_until <= 30);
    const ahead = items.filter(i => i.days_until > 30);
    return { today, week, month, ahead };
  }, [items]);

  return (
    <section className="rounded-xl border border-border/40 bg-card/50 p-5 shadow-sm">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-500" aria-hidden="true" />
          <h2 className="text-lg font-semibold">祭日提醒</h2>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
            {items.length} 项
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="h-8 rounded-md border border-border/40 bg-background px-2 text-xs"
            aria-label="时间范围"
          >
            <option value={30}>未来 30 天</option>
            <option value={90}>未来 90 天</option>
            <option value={180}>未来 180 天</option>
            <option value={365}>未来一年</option>
          </select>
          <button
            onClick={load}
            disabled={loading}
            className="flex h-8 items-center gap-1 rounded-md border border-border/40 bg-background px-2.5 text-xs transition-colors hover:bg-foreground/5 active:scale-95 disabled:opacity-50"
            aria-label="刷新"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            刷新
          </button>
          {isAdmin && (
            <button
              onClick={trigger}
              disabled={trigging}
              className="flex h-8 items-center gap-1 rounded-md bg-amber-500 px-2.5 text-xs text-white transition-colors hover:bg-amber-600 active:scale-95 disabled:opacity-50"
              aria-label="手动触发祭日检查"
            >
              <Send className={`h-3.5 w-3.5 ${trigging ? 'animate-pulse' : ''}`} aria-hidden="true" />
              立即检查
            </button>
          )}
        </div>
      </header>

      {message && (
        <div className="mb-3 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">加载中…</div>
      ) : items.length === 0 ? (
        <div className="flex h-32 flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-8 w-8 opacity-30" aria-hidden="true" />
          <p>未来 {days} 天内无祭日</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.today.length > 0 && (
            <Group title="今天" tone="red" items={grouped.today} />
          )}
          {grouped.week.length > 0 && (
            <Group title="未来 7 天" tone="amber" items={grouped.week} />
          )}
          {grouped.month.length > 0 && (
            <Group title="未来 30 天" tone="blue" items={grouped.month} />
          )}
          {grouped.ahead.length > 0 && (
            <Group title="更远" tone="muted" items={grouped.ahead} />
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        每天 08:00 自动检查祭日（30/7/0 天前），提醒会推送到「通知中心」。
      </p>
    </section>
  );
}

function Group({ title, tone, items }: { title: string; tone: 'red' | 'amber' | 'blue' | 'muted'; items: MemorialReminder[] }) {
  const toneClass = {
    red: 'border-red-500/40 bg-red-500/5 text-red-700 dark:text-red-300',
    amber: 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300',
    blue: 'border-blue-500/40 bg-blue-500/5 text-blue-700 dark:text-blue-300',
    muted: 'border-border/40 bg-foreground/3 text-muted-foreground',
  }[tone];

  return (
    <div className="rounded-lg border border-border/40 p-3">
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</h3>
      <ul className="space-y-1.5">
        {items.map((i) => (
          <li
            key={i.member_id}
            className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm ${toneClass}`}
          >
            <div className="flex-1">
              <div className="font-medium">{i.member_name}</div>
              <div className="text-xs opacity-80">
                {i.death_date} · 第 {i.generation} 代 · {i.next_anniversary}
              </div>
            </div>
            <span className="rounded-full bg-background/60 px-2 py-0.5 text-xs font-medium tabular-nums">
              {i.days_until === 0 ? '今天' : `${i.days_until} 天`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
