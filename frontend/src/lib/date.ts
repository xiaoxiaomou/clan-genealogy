/**
 * 格式化日期为相对时间显示
 * 例如：刚刚、5分钟前、3小时前、2天前、3周前、6个月前、2年前
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const target = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - target.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)
  const diffYear = Math.floor(diffDay / 365)

  if (diffSec < 60) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHour < 24) return `${diffHour}小时前`
  if (diffDay < 7) return `${diffDay}天前`
  if (diffWeek < 4) return `${diffWeek}周前`
  if (diffMonth < 12) return `${diffMonth}个月前`
  return `${diffYear}年前`
}

/**
 * 格式化日期为本地字符串
 * 例如：2024年1月15日 14:30
 */
export function formatDateTime(date: string | Date): string {
  const target = typeof date === 'string' ? new Date(date) : date
  return target.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 格式化日期为短日期
 * 例如：2024年1月15日
 */
export function formatDate(date: string | Date): string {
  const target = typeof date === 'string' ? new Date(date) : date
  return target.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
