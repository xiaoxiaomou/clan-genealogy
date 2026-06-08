/**
 * 字辈诗工具
 * 前后端规则一致：剔除所有非汉字字符
 */

const NON_CHINESE_RE = /[^\u4e00-\u9fff]/g

export interface ZibeiConfig {
  zibei_text: string
  zibei_start_generation: number
  zibei_assignment: 'sequential' | 'generation_based'
  zibei_description: string
}

export function parseChars(text: string): string[] {
  if (!text) return []
  return text.replace(NON_CHINESE_RE, '').split('')
}

export function charForGeneration(
  config: ZibeiConfig,
  generation: number
): string | null {
  const chars = parseChars(config.zibei_text)
  if (chars.length === 0) return null
  const start =
    config.zibei_assignment === 'generation_based'
      ? config.zibei_start_generation
      : 1
  const idx = generation - start
  if (idx < 0 || idx >= chars.length) return null
  return chars[idx]
}

export function generationsForChar(
  config: ZibeiConfig,
  char: string
): { char: string; indices: number[]; generations: number[] } {
  const chars = parseChars(config.zibei_text)
  if (!char || !chars.includes(char)) {
    return { char, indices: [], generations: [] }
  }
  const indices = chars
    .map((c, i) => (c === char ? i : -1))
    .filter((i) => i >= 0)
  const start =
    config.zibei_assignment === 'generation_based'
      ? config.zibei_start_generation
      : 1
  const generations = indices.map((i) =>
    config.zibei_assignment === 'generation_based' ? start + i : i + 1
  )
  return { char, indices, generations }
}

/** 把字辈诗每 10 字一行排版 */
export function formatPoem(text: string, cols = 10): string[] {
  const chars = parseChars(text)
  const lines: string[] = []
  for (let i = 0; i < chars.length; i += cols) {
    lines.push(chars.slice(i, i + cols).join(''))
  }
  return lines
}
