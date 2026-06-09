import { useMemo } from 'react'
import { useViewport } from '@xyflow/react'
import { toGenerationLabel } from '@/lib/chineseNum'
import type { TreeNode } from '@/types'

interface GenerationRulerProps {
  /** 所有节点（已 dagre 排版后的位置由调用方提供，节点上的 generation 字段用作分组依据） */
  nodes: TreeNode[]
  /** 节点屏幕坐标（已应用 viewport 变换的左上角 x/y 像素值，由父组件提供） */
  nodeScreenPositions: Map<number, { x: number; y: number; width: number; height: number }>
  /** 与节点相同的"代际颜色"生成函数，便于和节点配色保持一致 */
  getGenerationColor?: (gen: number | null) => string
}

/**
 * 世代表尺：左侧竖排"第X世"标注，每个世代显示该世代节点的 Y 中心位置。
 * 位置随 React Flow 视口缩放/平移自动跟随。
 */
export function GenerationRuler({
  nodes,
  nodeScreenPositions,
  getGenerationColor,
}: GenerationRulerProps) {
  // useViewport 仅用于触发组件随视口变化重渲染（位置由父组件计算传入）
  useViewport()

  const generations = useMemo(() => {
    const map = new Map<number, { generation: number; ys: number[]; nodeCount: number }>()
    for (const node of nodes) {
      const gen = node.generation || 1
      const pos = nodeScreenPositions.get(node.id)
      if (!pos) continue
      const yCenter = pos.y + pos.height / 2
      if (!map.has(gen)) map.set(gen, { generation: gen, ys: [], nodeCount: 0 })
      const entry = map.get(gen)!
      entry.ys.push(yCenter)
      entry.nodeCount++
    }
    return Array.from(map.values())
      .map((g) => ({
        generation: g.generation,
        nodeCount: g.nodeCount,
        // 取该世代 Y 中心的中位数，避免极值拉扯
        y: g.ys.sort((a, b) => a - b)[Math.floor(g.ys.length / 2)] ?? 0,
      }))
      .sort((a, b) => a.generation - b.generation)
  }, [nodes, nodeScreenPositions])

  if (generations.length === 0) return null

  return (
    <div
      className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 select-none"
      aria-hidden="true"
    >
      <div className="relative h-full w-9 border-r border-dashed border-amber-200/40 bg-background/60 backdrop-blur-[2px]">
        {generations.map((g) => {
          const color = getGenerationColor
            ? getGenerationColor(g.generation)
            : `hsl(145, 45%, ${Math.min(30 + g.generation * 6, 85)}%)`
          return (
            <div
              key={g.generation}
              className="absolute left-0 right-0 flex items-center justify-center"
              style={{ top: g.y - 12, height: 24 }}
            >
              <span
                className="origin-center -rotate-90 whitespace-nowrap text-[10px] font-semibold tracking-widest"
                style={{ color, textShadow: '0 1px 2px rgba(0,0,0,0.25)' }}
                title={`${toGenerationLabel(g.generation)} · ${g.nodeCount} 人`}
              >
                {toGenerationLabel(g.generation)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
