// OcrPipelinePanel.tsx
// OCR 流水线 - 多文件批量识别 + 进度追踪 + 预览 + 一键导入
import { useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Trash2, X, Eye, EyeOff } from 'lucide-react';
import { api, getToken } from '../../lib/api';

interface RecognizedMember {
  name: string;
  gender?: string;
  birth_date?: string;
  death_date?: string;
  generation?: number;
  generation_name?: string;
  is_alive?: boolean;
  bio?: string;
  birth_place?: string;
  death_place?: string;
  occupation?: string;
  selected: boolean;
}

type Stage = 'pending' | 'uploading' | 'recognizing' | 'done' | 'error';

interface QueueItem {
  id: string;
  file: File;
  stage: Stage;
  progress: number;
  members: RecognizedMember[];
  error: string | null;
  recognizedAt: string | null;
}

interface Props {
  familyId: number;
  onImported?: (count: number) => void;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).split(',')[1] || '');
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function OcrPipelinePanel({ familyId, onImported }: Props) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const onSelectFiles = (files: FileList | null) => {
    if (!files) return;
    const items: QueueItem[] = Array.from(files).map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      stage: 'pending',
      progress: 0,
      members: [],
      error: null,
      recognizedAt: null,
    }));
    setQueue((q) => [...q, ...items]);
  };

  const recognizeOne = async (item: QueueItem) => {
    setQueue((q) => q.map((x) => x.id === item.id ? { ...x, stage: 'uploading', progress: 10 } : x));
    try {
      const base64 = await fileToBase64(item.file);
      setQueue((q) => q.map((x) => x.id === item.id ? { ...x, progress: 40, stage: 'recognizing' } : x));
      const r = await fetch(`/api/family/${familyId}/ocr/recognize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken() || ''}`,
        },
        body: JSON.stringify({
          image_base64: base64,
          filename: item.file.name,
          mime_type: item.file.type,
        }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `识别失败: ${r.status}`);
      }
      const data = await r.json();
      const members: RecognizedMember[] = (data.members || []).map((m: any) => ({
        ...m,
        selected: true,
      }));
      setQueue((q) => q.map((x) =>
        x.id === item.id
          ? { ...x, stage: 'done', progress: 100, members, recognizedAt: new Date().toISOString() }
          : x
      ));
    } catch (e) {
      setQueue((q) => q.map((x) =>
        x.id === item.id
          ? { ...x, stage: 'error', error: (e as Error).message }
          : x
      ));
    }
  };

  const recognizeAll = async () => {
    const pending = queue.filter((x) => x.stage === 'pending');
    for (const item of pending) {
      await recognizeOne(item);
    }
  };

  const remove = (id: string) => {
    setQueue((q) => q.filter((x) => x.id !== id));
  };

  const toggleSelect = (itemId: string, idx: number) => {
    setQueue((q) => q.map((x) => {
      if (x.id !== itemId) return x;
      const ms = [...x.members];
      ms[idx] = { ...ms[idx], selected: !ms[idx].selected };
      return { ...x, members: ms };
    }));
  };

  const selectAllInItem = (itemId: string, selected: boolean) => {
    setQueue((q) => q.map((x) => {
      if (x.id !== itemId) return x;
      return { ...x, members: x.members.map((m) => ({ ...m, selected })) };
    }));
  };

  const importAll = async () => {
    setImporting(true);
    let totalImported = 0;
    try {
      for (const item of queue) {
        const selected = item.members.filter((m) => m.selected);
        if (selected.length === 0) continue;
        try {
          const r = await api.importOcrResult(familyId, { members: selected });
          totalImported += r.imported_count || selected.length;
        } catch (e) {
          // 标记当前 item 出错
          setQueue((q) => q.map((x) =>
            x.id === item.id ? { ...x, stage: 'error', error: '导入失败：' + (e as Error).message } : x
          ));
        }
      }
      if (totalImported > 0) {
        onImported?.(totalImported);
        // 导入成功后移除已完成项
        setQueue((q) => q.filter((x) => x.stage === 'error'));
      }
    } finally {
      setImporting(false);
    }
  };

  const totalMembers = queue.reduce((s, x) => s + x.members.filter((m) => m.selected).length, 0);

  return (
    <section className="rounded-xl border border-border/40 bg-card/50 p-5 shadow-sm">
      <header className="mb-4 flex flex-wrap items-center gap-2">
        <FileText className="h-5 w-5 text-purple-500" aria-hidden="true" />
        <h2 className="text-lg font-semibold">OCR 流水线</h2>
        <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-xs text-purple-700 dark:text-purple-300">
          批量识别
        </span>
        {queue.length > 0 && (
          <span className="ml-auto rounded-full bg-foreground/5 px-2 py-0.5 text-xs">
            {queue.length} 个文件 · {totalMembers} 个待导入成员
          </span>
        )}
      </header>

      <p className="mb-3 text-sm text-muted-foreground">
        上传多张家谱图片或 PDF，依次 AI 识别后预览并批量导入。识别服务需配置 LLM_API_KEY，未配置时返回示例数据。
      </p>

      {/* 上传区 */}
      <label className="mb-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 bg-background/30 px-4 py-6 transition-colors hover:border-primary/50 hover:bg-primary/5">
        <Upload className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-medium">点击或拖拽上传图片</span>
        <span className="text-xs text-muted-foreground">支持 JPG / PNG / WebP / PDF（单文件 ≤ 10MB）</span>
        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={(e) => onSelectFiles(e.target.files)}
          className="hidden"
        />
      </label>

      {/* 队列 */}
      {queue.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              onClick={recognizeAll}
              disabled={queue.every((x) => x.stage !== 'pending')}
              className="flex h-8 items-center gap-1 rounded-md bg-primary px-2.5 text-xs text-primary-foreground transition-colors hover:bg-primary/90 active:scale-95 disabled:opacity-50"
            >
              {queue.some((x) => x.stage === 'recognizing' || x.stage === 'uploading') ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <FileText className="h-3 w-3" aria-hidden="true" />
              )}
              识别全部
            </button>
            <button
              onClick={importAll}
              disabled={importing || totalMembers === 0}
              className="flex h-8 items-center gap-1 rounded-md bg-emerald-500 px-2.5 text-xs text-white transition-colors hover:bg-emerald-600 active:scale-95 disabled:opacity-50"
            >
              {importing ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-3 w-3" aria-hidden="true" />}
              导入选中 ({totalMembers})
            </button>
            <button
              onClick={() => setQueue([])}
              className="ml-auto flex h-8 items-center gap-1 rounded-md border border-border/40 px-2.5 text-xs text-muted-foreground hover:bg-foreground/5"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" /> 清空
            </button>
          </div>

          <ul className="space-y-2">
            {queue.map((item) => {
              const isOpen = !collapsed.has(item.id);
              return (
                <li key={item.id} className="rounded-lg border border-border/40 bg-background/40">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <button
                      onClick={() => {
                        setCollapsed((s) => {
                          const ns = new Set(s);
                          if (ns.has(item.id)) ns.delete(item.id);
                          else ns.add(item.id);
                          return ns;
                        });
                      }}
                      className="rounded p-0.5 text-muted-foreground hover:bg-foreground/5"
                      aria-label={isOpen ? '折叠' : '展开'}
                      aria-expanded={isOpen}
                    >
                      {isOpen ? <Eye className="h-3.5 w-3.5" aria-hidden="true" /> : <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />}
                    </button>
                    <div className="flex-1 truncate text-sm font-medium">
                      {item.file.name}
                    </div>
                    <StageBadge stage={item.stage} progress={item.progress} />
                    <button
                      onClick={() => remove(item.id)}
                      className="rounded p-0.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                      aria-label="移除"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="border-t border-border/40 px-3 py-2 text-xs">
                      {item.stage === 'error' && (
                        <div className="flex items-start gap-1.5 text-rose-600">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                          <span>{item.error}</span>
                        </div>
                      )}

                      {item.members.length === 0 && item.stage !== 'error' && (
                        <span className="text-muted-foreground">尚未识别</span>
                      )}

                      {item.members.length > 0 && (
                        <>
                          <div className="mb-2 flex items-center gap-2">
                            <span className="text-muted-foreground">识别 {item.members.length} 个成员：</span>
                            <button
                              onClick={() => selectAllInItem(item.id, true)}
                              className="text-[10px] text-primary hover:underline"
                            >
                              全选
                            </button>
                            <button
                              onClick={() => selectAllInItem(item.id, false)}
                              className="text-[10px] text-muted-foreground hover:underline"
                            >
                              全不选
                            </button>
                          </div>
                          <ul className="space-y-1">
                            {item.members.map((m, i) => (
                              <li key={i} className="flex items-start gap-2 rounded bg-background/40 px-2 py-1">
                                <input
                                  type="checkbox"
                                  checked={m.selected}
                                  onChange={() => toggleSelect(item.id, i)}
                                  className="mt-0.5 h-3.5 w-3.5 rounded border-border/60"
                                  aria-label={`选择 ${m.name}`}
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{m.name}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {m.generation ? `第${m.generation}代` : '?'} · {m.gender || '?'} · {m.birth_date || '?'} - {m.death_date || (m.is_alive ? '至今' : '?')}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

function StageBadge({ stage, progress }: { stage: Stage; progress: number }) {
  if (stage === 'pending') return <span className="rounded bg-foreground/5 px-2 py-0.5 text-[10px]">待识别</span>;
  if (stage === 'uploading' || stage === 'recognizing') {
    return (
      <span className="flex items-center gap-1 rounded bg-blue-500/15 px-2 py-0.5 text-[10px] text-blue-700 dark:text-blue-300">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        {progress}%
      </span>
    );
  }
  if (stage === 'done') return <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">完成</span>;
  if (stage === 'error') return <span className="rounded bg-rose-500/15 px-2 py-0.5 text-[10px] text-rose-700 dark:text-rose-300">错误</span>;
  return null;
}
