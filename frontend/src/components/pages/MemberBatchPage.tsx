import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Upload, Edit3, Trash2, Filter, X, CheckSquare, Square,
  Users, RotateCcw,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAppDispatch, addToast } from '@/store'
import { BatchEditModal, CsvImportModal } from '@/components/ui'
import type { Member, FamilyBranch } from '@/types'

export function MemberBatchPage() {
  const { familyId } = useParams<{ familyId: string }>()
  const fid = Number(familyId)
  const navigate = useNavigate()
  const dispatch = useAppDispatch()

  const [members, setMembers] = useState<Member[]>([])
  const [branches, setBranches] = useState<FamilyBranch[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterAlive, setFilterAlive] = useState('')
  const [filterGeneration, setFilterGeneration] = useState('')
  const [filterBranch, setFilterBranch] = useState('')
  const [showBatchEdit, setShowBatchEdit] = useState(false)
  const [showCsvImport, setShowCsvImport] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [m, b] = await Promise.all([
        api.getMembers(fid),
        api.getBranches(fid).catch(() => ({ branches: [] })),
      ])
      setMembers(m.members || [])
      setBranches(b.branches || [])
    } catch (err: any) {
      dispatch(addToast({ message: err.message || '加载失败', type: 'error' }))
    } finally {
      setLoading(false)
    }
  }, [fid, dispatch])

  useEffect(() => { load() }, [load])

  const generations = useMemo(() => {
    const set = new Set<number>()
    members.forEach((m) => { if (m.generation != null) set.add(m.generation) })
    return Array.from(set).sort((a, b) => a - b)
  }, [members])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return members.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q)) return false
      if (filterGender && m.gender !== filterGender) return false
      if (filterAlive === 'alive' && !m.is_alive) return false
      if (filterAlive === 'dead' && m.is_alive) return false
      if (filterGeneration && String(m.generation || '') !== filterGeneration) return false
      if (filterBranch && String(m.branch_id || '') !== filterBranch) return false
      return true
    })
  }, [members, search, filterGender, filterAlive, filterGeneration, filterBranch])

  const allSelected = filtered.length > 0 && filtered.every((m) => selected.has(m.id))
  const someSelected = filtered.some((m) => selected.has(m.id))

  const toggleAll = () => {
    if (allSelected) {
      const next = new Set(selected)
      filtered.forEach((m) => next.delete(m.id))
      setSelected(next)
    } else {
      const next = new Set(selected)
      filtered.forEach((m) => next.add(m.id))
      setSelected(next)
    }
  }

  const toggle = (id: number) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const clearSelection = () => setSelected(new Set())

  const handleBatchDelete = async () => {
    if (selected.size === 0) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 5000)
      return
    }
    try {
      const data = await api.batchDeleteMembers(fid, Array.from(selected))
      dispatch(addToast({ message: data.message, type: data.failed.length > 0 ? 'info' : 'success' }))
      clearSelection()
      load()
    } catch (err: any) {
      dispatch(addToast({ message: err.message || '删除失败', type: 'error' }))
    }
  }

  const selectedMembers = members.filter((m) => selected.has(m.id))
  const selectedNames = selectedMembers.map((m) => m.name)

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <button
          onClick={() => navigate(`/family/${fid}/tree`)}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> 返回族谱
        </button>

        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
              <Users className="h-5 w-5 text-amber-700" />
              批量操作
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              共 {members.length} 个成员 · 当前筛选 {filtered.length} · 已选 {selected.size}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCsvImport(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border/30 bg-foreground/3 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-foreground/6"
            >
              <Upload className="h-3.5 w-3.5" /> CSV 导入
            </button>
            <button
              onClick={load}
              className="flex items-center gap-1.5 rounded-lg border border-border/30 bg-foreground/3 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-foreground/6"
            >
              <RotateCcw className="h-3.5 w-3.5" /> 刷新
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-border/20 bg-foreground/2 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Filter className="h-3.5 w-3.5" /> 筛选
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="按姓名搜索"
              className="rounded-md border border-border/30 bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-700/40"
            />
            <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} className="rounded-md border border-border/30 bg-background px-2 py-1.5 text-xs">
              <option value="">全部性别</option>
              <option value="male">男</option>
              <option value="female">女</option>
              <option value="unknown">未知</option>
            </select>
            <select value={filterAlive} onChange={(e) => setFilterAlive(e.target.value)} className="rounded-md border border-border/30 bg-background px-2 py-1.5 text-xs">
              <option value="">全部</option>
              <option value="alive">在世</option>
              <option value="dead">已故</option>
            </select>
            <select value={filterGeneration} onChange={(e) => setFilterGeneration(e.target.value)} className="rounded-md border border-border/30 bg-background px-2 py-1.5 text-xs">
              <option value="">全部世代</option>
              {generations.map((g) => <option key={g} value={g}>第 {g} 世</option>)}
            </select>
            <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="rounded-md border border-border/30 bg-background px-2 py-1.5 text-xs">
              <option value="">全部房支</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">加载中…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/30 py-12 text-center text-sm text-muted-foreground">
            没有匹配的成员
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/20 bg-foreground/2">
            <div className="grid grid-cols-[40px_1fr_60px_60px_80px_80px_1fr] items-center gap-2 border-b border-border/20 bg-foreground/3 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              <button onClick={toggleAll} aria-label={allSelected ? '取消全选' : '全选'}>
                {allSelected ? <CheckSquare className="h-4 w-4 text-amber-700" /> : <Square className="h-4 w-4" />}
              </button>
              <span>姓名</span>
              <span>性别</span>
              <span>世代</span>
              <span>在世</span>
              <span>房支</span>
              <span>简介</span>
            </div>
            <div className="max-h-[60vh] divide-y divide-border/10 overflow-y-auto">
              {filtered.map((m) => {
                const isSelected = selected.has(m.id)
                const branch = branches.find((b) => b.id === m.branch_id)
                return (
                  <div
                    key={m.id}
                    onClick={() => toggle(m.id)}
                    className={`grid cursor-pointer grid-cols-[40px_1fr_60px_60px_80px_80px_1fr] items-center gap-2 px-3 py-2 text-xs transition-colors ${
                      isSelected ? 'bg-amber-700/10' : 'hover:bg-foreground/3'
                    }`}
                  >
                    {isSelected ? <CheckSquare className="h-4 w-4 text-amber-700" /> : <Square className="h-4 w-4 text-muted-foreground/50" />}
                    <span className="font-medium text-foreground">{m.name}</span>
                    <span className="text-muted-foreground">
                      {m.gender === 'male' ? '男' : m.gender === 'female' ? '女' : '?'}
                    </span>
                    <span className="text-muted-foreground">{m.generation ? `${m.generation}` : '-'}</span>
                    <span className={m.is_alive ? 'text-green-600' : 'text-muted-foreground'}>
                      {m.is_alive ? '在世' : '已故'}
                    </span>
                    <span className="truncate text-muted-foreground">{branch?.name || '-'}</span>
                    <span className="truncate text-muted-foreground/70">{m.bio || '-'}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 底部浮动批量操作栏 */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/30 bg-background/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-mono text-amber-700">{selected.size}</span>
              <span className="text-muted-foreground">个成员已选</span>
              <button
                onClick={clearSelection}
                className="ml-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" /> 清除
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowBatchEdit(true)}
                className="flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-800"
              >
                <Edit3 className="h-3.5 w-3.5" /> 批量编辑
              </button>
              <button
                onClick={handleBatchDelete}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  confirmDelete
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'border border-red-500/40 text-red-600 hover:bg-red-500/10'
                }`}
              >
                <Trash2 className="h-3.5 w-3.5" /> {confirmDelete ? '再次点击确认' : '批量删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BatchEditModal
        open={showBatchEdit}
        familyId={fid}
        memberIds={Array.from(selected)}
        memberNames={selectedNames}
        onClose={() => setShowBatchEdit(false)}
        onSuccess={() => { clearSelection(); load() }}
      />
      <CsvImportModal
        open={showCsvImport}
        familyId={fid}
        onClose={() => setShowCsvImport(false)}
        onSuccess={load}
      />
    </div>
  )
}

export default MemberBatchPage
