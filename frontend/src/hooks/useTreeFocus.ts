import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useReactFlow } from '@xyflow/react'

export interface UseTreeFocusReturn {
  /** 从 URL 解析出的焦点成员 ID（数字），不存在则为 null */
  focusMemberId: number | null
  /** 生成可分享的永久链接 */
  generateFocusUrl: (familyId: number, memberId: number) => string
  /** 清除 URL 中的 focus 参数 */
  clearFocus: () => void
}

/**
 * 树图永久链接 Hook
 * - 支持 `?focus=person_123` 或 `?focus=123` 格式
 * - 提供生成分享链接的工具函数
 */
export function useTreeFocus(): UseTreeFocusReturn {
  const [searchParams, setSearchParams] = useSearchParams()

  const focusMemberId = useMemo((): number | null => {
    const focusParam = searchParams.get('focus')
    if (!focusParam) return null

    // 支持 person_123 或 123 格式
    const match = focusParam.match(/^(?:person_)?(\d+)$/)
    if (!match) return null

    const id = Number(match[1])
    return Number.isNaN(id) ? null : id
  }, [searchParams])

  const generateFocusUrl = useCallback((familyId: number, memberId: number): string => {
    // 格式：/family/{familyId}?focus=person_{memberId}
    // 也兼容任务要求的 /tree/{familyId}/view?focus=person_{memberId} 格式
    return `/family/${familyId}?focus=person_${memberId}`
  }, [])

  const clearFocus = useCallback(() => {
    const params = new URLSearchParams(searchParams)
    params.delete('focus')
    setSearchParams(params, { replace: true })
  }, [searchParams, setSearchParams])

  return { focusMemberId, generateFocusUrl, clearFocus }
}

/**
 * 在组件挂载/焦点变化时自动平滑定位到节点的 Hook
 * 复用 dagrePositions Map（已有布局坐标），不重新计算
 */
export function useAutoFocusNode({
  focusMemberId,
  dagrePositions,
  reactFlowInstance,
  duration = 800,
  zoom = 1.0,
}: {
  focusMemberId: number | null
  dagrePositions: Map<number, { x: number; y: number }>
  reactFlowInstance: React.MutableRefObject<ReturnType<typeof useReactFlow> | null>
  duration?: number
  zoom?: number
}) {
  const hasFocusedRef = useRef(false)

  useEffect(() => {
    if (!focusMemberId || hasFocusedRef.current) return

    const position = dagrePositions.get(focusMemberId)
    if (!position) {
      // 节点不存在，静默忽略
      return
    }

    const instance = reactFlowInstance.current
    if (!instance) return

    // dagrePositions 存储的是节点中心点坐标
    const cx = position.x
    const cy = position.y

    instance.setCenter(cx, cy, { zoom, duration })
    hasFocusedRef.current = true
  }, [focusMemberId, dagrePositions, reactFlowInstance, duration, zoom])

  // 当 focusMemberId 变化时重置标记，允许再次聚焦（包括 ID 切换场景）
  useEffect(() => {
    hasFocusedRef.current = false
  }, [focusMemberId])
}