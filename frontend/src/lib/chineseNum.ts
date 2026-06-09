/**
 * 阿拉伯数字转中文数字（族谱世系专用）
 * 例：toChineseNum(1) => "一", toChineseNum(15) => "十五", toChineseNum(21) => "二十一"
 * 例：toChineseNum(10001) => "一万零一", toChineseNum(11000) => "一万一千"
 */
const DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']

/**
 * 把 0 <= n < 10000 的整数转中文（n=0 时返回空串）
 */
function _toChineseBelowTenThousand(n: number): string {
  if (n === 0) return ''
  if (n < 10) return DIGITS[n]

  const result: string[] = []
  const thousands = Math.floor(n / 1000)
  const hundreds = Math.floor((n % 1000) / 100)
  const tens = Math.floor((n % 100) / 10)
  const ones = n % 10

  // 千位
  if (thousands > 0) {
    result.push(DIGITS[thousands] + '千')
  }

  // 百位
  if (hundreds > 0) {
    result.push(DIGITS[hundreds] + '百')
  } else if (result.length > 0 && (tens > 0 || ones > 0)) {
    // 仅在尚未补过"零"时添加
    if (result[result.length - 1] !== '零') result.push('零')
  }

  // 十位
  if (tens > 0) {
    if (tens === 1 && thousands === 0 && hundreds === 0) {
      // "十" 不写 "一十"（仅在最高位为十时省略）
      result.push('十')
    } else {
      result.push(DIGITS[tens] + '十')
    }
  } else if (result.length > 0 && ones > 0) {
    if (result[result.length - 1] !== '零') result.push('零')
  }

  // 个位
  if (ones > 0) {
    result.push(DIGITS[ones])
  }

  return result.join('')
}

/**
 * 把任意非负整数转中文（支持到万亿级）
 * @param n 非负整数
 * @returns 中文数字字符串
 */
export function toChineseNum(n: number): string {
  if (!Number.isFinite(n)) return String(n)
  if (n < 0) return '负' + toChineseNum(-n)
  const num = Math.floor(n)
  if (num === 0) return '零'
  if (num < 10000) return _toChineseBelowTenThousand(num)

  // 拆分为万段，从低到高处理（保留原始数值用于"零"补位判断）
  // 11 个大数单位：bigIdx=N 对应 10^(4N)，覆盖到 10^40
  const bigUnits = ['', '万', '亿', '万亿', '京', '秭', '穰', '沟', '涧', '正', '载']
  type Seg = { value: number; text: string; unit: string }
  const segments: Seg[] = []
  let rest = num
  let bigIdx = 0
  const MAX_BIG_IDX = bigUnits.length - 1
  while (rest > 0) {
    const segment = rest % 10000
    if (segment > 0) {
      // 超过预设单位时使用"载"+指数占位，避免直接截断
      const unit =
        bigIdx <= MAX_BIG_IDX
          ? bigUnits[bigIdx]
          : `${bigUnits[MAX_BIG_IDX]}×10^${(bigIdx - MAX_BIG_IDX) * 4}`
      segments.push({
        value: segment,
        text: _toChineseBelowTenThousand(segment),
        unit,
      })
    }
    rest = Math.floor(rest / 10000)
    bigIdx++
    // 防御性兜底：极端大数限制为 1e20 段（约 10^84），防止无界循环
    if (bigIdx > 20) break
  }

  // 倒序拼装（高段在前）
  let result = ''
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i]
    if (i === segments.length - 1) {
      // 最高段
      result += seg.text + seg.unit
    } else {
      // 后续段：当前段 < 1000（千位为 0）则补"零"
      if (seg.value < 1000) {
        if (!result.endsWith('零') && result.length > 0) {
          result += '零'
        }
      }
      result += seg.text + seg.unit
    }
  }
  return result
}

/**
 * 生成"第X世"标注文案
 * @param n 世代数（从 1 开始）
 */
export function toGenerationLabel(n: number): string {
  if (n <= 0 || !Number.isFinite(n)) return `第${n}世`
  return `第${toChineseNum(n)}世`
}
