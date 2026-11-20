import { cn } from '@/lib/utils'

export interface ToggleSwitchProps {
  /** 是否开启 */
  checked: boolean
  /** 状态变化回调；禁用或点击期间不触发 */
  onChange: (next: boolean) => void
  /** 无障碍标签，例如「显示导出按钮，当前已开启」 */
  ariaLabel?: string
  /** 禁用态 */
  disabled?: boolean
  /** 正在提交（显示旋转指示并锁定交互） */
  busy?: boolean
  /** 是否显示「是 / 否」状态文案 */
  showLabel?: boolean
  /** 尺寸：sm 用于紧凑面板，md 用于配置列表 */
  size?: 'sm' | 'md'
  className?: string
}

/**
 * 谱牒风格开关控件
 * - 胶囊轨道 + 圆形滑块，开启态走 success 令牌并带细腻投影/渐变
 * - 完整无障碍：role=switch / aria-checked / aria-label / 键盘可操作 / 焦点环
 * - 交互健壮：busy/disabled 锁定、reduced-motion 降级
 */
export function ToggleSwitch({
  checked,
  onChange,
  ariaLabel,
  disabled = false,
  busy = false,
  showLabel = true,
  size = 'md',
  className,
}: ToggleSwitchProps) {
  const locked = disabled || busy
  const sm = size === 'sm'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-busy={busy || undefined}
      disabled={locked}
      onClick={() => !locked && onChange(!checked)}
      className={cn(
        'group inline-flex items-center gap-2.5 rounded-full outline-none select-none',
        'transition-opacity focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        locked ? 'cursor-not-allowed opacity-55' : 'cursor-pointer',
        className
      )}
    >
      {/* 轨道 */}
      <span
        aria-hidden="true"
        className={cn(
          'relative inline-flex shrink-0 items-center rounded-full',
          'transition-[background-color,box-shadow] duration-300 ease-out',
          sm ? 'h-[20px] w-[36px]' : 'h-[24px] w-[44px]',
          checked
            ? 'bg-gradient-to-r from-success/80 to-success shadow-[inset_0_1px_2px_rgba(0,0,0,0.25),0_0_0_1px_hsl(var(--success)/0.35)]'
            : 'bg-muted shadow-[inset_0_1px_3px_rgba(0,0,0,0.18),0_0_0_1px_hsl(var(--border)/0.7)]'
        )}
      >
        {/* 滑块 */}
        <span
          className={cn(
            'pointer-events-none flex items-center justify-center rounded-full bg-white',
            'shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out',
            sm ? 'h-[16px] w-[16px]' : 'h-[20px] w-[20px]',
            checked
              ? sm
                ? 'translate-x-[18px]'
                : 'translate-x-[22px]'
              : 'translate-x-[2px]'
          )}
        >
          {/* 开启态勾选微标 */}
          {checked && !busy && (
            <svg
              viewBox="0 0 12 12"
              className={sm ? 'h-[10px] w-[10px]' : 'h-[12px] w-[12px]'}
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2.5 6.2 4.8 8.5 9.5 3.6" className="text-success" />
            </svg>
          )}
          {/* 提交中指示 */}
          {busy && (
            <span className="h-2 w-2 animate-spin rounded-full border-[1.5px] border-success/30 border-t-success" />
          )}
        </span>
      </span>

      {/* 状态文案 */}
      {showLabel && (
        <span
          aria-hidden="true"
          className={cn(
            'font-serif text-[13px] font-semibold tracking-wide transition-colors duration-200',
            checked ? 'text-success' : 'text-muted-foreground'
          )}
        >
          {checked ? '是' : '否'}
        </span>
      )}
    </button>
  )
}

export default ToggleSwitch
