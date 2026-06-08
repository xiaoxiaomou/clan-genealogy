// AIAssistantPanel.tsx
// 浮动 AI 助手聊天面板
// 后端 LLM 不可用时自动降级到规则引擎
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, Send, Loader2, Bot, User, Minimize2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAppSelector } from '@/store';
import { useLocale } from '@/i18n';

interface Msg {
  role: 'user' | 'ai';
  text: string;
  mode?: string;
  ts: number;
}

const SUGGESTIONS = [
  '家族有多少人？',
  '本族起源地在哪里？',
  '本族家训是什么？',
  '在世成员多少？',
  '帮我查询 张德厚',
  '男性/女性各多少？',
];

export default function AIAssistantPanel() {
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentFamilyId = useAppSelector((s: any) => s.app.currentFamilyId);
  const { t } = useLocale();

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs, open]);

  const send = async (q: string) => {
    if (!q.trim() || busy) return;
    if (!currentFamilyId) {
      const warn: Msg = {
        role: 'ai',
        text: '请先选择一个家族后再提问。',
        ts: Date.now(),
      };
      setMsgs((m) => [...m, { role: 'user', text: q, ts: Date.now() }, warn]);
      setInput('');
      return;
    }
    const userMsg: Msg = { role: 'user', text: q, ts: Date.now() };
    setMsgs((m) => [...m, userMsg]);
    setInput('');
    setBusy(true);
    try {
      const res = await api.askAI(currentFamilyId, q);
      setMsgs((m) => [
        ...m,
        { role: 'ai', text: res.answer, mode: res.mode, ts: Date.now() },
      ]);
    } catch (e: any) {
      setMsgs((m) => [
        ...m,
        { role: 'ai', text: e?.message || '出错了', mode: 'error', ts: Date.now() },
      ]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-2xl transition-transform hover:scale-110 active:scale-95"
        aria-label="打开 AI 助手"
        title="AI 助手"
      >
        <Sparkles className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75"></span>
          <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-200"></span>
        </span>
      </button>
    );
  }

  if (min) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2 text-white shadow-2xl">
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-medium">AI 助手</span>
        <button onClick={() => setMin(false)} className="ml-2 rounded-full p-1 hover:bg-amber-700" aria-label="展开">
          <Minimize2 className="h-3 w-3 rotate-180" />
        </button>
        <button onClick={() => setOpen(false)} className="rounded-full p-1 hover:bg-amber-700" aria-label="关闭">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[600px] w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-amber-500/30 bg-white shadow-2xl dark:bg-stone-900">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <div>
            <div className="font-semibold text-sm">家族 AI 助手</div>
            <div className="text-xs text-amber-100">
              {currentFamilyId ? `当前族：${t('common.viewing')}` : '请先选择家族'}
            </div>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setMin(true)} className="rounded-full p-1.5 hover:bg-amber-700" aria-label="最小化" title="最小化">
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-amber-700" aria-label="关闭" title="关闭">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-stone-50 p-3 dark:bg-stone-950">
        {msgs.length === 0 && (
          <div className="space-y-2 py-4 text-center">
            <Sparkles className="mx-auto h-10 w-10 text-amber-400" />
            <p className="text-sm text-stone-600 dark:text-stone-400">
              你好！我是家族 AI 助手。
            </p>
            <p className="text-xs text-stone-500">试试问我：</p>
            <div className="mt-3 flex flex-col gap-1.5 px-4">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs text-amber-700 transition-colors hover:bg-amber-50 dark:border-amber-800 dark:bg-stone-900 dark:text-amber-300 dark:hover:bg-stone-800"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex max-w-[80%] gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  m.role === 'user'
                    ? 'bg-amber-500 text-white'
                    : 'bg-stone-200 text-amber-700 dark:bg-stone-800 dark:text-amber-300'
                }`}
              >
                {m.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div>
                <div
                  className={`rounded-2xl px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'bg-amber-500 text-white'
                      : 'bg-white text-stone-900 shadow-sm dark:bg-stone-800 dark:text-stone-100'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.text}</div>
                </div>
                {m.mode && (
                  <div className="mt-0.5 px-1 text-[10px] text-stone-400">
                    {m.mode === 'offline' && '本地规则'}
                    {m.mode === 'online' && 'AI 大模型'}
                    {m.mode === 'error' && '出错了'}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm shadow-sm dark:bg-stone-800">
              <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
              <span className="text-stone-500">正在思考...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="问点关于家族的事..."
            disabled={busy}
            className="flex-1 rounded-full border border-stone-300 bg-stone-50 px-4 py-2 text-sm focus:border-amber-500 focus:outline-none dark:border-stone-700 dark:bg-stone-800"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-white transition-colors hover:bg-amber-600 disabled:bg-stone-300"
            aria-label="发送"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        <div className="mt-1 text-center text-[10px] text-stone-400">
          AI 回答仅供参考 · 详细请查看家族数据
        </div>
      </div>
    </div>
  );
}
