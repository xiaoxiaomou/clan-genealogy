// MemberEditHistoryPanel.tsx
// 显示某成员的编辑历史（按 batch 分组）+ 一键回滚
import { useState, useEffect } from 'react';
import { History, RotateCcw, ChevronDown, ChevronRight, Trash2, User } from 'lucide-react';
import { api } from '../../lib/api';

interface HistoryChange {
  field: string;
  old: string | null;
  new: string | null;
}

interface HistoryGroup {
  batch_id: string;
  editor_id: number;
  editor_name: string | null;
  action: 'update' | 'rollback';
  created_at: string;
  changes: HistoryChange[];
}

interface Props {
  familyId: number;
  memberId: number;
  canEdit?: boolean;
  isAdmin?: boolean;
}

const FIELD_LABELS: Record<string, string> = {
  name: '姓名',
  gender: '性别',
  generation: '世代',
  birth_date: '出生日期',
  death_date: '去世日期',
  is_alive: '在世',
  birth_place: '出生地',
  death_place: '去世地',
  generation_name: '字辈',
  father_id: '父亲',
  mother_id: '母亲',
  spouse_id: '配偶',
  branch_id: '房支',
  bio: '简介',
  occupation: '职业',
  avatar: '头像',
};

export function MemberEditHistoryPanel({ familyId, memberId, canEdit = false, isAdmin = false }: Props) {
  const [groups, setGroups] = useState<HistoryGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [rolling, setRolling] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const r = await api.listMemberHistory(familyId, memberId);
      setGroups(r.groups);
      // 默认展开最近 3 条
      const top3 = new Set(r.groups.slice(0, 3).map((g: HistoryGroup) => g.batch_id));
      setExpanded(top3);
    } catch (e) {
      setMessage({ type: 'err', text: '加载失败：' + (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [familyId, memberId]);

  const toggle = (batchId: string) => {
    setExpanded((s) => {
      const ns = new Set(s);
      if (ns.has(batchId)) ns.delete(batchId);
      else ns.add(batchId);
      return ns;
    });
  };

  const rollback = async (batchId: string) => {
    if (!confirm('确定要回滚到这次编辑之前的状态吗？')) return;
    setRolling(batchId);
    setMessage(null);
    try {
      const r = await api.rollbackMember(familyId, memberId, batchId);
      setMessage({ type: 'ok', text: r.message });
      await load();
    } catch (e) {
      setMessage({ type: 'err', text: '回滚失败：' + (e as Error).message });
    } finally {
      setRolling(null);
    }
  };

  const del = async (batchId: string) => {
    if (!confirm('确定要删除这条历史记录吗？')) return;
    try {
      await api.deleteMemberHistory(familyId, memberId, batchId);
      await load();
    } catch (e) {
      setMessage({ type: 'err', text: '删除失败：' + (e as Error).message });
    }
  };

  return (
    <section className="rounded-xl border border-border/40 bg-card/50 p-5 shadow-sm">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-indigo-500" aria-hidden="true" />
          <h2 className="text-lg font-semibold">编辑历史</h2>
          <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-700 dark:text-indigo-300">
            {groups.length}
          </span>
        </div>
      </header>

      {message && (
        <div
          className={`mb-3 flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
            message.type === 'ok'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
          }`}
        >
          <span>{message.text}</span>
        </div>
      )}

      {loading && groups.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">加载中…</div>
      ) : groups.length === 0 ? (
        <div className="flex h-24 flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
          <History className="h-6 w-6 opacity-30" aria-hidden="true" />
          <p>暂无编辑记录</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {groups.map((g) => {
            const isOpen = expanded.has(g.batch_id);
            const dt = new Date(g.created_at);
            const dtLabel = dt.toLocaleString('zh-CN', { hour12: false });
            return (
              <li
                key={g.batch_id}
                className="rounded-lg border border-border/40 bg-background/40 transition-colors hover:bg-foreground/3"
              >
                <button
                  onClick={() => toggle(g.batch_id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left"
                  aria-expanded={isOpen}
                >
                  {isOpen ? (
                    <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                  )}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${g.action === 'rollback' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-blue-500/20 text-blue-700 dark:text-blue-300'}`}>
                    {g.action === 'rollback' ? '回滚' : '编辑'}
                  </span>
                  <span className="flex-1 truncate text-sm">
                    {g.changes.length} 处变更 · {dtLabel}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" aria-hidden="true" />
                    {g.editor_name || `#${g.editor_id}`}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-border/40 px-3 py-2">
                    <ul className="space-y-1 text-xs">
                      {g.changes.map((c) => (
                        <li key={c.field} className="rounded bg-background/60 px-2 py-1.5">
                          <div className="mb-0.5 font-medium text-foreground">
                            {FIELD_LABELS[c.field] || c.field}
                          </div>
                          <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                            <span className="line-through text-rose-600/80 dark:text-rose-400/80">
                              {c.old || <em className="text-muted-foreground">（空）</em>}
                            </span>
                            <span className="hidden text-muted-foreground sm:inline">→</span>
                            <span className="text-emerald-600/90 dark:text-emerald-400/90">
                              {c.new || <em className="text-muted-foreground">（空）</em>}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex items-center gap-1 border-t border-border/40 pt-2">
                      {canEdit && (
                        <button
                          onClick={() => rollback(g.batch_id)}
                          disabled={rolling === g.batch_id}
                          className="flex h-7 items-center gap-1 rounded-md bg-amber-500/10 px-2 text-xs text-amber-700 transition-colors hover:bg-amber-500/20 disabled:opacity-50 dark:text-amber-300"
                          aria-label="回滚到此版本之前"
                        >
                          <RotateCcw className={`h-3 w-3 ${rolling === g.batch_id ? 'animate-spin' : ''}`} aria-hidden="true" />
                          回滚
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => del(g.batch_id)}
                          className="ml-auto flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600"
                          aria-label="删除此历史记录"
                        >
                          <Trash2 className="h-3 w-3" aria-hidden="true" />
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        每次编辑会自动记录。可回滚到任一历史版本（编辑器权限）；管理员可清理历史。
      </p>
    </section>
  );
}
