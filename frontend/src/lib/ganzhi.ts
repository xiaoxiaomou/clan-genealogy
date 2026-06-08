/**
 * 干支纪年与生肖工具
 *
 * 干支纪年：以立春为年界（农历正月初一为农历年界，节气立春为干支年界）
 * 本工具对公历年份使用简化判断：
 *   - 该年 2 月 4 日（立春通常在 2/3~2/5）之前 → 算前一个干支年
 *   - 之后 → 算本年干支
 *
 * 公式：gZ = (year - 4) % 60  (0=甲子)
 */

const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const
const SHENGXIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'] as const
const WUXING_OF_TIANGAN: Record<string, string> = {
  甲: '木', 乙: '木',
  丙: '火', 丁: '火',
  戊: '土', 己: '土',
  庚: '金', 辛: '金',
  壬: '水', 癸: '水',
}
const WUXING_OF_DIZHI: Record<string, string> = {
  子: '水', 亥: '水',
  寅: '木', 卯: '木',
  巳: '火', 午: '火',
  申: '金', 酉: '金',
  辰: '土', 戌: '土', 丑: '土', 未: '土',
}

/** 立春约在公历 2 月 4 日，本工具取 2/4 00:00 作为分界 */
const LICHUN_MONTH = 2
const LICHUN_DAY = 4

/**
 * 计算公历日期对应的干支年
 */
export function getGanZhiYear(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return ''
  let year = d.getFullYear()
  // 立春前算上一年
  if (d.getMonth() + 1 < LICHUN_MONTH || (d.getMonth() + 1 === LICHUN_MONTH && d.getDate() < LICHUN_DAY)) {
    year -= 1
  }
  const idx = ((year - 4) % 60 + 60) % 60
  return TIANGAN[idx % 10] + DIZHI[idx % 12]
}

/**
 * 计算生肖（地支决定生肖）
 */
export function getShengXiao(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return ''
  let year = d.getFullYear()
  if (d.getMonth() + 1 < LICHUN_MONTH || (d.getMonth() + 1 === LICHUN_MONTH && d.getDate() < LICHUN_DAY)) {
    year -= 1
  }
  return SHENGXIAO[(year - 4) % 12]
}

/**
 * 干支对应的五行（如甲子 → 金木）
 * 返回 { 天干五行, 地支五行, 纳音五行（简化版） }
 */
export function getGanZhiWuXing(ganZhi: string): { tianGan: string; diZhi: string; naYin: string } {
  if (!ganZhi || ganZhi.length < 2) return { tianGan: '', diZhi: '', naYin: '' }
  const tianGan = WUXING_OF_TIANGAN[ganZhi[0]] || ''
  const diZhi = WUXING_OF_DIZHI[ganZhi[1]] || ''
  return { tianGan, diZhi, naYin: '' }
}

/**
 * 格式化干支年份为展示字符串
 * 例如 getGanZhiInfo(new Date('2024-03-01')) => "甲辰 龙年（木土）"
 */
export function getGanZhiInfo(date: Date | string | null | undefined): {
  ganZhi: string
  shengXiao: string
  description: string
} {
  const ganZhi = getGanZhiYear(date)
  const shengXiao = getShengXiao(date)
  if (!ganZhi) return { ganZhi: '', shengXiao: '', description: '' }
  const wx = getGanZhiWuXing(ganZhi)
  return {
    ganZhi,
    shengXiao,
    description: `${ganZhi} ${shengXiao}年（${wx.tianGan}${wx.diZhi}）`,
  }
}

/**
 * 从干支反查所有 60 个甲子（用于选择器）
 */
export function listAllJiaZi(): Array<{ ganZhi: string; shengXiao: string; tianGan: string; diZhi: string }> {
  const result: Array<{ ganZhi: string; shengXiao: string; tianGan: string; diZhi: string }> = []
  for (let i = 0; i < 60; i++) {
    const tianGan = TIANGAN[i % 10]
    const diZhi = DIZHI[i % 12]
    const ganZhi = tianGan + diZhi
    const shengXiao = SHENGXIAO[i % 12]
    result.push({ ganZhi, shengXiao, tianGan, diZhi })
  }
  return result
}

export { TIANGAN, DIZHI, SHENGXIAO }
