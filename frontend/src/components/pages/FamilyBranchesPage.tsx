import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { FamilyBranch, Member } from '@/types'
import {
  Button,
  Modal,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  useToast,
  BorderGlow,
} from '@/components/ui'
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
  PieChart,
  BarChart3,
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
          className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent/50"
          style={{ marginLeft: `${node.level * 24}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(node.id)}
              className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent"
              aria-label={isExpanded ? '折叠' : '展开'}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="h-6 w-6 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
            </div>
          )}
          <div className="flex items-center gap-3 flex-1">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 border border-primary/20">
              <GitBranch className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{node.name}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {node.member_count} 人
                </span>
                {!node.is_active && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">
                    已停用
                  </span>
                )}
              </div>
              {node.description && (
                <p className="text-xs text-muted-foreground truncate">{node.description}</p>
              )}
            </div>
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
              <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => openEdit(node)}
              aria-label={`编辑${node.name}`}
              title="编辑"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => handleDelete(node.id)}
              aria-label={`删除${node.name}`}
              title="删除"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
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
                {m.generation && <span className="text-muted-foreground">({m.generation}代)</span>}
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
          <div className="space-y-1 mt-1">
            {node.children.map((child) => renderBranchNode(child))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Layout>

      <BorderGlow
        backgroundColor="transparent"
        className="!bg-transparent border-0 p-0 mx-auto w-full"
        colors={['#4facfe', '#00f2fe', '#43e97b']}
        glowIntensity={0.3}
        edgeSensitivity={35}
      >
        <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/family/${familyId}`)}
              aria-label="返回族谱"
            >
              <ArrowLeft className="mr-1 h-4 w-4" aria-hidden="true" />
              返回族谱
            </Button>
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <h1 className="text-xl font-semibold text-foreground">分支管理</h1>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {flatBranches.length}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStats(!showStats)}
              className="gap-1.5"
            >
              <PieChart className="h-3.5 w-3.5" />
              {showStats ? '隐藏统计' : '分支统计'}
            </Button>
            <Button
              variant="apple"
              glow
              size="sm"
              onClick={() => openCreate()}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              新建分支
            </Button>
          </div>
        </div>

        {/* Statistics Panel */}
        {showStats && (
          <div className="mb-6 space-y-4 animate-fade-in">
            <Card spotlight>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <PieChart className="h-4 w-4" />
                  各分支统计概览
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {flatBranches.map((branch) => {
                    const stats = getBranchStats(branch.id)
                    return (
                      <div
                        key={branch.id}
                        className="rounded-lg border bg-card p-4 hover:bg-accent/30 transition-colors"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="font-medium">{branch.name}</h4>
                          <span className="text-2xl font-bold text-primary">{stats.total}</span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between text-muted-foreground">
                            <span>男</span>
                            <span className="text-blue-600 font-medium">{stats.male}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>女</span>
                            <span className="text-pink-600 font-medium">{stats.female}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>在世</span>
                            <span className="text-green-600 font-medium">{stats.alive}</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>已故</span>
                            <span className="text-gray-600 font-medium">{stats.deceased}</span>
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
              </CardContent>
            </Card>

            {flatBranches.length >= 2 && (
              <Card spotlight>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4" />
                    分支对比
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>选择分支 1</Label>
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
                      <Label>选择分支 2</Label>
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
                      <table className="w-full text-sm table-cards">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 font-medium">指标</th>
                            <th className="text-right py-2 px-3 font-medium">
                              {flatBranches.find((b) => b.id === compareBranch1)?.name}
                            </th>
                            <th className="text-right py-2 px-3 font-medium">
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
                              <tr key={row.label} className="border-b">
                                <td data-label="指标" className="py-2 px-3 text-muted-foreground">{row.label}</td>
                                <td data-label={flatBranches.find((b) => b.id === compareBranch1)?.name} className="text-right py-2 px-3 font-medium">{row.v1}</td>
                                <td data-label={flatBranches.find((b) => b.id === compareBranch2)?.name} className="text-right py-2 px-3 font-medium">{row.v2}</td>
                              </tr>
                            ))
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : flatBranches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded bg-primary/8 border border-primary/15">
              <GitBranch className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mb-2 text-lg font-medium">暂无分支</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              分支用于管理家族的不同房支，方便族谱成员的分类管理
            </p>
            <Button
              variant="apple"
              glow
              onClick={() => openCreate()}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              创建第一个分支
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
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
          title="新建分支"
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branch-name">
                分支名称 <span className="text-destructive">*</span>
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
                placeholder="分支的简要说明..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-parent">父级分支</Label>
              <select
                id="branch-parent"
                value={form.parent_branch_id}
                onChange={(e) => setForm((p) => ({ ...p, parent_branch_id: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">无（顶级分支）</option>
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
              <Button type="submit" variant="apple" glow className="flex-1" disabled={saving}>
                {saving ? '创建中...' : '创建'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={!!showEdit}
          onClose={() => setShowEdit(null)}
          title="编辑分支"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">分支名称</Label>
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
              <Label htmlFor="edit-parent">父级分支</Label>
              <select
                id="edit-parent"
                value={form.parent_branch_id}
                onChange={(e) => setForm((p) => ({ ...p, parent_branch_id: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">无（顶级分支）</option>
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
                <X className="mr-1 h-4 w-4" />
                取消
              </Button>
              <Button
                variant="apple"
                glow
                className="flex-1"
                onClick={handleUpdate}
                disabled={saving}
              >
                <Save className="mr-1 h-4 w-4" />
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
          title={`分配成员 - ${showAssign?.branchName || ''}`}
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
                    {m.name} {m.generation ? `(第${m.generation}代)` : ''}
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
                glow
                className="flex-1"
                onClick={handleAssignMember}
                disabled={!assignMemberId}
              >
                <UserPlus className="mr-1 h-4 w-4" />
                分配
              </Button>
            </div>
          </div>
        </Modal>
      </div>
      </BorderGlow>
    </Layout>
  )
}
