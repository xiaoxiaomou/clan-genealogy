/**
 * 农历与天干地支工具（前端）
 *
 * 包装 lunar-javascript 库，提供更易用的 API。
 * 同时提供不依赖库的回退实现以避免 SSR / 库未安装时的崩溃。
 */

import { Lunar, Solar } from 'lunar-javascript'

/** 阳历转农历信息 */
export interface LunarInfo {
  /** 公历年 */
  year: number
  /** 公历月 */
  month: number
  /** 公历日 */
  day: number
  /** 农历年 */
  lunarYear: number
  /** 农历月（1-12） */
  lunarMonth: number
  /** 农历日（1-30） */
  lunarDay: number
  /** 是否闰月 */
  isLeap: boolean
  /** 干支年，如 "甲辰" */
  yearGanZhi: string
  /** 生肖，如 "龙" */
  shengXiao: string
  /** 月份中文，如 "三月" / "闰三月" */
  monthStr: string
  /** 日期中文，如 "初一" */
  dayStr: string
  /** 完整描述，如 "甲辰龙年 三月初一" */
  fullStr: string
}

/** 安全的阳历→农历转换（库未安装时回退到 null） */
export function solarToLunar(date: Date | string): LunarInfo | null {
  try {
    const d = typeof date === 'string' ? new Date(date) : date
    if (Number.isNaN(d.getTime())) return null
    const solar = Solar.fromDate(d)
    const lunar = solar.getLunar()
    const yearGanZhi = lunar.getYearInGanZhi()
    const shengXiao = lunar.getYearShengXiao()
    const lunarMonth = lunar.getMonth()
    const isLeap = lunar.getMonth() < 0
    const realMonth = Math.abs(lunarMonth)
    return {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
      lunarYear: lunar.getYear(),
      lunarMonth: realMonth,
      lunarDay: lunar.getDay(),
      isLeap,
      yearGanZhi,
      shengXiao,
      monthStr: (isLeap ? '闰' : '') + lunar.getMonthInChinese() + '月',
      dayStr: lunar.getDayInChinese(),
      fullStr: `${yearGanZhi}${shengXiao}年 ${(isLeap ? '闰' : '') + lunar.getMonthInChinese() + '月'}${lunar.getDayInChinese()}`,
    }
  } catch (err) {
    console.error('lunar-javascript 调用失败', err)
    return null
  }
}

/** 阳历日期转中文格式（如 "2024年3月15日"） */
export function formatSolarDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** 找出从今天起下一个给定农历月日的阳历日期 */
export function findNextLunarDate(
  lunarMonth: number,
  lunarDay: number,
  isLeap: boolean = false,
  from: Date = new Date()
): Date | null {
  try {
    // 在本年和次年查找
    for (const year of [from.getFullYear(), from.getFullYear() + 1]) {
      const candidate = Lunar.fromYmd(year, isLeap ? -lunarMonth : lunarMonth, lunarDay)
      if (!candidate) continue
      const solar = candidate.getSolar()
      const solarDate = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay())
      if (solarDate >= new Date(from.getFullYear(), from.getMonth(), from.getDate())) {
        return solarDate
      }
    }
    return null
  } catch (err) {
    return null
  }
}

/** 计算距今天数（0=今天, 1=明天, -1=昨天） */
export function daysFromToday(target: Date | string): number {
  const t = typeof target === 'string' ? new Date(target) : target
  if (Number.isNaN(t.getTime())) return 0
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDay = new Date(t.getFullYear(), t.getMonth(), t.getDate())
  return Math.round((targetDay.getTime() - today.getTime()) / 86400000)
}

/** 友好的天数描述 */
export function formatDaysOffset(offset: number): string {
  if (offset === 0) return '今天'
  if (offset === 1) return '明天'
  if (offset === 2) return '后天'
  if (offset < 0) return `${-offset}天前`
  if (offset < 30) return `${offset}天后`
  if (offset < 60) return `${Math.floor(offset / 7)}周后`
  return `${Math.floor(offset / 30)}个月后`
}

/** 解析各种格式的日期字符串为 Date 对象 */
export function parseDateString(s: string | null | undefined): Date | null {
  if (!s) return null
  const str = String(s).trim().replace(/[年月日]/g, '-').replace(/\./g, '-').replace(/\//g, '-').replace(/-$/, '')
  const d = new Date(str)
  if (!Number.isNaN(d.getTime())) return d
  const m = str.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) {
    const dd = new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]))
    if (!Number.isNaN(dd.getTime())) return dd
  }
  return null
}
