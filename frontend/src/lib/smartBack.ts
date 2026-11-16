import type { NavigateFunction } from 'react-router-dom'

/**
 * 智能返回：优先回退浏览历史（回到来时的页面，如功能目录），
 * 无历史（直接落地本页）时回退到层级父页 fallback。
 */
export function smartBack(navigate: NavigateFunction, fallback: string) {
  const idx = (window.history.state?.idx ?? 0)
  if (idx > 0) navigate(-1)
  else navigate(fallback)
}
