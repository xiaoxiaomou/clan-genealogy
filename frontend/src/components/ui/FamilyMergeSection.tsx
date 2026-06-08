// FamilyMergeSection.tsx
// 合并其他家族到本家族 - 预览冲突 + 执行
import { useState, useEffect } from 'react';
import { ArrowRight, GitMerge, AlertTriangle, CheckCircle2, RefreshCw, X, Users } from 'lucide-react';
import { api, Family } from '../../lib/api';

interface MergePreview {
  target: { id: number; name: string; surname: string };
  source: { id: number; name: string; surname: string; merged_into_id: number | null };
  counts: {
    source_members: number;
    target_members: number;
    duplicates: number;
    source_relationships: number;
    source_events: number;
    source_albums: number;
    source_photos: number;
    source_posts: number;
    source_chat_groups: number;
    source_share_links: number;
    shared_users: number;
    source_only_users: number;
  };
  member_duplicates: Array<{
    source_member_id: number;
    target_member_id: number;
    name: string;
    generation: number;
    differences: Array<{ field: string; target: string; source: string }>;
    recommend: string;
  }>;
  user_role_conflicts: Array<{
    user_id: number;
    source_role: string;
    target_role: string;
    recommend: string;
  }>;
  recommend_strategy: string;
}

interface MergeResult {
  migrated_members: number;
  skipped_members: number;
  migrated_relationships: number;
  migrated_events: number;
  migrated_albums: number;
  migrated_photos: number;
  migrated_posts: number;
  merged_user_access: number;
  migrated_share_links: number;
}

interface Props {
  familyId: number;
}

