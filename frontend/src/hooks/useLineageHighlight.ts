import { useCallback, useMemo, useState } from 'react'
import { api } from '@/lib/api'

export type LineageMode = 'none' | 'ancestors' | 'descendants' | 'path'

export type HighlightRole = 'normal' | 'up' | 'down' | 'path' | 'pulse' | 'dimmed'

export interface LineageHighlight {
  nodeIds: Set<number>
  edgeKeys: Set<string>
  mode: 'ancestors' | 'descendants' | 'path' | 'pulse'
  /** 高亮的原因标签（显示在 toast/toolbar） */
  label?: string
}

interface UseLineageHighlightOptions {
  familyId?: number
  /** 单点高亮 prop（来自父组件，例如从列表点击进入） */
  externalAnchorId?: number | null
}

interface UseLineageHighlightReturn {
  mode: LineageMode
  setMode: (m: LineageMode) => void
  highlight: LineageHighlight | null
  loading: boolean
  error: string | null
  /** 在某节点上"激活"当前模式（ancestors/descendants 直接调后端；path 需点击两次） */
  applyOnNode: (memberId: number, memberName: string) => Promise<void>
  /** 关系路径：直接计算两个节点之间的路径 */
  applyPath: (a: number, b: number) => Promise<void>
  clear: () => void
  /** A7 搜索命中后短暂脉冲 */
  pulse: (memberId: number) => void
}

/** 一边一边的"方向"标签（保留供将来使用） */
function _directionLabel(direction: 'up' | 'down' | 'left' | 'right'): string {
  return { up: '向上', down: '向下', left: '向左', right: '向右' }[direction]
}
void _directionLabel

/**
 * 高亮状态机：
 * - 监听 familyId
 * - mode 是用户在工具栏的"模式选择"（ancestors/descendants/path/none）
 * - highlight 是当前实际应用的高亮集合（可能来自 mode，也可能来自外部 anchor 或搜索脉冲）
 */
export function useLineageHighlight(opts: UseLineageHighlightOptions): UseLineageHighlightReturn {
  const { familyId, externalAnchorId } = opts
  const [mode, setMode] = useState<LineageMode>('none')
  const [highlight, setHighlight] = useState<LineageHighlight | null>(null)
  const [pathSelection, setPathSelection] = useState<{ first: number | null; second: number | null }>({
    first: null,
    second: null,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clear = useCallback(() => {
    setHighlight(null)
    setPathSelection({ first: null, second: null })
    setError(null)
  }, [])

  const setModeSafe = useCallback((m: LineageMode) => {
    setMode(m)
    if (m === 'none') {
      setHighlight(null)
      setPathSelection({ first: null, second: null })
    } else {
      // 切换模式时清掉旧高亮，等待用户点击
      setHighlight(null)
      setPathSelection({ first: null, second: null })
    }
  }, [])

  const applyOnNode = useCallback(
    async (memberId: number, memberName: string) => {
      if (!familyId) {
        setError('缺少 familyId')
        return
      }
      if (mode === 'none') return
      if (mode === 'path') {
        // path 模式：第一次点击记 first，第二次点击触发计算
        if (pathSelection.first == null) {
          setPathSelection({ first: memberId, second: null })
          setHighlight({
            nodeIds: new Set([memberId]),
            edgeKeys: new Set(),
            mode: 'pulse',
            label: `已选择起点：${memberName}，请再选一个成员`,
          })
          return
        }
        if (pathSelection.first === memberId) {
          // 取消选择
          setPathSelection({ first: null, second: null })
          setHighlight(null)
          return
        }
        // 第二次点击 → 计算路径
        setLoading(true)
        setError(null)
        try {
          const data = await api.getKinshipPath(familyId, pathSelection.first, memberId)
          if (!data.connected) {
            setError('两个成员之间没有连通关系')
            setHighlight({
              nodeIds: new Set([pathSelection.first, memberId]),
              edgeKeys: new Set(),
              mode: 'pulse',
              label: '两成员无亲属关系',
            })
            return
          }
          const nodeIds = new Set<number>(data.path_node_ids || [])
          const edgeKeys = new Set<string>(data.path_edge_keys || [])
          nodeIds.add(pathSelection.first)
          nodeIds.add(memberId)
          setHighlight({
            nodeIds,
            edgeKeys,
            mode: 'path',
            label: `${data.relationship}（${data.path.length} 步）`,
          })
          setPathSelection({ first: null, second: null })
        } catch (e: any) {
          setError(e?.message || '路径计算失败')
        } finally {
          setLoading(false)
        }
        return
      }

      // ancestors / descendants 模式
      setLoading(true)
      setError(null)
      try {
        const data = await api.getLineageHighlight(familyId, memberId, { maxDepth: 6 })
        if (mode === 'ancestors') {
          const nodeIds = new Set<number>([memberId, ...data.ancestor_ids])
          setHighlight({
            nodeIds,
            edgeKeys: new Set(data.ancestor_edge_keys),
            mode: 'ancestors',
            label: `向上 ${data.ancestors.length} 代 · 主干 ${data.ancestor_chain.length} 人`,
          })
        } else {
          const nodeIds = new Set<number>([memberId, ...data.descendant_ids])
          setHighlight({
            nodeIds,
            edgeKeys: new Set(data.descendant_edge_keys),
            mode: 'descendants',
            label: `向下 ${data.descendants.length} 代 · 主干 ${data.descendant_chain.length} 人`,
          })
        }
      } catch (e: any) {
        setError(e?.message || '加载失败')
      } finally {
        setLoading(false)
      }
    },
    [familyId, mode, pathSelection.first]
  )

  const applyPath = useCallback(
    async (a: number, b: number) => {
      if (!familyId) return
      setLoading(true)
      setError(null)
      try {
        const data = await api.getKinshipPath(familyId, a, b)
        const nodeIds = new Set<number>(data.path_node_ids || [a, b])
        const edgeKeys = new Set<string>(data.path_edge_keys || [])
        setHighlight({
          nodeIds,
          edgeKeys,
          mode: 'path',
          label: data.connected ? data.relationship : '无连通',
        })
      } catch (e: any) {
        setError(e?.message || '路径计算失败')
      } finally {
        setLoading(false)
      }
    },
    [familyId]
  )

  const pulse = useCallback((memberId: number) => {
    setHighlight({
      nodeIds: new Set([memberId]),
      edgeKeys: new Set(),
      mode: 'pulse',
      label: undefined,
    })
  }, [])

  // 外部 anchor 变化时（用户在列表里点了别的成员），覆盖高亮
  // 这里不用 useEffect 触发 fetch，简单展示单点高亮即可
  const effectiveHighlight = useMemo<LineageHighlight | null>(() => {
    if (highlight) return highlight
    if (externalAnchorId != null) {
      return {
        nodeIds: new Set([externalAnchorId]),
        edgeKeys: new Set(),
        mode: 'pulse',
      }
    }
    return null
  }, [highlight, externalAnchorId])

  return {
    mode,
    setMode: setModeSafe,
    highlight: effectiveHighlight,
    loading,
    error,
    applyOnNode,
    applyPath,
    clear,
    pulse,
  }
}
