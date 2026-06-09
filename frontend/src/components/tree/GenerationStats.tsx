import { useCallback, useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { api } from '@/lib/api'

const GENDER_COLORS = { male: '#2563eb', female: '#ec4899', unknown: '#94a3b8' }

interface GenerationStatsProps {
  familyId: number
}

export default function GenerationStats({ familyId }: GenerationStatsProps) {
  const [data, setData] = useState<{
    total: number
    alive_count: number
    dead_count: number
    generation_names: Array<{ generation_name: string; count: number }>
    generation_distribution: Array<{ generation: number; count: number }>
    generation_gender: Array<{ generation: number; gender: string; count: number }>
  } | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await api.getGenerationStatistics(familyId)
      setData(d)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [familyId])

  useEffect(() => { void load() }, [load])

  if (loading) return <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">加载统计中...</div>
  if (!data) return <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">无法加载统计</div>

  const alivePie = [
    { name: '在世', value: data.alive_count },
    { name: '已故', value: data.dead_count },
  ]
  const aliveTotal = data.alive_count + data.dead_count

  return (
    <div className="space-y-6 p-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{data.total}</p>
          <p className="text-xs text-muted-foreground">总人数</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{data.alive_count}</p>
          <p className="text-xs text-muted-foreground">在世</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{data.dead_count}</p>
          <p className="text-xs text-muted-foreground">已故</p>
        </div>
      </div>

      {data.generation_names.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">字辈频次</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.generation_names}>
                <XAxis dataKey="generation_name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#b08d57" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {data.generation_distribution.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">世代人口分布</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.generation_distribution.map(g => ({ ...g, gen: `第${g.generation}世` }))}>
                <XAxis dataKey="gen" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#7ba17b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {aliveTotal > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">在世比例</h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={alivePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label>
                  {alivePie.map((entry) => (
                    <Cell key={entry.name} fill={entry.name === '在世' ? '#22c55e' : '#d97706'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
