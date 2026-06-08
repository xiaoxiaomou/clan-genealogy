import { useMemo, useState, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import { useNavigate } from 'react-router-dom'
import type { Member } from '@/types'
import { Card, CardContent } from '@/components/ui'
import { Box, RotateCcw, Maximize, Minimize, Play, Pause, Gauge } from 'lucide-react'

interface Tree3DViewProps {
  members: Member[]
  relationships?: Array<{
    member_id: number
    related_member_id: number
    relationship_type: string
  }>
  onMemberClick?: (member: Member) => void
  highlightedMemberId?: number | null
  familyId: number
}

interface Node3D {
  id: number
  name: string
  x: number
  y: number
  z: number
  generation: number
  isMale: boolean
  isAlive: boolean
  member: Member
}

/**
 * 3D 家谱视图
 * - 每代一层（z 轴）
 * - 同代节点在 x 轴排列
 * - 男性节点蓝色，女性节点粉红色，已故者半透明
 * - 支持鼠标拖动旋转、滚轮缩放
 * - 点击节点跳转详情
 */
export default function Tree3DView({
  members,
  relationships = [],
  onMemberClick,
  highlightedMemberId,
  familyId,
}: Tree3DViewProps) {
  const navigate = useNavigate()
  const [autoRotate, setAutoRotate] = useState(false)
  const [touring, setTouring] = useState(false)
  const [tourSpeed, setTourSpeed] = useState(1)
  const [realistic, setRealistic] = useState(false)
  const cameraRef = useRef<any>(null)

  // 1. 按 generation 分组
  const nodes: Node3D[] = useMemo(() => {
    if (!members || members.length === 0) return []

    // 按 generation 分组，缺失 generation 的归到 0
    const groups: Record<number, Member[]> = {}
    for (const m of members) {
      const g = m.generation || 0
      if (!groups[g]) groups[g] = []
      groups[g].push(m)
    }

    const result: Node3D[] = []
    const sortedGens = Object.keys(groups)
      .map(Number)
      .sort((a, b) => a - b)

    for (const g of sortedGens) {
      const list = groups[g].sort((a, b) => a.id - b.id)
      const totalWidth = (list.length - 1) * 2.5
      list.forEach((m, idx) => {
        result.push({
          id: m.id,
          name: m.name,
          x: idx * 2.5 - totalWidth / 2,
          y: 0,
          z: g * 3,
          generation: g,
          isMale: m.gender === 'male',
          isAlive: m.is_alive,
          member: m,
        })
      })
    }
    return result
  }, [members])

  // 2. 根据 relationships 构建父子边
  const edges: Array<{ from: Node3D; to: Node3D; type: 'parent' | 'spouse' }> = useMemo(() => {
    if (!members || members.length === 0) return []
    const nodeMap = new Map<number, Node3D>()
    // 需要先构建 nodes 数组，但因为 hooks 顺序问题，构造临时 map
    const groups: Record<number, Member[]> = {}
    for (const m of members) {
      const g = m.generation || 0
      if (!groups[g]) groups[g] = []
      groups[g].push(m)
    }
    const sortedGens = Object.keys(groups).map(Number).sort((a, b) => a - b)
    for (const g of sortedGens) {
      const list = groups[g].sort((a, b) => a.id - b.id)
      const totalWidth = (list.length - 1) * 2.5
      list.forEach((m, idx) => {
        nodeMap.set(m.id, {
          id: m.id,
          name: m.name,
          x: idx * 2.5 - totalWidth / 2,
          y: 0,
          z: g * 3,
          generation: g,
          isMale: m.gender === 'male',
          isAlive: m.is_alive,
          member: m,
        })
      })
    }
    const result: Array<{ from: Node3D; to: Node3D; type: 'parent' | 'spouse' }> = []
    for (const r of relationships) {
      const from = nodeMap.get(r.member_id)
      const to = nodeMap.get(r.related_member_id)
      if (!from || !to) continue
      if (r.relationship_type === 'parent' || r.relationship_type === 'father' || r.relationship_type === 'mother') {
        // parent 关系：related 是父，member 是子
        if (from.generation < to.generation) {
          result.push({ from, to, type: 'parent' })
        } else {
          result.push({ from: to, to: from, type: 'parent' })
        }
      } else if (r.relationship_type === 'spouse' || r.relationship_type === 'child') {
        result.push({ from, to, type: 'spouse' })
      }
    }
    return result
  }, [members, relationships])

  if (members.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-[500px] flex-col items-center justify-center gap-2 text-muted-foreground">
          <Box className="h-12 w-12" />
          <p>暂无成员数据</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Box className="h-4 w-4 text-primary" />
          <span className="font-medium">3D 家谱视图</span>
          <span className="text-xs text-muted-foreground">（拖动旋转 · 滚轮缩放）</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`flex h-7 items-center gap-1 rounded border border-border bg-background px-2 text-xs hover:bg-muted ${
              autoRotate ? 'border-primary text-primary' : ''
            }`}
            title={autoRotate ? '停止旋转' : '自动旋转'}
          >
            {autoRotate ? <Minimize className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
            {autoRotate ? '停止' : '旋转'}
          </button>
          <button
            onClick={() => setRealistic((r) => !r)}
            className={`flex h-7 items-center gap-1 rounded border border-border bg-background px-2 text-xs hover:bg-muted ${
              realistic ? 'border-primary text-primary' : ''
            }`}
            title={realistic ? '切换到方块模式' : '切换到真实模式（球体 + 光照）'}
          >
            <Box className="h-3 w-3" />
            {realistic ? '真实' : '方块'}
          </button>
          <button
            onClick={() => setTouring(!touring)}
            className={`flex h-7 items-center gap-1 rounded border border-border bg-background px-2 text-xs hover:bg-muted ${
              touring ? 'border-primary text-primary' : ''
            }`}
            title={touring ? '停止巡游' : '自动巡游'}
          >
            {touring ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {touring ? '暂停' : '巡游'}
          </button>
          <div className="flex h-7 items-center gap-1 rounded border border-border bg-background px-2 text-xs">
            <Gauge className="h-3 w-3" />
            <input
              type="range"
              min={0.3}
              max={3}
              step={0.1}
              value={tourSpeed}
              onChange={(e) => setTourSpeed(parseFloat(e.target.value))}
              className="w-12"
            />
            <span className="text-[10px] text-muted-foreground">{tourSpeed.toFixed(1)}x</span>
          </div>
          <button
            onClick={() => {
              setAutoRotate(false)
              setTouring(false)
              if (cameraRef.current) {
                cameraRef.current.position.set(15, 12, 15)
              }
            }}
            className="flex h-7 items-center gap-1 rounded border border-border bg-background px-2 text-xs hover:bg-muted"
            title="重置视角"
          >
            <RotateCcw className="h-3 w-3" />
            重置
          </button>
        </div>
      </div>
      <div style={{ height: '600px' }} className="bg-gradient-to-b from-slate-50 to-slate-200 dark:from-slate-900 dark:to-slate-950">
        <Canvas
          camera={{ position: [15, 12, 15], fov: 50 }}
          shadows
          dpr={[1, 2]}
        >
          <color attach="background" args={['#f1f5f9']} />
          {/* 灯光 */}
          <ambientLight intensity={0.6} />
          <directionalLight
            position={[10, 15, 10]}
            intensity={1}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-10, 8, -10]} intensity={0.3} />

          {/* 地板 */}
          <Floor />

          {/* 父子连线 */}
          {edges.map((e, idx) => (
            <Line
              key={idx}
              points={[
                [e.from.x, 0.3, e.from.z],
                [e.to.x, 0.3, e.to.z],
              ]}
              color={e.type === 'spouse' ? '#ec4899' : '#0f766e'}
              lineWidth={e.type === 'spouse' ? 1.5 : 1.2}
              transparent
              opacity={0.6}
            />
          ))}

          {/* 节点 */}
          {nodes.map((n) => (
            <FamilyNode
              key={n.id}
              node={n}
              highlighted={highlightedMemberId === n.id}
              realistic={realistic}
              onClick={() => {
                onMemberClick?.(n.member)
              }}
              onDoubleClick={() => {
                navigate(`/family/${familyId}/member/${n.id}`)
              }}
            />
          ))}

          {/* 自动旋转控制器 */}
          {autoRotate && <AutoRotate />}

          {/* 自动巡游：沿时间轴推进，逐代"飞过" */}
          {touring && <AutoTour nodes={nodes} speed={tourSpeed} />}

          {/* 鼠标控制 */}
          <OrbitControls
            ref={cameraRef}
            enablePan
            enableZoom
            enableRotate
            minDistance={5}
            maxDistance={50}
            maxPolarAngle={Math.PI / 2.2}
            target={[0, 0, ((Math.max(...nodes.map((n) => n.generation)) || 1) * 3) / 2]}
          />
        </Canvas>
      </div>
      <div className="border-t border-border bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-4">
          <span>共 {nodes.length} 位成员</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-blue-500" /> 男
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-pink-500" /> 女
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-gray-400 opacity-50" /> 已故
          </span>
          <span>·</span>
          <span>提示：单击节点高亮 · 双击进入详情</span>
        </div>
      </div>
    </Card>
  )
}

