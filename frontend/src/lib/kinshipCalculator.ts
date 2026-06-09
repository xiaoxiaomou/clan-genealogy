/**
 * 中文亲属关系计算器 wrapper
 * 基于 mumuy/relationship (npm: relationship.js, 3.7k stars)
 * 提供 TypeScript 友好的接口
 */

// relationship.js 是 CommonJS 模块，通过 default import 引入
import relationship from 'relationship.js'

export interface KinshipOptions {
  /** 目标对象的称谓，用"的"字分隔，如 "妈妈的妈妈的哥哥" */
  text: string
  /** 相对对象的称谓（可选），如 "舅妈" */
  target?: string
  /** 本人性别：0=女性, 1=男性，默认男性 */
  sex?: 0 | 1
  /** 转换类型 */
  type?: 'default' | 'chain' | 'pair'
  /** 是否反向：true=对方称呼我, false=我称呼对方（默认） */
  reverse?: boolean
  /** 是否取最短关系 */
  optimal?: boolean
}

/**
 * 计算中文亲属称谓
 *
 * @example
 * // 我应该叫外婆的哥哥什么？
 * calculateKinship({ text: '妈妈的妈妈的哥哥' })
 * // => ['舅外公']
 *
 * // 七舅姥爷应该叫我什么？
 * calculateKinship({ text: '七舅姥爷', reverse: true, sex: 1 })
 * // => ['甥外孙']
 *
 * // 舅公是什么亲戚？（关系链展开）
 * calculateKinship({ text: '舅公', type: 'chain' })
 * // => ['爸爸的妈妈的兄弟', '妈妈的妈妈的兄弟', '老公的妈妈的兄弟']
 *
 * // 舅妈如何称呼外婆？
 * calculateKinship({ text: '外婆', target: '舅妈', sex: 1 })
 * // => ['婆婆']
 */
export function calculateKinship(options: KinshipOptions): string[] {
  try {
    return relationship(options) as string[]
  } catch {
    return ['未知关系']
  }
}

/**
 * 自然语言查询（语句模式）
 *
 * @example
 * // "舅妈如何称呼外婆？" => ['婆婆']
 * queryKinship('舅妈如何称呼外婆？')
 */
export function queryKinship(expression: string): string[] {
  try {
    return relationship(expression) as string[]
  } catch {
    return ['无法解析']
  }
}

/**
 * 展开某称谓的关系链（这个称谓是哪些关系的组合）
 * @example
 * expandKinship('舅公') => ['爸爸的妈妈的兄弟', '妈妈的妈妈的兄弟', ...]
 */
export function expandKinship(term: string): string[] {
  return calculateKinship({ text: term, type: 'chain' })
}

/**
 * 将关系路径（parent/child/spouse 序列）转换为 relationship.js 的 text 格式
 * 用于将族谱图中的 BFS 路径转换为中文称谓查询
 *
 * @param steps 关系步骤列表，每个步骤包含方向和性别
 * @returns relationship.js 可用的 text 字符串
 *
 * @example
 * pathToKinshipText([
 *   { direction: 'up', gender: 'male' },    // -> 爸爸
 *   { direction: 'sideways', gender: 'male' }, // -> 爸爸的兄弟
 * ])
 * // => '爸爸的兄弟'
 */
export function pathToKinshipText(
  steps: Array<{ direction: 'up' | 'down' | 'sideways'; gender: 'male' | 'female' }>
): string {
  const partMap: Record<string, string> = {
    'up:male': '爸爸',
    'up:female': '妈妈',
    'down:male': '儿子',
    'down:female': '女儿',
    'sideways:male': '兄弟',
    'sideways:female': '姐妹',
  }

  const parts = steps.map(s => partMap[`${s.direction}:${s.gender}`] || '亲戚')
  return parts.join('的')
}
