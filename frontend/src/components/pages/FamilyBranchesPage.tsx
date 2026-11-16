import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { smartBack } from '@/lib/smartBack'
import type { FamilyBranch, Member } from '@/types'
import {
  Button,
  Modal,
  Input,
  Label,
  useToast,
} from '@/components/ui'
import { PgPageHead, PgSectionHead, PgSeal, PG_RED, PG_SERIF } from '@/components/ui/pedigree'
import { Layout } from '@/components/layout/Layout'
import {
  ArrowLeft,
  GitBranch,
  Plus,
  Trash2,
  Pencil,
  ChevronRight,
  ChevronDown,
  Save,
  X,
  Loader2,
  UserPlus,
} from 'lucide-react'

interface BranchNode extends FamilyBranch {
  children: BranchNode[]
  level: number
}

function buildBranchTree(branches: FamilyBranch[]): BranchNode[] {
  const map = new Map<number, BranchNode>()
  const roots: BranchNode[] = []

  // Create nodes
  branches.forEach((b) => {
    map.set(b.id, { ...b, children: [], level: 0 })
  })

  // Build tree
  branches.forEach((b) => {
    const node = map.get(b.id)!
    if (b.parent_branch_id && map.has(b.parent_branch_id)) {
      map.get(b.parent_branch_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  // Assign levels
  function assignLevel(nodes: BranchNode[], level: number) {
    nodes.forEach((n) => {
      n.level = level
      assignLevel(n.children, level + 1)
    })
  }
  assignLevel(roots, 0)

  // Sort by sort_order
  function sortNodes(nodes: BranchNode[]) {
    nodes.sort((a, b) => a.sort_order - b.sort_order)
    nodes.forEach((n) => sortNodes(n.children))
  }
  sortNodes(roots)

  return roots
}

export default function FamilyBranchesPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const familyId = Number(id)

  const [branches, setBranches] = useState<BranchNode[]>([])
  const [flatBranches, setFlatBranches] = useState<FamilyBranch[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState<FamilyBranch | null>(null)
  const [showAssign, setShowAssign] = useState<{ branchId: number; branchName: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [compareBranch1, setCompareBranch1] = useState<number | null>(null)
  const [compareBranch2, setCompareBranch2] = useState<number | null>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    parent_branch_id: '',
  })

  const [assignMemberId, setAssignMemberId] = useState<number | null>(null)

  useEffect(() => {
    loadData()
  }, [familyId])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [branchesRes, membersRes] = await Promise.all([
        api.getBranches(familyId),
        api.getMembers(familyId),
      ])
      setFlatBranches(branchesRes.branches)
      setBranches(buildBranchTree(branchesRes.branches))
      setMembers(membersRes.members)
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [familyId, showToast])

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getBranchStats = (branchId: number) => {
    const branchMembers = members.filter((m) => m.branch_id === branchId)
    const male = branchMembers.filter((m) => m.gender === 'male').length
    const female = branchMembers.filter((m) => m.gender === 'female').length
    const alive = branchMembers.filter((m) => m.is_alive).length
    const deceased = branchMembers.filter((m) => !m.is_alive).length
    const generations = [...new Set(branchMembers.map((m) => m.generation).filter(Boolean))].sort()

    return {
      total: branchMembers.length,
      male,
      female,
      unknown: branchMembers.length - male - female,
      alive,
      deceased,
      generations,
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      showToast('请输入分支名称', 'error')
      return
    }
    setSaving(true)
    try {
      await api.createBranch(familyId, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        parent_branch_id: form.parent_branch_id ? Number(form.parent_branch_id) : null,
      })
      showToast('分支创建成功', 'success')
      setShowCreate(false)
      setForm({ name: '', description: '', parent_branch_id: '' })
      loadData()
    } catch (err: any) {
      showToast(err.message || '创建失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!showEdit || !form.name.trim()) return
    setSaving(true)
    try {
      await api.updateBranch(familyId, showEdit.id, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        parent_branch_id: form.parent_branch_id ? Number(form.parent_branch_id) : null,
      })
      showToast('分支更新成功', 'success')
      setShowEdit(null)
      loadData()
    } catch (err: any) {
      showToast(err.message || '更新失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (branchId: number) => {
    if (!confirm('确定要删除该分支吗？分支下的成员不会被删除。')) return
    try {
      await api.deleteBranch(familyId, branchId)
      showToast('分支已删除', 'success')
      loadData()
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    }
  }

  const handleAssignMember = async () => {
    if (!showAssign || !assignMemberId) return
    try {
      await api.assignMemberBranch(familyId, assignMemberId, showAssign.branchId)
      showToast('成员已分配', 'success')
      setShowAssign(null)
      setAssignMemberId(null)
      loadData()
    } catch (err: any) {
      showToast(err.message || '分配失败', 'error')
    }
  }

  const openEdit = (branch: FamilyBranch) => {
    setForm({
      name: branch.name,
      description: branch.description || '',
      parent_branch_id: branch.parent_branch_id ? String(branch.parent_branch_id) : '',
    })
    setShowEdit(branch)
  }

  const openCreate = (parentId?: number) => {
    setForm({
      name: '',
      description: '',
      parent_branch_id: parentId ? String(parentId) : '',
    })
    setShowCreate(true)
  }

  const renderBranchNode = (node: BranchNode) => {
    const isExpanded = expandedIds.has(node.id)
    const hasChildren = node.children.length > 0
    const branchMembers = members.filter((m) => m.branch_id === node.id)

    return (
      <div key={node.id}>
        <div
          className="pg-card flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
          style={{ marginLeft: `${node.level * 24}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(node.id)}
              className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
              aria-label={isExpanded ? '折叠' : '展开'}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
            </button>
          ) : (
            <div className="flex h-6 w-6 items-center justify-center">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-[2px] bg-muted-foreground/30" />
            </div>
          )}
          {/* 支字号印 */}
          <PgSeal char={node.name.trim().charAt(0) || '支'} size={38} title={node.name} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ fontFamily: PG_SERIF, letterSpacing: '0.04em' }}>
                {node.name}
              </span>
              <span className="text-xs text-muted-foreground">
                <b style={{ fontFamily: PG_SERIF, color: PG_RED }}>{node.member_count}</b> 人
              </span>
              {!node.is_active && (
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  已停用
                </span>
              )}
            </div>
            {node.description && (
              <p className="truncate text-xs text-muted-foreground">{node.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowAssign({ branchId: node.id, branchName: node.name })}
              aria-label={`分配成员到${node.name}`}
              title="分配成员"
            >
              <UserPlus className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => openEdit(node)}
              aria-label={`编辑${node.name}`}
              title="编辑"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleDelete(node.id)}
              aria-label={`删除${node.name}`}
              title="删除"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
            </Button>
          </div>
        </div>
        {/* Assigned members preview */}
        {isExpanded && branchMembers.length > 0 && (
          <div
            className="mt-1 flex flex-wrap gap-1.5"
            style={{ marginLeft: `${node.level * 24 + 28}px` }}
          >
            {branchMembers.slice(0, 5).map((m) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs"
                title={m.name}
              >
                {m.name}
                {m.generation && <span className="text-muted-foreground">(第{m.generation}世)</span>}
              </span>
            ))}
            {branchMembers.length > 5 && (
              <span className="text-xs text-muted-foreground">
                +{branchMembers.length - 5} 人
              </span>
            )}
          </div>
        )}
        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-2">
            {node.children.map((child) => renderBranchNode(child))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Layout>
      <div className="pg-rise mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => smartBack(navigate, `/family/${familyId}`)}
            aria-label="返回族谱"
            className="-ml-2 gap-1.5 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回族谱
          </Button>
        </div>

        <PgPageHead
          eyebrow="谱 牒 · 房 支"
          title="房支管理"
          subtitle={`共 ${flatBranches.length} 支 · 分房立支，昭穆有序`}
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStats(!showStats)}
                className="gap-1.5"
                aria-expanded={showStats}
              >
                {showStats ? '隐藏统计' : '支系列表'}
              </Button>
              <Button
                variant="apple"
                size="sm"
                onClick={() => openCreate()}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                新建房支
              </Button>
            </>
          }
        />

        {/* Statistics Panel */}
        {showStats && (
          <div className="pg-rise mb-6 space-y-4">
            <section className="pg-card p-5">
              <PgSectionHead text="各 支 统 计" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {flatBranches.map((branch) => {
                  const stats = getBranchStats(branch.id)
                  return (
                    <div
                      key={branch.id}
                      className="pg-card-soft p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-sm font-medium" style={{ fontFamily: PG_SERIF }}>{branch.name}</h4>
                        <span className="text-2xl font-semibold" style={{ fontFamily: PG_SERIF, color: PG_RED }}>
                          {stats.total}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                          <span>男</span>
                          <span className="font-medium text-foreground">{stats.male}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>女</span>
                          <span className="font-medium text-foreground">{stats.female}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>在世</span>
                          <span className="font-medium text-foreground">{stats.alive}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>已故</span>
                          <span className="font-medium text-foreground">{stats.deceased}</span>
                        </div>
                        {stats.generations.length > 0 && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>世代</span>
                            <span className="font-medium">{stats.generations.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {flatBranches.length >= 2 && (
              <section className="pg-card p-5">
                <PgSectionHead text="两 支 对 比" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>选择房支 一</Label>
                    <select
                      value={compareBranch1 || ''}
                      onChange={(e) => setCompareBranch1(e.target.value ? Number(e.target.value) : null)}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="">请选择...</option>
                      {flatBranches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>选择房支 二</Label>
                    <select
                      value={compareBranch2 || ''}
                      onChange={(e) => setCompareBranch2(e.target.value ? Number(e.target.value) : null)}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="">请选择...</option>
                      {flatBranches.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {compareBranch1 && compareBranch2 && compareBranch1 !== compareBranch2 && (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                          <th className="py-2 px-3 text-left font-medium">指标</th>
                          <th className="py-2 px-3 text-right font-medium">
                            {flatBranches.find((b) => b.id === compareBranch1)?.name}
                          </th>
                          <th className="py-2 px-3 text-right font-medium">
                            {flatBranches.find((b) => b.id === compareBranch2)?.name}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const s1 = getBranchStats(compareBranch1)
                          const s2 = getBranchStats(compareBranch2)
                          return [
                            { label: '总人数', v1: s1.total, v2: s2.total },
                            { label: '男性', v1: s1.male, v2: s2.male },
                            { label: '女性', v1: s1.female, v2: s2.female },
                            { label: '在世', v1: s1.alive, v2: s2.alive },
                            { label: '已故', v1: s1.deceased, v2: s2.deceased },
                          ].map((row) => (
                            <tr key={row.label} className="border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                              <td data-label="指标" className="py-2 px-3 text-muted-foreground">{row.label}</td>
                              <td data-label={flatBranches.find((b) => b.id === compareBranch1)?.name} className="py-2 px-3 text-right font-medium">{row.v1}</td>
                              <td data-label={flatBranches.find((b) => b.id === compareBranch2)?.name} className="py-2 px-3 text-right font-medium">{row.v2}</td>
                            </tr>
                          ))
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="加载中" />
          </div>
        ) : flatBranches.length === 0 ? (
          <div className="pg-card flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-muted/40">
              <GitBranch className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            </div>
            <h2 className="pg-title mb-2 text-lg font-medium">尚未立支</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              尚未立卷分房，待修谱人分房立支，以便族人分类管理
            </p>
            <Button
              variant="apple"
              onClick={() => openCreate()}
              className="gap-2"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              创建第一个房支
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {branches.map((node) => renderBranchNode(node))}
          </div>
        )}

        {/* Create Modal */}
        <Modal
          isOpen={showCreate}
          onClose={() => {
            setShowCreate(false)
            setForm({ name: '', description: '', parent_branch_id: '' })
          }}
          title="新建房支"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branch-name">
                房支名称 <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                id="branch-name"
                placeholder="如：长房、二房、长支..."
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-desc">描述</Label>
              <Input
                id="branch-desc"
                placeholder="房支的简要说明..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-parent">所属房支</Label>
              <select
                id="branch-parent"
                value={form.parent_branch_id}
                onChange={(e) => setForm((p) => ({ ...p, parent_branch_id: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">无（顶级房支）</option>
                {flatBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreate(false)}
              >
                取消
              </Button>
              <Button type="submit" variant="apple" className="flex-1" disabled={saving} aria-busy={saving}>
                {saving ? '创建中...' : '创建'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={!!showEdit}
          onClose={() => setShowEdit(null)}
          title="编辑房支"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">房支名称</Label>
              <Input
                id="edit-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">描述</Label>
              <Input
                id="edit-desc"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-parent">所属房支</Label>
              <select
                id="edit-parent"
                value={form.parent_branch_id}
                onChange={(e) => setForm((p) => ({ ...p, parent_branch_id: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">无（顶级房支）</option>
                {flatBranches
                  .filter((b) => b.id !== showEdit?.id)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowEdit(null)}
              >
                <X className="mr-1 h-4 w-4" aria-hidden="true" />
                取消
              </Button>
              <Button
                variant="apple"
                className="flex-1"
                onClick={handleUpdate}
                disabled={saving}
                aria-busy={saving}
              >
                <Save className="mr-1 h-4 w-4" aria-hidden="true" />
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Assign Member Modal */}
        <Modal
          isOpen={!!showAssign}
          onClose={() => {
            setShowAssign(null)
            setAssignMemberId(null)
          }}
          title={`分配成员 · ${showAssign?.branchName || ''}`}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assign-member">选择成员</Label>
              <select
                id="assign-member"
                value={assignMemberId || ''}
                onChange={(e) => setAssignMemberId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">请选择...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.generation ? `(第${m.generation}世)` : ''}
                    {m.branch_id ? ' ✓已分配' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowAssign(null)
                  setAssignMemberId(null)
                }}
              >
                取消
              </Button>
              <Button
                variant="apple"
                className="flex-1"
                onClick={handleAssignMember}
                disabled={!assignMemberId}
              >
                <UserPlus className="mr-1 h-4 w-4" aria-hidden="true" />
                分配
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  )
}