function Floor() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -1.5, 0]}
      receiveShadow
    >
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial color="#e2e8f0" metalness={0.1} roughness={0.8} />
    </mesh>
  )
}

function FamilyNode({
  node,
  highlighted,
  onClick,
  onDoubleClick,
  realistic = false,
}: {
  node: Node3D
  highlighted: boolean
  onClick: () => void
  onDoubleClick: () => void
  realistic?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const color = node.isMale
    ? new THREE.Color('#3b82f6')
    : new THREE.Color('#ec4899')
  const emissive = highlighted
    ? new THREE.Color('#fbbf24')
    : hovered
    ? new THREE.Color('#fef3c7')
    : new THREE.Color('#000000')
  const opacity = node.isAlive ? 1 : 0.45

  return (
    <group position={[node.x, node.y, node.z]}>
      {realistic ? (
        <>
          {/* 球体节点 */}
          <mesh
            castShadow
            receiveShadow
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            scale={hovered || highlighted ? 1.3 : 1}
          >
            <icosahedronGeometry args={[0.55, 1]} />
            <meshStandardMaterial
              color={color}
              transparent={!node.isAlive}
              opacity={opacity}
              emissive={emissive}
              emissiveIntensity={highlighted ? 0.7 : 0.15}
              metalness={0.7}
              roughness={0.25}
            />
          </mesh>
          {/* 名字（始终朝相机） */}
          <Text
            position={[0, -0.85, 0]}
            fontSize={0.32}
            color="#0f172a"
            anchorX="center"
            anchorY="top"
            outlineWidth={0.02}
            outlineColor="#fef3c7"
          >
            {node.name}
          </Text>
        </>
      ) : (
        <>
          <mesh
            castShadow
            receiveShadow
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            scale={hovered || highlighted ? 1.2 : 1}
          >
            <boxGeometry args={[1.6, 0.6, 1.2]} />
            <meshStandardMaterial
              color={color}
              transparent={!node.isAlive}
              opacity={opacity}
              emissive={emissive}
              emissiveIntensity={highlighted ? 0.6 : 0.1}
              metalness={0.3}
              roughness={0.4}
            />
          </mesh>
        </>
      )}
      {/* 名字标签 - 始终面向相机 */}
      <Text
        position={[0, 0.5, 0]}
        fontSize={0.35}
        color="#0f172a"
        anchorX="center"
        anchorY="middle"
        maxWidth={2}
        outlineWidth={0.02}
        outlineColor="#ffffff"
      >
        {node.name}
      </Text>
      {/* 世代标签 */}
      <Text
        position={[0, -0.5, 0]}
        fontSize={0.18}
        color="#64748b"
        anchorX="center"
        anchorY="middle"
      >
        第{node.generation || '?'}代
      </Text>

      {/* 悬停时显示悬浮卡片 */}
      {hovered && (
        <Html
          position={[0, 1.5, 0]}
          center
          distanceFactor={8}
          occlude={false}
        >
          <div className="pointer-events-none rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
            <div className="font-semibold text-slate-900 dark:text-slate-100">{node.name}</div>
            <div className="mt-0.5 text-slate-500">第 {node.generation || '?'} 代 · {node.isMale ? '男' : '女'} · {node.isAlive ? '在世' : '已故'}</div>
            <div className="mt-1 text-[10px] text-slate-400">双击查看详情</div>
          </div>
        </Html>
      )}
    </group>
  )
}

function AutoRotate() {
  useFrame(({ clock, camera }) => {
    const t = clock.getElapsedTime() * 0.15
    const r = 22
    camera.position.x = Math.cos(t) * r
    camera.position.z = Math.sin(t) * r
    camera.lookAt(0, 0, 6)
  })
  return null
}

function AutoTour({ nodes, speed }: { nodes: Node3D[]; speed: number }) {
  const { camera } = useThree()
  const tRef = useRef(0)
  useFrame((_, delta) => {
    if (nodes.length === 0) return
    tRef.current += delta * speed * 0.3
    // 在世代之间来回巡游
    const maxGen = Math.max(...nodes.map((n) => n.generation)) || 1
    const phase = (Math.sin(tRef.current) + 1) / 2 // 0..1
    const z = phase * maxGen * 3
    const radius = 18
    const angle = tRef.current * 0.5
    camera.position.x = Math.cos(angle) * radius
    camera.position.z = z + Math.sin(angle) * 4
    camera.position.y = 10 + Math.sin(tRef.current * 0.7) * 3
    camera.lookAt(0, 0, z)
  })
  return null
}
