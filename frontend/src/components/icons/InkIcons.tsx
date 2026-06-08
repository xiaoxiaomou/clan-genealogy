// 墨水笔触 SVG 图标库 - 古风水墨风格
// 风格：飞白、晕染、留白。颜色默认 #2d1f1a，可在外部覆盖
import type { CSSProperties } from 'react'

const DEFAULT_COLOR = 'currentColor'

interface IconProps {
  size?: number
  color?: string
  className?: string
  style?: CSSProperties
  strokeWidth?: number
}

const base = (size: number, color: string, className: string, style: CSSProperties, sw: number) => ({
  width: size, height: size, viewBox: '0 0 64 64', fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg', stroke: color, strokeWidth: sw,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  className, style,
})

/** 毛笔 - 飞白效果 */
export function InkBrush({ size = 24, color = DEFAULT_COLOR, className, style, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size, color, className, style, strokeWidth)}>
      {/* 笔杆 */}
      <path d="M50 8 L24 34" strokeWidth={2} />
      {/* 笔尖飞白 */}
      <path d="M24 34 L18 40 Q14 44 16 48 Q20 50 24 48 L28 44" fill={color} fillOpacity="0.85" stroke="none" />
      {/* 笔杆分节 */}
      <line x1="48" y1="10" x2="44" y2="14" />
      <line x1="44" y1="14" x2="48" y2="18" />
      <line x1="40" y1="18" x2="44" y2="22" />
      {/* 笔锋展开 */}
      <path d="M16 48 Q8 52 6 56 Q4 60 8 60" strokeWidth={2.5} />
      {/* 飞白点 */}
      <circle cx="4" cy="60" r="0.8" fill={color} stroke="none" />
      <circle cx="6" cy="56" r="0.6" fill={color} stroke="none" />
    </svg>
  )
}

/** 印章 - 红色方印 */
export function InkSeal({ size = 24, color = '#8b2500', className, style, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size, color, className, style, strokeWidth)}>
      <rect x="14" y="10" width="36" height="36" stroke={color} strokeWidth={3} fill="none" />
      <rect x="18" y="14" width="28" height="28" stroke={color} strokeWidth={1.5} fill="none" />
      <text x="32" y="36" textAnchor="middle" fontSize="14" fill={color} fontFamily="serif" fontWeight="bold" stroke="none">印</text>
      <text x="32" y="50" textAnchor="middle" fontSize="10" fill={color} fontFamily="serif" stroke="none" opacity="0.6">章</text>
    </svg>
  )
}

/** 山峦 - 远山墨影 */
export function InkMountain({ size = 24, color = DEFAULT_COLOR, className, style, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size, color, className, style, strokeWidth)}>
      <path d="M4 50 L18 28 L26 38 L36 18 L48 32 L60 22" />
      <path d="M4 50 L60 50" />
      {/* 远山晕染 */}
      <path d="M14 50 Q22 38 30 50 Z" fill={color} fillOpacity="0.15" stroke="none" />
      <path d="M36 50 Q44 32 52 50 Z" fill={color} fillOpacity="0.2" stroke="none" />
      {/* 飞白点 */}
      <circle cx="42" cy="14" r="1" fill={color} stroke="none" />
      {/* 太阳 */}
      <circle cx="50" cy="14" r="3" fill={color} fillOpacity="0.3" stroke="none" />
    </svg>
  )
}

/** 竹 - 墨竹 */
export function InkBamboo({ size = 24, color = DEFAULT_COLOR, className, style, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size, color, className, style, strokeWidth)}>
      {/* 主杆 */}
      <line x1="20" y1="58" x2="20" y2="6" strokeWidth={2.5} />
      <line x1="36" y1="58" x2="36" y2="14" strokeWidth={2} />
      {/* 节 */}
      <line x1="16" y1="20" x2="24" y2="20" />
      <line x1="16" y1="36" x2="24" y2="36" />
      <line x1="16" y1="50" x2="24" y2="50" />
      <line x1="32" y1="26" x2="40" y2="26" />
      <line x1="32" y1="42" x2="40" y2="42" />
      {/* 叶 - 飞白 */}
      <path d="M24 14 Q34 8 40 18" />
      <path d="M24 28 Q38 22 44 32" />
      <path d="M24 42 Q38 36 44 46" />
      <path d="M16 32 Q6 26 4 36" />
      <path d="M16 46 Q6 40 2 48" />
    </svg>
  )
}

