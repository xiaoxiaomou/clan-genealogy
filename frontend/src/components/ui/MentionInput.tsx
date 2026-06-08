// MentionInput.tsx
// 带 @ 提及补全的输入框
import { useState, useRef, useEffect } from 'react';
import { api } from '../../lib/api';

interface Props {
  familyId: number;
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  as?: 'input' | 'textarea';
  rows?: number;
  disabled?: boolean;
  ariaLabel?: string;
}

interface MentionUser {
  id: number;
  username: string;
  display_name: string;
  avatar: string | null;
}

export function MentionInput({
  familyId,
  value,
  onChange,
  onKeyDown,
  placeholder = '说点什么…',
  className = '',
  as = 'input',
  rows = 1,
  disabled = false,
  ariaLabel,
}: Props) {
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const ref = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (mentionQuery === null) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const r = await api.searchMentionable(familyId, mentionQuery);
        setSuggestions(r.items || []);
        setActiveIndex(0);
      } catch {
        setSuggestions([]);
      }
    }, 120);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [mentionQuery, familyId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value;
    onChange(v);
    // 检测 @ 触发
    const cursor = e.target.selectionStart || 0;
    const before = v.slice(0, cursor);
    const at = before.lastIndexOf('@');
    if (at >= 0 && /^[^\s@]*$/.test(before.slice(at + 1))) {
      const q = before.slice(at + 1);
      // 限制 @ 后面内容长度
      if (q.length <= 30) {
        setMentionQuery(q);
        return;
      }
    }
    setMentionQuery(null);
  };

  const insertMention = (u: MentionUser) => {
    const el = ref.current;
    if (!el) return;
    const cursor = el.selectionStart || value.length;
    const before = value.slice(0, cursor);
    const after = value.slice(cursor);
    const at = before.lastIndexOf('@');
    if (at < 0) return;
    const mentionText = `@${u.display_name} `;
    const newValue = before.slice(0, at) + mentionText + after;
    onChange(newValue);
    setMentionQuery(null);
    // 恢复光标
    requestAnimationFrame(() => {
      const newCursor = at + mentionText.length;
      el.focus();
      try {
        el.setSelectionRange(newCursor, newCursor);
      } catch {}
    });
  };

  const handleKeyDownInner = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(suggestions[activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }
    onKeyDown?.(e);
  };

  const commonProps = {
    ref: ref as any,
    value,
    onChange: handleChange,
    onKeyDown: handleKeyDownInner,
    placeholder,
    disabled,
    'aria-label': ariaLabel,
    className: `flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring ${className}`,
  };

  return (
    <div className="relative flex-1">
      {as === 'textarea' ? (
        <textarea {...commonProps} rows={rows} />
      ) : (
        <input {...commonProps} />
      )}

      {suggestions.length > 0 && (
        <ul
          role="listbox"
          aria-label="@ 提及建议"
          className="absolute bottom-full left-0 z-30 mb-1 max-h-48 w-64 overflow-y-auto rounded-md border border-border bg-card shadow-lg"
        >
          {suggestions.map((u, i) => (
            <li
              key={u.id}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer ${
                i === activeIndex ? 'bg-foreground/10' : ''
              }`}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
                {(u.display_name || u.username).charAt(0)}
              </div>
              <div className="flex-1 truncate">
                <div className="truncate font-medium">{u.display_name}</div>
                <div className="truncate text-[10px] text-muted-foreground">@{u.username}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