export function FamilyMergeSection({ familyId }: Props) {
  const [families, setFamilies] = useState<Family[]>([]);
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [fieldStrategy, setFieldStrategy] = useState<'keep_target' | 'keep_source'>('keep_target');
  const [memberStrategy, setMemberStrategy] = useState<'migrate_all' | 'skip_duplicate'>('migrate_all');
  const [deleteSource, setDeleteSource] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    api.getFamilies()
      .then((r: any) => {
        const list = Array.isArray(r) ? r : (r?.families || r?.items || []);
        setFamilies((list as Family[]).filter((f: Family) => f.id !== familyId));
      })
      .catch(() => setFamilies([]));
  }, [familyId]);

  const loadPreview = async () => {
    if (!sourceId) return;
    setLoading(true);
    setMessage(null);
    setPreview(null);
    try {
      const r = await api.previewFamilyMerge(familyId, sourceId);
      setPreview(r);
    } catch (e) {
      setMessage({ type: 'err', text: '预览失败：' + (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const execute = async () => {
    if (!sourceId || !preview) return;
    if (confirmText !== '合并') {
      setMessage({ type: 'err', text: '请输入确认文字「合并」' });
      return;
    }
    setExecuting(true);
    setMessage(null);
    try {
      const r = await api.executeFamilyMerge(familyId, sourceId, {
        field_strategy: fieldStrategy,
        member_strategy: memberStrategy,
        delete_source: deleteSource,
      });
      const res = r.result as MergeResult;
      setMessage({
        type: 'ok',
        text: `合并完成：迁移 ${res.migrated_members} 成员 / ${res.migrated_events} 事件 / ${res.migrated_posts} 动态 / 跳过 ${res.skipped_members} 重复。`,
      });
      setPreview(null);
      setSourceId(null);
      setConfirmText('');
    } catch (e) {
      setMessage({ type: 'err', text: '合并失败：' + (e as Error).message });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <section className="rounded-xl border border-border/40 bg-card/50 p-5 shadow-sm">
      <header className="mb-4 flex items-center gap-2">
        <GitMerge className="h-5 w-5 text-rose-500" aria-hidden="true" />
        <h2 className="text-lg font-semibold">家族合并</h2>
        <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs text-rose-700 dark:text-rose-300">
          高危操作
        </span>
      </header>

      <p className="mb-4 text-sm text-muted-foreground">
        将其他家族的全部成员、关系、事件、相册、动态、用户访问权合并到本家族。合并后源家族将被标记为「已合并」。
      </p>

      {message && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
            message.type === 'ok'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
          }`}
        >
          {message.type === 'ok' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="merge-source">
            选择要合并的源家族
          </label>
          <select
            id="merge-source"
            value={sourceId || ''}
            onChange={(e) => setSourceId(e.target.value ? Number(e.target.value) : null)}
            className="h-9 w-full rounded-md border border-border/40 bg-background px-2 text-sm"
            disabled={executing}
          >
            <option value="">— 请选择 —</option>
            {families.map((f) => (
              <option key={f.id} value={f.id} disabled={!!f.merged_into_id}>
                #{f.id} {f.name} {f.merged_into_id ? `(已合并到 #${f.merged_into_id})` : ''}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={loadPreview}
          disabled={!sourceId || loading}
          className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm text-primary-foreground transition-colors hover:bg-primary/90 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          预览冲突
        </button>
      </div>

      {preview && (
        <div className="space-y-4">
          {/* 计数卡片 */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatBox label="源成员" value={preview.counts.source_members} tone="blue" />
            <StatBox label="目标成员" value={preview.counts.target_members} tone="blue" />
            <StatBox label="重复成员" value={preview.counts.duplicates} tone={preview.counts.duplicates > 0 ? 'amber' : 'muted'} />
            <StatBox label="共享用户" value={preview.counts.shared_users} tone="muted" />
            <StatBox label="源关系" value={preview.counts.source_relationships} />
            <StatBox label="源事件" value={preview.counts.source_events} />
            <StatBox label="源相册" value={preview.counts.source_albums} />
            <StatBox label="源动态" value={preview.counts.source_posts} />
          </div>

          {/* 重复成员 */}
          {preview.member_duplicates.length > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
              <h3 className="mb-2 flex items-center gap-1 text-sm font-medium text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                发现 {preview.member_duplicates.length} 位重复成员
              </h3>
              <ul className="space-y-1 text-xs">
                {preview.member_duplicates.slice(0, 5).map((d) => (
                  <li key={d.source_member_id} className="rounded bg-background/60 px-2 py-1">
                    <strong>{d.name}</strong> (第 {d.generation} 代)：
                    {d.differences.length === 0 ? ' 字段一致' : ` ${d.differences.length} 字段差异`}
                  </li>
                ))}
                {preview.member_duplicates.length > 5 && (
                  <li className="text-muted-foreground">…等 {preview.member_duplicates.length - 5} 人</li>
                )}
              </ul>
            </div>
          )}

          {/* 策略选择 */}
          <div className="rounded-lg border border-border/40 bg-background/40 p-3">
            <h3 className="mb-2 text-sm font-medium">合并策略</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">重复成员字段</label>
                <select
                  value={fieldStrategy}
                  onChange={(e) => setFieldStrategy(e.target.value as any)}
                  className="mt-1 h-8 w-full rounded-md border border-border/40 bg-background px-2 text-sm"
                  disabled={executing}
                >
                  <option value="keep_target">保留目标字段</option>
                  <option value="keep_source">保留源字段（补全空值）</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">重复成员处理</label>
                <select
                  value={memberStrategy}
                  onChange={(e) => setMemberStrategy(e.target.value as any)}
                  className="mt-1 h-8 w-full rounded-md border border-border/40 bg-background px-2 text-sm"
                  disabled={executing}
                >
                  <option value="migrate_all">全部迁移（允许重名）</option>
                  <option value="skip_duplicate">跳过重复（按上面字段策略）</option>
                </select>
              </div>
              <label className="col-span-full flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={deleteSource}
                  onChange={(e) => setDeleteSource(e.target.checked)}
                  disabled={executing}
                  className="h-3.5 w-3.5 rounded border-border/60"
                />
                合并后<b>硬删除</b>源家族（不可恢复！默认仅归档）
              </label>
            </div>
          </div>

          {/* 确认 */}
          <div className="rounded-lg border border-rose-500/40 bg-rose-500/5 p-3">
            <h3 className="mb-2 text-sm font-medium text-rose-700 dark:text-rose-300">
              <AlertTriangle className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              二次确认
            </h3>
            <p className="mb-2 text-xs text-muted-foreground">
              合并不可逆！请输入「合并」二字以确认。
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="合并"
                className="h-8 w-32 rounded-md border border-border/40 bg-background px-2 text-sm"
                disabled={executing}
                aria-label="二次确认"
              />
              <button
                onClick={execute}
                disabled={executing || confirmText !== '合并'}
                className="flex h-8 items-center gap-1.5 rounded-md bg-rose-500 px-3 text-sm text-white transition-colors hover:bg-rose-600 active:scale-95 disabled:opacity-50"
              >
                <ArrowRight className={`h-3.5 w-3.5 ${executing ? 'animate-pulse' : ''}`} aria-hidden="true" />
                {executing ? '合并中…' : '执行合并'}
              </button>
              <button
                onClick={() => { setPreview(null); setConfirmText(''); }}
                disabled={executing}
                className="flex h-8 items-center gap-1 rounded-md border border-border/40 px-2.5 text-sm hover:bg-foreground/5"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" /> 取消
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        <Users className="mr-1 inline h-3 w-3" />
        仅家族 admin 可执行合并；合并后源家族记录会被保留在审计日志中。
      </p>
    </section>
  );
}

function StatBox({ label, value, tone = 'muted' }: { label: string; value: number; tone?: 'muted' | 'blue' | 'amber' }) {
  const cls = {
    muted: 'border-border/40 bg-background/40 text-foreground',
    blue: 'border-blue-500/40 bg-blue-500/5 text-blue-700 dark:text-blue-300',
    amber: 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300',
  }[tone];
  return (
    <div className={`rounded-md border px-3 py-2 ${cls}`}>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
  );
}