/** 莲花 - 墨荷 */
export function InkLotus({ size = 24, color = DEFAULT_COLOR, className, style, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size, color, className, style, strokeWidth)}>
      {/* 花瓣 */}
      <path d="M32 28 Q24 16 18 28 Q22 30 32 28" fill={color} fillOpacity="0.1" />
      <path d="M32 28 Q40 16 46 28 Q42 30 32 28" fill={color} fillOpacity="0.1" />
      <path d="M32 28 Q20 24 22 36 Q26 34 32 28" fill={color} fillOpacity="0.15" />
      <path d="M32 28 Q44 24 42 36 Q38 34 32 28" fill={color} fillOpacity="0.15" />
      <path d="M32 28 Q28 18 32 10 Q36 18 32 28" fill={color} fillOpacity="0.2" />
      {/* 莲蓬 */}
      <circle cx="32" cy="30" r="2" fill={color} stroke="none" />
      {/* 叶 */}
      <path d="M8 46 Q14 38 24 42 Q22 50 8 50" fill={color} fillOpacity="0.1" />
      <path d="M56 46 Q50 38 40 42 Q42 50 56 50" fill={color} fillOpacity="0.1" />
      {/* 水波 */}
      <path d="M4 54 Q12 52 20 54 T36 54 T52 54 T60 54" strokeWidth={1} opacity="0.6" />
    </svg>
  )
}

/** 祥云 - 飞云 */
export function InkCloud({ size = 24, color = DEFAULT_COLOR, className, style, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size, color, className, style, strokeWidth)}>
      <path d="M12 38 Q4 38 4 30 Q4 22 14 22 Q16 14 26 14 Q36 14 38 22 Q48 20 50 28 Q56 28 56 36 Q56 44 46 44 L18 44 Q12 44 12 38" />
      <path d="M16 30 Q20 26 24 30" />
      <path d="M28 24 Q32 20 36 24" />
      <path d="M40 32 Q44 28 48 32" />
    </svg>
  )
}

/** 古树 - 枝干苍劲 */
export function InkTree({ size = 24, color = DEFAULT_COLOR, className, style, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size, color, className, style, strokeWidth)}>
      <path d="M32 58 L32 30" strokeWidth={2.5} />
      <path d="M32 40 L20 28" />
      <path d="M32 36 L44 24" />
      <path d="M32 30 L24 20" />
      <path d="M32 30 L40 18" />
      <path d="M20 28 L14 22" />
      <path d="M44 24 L50 18" />
      <path d="M24 20 L20 14" />
      <path d="M40 18 L46 12" />
      {/* 苔点 */}
      <circle cx="18" cy="30" r="1.5" fill={color} stroke="none" />
      <circle cx="46" cy="20" r="1.5" fill={color} stroke="none" />
      <circle cx="22" cy="18" r="1" fill={color} stroke="none" />
      <circle cx="48" cy="14" r="1" fill={color} stroke="none" />
    </svg>
  )
}

/** 卷轴 - 书画卷 */
export function InkScroll({ size = 24, color = DEFAULT_COLOR, className, style, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size, color, className, style, strokeWidth)}>
      <rect x="8" y="14" width="48" height="36" rx="2" />
      <line x1="8" y1="20" x2="56" y2="20" opacity="0.5" />
      <line x1="8" y1="44" x2="56" y2="44" opacity="0.5" />
      <line x1="32" y1="20" x2="32" y2="44" opacity="0.3" />
      {/* 卷头 */}
      <ellipse cx="8" cy="32" rx="3" ry="18" fill={color} fillOpacity="0.2" />
      <ellipse cx="56" cy="32" rx="3" ry="18" fill={color} fillOpacity="0.2" />
      {/* 印章 */}
      <rect x="46" y="36" width="6" height="6" fill="#8b2500" stroke="none" />
    </svg>
  )
}

/** 香炉 - 三足鼎 */
export function InkCenser({ size = 24, color = DEFAULT_COLOR, className, style, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size, color, className, style, strokeWidth)}>
      {/* 炉身 */}
      <path d="M14 22 L18 44 L46 44 L50 22 Z" />
      {/* 炉口 */}
      <ellipse cx="32" cy="22" rx="18" ry="4" />
      {/* 把手 */}
      <path d="M14 22 Q8 18 10 14" />
      <path d="M50 22 Q56 18 54 14" />
      {/* 三足 */}
      <line x1="20" y1="44" x2="16" y2="56" />
      <line x1="32" y1="44" x2="32" y2="58" />
      <line x1="44" y1="44" x2="48" y2="56" />
      {/* 烟 */}
      <path d="M28 14 Q26 10 30 6 Q34 4 30 0" opacity="0.6" strokeWidth={1.2} />
      <path d="M36 14 Q34 10 38 6 Q40 4 38 0" opacity="0.6" strokeWidth={1.2} />
    </svg>
  )
}

/** 棋盘 - 围棋 */
export function InkGoBoard({ size = 24, color = DEFAULT_COLOR, className, style, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size, color, className, style, strokeWidth)}>
      <rect x="6" y="6" width="52" height="52" rx="2" />
      {[18, 26, 34, 42, 50].map((p) => (
        <g key={p}>
          <line x1={p} y1="10" x2={p} y2="54" />
          <line x1="10" y1={p} x2="54" y2={p} />
        </g>
      ))}
      {/* 棋子 */}
      <circle cx="26" cy="26" r="2.5" fill={color} stroke="none" />
      <circle cx="42" cy="34" r="2.5" fill="white" stroke={color} />
    </svg>
  )
}

/** 灯笼 - 宫灯 */
export function InkLantern({ size = 24, color = DEFAULT_COLOR, className, style, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size, color, className, style, strokeWidth)}>
      <line x1="32" y1="2" x2="32" y2="10" />
      <ellipse cx="32" cy="10" rx="6" ry="2" />
      <ellipse cx="32" cy="50" rx="6" ry="2" />
      <path d="M26 10 Q18 30 26 50" />
      <path d="M38 10 Q46 30 38 50" />
      <path d="M22 18 L42 18" opacity="0.4" />
      <path d="M20 30 L44 30" opacity="0.4" />
      <path d="M22 42 L42 42" opacity="0.4" />
      {/* 穗 */}
      <line x1="32" y1="52" x2="32" y2="60" />
      <line x1="30" y1="60" x2="34" y2="60" />
      <line x1="32" y1="60" x2="32" y2="62" />
    </svg>
  )
}

/** 茶壶 - 紫砂 */
export function InkTeapot({ size = 24, color = DEFAULT_COLOR, className, style, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size, color, className, style, strokeWidth)}>
      {/* 壶身 */}
      <ellipse cx="32" cy="38" rx="20" ry="14" />
      {/* 壶嘴 */}
      <path d="M12 32 Q4 28 6 22 Q10 24 14 30" />
      {/* 壶把 */}
      <path d="M52 30 Q60 30 60 38 Q60 46 52 46" />
      {/* 壶盖 */}
      <ellipse cx="32" cy="24" rx="10" ry="3" />
      <line x1="32" y1="24" x2="32" y2="18" />
      <circle cx="32" cy="18" r="1.5" fill={color} stroke="none" />
    </svg>
  )
}

/** 古琴 - 琴 */
export function InkGuqin({ size = 24, color = DEFAULT_COLOR, className, style, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size, color, className, style, strokeWidth)}>
      <path d="M4 32 Q32 26 60 32 Q32 38 4 32" />
      {/* 弦 */}
      <line x1="14" y1="29" x2="14" y2="35" />
      <line x1="22" y1="28" x2="22" y2="36" />
      <line x1="30" y1="27" x2="30" y2="37" />
      <line x1="38" y1="27" x2="38" y2="37" />
      <line x1="46" y1="28" x2="46" y2="36" />
      <line x1="54" y1="29" x2="54" y2="35" />
      {/* 徽 */}
      <circle cx="22" cy="31" r="0.8" fill={color} stroke="none" />
      <circle cx="32" cy="31" r="0.8" fill={color} stroke="none" />
      <circle cx="42" cy="31" r="0.8" fill={color} stroke="none" />
    </svg>
  )
}

/** 古钱 - 外圆内方 */
export function InkCoin({ size = 24, color = DEFAULT_COLOR, className, style, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size, color, className, style, strokeWidth)}>
      <circle cx="32" cy="32" r="24" />
      <rect x="22" y="22" width="20" height="20" />
      <line x1="32" y1="6" x2="32" y2="12" opacity="0.5" />
      <line x1="32" y1="52" x2="32" y2="58" opacity="0.5" />
      <line x1="6" y1="32" x2="12" y2="32" opacity="0.5" />
      <line x1="52" y1="32" x2="58" y2="32" opacity="0.5" />
    </svg>
  )
}

/** 玉佩 - 双鱼 */
export function InkJade({ size = 24, color = DEFAULT_COLOR, className, style, strokeWidth = 1.5 }: IconProps) {
  return (
    <svg {...base(size, color, className, style, strokeWidth)}>
      <circle cx="22" cy="32" r="10" />
      <circle cx="42" cy="32" r="10" />
      <circle cx="22" cy="32" r="3" fill={color} stroke="none" />
      <circle cx="42" cy="32" r="3" fill={color} stroke="none" />
      <line x1="28" y1="32" x2="36" y2="32" strokeDasharray="2 2" />
      <line x1="32" y1="14" x2="32" y2="22" />
      <line x1="32" y1="42" x2="32" y2="50" />
    </svg>
  )
}
