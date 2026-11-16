import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Family, FamilyTree, Member, GenerationRule, FamilyBranch, TreeNode } from '@/types'
import { Button, Modal, Input, Label, useToast, ScrollReveal, TimeMachinePanel } from '@/components/ui'
import { ReactFlowProvider } from '@xyflow/react'
import GenerationStats from '@/components/tree/GenerationStats'
import { PgSeal, PgSectionHead, PG_RED } from '@/components/ui/pedigree'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import {
  Plus,
  Users,
  GitBranch,
  UserPlus,
  Link2,
  Trash2,
  Search,
  Upload,
  Download,
  BarChart3,
  Filter,
  X,
  Clock,
  AlertCircle,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import FamilyHeader from './FamilyHeader'
import MemberCard from './MemberCard'
import type { MemberFormData } from './MemberFormModal'
import type { QuickFamilyFormData } from './QuickAddFamily'
import { createDefaultLayer } from './QuickAddFamily'

const FamilyTreeGraph = lazy(() => import('./FamilyTreeGraph'))
import { FamilyTreeEngine } from '@/components/tree-engine'
const Tree3DView = lazy(() => import('./Tree3DView'))
const TimelineView = lazy(() => import('./TimelineView'))
const FanChart = lazy(() => import('./FanChart'))
const HangingChart = lazy(() => import('./HangingChart'))
const HourglassTree = lazy(() => import('../tree/HourglassTree'))
const MemberFormModal = lazy(() => import('./MemberFormModal'))
const QuickAddFamily = lazy(() => import('./QuickAddFamily'))

const SAVE_SHORTCUT_KEYS = 'Ctrl+S / Ctrl+Enter'
const SAVE_SHORTCUT_HINT = `快捷保存：${SAVE_SHORTCUT_KEYS}`

const defaultMemberForm: MemberFormData = {
  name: '',
  gender: 'male',
  birth_date: '',
  death_date: '',
  generation: '',
  generation_name: '',
  bio: '',
  avatar: '',
  is_alive: true,
  courtesy_name: '',
  art_name: '',
  posthumous_name: '',
  burial_place: '',
  migration_note: '',
  spouse_family_name: '',
  privacy_level: 'public',
  privacy_override: false,
}

const defaultQuickFamilyForm: QuickFamilyFormData = {
  layers: [createDefaultLayer()],
}

export default function FamilyTreePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const familyId = Number(id)

  // 数据状态
  const [family, setFamily] = useState<Family | null>(null)
  const [treeData, setTreeData] = useState<FamilyTree | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [stats, setStats] = useState<{
    total: number;
    gender: { male: number; female: number; unknown: number };
    alive_status: { alive: number; deceased: number };
    generation: Record<string, number>;
    relationships: { parent: number; spouse: number; sibling: number };
  } | null>(null)
  const [activeTab, setActiveTab] = useState<'tree' | 'members' | 'relations' | 'stats'>('tree')
  const [searchParams, setSearchParams] = useSearchParams()
  const VIEW_KEYS = ['tree', 'fan', 'hanging', 'graph', 'timeline', '3d', 'hourglass'] as const
  const [treeViewType, setTreeViewTypeState] = useState<'tree' | 'fan' | 'hanging' | 'graph' | 'timeline' | '3d' | 'hourglass'>(() => {
    const v = searchParams.get('view')
    return (VIEW_KEYS as readonly string[]).includes(v ?? '') ? (v as typeof VIEW_KEYS[number]) : 'graph'
  })
  /* 管理员树上操作：右键菜单 + 待自动建立的关系 */
  const [treeContextMenu, setTreeContextMenu] = useState<{ member: TreeNode; x: number; y: number } | null>(null)
  const [pendingRelation, setPendingRelation] = useState<
    | { kind: 'child-of'; parentId: number }
    | { kind: 'spouse-of'; memberId: number }
    | { kind: 'parent-of'; childId: number }
    | null
  >(null)
  /* 拖拽连线确认：source=拖拽起点（长辈侧），target=落点 */
  const [connectDialog, setConnectDialog] = useState<{ sourceId: number; targetId: number } | null>(null)
  const [connectType, setConnectType] = useState<'parent' | 'spouse' | 'sibling'>('parent')
  /* 谱牒确认弹窗（替代原生 confirm） */
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string
    description: string
    danger?: boolean
    onConfirm: () => void
  } | null>(null)
  const [edgeContextMenu, setEdgeContextMenu] = useState<
    { id: number; type: string; sourceName: string; targetName: string; x: number; y: number } | null
  >(null)
  const [dupGroups, setDupGroups] = useState<Array<{
    name: string
    strong: boolean
    members: Array<{ id: number; name: string; birth_date: string | null; generation: number | null }>
  }>>([])
  /** 切换视图并同步 ?view= 参数（默认视图不占参数，刷新/直达均可还原） */
  const setTreeViewType = useCallback((v: typeof VIEW_KEYS[number]) => {
    setTreeViewTypeState(v)
    const params = new URLSearchParams(searchParams)
    if (v === 'graph') params.delete('view')
    else params.set('view', v)
    setSearchParams(params, { replace: true })
  }, [searchParams, setSearchParams])

  // 权限状态
  const [canEdit, setCanEdit] = useState(false)
  const [myRole, setMyRole] = useState<string>('viewer')

  // 成员搜索
  const [memberSearch, setMemberSearch] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 高级筛选
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false)
  const [advancedFilter, setAdvancedFilter] = useState({
    name: '',
    generation_min: '',
    generation_max: '',
    gender: '',
    is_alive: '',
  })
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Member[]>([])
  const [highlightedMemberId, setHighlightedMemberId] = useState<number | null>(null)

  // 添加/编辑成员
  const [showAddMember, setShowAddMember] = useState(false)
  const [showEditMember, setShowEditMember] = useState(false)
  const [memberForm, setMemberForm] = useState<MemberFormData>({ ...defaultMemberForm })
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const addMemberFormRef = useRef<HTMLFormElement>(null!)

  const editMemberFormRef = useRef<HTMLFormElement>(null!)
  // 添加关系
  const [showAddRelation, setShowAddRelation] = useState(false)
  const [relationForm, setRelationForm] = useState({
    member_id: 0,
    related_member_id: 0,
    relationship_type: 'parent',
  })

  // 快速建家庭
  const [showQuickFamily, setShowQuickFamily] = useState(false)
  const [quickFamilyForm, setQuickFamilyForm] = useState<QuickFamilyFormData>({
    ...defaultQuickFamilyForm,
  })
  const [addingQuickFamily, setAddingQuickFamily] = useState(false)
  const [, setBranches] = useState<FamilyBranch[]>([])

  // 批量导入
  const [showImport, setShowImport] = useState(false)
  const [showTimeMachine, setShowTimeMachine] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ message: string; added_count: number; error_count: number; errors: string[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 辈分字派（用于自动命名建议）
  const [generations, setGenerations] = useState<GenerationRule[]>([])
  const [relationships, setRelationships] = useState<Array<{ member_id: number; related_member_id: number; relationship_type: string }>>([])
  const [generationSuggestion, setGenerationSuggestion] = useState<string | null>(null)

  // 示例数据集
  const [showSampleModal, setShowSampleModal] = useState(false)
  const [sampleDatasets, setSampleDatasets] = useState<Array<{ key: string; name: string; description: string; member_count: number; generation_count: number }>>([])
  const [loadingSample, setLoadingSample] = useState(false)

  // ============ 弹窗操作 ============
  const closeAddMemberModal = useCallback(() => {
    setShowAddMember(false)
    setMemberForm({ ...defaultMemberForm })
  }, [])

  const closeEditMemberModal = useCallback(() => {
    setShowEditMember(false)
    setEditingMember(null)
    setMemberForm({ ...defaultMemberForm })
  }, [])

  const closeAllOverlays = useCallback(() => {
    setShowAddRelation(false)
    closeAddMemberModal()
    closeEditMemberModal()
  }, [closeAddMemberModal, closeEditMemberModal])

  const submitMemberFormByShortcut = useCallback(
    (e: KeyboardEvent) => {
      if (!canEdit) return
      if (showAddMember) {
        e.preventDefault()
        addMemberFormRef.current?.requestSubmit()
        return
      }
      if (showEditMember) {
        e.preventDefault()
        editMemberFormRef.current?.requestSubmit()
      }
    },
    [canEdit, showAddMember, showEditMember]
  )

  // 键盘快捷键
  useKeyboardShortcuts([
    {
      key: 'f',
      ctrl: true,
      callback: () => {
        searchInputRef.current?.focus()
      },
    },
    {
      key: 's',
      ctrl: true,
      preventDefault: false,
      callback: submitMemberFormByShortcut,
    },
    {
      key: 'Enter',
      ctrl: true,
      preventDefault: false,
      callback: submitMemberFormByShortcut,
    },
    {
      key: 'Escape',
      callback: () => {
        closeAllOverlays()
      },
    },
  ])

  // ============ 导出 PDF ============
  const handleExportPdf = async () => {
    setIsExporting(true)
    try {
      await api.exportPdf(familyId)
      showToast('导出成功', 'success')
    } catch (err: any) {
      showToast(err.message || '导出失败', 'error')
    } finally {
      setIsExporting(false)
    }
  }
  const [isExporting, setIsExporting] = useState(false)

  // ============ 快速建家庭处理（多代） ============
  const handleQuickFamilySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const firstFather = quickFamilyForm.layers[0]?.father?.name?.trim()
    if (!firstFather) {
      showToast('请输入第一代父亲姓名', 'error')
      return
    }
    setAddingQuickFamily(true)
    try {
      const layers = quickFamilyForm.layers.map((layer) => ({
        father: {
          name: layer.father.name.trim(),
          birth_date: layer.father.birth_date || undefined,
          generation: layer.father.generation ? Number(layer.father.generation) : undefined,
          generation_name: layer.father.generation_name || undefined,
          bio: layer.father.bio || undefined,
          is_alive: layer.father.is_alive,
        },
        mother: layer.mother.name.trim()
          ? {
              name: layer.mother.name.trim(),
              birth_date: layer.mother.birth_date || undefined,
              generation: layer.mother.generation ? Number(layer.mother.generation) : undefined,
              generation_name: layer.mother.generation_name || undefined,
              bio: layer.mother.bio || undefined,
              is_alive: layer.mother.is_alive,
            }
          : undefined,
        children: layer.children
          .filter((c) => c.name.trim())
          .map((c) => ({
            name: c.name.trim(),
            gender: c.gender as 'male' | 'female' | 'unknown',
            birth_date: c.birth_date || undefined,
            is_alive: c.is_alive,
          })),
      }))
      const result = await api.quickAddFamilyMulti(familyId, { layers })
      showToast(result.message, 'success')
      setShowQuickFamily(false)
      setQuickFamilyForm({ ...defaultQuickFamilyForm })
      loadData()
    } catch (err: any) {
      showToast(err.message || '添加失败', 'error')
    } finally {
      setAddingQuickFamily(false)
    }
  }

  // 批量导入
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    try {
      const result = await api.importMembers(familyId, file)
      setImportResult(result)
      if (result.added_count > 0) {
        showToast(result.message, 'success')
        loadData()
      }
    } catch (err: any) {
      showToast(err.message || '导入失败', 'error')
    } finally {
      setImporting(false)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ============ 数据加载 ============
  useEffect(() => {
    if (familyId) {
      loadData()
    }
  }, [familyId])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [familyData, treeDataResult, membersData, roleData, statsData, gensData, branchesData, relsData] = await Promise.all([
        api.getFamily(familyId),
        api.getFamilyTree(familyId),
        api.getMembers(familyId),
        api.getMyRole(familyId),
        api.getFamilyStats(familyId),
        api.getGenerations(familyId),
        api.getBranches(familyId),
        api.getRelationships(familyId).catch(() => ({ relationships: [] })),
      ])
      setFamily(familyData.family)
      setTreeData(treeDataResult)
      setMembers(membersData.members)
      setCanEdit(roleData.can_edit)
      setMyRole(roleData.role)
      setStats(statsData)
      setGenerations(gensData.generations)
      setBranches(branchesData.branches || [])
      setRelationships(relsData.relationships || [])
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  // ============ 示例数据集 ============
  const openSampleModal = useCallback(async () => {
    setShowSampleModal(true)
    try {
      const res = await api.listSampleDatasets()
      setSampleDatasets(res.datasets)
    } catch {
      showToast('获取示例数据集失败', 'error')
    }
  }, [])

  const handleLoadSample = useCallback(async (datasetKey: string) => {
    if (!confirm('加载示例数据会将成员和关系添加到当前家族，确定继续？')) return
    setLoadingSample(true)
    try {
      const res = await api.loadSampleData(familyId, datasetKey)
      showToast(`${res.dataset_name}：已添加 ${res.member_count} 人`, 'success')
      setShowSampleModal(false)
      loadData()
    } catch (e: any) {
      showToast(e.message || '加载示例数据失败', 'error')
    } finally {
      setLoadingSample(false)
    }
  }, [familyId])

  // ============ 成员操作 ============
  const handleMemberFormChange = useCallback(async (field: string, value: any) => {
    setMemberForm((prev) => ({ ...prev, [field]: value }))

    if (field === 'generation' && value && generations.length > 0) {
      const genNum = Number(value)
      if (!isNaN(genNum)) {
        try {
          const res = await api.suggestGeneration(familyId, genNum)
          if (res.has_rule && res.character) {
            setGenerationSuggestion(res.character)
          } else {
            setGenerationSuggestion(null)
          }
        } catch {
          setGenerationSuggestion(null)
        }
      }
    } else if (field === 'generation') {
      setGenerationSuggestion(null)
    }
  }, [familyId, generations])

  const applyGenerationSuggestion = () => {
    if (generationSuggestion) {
      setMemberForm((prev) => ({ ...prev, generation_name: generationSuggestion }))
      setGenerationSuggestion(null)
    }
  }

  // 成员列表 tab 激活时拉取疑似重复分组
  useEffect(() => {
    if (activeTab === 'members' && familyId) {
      api.getMemberDuplicates(familyId)
        .then((r) => setDupGroups(r.groups || []))
        .catch(() => setDupGroups([]))
    }
  }, [activeTab, familyId, members.length])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await api.addMember(familyId, {
        name: memberForm.name,
        gender: memberForm.gender as 'male' | 'female' | 'unknown',
        birth_date: memberForm.birth_date || undefined,
        death_date: memberForm.death_date || undefined,
        generation: memberForm.generation ? Number(memberForm.generation) : undefined,
        generation_name: memberForm.generation_name || undefined,
        bio: memberForm.bio || undefined,
        avatar: memberForm.avatar || undefined,
        is_alive: memberForm.is_alive,
        courtesy_name: memberForm.courtesy_name || undefined,
        art_name: memberForm.art_name || undefined,
        posthumous_name: memberForm.posthumous_name || undefined,
        burial_place: memberForm.burial_place || undefined,
        migration_note: memberForm.migration_note || undefined,
        spouse_family_name: memberForm.spouse_family_name || undefined,
        privacy_level: memberForm.privacy_level,
      })
      showToast('成员添加成功', 'success')
      // 智能线索：疑似同一人提示
      for (const w of (res.warnings || []) as string[]) showToast(w, 'error')
      // 右键菜单发起的添加：自动建立关系（节点 + 连线一步完成）
      const newId = res?.member?.id
      if (newId && pendingRelation) {
        try {
          if (pendingRelation.kind === 'child-of') {
            // parent 语义：member_id=子女，related_member_id=父/母
            await api.addRelationship(familyId, newId, pendingRelation.parentId, 'parent')
          } else if (pendingRelation.kind === 'spouse-of') {
            await api.addRelationship(familyId, pendingRelation.memberId, newId, 'spouse')
          } else {
            await api.addRelationship(familyId, pendingRelation.childId, newId, 'parent')
          }
        } catch (relErr: any) {
          showToast(relErr.message || '成员已添加，但自动建立关系失败', 'error')
        }
        setPendingRelation(null)
      }
      closeAddMemberModal()
      loadData()
    } catch (err: any) {
      showToast(err.message || '添加失败', 'error')
    }
  }

  /** 右键菜单：带预填与待建关系地打开添加成员弹窗 */
  const openAddMemberWith = (
    prefill: Partial<MemberFormData>,
    pending: NonNullable<typeof pendingRelation> | null,
  ) => {
    setPendingRelation(pending)
    setMemberForm({ ...defaultMemberForm, ...prefill })
    setShowAddMember(true)
  }

  const handleAdvancedSearch = async () => {
    setIsSearching(true)
    try {
      const params: { name?: string; generation?: number; gender?: string; is_alive?: boolean; generation_min?: number; generation_max?: number } = {}
      if (advancedFilter.name.trim()) params.name = advancedFilter.name.trim()
      if (advancedFilter.generation_min) params.generation_min = Number(advancedFilter.generation_min)
      if (advancedFilter.generation_max) params.generation_max = Number(advancedFilter.generation_max)
      if (advancedFilter.gender) params.gender = advancedFilter.gender
      if (advancedFilter.is_alive === 'true') params.is_alive = true
      else if (advancedFilter.is_alive === 'false') params.is_alive = false

      const res = await api.advancedSearch(familyId, params)
      setSearchResults(res.members)
    } catch (err: any) {
      showToast(err.message || '搜索失败', 'error')
    } finally {
      setIsSearching(false)
    }
  }

  const clearAdvancedFilter = () => {
    setAdvancedFilter({
      name: '',
      generation_min: '',
      generation_max: '',
      gender: '',
      is_alive: '',
    })
    setSearchResults([])
  }

  const hasActiveFilters = advancedFilter.name || advancedFilter.generation_min || advancedFilter.gender || advancedFilter.is_alive

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMember) return
    try {
      await api.updateMember(familyId, editingMember.id, {
        name: memberForm.name,
        gender: memberForm.gender as 'male' | 'female' | 'unknown',
        birth_date: memberForm.birth_date || undefined,
        death_date: memberForm.death_date || undefined,
        generation: memberForm.generation ? Number(memberForm.generation) : undefined,
        generation_name: memberForm.generation_name || undefined,
        bio: memberForm.bio || undefined,
        avatar: memberForm.avatar || undefined,
        is_alive: memberForm.is_alive,
        courtesy_name: memberForm.courtesy_name || undefined,
        art_name: memberForm.art_name || undefined,
        posthumous_name: memberForm.posthumous_name || undefined,
        burial_place: memberForm.burial_place || undefined,
        migration_note: memberForm.migration_note || undefined,
        spouse_family_name: memberForm.spouse_family_name || undefined,
        privacy_level: memberForm.privacy_level,
        privacy_override: memberForm.privacy_override,
      })
      showToast('成员信息已更新', 'success')
      closeEditMemberModal()
      loadData()
    } catch (err: any) {
      showToast(err.message || '更新失败', 'error')
    }
  }

  /** 打开删除成员确认弹窗（旧调用方沿用此名） */
  const handleDeleteMember = (memberId: number) => {
    const m = members.find((x) => x.id === memberId)
    setConfirmDialog({
      title: '删除成员',
      description: `确定删除「${m?.name ?? `#${memberId}`}」吗？相关关系也会一并删除。`,
      danger: true,
      onConfirm: () => actuallyDeleteMember(memberId),
    })
  }

  const actuallyDeleteMember = async (memberId: number) => {
    try {
      await api.deleteMember(familyId, memberId)
      showToast('成员已删除', 'success')
      loadData()
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    }
  }

  const handleAddRelation = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.addRelationship(
        familyId,
        relationForm.member_id,
        relationForm.related_member_id,
        relationForm.relationship_type
      )
      showToast('关系添加成功', 'success')
      setShowAddRelation(false)
      setRelationForm({ member_id: 0, related_member_id: 0, relationship_type: 'parent' })
      loadData()
    } catch (err: any) {
      showToast(err.message || '添加关系失败', 'error')
    }
  }

  const openEditMember = (member: Member) => {
    setEditingMember(member)
    setMemberForm({
      name: member.name,
      gender: member.gender,
      birth_date: member.birth_date || '',
      death_date: member.death_date || '',
      generation: member.generation?.toString() || '',
      generation_name: member.generation_name || '',
      bio: member.bio || '',
      avatar: member.avatar || '',
      is_alive: member.is_alive,
      courtesy_name: member.courtesy_name || '',
      art_name: member.art_name || '',
      posthumous_name: member.posthumous_name || '',
      burial_place: member.burial_place || '',
      migration_note: member.migration_note || '',
      spouse_family_name: member.spouse_family_name || '',
      privacy_level: member.privacy_level || 'public',
      privacy_override: member.privacy_override || false,
    })
    setShowEditMember(true)
  }

  // ============ 快速建家庭表单回调 ============
  const handleAddLayer = useCallback(() => {
    setQuickFamilyForm((prev) => ({
      ...prev,
      layers: [...prev.layers, createDefaultLayer()],
    }))
  }, [])

  const handleRemoveLayer = useCallback((idx: number) => {
    setQuickFamilyForm((prev) => ({
      ...prev,
      layers: prev.layers.filter((_, i) => i !== idx),
    }))
  }, [])

  const handleChangeLayerFather = useCallback((layerIdx: number, field: string, value: any) => {
    setQuickFamilyForm((prev) => {
      const layers = prev.layers.map((layer, i) =>
        i === layerIdx ? { ...layer, father: { ...layer.father, [field]: value } } : layer
      )
      return { ...prev, layers }
    })
  }, [])

  const handleChangeLayerMother = useCallback((layerIdx: number, field: string, value: any) => {
    setQuickFamilyForm((prev) => {
      const layers = prev.layers.map((layer, i) =>
        i === layerIdx ? { ...layer, mother: { ...layer.mother, [field]: value } } : layer
      )
      return { ...prev, layers }
    })
  }, [])

  const handleAddLayerChild = useCallback((layerIdx: number) => {
    setQuickFamilyForm((prev) => {
      const layers = prev.layers.map((layer, i) =>
        i === layerIdx
          ? { ...layer, children: [...layer.children, { name: '', gender: 'male', birth_date: '', is_alive: true }] }
          : layer
      )
      return { ...prev, layers }
    })
  }, [])

  const handleRemoveLayerChild = useCallback((layerIdx: number, childIdx: number) => {
    setQuickFamilyForm((prev) => {
      const layers = prev.layers.map((layer, i) =>
        i === layerIdx
          ? { ...layer, children: layer.children.filter((_, ci) => ci !== childIdx) }
          : layer
      )
      return { ...prev, layers }
    })
  }, [])

  const handleChangeLayerChild = useCallback((layerIdx: number, childIdx: number, field: string, value: any) => {
    setQuickFamilyForm((prev) => {
      const layers = prev.layers.map((layer, i) => {
        if (i !== layerIdx) return layer
        const children = layer.children.map((c, ci) =>
          ci === childIdx ? { ...c, [field]: value } : c
        )
        return { ...layer, children }
      })
      return { ...prev, layers }
    })
  }, [])

  // ============ 渲染 ============
  const handleNavigate = useCallback(
    (path: string) => navigate(path),
    [navigate]
  )

  return (
    <ScrollReveal>
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="relative z-[2] mx-auto max-w-7xl space-y-6">
        <FamilyHeader
          family={family}
          myRole={myRole}
          canEdit={canEdit}
          familyId={familyId}
          isExporting={isExporting}
          members={members}
          onNavigate={handleNavigate}
          onAddMember={() => setShowAddMember(true)}
          onAddRelation={() => setShowAddRelation(true)}
          onOpenQuickFamily={() => {
            setShowQuickFamily(true)
            setQuickFamilyForm({ ...defaultQuickFamilyForm })
          }}
          onOpenImport={() => setShowImport(true)}
          onExportPdf={handleExportPdf}
        />

        {/* 匾额 */}
        {family && (
          <div className="pg-card relative overflow-hidden px-4 py-7 text-center sm:px-6">
            <div className="text-xs tracking-[0.5em] text-muted-foreground">家 之 谱 系</div>
            <div className="mt-3 flex items-center justify-center gap-4">
              {family.surname && (
                <PgSeal char={family.surname} size={56} title={`姓印 · ${family.surname}`} />
              )}
              <h1 className="pg-title text-3xl font-semibold text-foreground sm:text-4xl">
                {family.surname ? `${family.surname}氏` : ''}·{family.name}
              </h1>
            </div>
            {family.motto && (
              <p className="pg-title mt-2 text-sm text-muted-foreground">「{family.motto}」</p>
            )}
          </div>
        )}

        {/* Tab 切换 */}
        <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
          {[
            { key: 'tree', label: '族谱树', icon: GitBranch },
            { key: 'members', label: '成员列表', icon: Users },
            { key: 'relations', label: '关系管理', icon: Link2 },
            { key: 'stats', label: '数据统计', icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex flex-1 items-center justify-center gap-2 rounded px-4 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* 族谱树 */}
        {activeTab === 'tree' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                {[
                  { key: 'tree', label: '树形图' },
                  { key: 'fan', label: '扇形图' },
                  { key: 'hanging', label: '吊线图' },
                  { key: 'graph', label: '交互图' },
                  { key: 'hourglass', label: '沙漏图' },
                  { key: 'timeline', label: '时间线' },
                  { key: '3d', label: '3D视图' },
                ].map((view) => (
                  <button
                    key={view.key}
                    onClick={() => setTreeViewType(view.key as any)}
                    className={`rounded px-3 py-1.5 text-sm font-medium transition-all ${
                      treeViewType === view.key
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {view.label}
                  </button>
                ))}
              </div>
              {canEdit && (
                <button
                  onClick={openSampleModal}
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-muted"
                  title="加载内置示例族谱数据"
                >
                  加载示例
                </button>
              )}
            </div>

            {treeViewType === 'tree' && (
              <ReactFlowProvider>
                <FamilyTreeEngine
                  treeData={treeData}
                  canEdit={canEdit}
                  onMemberClick={(member) => {
                    setHighlightedMemberId(member.id)
                  }}
                  highlightedMemberId={highlightedMemberId}
                  familyId={familyId}
                  onNodeContextMenu={(m, x, y) => {
                    if (canEdit) setTreeContextMenu({ member: m, x, y })
                  }}
                  onPaneClick={() => { setTreeContextMenu(null); setEdgeContextMenu(null) }}
                  onCanvasDoubleClick={() => {
                    if (canEdit) openAddMemberWith({ generation: '1' }, null)
                  }}
                  onCreateRelationship={(sourceId, targetId) => {
                    setConnectType('parent')
                    setConnectDialog({ sourceId, targetId })
                  }}
                  onEdgeContextMenu={(edge, x, y) => {
                    if (canEdit) setEdgeContextMenu({ ...edge, x, y })
                  }}
                />
              </ReactFlowProvider>
            )}

            {treeViewType === 'fan' && (
              <Suspense fallback={<div className="flex h-[500px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" /></div>}>
                <FanChart
                  treeData={treeData}
                  members={members}
                  canEdit={canEdit}
                  familyId={familyId}
                  isLoading={isLoading}
                  onEditMember={openEditMember}
                  onDeleteMember={handleDeleteMember}
                />
              </Suspense>
            )}

            {treeViewType === 'hanging' && (
              <Suspense fallback={<div className="flex h-[500px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" /></div>}>
                <HangingChart
                  treeData={treeData}
                  members={members}
                  canEdit={canEdit}
                  familyId={familyId}
                  isLoading={isLoading}
                  onEditMember={openEditMember}
                  onDeleteMember={handleDeleteMember}
                />
              </Suspense>
            )}

            {treeViewType === 'graph' && (
              <Suspense fallback={<div className="flex h-[500px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" /></div>}>
                <ReactFlowProvider>
                <FamilyTreeGraph
                  treeData={treeData}
                  canEdit={canEdit}
                  onMemberClick={(member) => {
                    setHighlightedMemberId(member.id)
                  }}
                  highlightedMemberId={highlightedMemberId}
                  onClearSelection={() => setHighlightedMemberId(null)}
                  familyId={familyId}
                />
                </ReactFlowProvider>
              </Suspense>
            )}

            {treeViewType === 'hourglass' && (
              <Suspense fallback={<div className="flex h-[500px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" /></div>}>
                <HourglassTree
                  familyId={familyId}
                  initialMemberId={highlightedMemberId}
                  onMemberClick={(member) => setHighlightedMemberId(member.id)}
                />
              </Suspense>
            )}

            {treeViewType === 'timeline' && (
              <Suspense fallback={<div className="flex h-[500px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" /></div>}>
                <TimelineView
                  members={members}
                  onMemberClick={(member) => {
                    setHighlightedMemberId(member.id)
                  }}
                  highlightedMemberId={highlightedMemberId}
                  onOpenDetail={(member) => navigate(`/family/${familyId}/member/${member.id}`)}
                />
              </Suspense>
            )}

            {treeViewType === '3d' && (
              <Suspense fallback={<div className="flex h-[600px] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" /></div>}>
                <Tree3DView
                  members={members}
                  relationships={relationships}
                  familyId={familyId}
                  onMemberClick={(member) => {
                    setHighlightedMemberId(member.id)
                  }}
                  highlightedMemberId={highlightedMemberId}
                />
              </Suspense>
            )}
          </div>
        )}

        {/* 成员列表 */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Users className="mb-4 h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
                <p className="pg-title mb-1 text-muted-foreground">谱中尚无成员</p>
                <p className="mb-4 text-xs text-muted-foreground/80">点击下方按钮，录入第一位族人</p>
                {canEdit && (
                  <Button
                    variant="apple" glow
                    onClick={() => setShowAddMember(true)}
                    className="gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    添加成员
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* 疑似重复成员提示 */}
                {dupGroups.length > 0 && (
                  <div
                    className="mb-3 rounded-md border p-3"
                    style={{
                      borderColor: `color-mix(in srgb, ${PG_RED} 35%, transparent)`,
                      background: `color-mix(in srgb, ${PG_RED} 6%, transparent)`,
                    }}
                  >
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold" style={{ color: PG_RED }}>
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      发现 {dupGroups.length} 组疑似重复成员（同名且生年相同/同世代）
                    </p>
                    <div className="space-y-1.5">
                      {dupGroups.map((g) => (
                        <div key={g.name} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className="text-muted-foreground">
                            {g.name}（{g.members.length} 人）
                            {g.strong && <b className="ml-1" style={{ color: PG_RED }}>高度疑似</b>}
                          </span>
                          {g.members.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => navigate(`/family/${familyId}/member/${m.id}`)}
                              className="rounded border px-1.5 py-0.5 transition-colors hover:text-foreground"
                              style={{ borderColor: 'hsl(var(--border))' }}
                              title="查看成员详情"
                            >
                              {m.name}
                              {m.birth_date ? `（${String(m.birth_date).slice(0, 4)}）` : ''}
                              {m.generation ? `·${m.generation}代` : ''}
                            </button>
                          ))}
                          <span className="text-[10px] text-muted-foreground">核对后可用族谱合并处理</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 搜索和高级筛选 */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input
                        ref={searchInputRef}
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="搜索成员姓名..."
                        className="pl-9"
                        aria-label="搜索家族成员"
                      />
                    </div>
                    <Button
                      variant={hasActiveFilters ? 'primary' : 'outline'}
                      size="icon"
                      onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                      className="relative"
                      aria-label="高级筛选"
                    >
                      <Filter className="h-4 w-4" />
                      {hasActiveFilters && (
                        <span
                          style={{ backgroundColor: PG_RED }}
                          className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-white"
                        >
                         !
                        </span>
                      )}
                    </Button>
                  </div>

                  {/* 高级筛选面板 */}
                  {showAdvancedFilter && (
                    <div className="rounded-lg border bg-card p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <PgSectionHead text="高 级 筛 选" />
                        </div>
                        {hasActiveFilters && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAdvancedFilter}
                            className="h-7 gap-1 text-xs"
                          >
                            <X className="h-3 w-3" />
                            清除筛选
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="filter-name" className="text-xs">姓名</Label>
                          <Input
                            id="filter-name"
                            value={advancedFilter.name}
                            onChange={(e) => setAdvancedFilter({ ...advancedFilter, name: e.target.value })}
                            placeholder="输入姓名"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="filter-gender" className="text-xs">性别</Label>
                          <select
                            id="filter-gender"
                            value={advancedFilter.gender}
                            onChange={(e) => setAdvancedFilter({ ...advancedFilter, gender: e.target.value })}
                            className="flex h-9 w-full rounded border border-border bg-background px-3 py-2 text-sm"
                          >
                            <option value="">全部</option>
                            <option value="male">男</option>
                            <option value="female">女</option>
                            <option value="unknown">未知</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="filter-gen-min" className="text-xs">起始辈分</Label>
                          <Input
                            id="filter-gen-min"
                            type="number"
                            min={1}
                            value={advancedFilter.generation_min}
                            onChange={(e) => setAdvancedFilter({ ...advancedFilter, generation_min: e.target.value })}
                            placeholder="如：1"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="filter-gen-max" className="text-xs">结束辈分</Label>
                          <Input
                            id="filter-gen-max"
                            type="number"
                            min={1}
                            value={advancedFilter.generation_max}
                            onChange={(e) => setAdvancedFilter({ ...advancedFilter, generation_max: e.target.value })}
                            placeholder="如：10"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="filter-alive" className="text-xs">在世状态</Label>
                          <select
                            id="filter-alive"
                            value={advancedFilter.is_alive}
                            onChange={(e) => setAdvancedFilter({ ...advancedFilter, is_alive: e.target.value })}
                            className="flex h-9 w-full rounded border border-border bg-background px-3 py-2 text-sm"
                          >
                            <option value="">全部</option>
                            <option value="true">在世</option>
                            <option value="false">已故</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button
                          variant="apple" glow
                          size="sm"
                          onClick={handleAdvancedSearch}
                          disabled={isSearching}
                          className="flex-1"
                        >
                          {isSearching ? '搜索中...' : '搜索'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAdvancedFilter(false)}
                        >
                          关闭
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* 搜索结果或成员列表 */}
                  {searchResults.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          找到 {searchResults.length} 个匹配结果
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearchResults([])
                            setMemberSearch('')
                          }}
                          className="h-7 gap-1 text-xs"
                        >
                          <X className="h-3 w-3" />
                          清除结果
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {searchResults.map((member) => (
                          <MemberCard
                            key={member.id}
                            member={member}
                            canEdit={canEdit}
                            onView={(id) => navigate(`/family/${familyId}/member/${id}`)}
                            onDelete={handleDeleteMember}
                          />
                        ))}
                      </div>
                    </div>
                  ) : hasActiveFilters && !isSearching ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Search className="mb-2 h-8 w-8 opacity-40" aria-hidden="true" />
                      <p className="pg-title text-sm">未找到匹配的成员</p>
                    </div>
                  ) : null}
                </div>

                {/* 按辈分分组 */}
                {searchResults.length === 0 && !hasActiveFilters && (() => {
                  const filtered = memberSearch.trim()
                    ? members.filter((m) =>
                        m.name.toLowerCase().includes(memberSearch.trim().toLowerCase())
                      )
                    : members

                  if (filtered.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Search className="mb-2 h-8 w-8 opacity-40" aria-hidden="true" />
                        <p className="pg-title text-sm">未找到匹配的成员</p>
                      </div>
                    )
                  }

                  return Array.from(new Set(filtered.map((m) => m.generation ?? 0)))
                    .sort((a, b) => a - b)
                    .map((gen) => (
                      <div key={gen}>
                        <h3 className="pg-title mb-2 text-sm font-medium text-muted-foreground">
                          {gen > 0 ? `第${gen}世` : '未设置辈分'}
                        </h3>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {filtered
                            .filter((m) => (m.generation ?? 0) === gen)
                            .map((member) => (
                              <MemberCard
                                key={member.id}
                                member={member}
                                canEdit={canEdit}
                                onView={(id) => navigate(`/family/${familyId}/member/${id}`)}
                                onDelete={handleDeleteMember}
                              />
                            ))}
                        </div>
                      </div>
                    ))
                })()}
              </>
            )}
          </div>
        )}

        {/* 关系管理 */}
        {activeTab === 'relations' && (
          <div className="space-y-4">
            <PgSectionHead
              text="家 族 关 系"
              right={
                canEdit ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddRelation(true)}
                    className="gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    添加关系
                  </Button>
                ) : undefined
              }
            />

            {treeData && treeData.edges.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {treeData.edges.map((edge) => {
                  const sourceNode = treeData.nodes.find((n) => n.id === edge.source)
                  const targetNode = treeData.nodes.find((n) => n.id === edge.target)
                  if (!sourceNode || !targetNode) return null

                  const typeLabel =
                    edge.type === 'parent'
                      ? '的父/母是'
                      : edge.type === 'spouse'
                      ? '的配偶是'
                      : '的兄弟姐妹是'

                  return (
                    <div
                      key={edge.id}
                      className="flex items-center gap-3 rounded border bg-card p-4"
                    >
                      <div className="flex flex-1 items-center gap-2">
                        <span className="font-medium">{sourceNode.name}</span>
                        <span className="text-xs text-muted-foreground">{typeLabel}</span>
                        <span className="font-medium">{targetNode.name}</span>
                      </div>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={async () => {
                            try {
                              await api.deleteRelationship(familyId, edge.id)
                              showToast('关系已删除', 'success')
                              loadData()
                            } catch (err: any) {
                              showToast(err.message || '删除失败', 'error')
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <Link2 className="mb-4 h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
                <p className="pg-title mb-1 text-muted-foreground">暂无亲属关系</p>
                <p className="mb-4 text-xs text-muted-foreground/80">为两位族人添加父母、配偶或兄弟姐妹关系</p>
                <Button
                  variant="outline"
                  onClick={() => setShowAddRelation(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  添加关系
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 数据统计 */}
        {activeTab === 'stats' && stats && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded border bg-card p-4">
                <p className="text-sm text-muted-foreground">总人数</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="rounded border bg-card p-4">
                <p className="text-sm text-muted-foreground">男性</p>
                <p className="text-2xl font-bold text-blue-600">{stats.gender.male}</p>
              </div>
              <div className="rounded border bg-card p-4">
                <p className="text-sm text-muted-foreground">女性</p>
                <p className="text-2xl font-bold text-pink-600">{stats.gender.female}</p>
              </div>
              <div className="rounded border bg-card p-4">
                <p className="text-sm text-muted-foreground">在世</p>
                <p className="text-2xl font-bold text-green-600">{stats.alive_status.alive}</p>
              </div>
            </div>

            {/* 字辈频次统计（新增） */}
            {familyId && <GenerationStats familyId={familyId} />}

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded border bg-card p-4">
                <h3 className="pg-title mb-4 text-sm text-muted-foreground">性别分布</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: '男性', value: stats.gender.male, fill: '#2563eb' },
                          { name: '女性', value: stats.gender.female, fill: '#ec4899' },
                          { name: '未知', value: stats.gender.unknown || 0, fill: '#94a3b8' },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        {[
                          { name: '男性', value: stats.gender.male, fill: '#2563eb' },
                          { name: '女性', value: stats.gender.female, fill: '#ec4899' },
                          { name: '未知', value: stats.gender.unknown || 0, fill: '#94a3b8' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}人`, '']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded border bg-card p-4">
                <h3 className="pg-title mb-4 text-sm text-muted-foreground">在世/已故分布</h3>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: '在世', value: stats.alive_status.alive, fill: '#34c759' },
                          { name: '已故', value: stats.alive_status.deceased || (stats.total - stats.alive_status.alive), fill: '#6b7280' },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#34c759" />
                        <Cell fill="#6b7280" />
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}人`, '']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="rounded border bg-card p-4">
              <h3 className="pg-title mb-4 text-sm text-muted-foreground">辈分分布</h3>
              {Object.entries(stats.generation).length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries(stats.generation)
                        .map(([gen, count]) => ({
                          name: gen,
                          count: count as number,
                        }))
                        .sort((a, b) => {
                          const aNum = parseInt(a.name.replace('第', '').replace('代', ''))
                          const bNum = parseInt(b.name.replace('第', '').replace('代', ''))
                          return aNum - bNum
                        })}
                      layout="vertical"
                    >
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={60} />
                      <Tooltip formatter={(value) => [`${value}人`, '人数']} />
                      <Bar dataKey="count" fill={PG_RED} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">暂无辈分数据</p>
              )}
            </div>

            {(stats as any).age_groups && (
              <div className="rounded border bg-card p-4">
                <h3 className="pg-title mb-4 text-sm text-muted-foreground">人口金字塔（年龄分布）</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={Object.entries((stats as any).age_groups).map(([age, data]: [string, any]) => ({
                        age,
                        男: -data.male,
                        女: data.female,
                      }))}
                    >
                      <XAxis dataKey="age" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => [Math.abs(Number(value)) + '人', '']} />
                      <Legend />
                      <Bar dataKey="男" fill="#2563eb" stackId="gender" />
                      <Bar dataKey="女" fill="#ec4899" stackId="gender" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded border bg-card p-4">
                <p className="text-sm text-muted-foreground">父母关系</p>
                <p className="text-2xl font-bold">{stats.relationships.parent}</p>
              </div>
              <div className="rounded border bg-card p-4">
                <p className="text-sm text-muted-foreground">配偶关系</p>
                <p className="text-2xl font-bold">{stats.relationships.spouse}</p>
              </div>
              <div className="rounded border bg-card p-4">
                <p className="text-sm text-muted-foreground">兄弟姐妹关系</p>
                <p className="text-2xl font-bold">{stats.relationships.sibling}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 添加/编辑成员弹窗 */}
      <Suspense fallback={null}>
        <MemberFormModal
          showAdd={showAddMember}
          showEdit={showEditMember}
          formData={memberForm}
          editingMember={editingMember}
          formRefAdd={addMemberFormRef}
          formRefEdit={editMemberFormRef}
          saveShortcutHint={SAVE_SHORTCUT_HINT}
          familyId={familyId}
          onChange={handleMemberFormChange}
          onCloseAdd={closeAddMemberModal}
          onCloseEdit={closeEditMemberModal}
          onSubmitAdd={handleAddMember}
          onSubmitEdit={handleEditMember}
          generationSuggestion={generationSuggestion}
          onApplySuggestion={applyGenerationSuggestion}
        />
      </Suspense>

      {/* 添加关系弹窗 */}
      <Modal
        isOpen={showAddRelation}
        onClose={() => setShowAddRelation(false)}
        title="添加关系"
      >
        <form onSubmit={handleAddRelation} className="space-y-4">
          <div className="space-y-2">
            <Label>成员A</Label>
            <select
              value={relationForm.member_id || ''}
              onChange={(e) =>
                setRelationForm((p) => ({
                  ...p,
                  member_id: Number(e.target.value),
                }))
              }
              className="flex h-11 w-full rounded border border-border bg-background px-4 py-2 text-sm"
              required
            >
              <option value="">选择成员</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>关系类型</Label>
            <select
              value={relationForm.relationship_type}
              onChange={(e) =>
                setRelationForm((p) => ({
                  ...p,
                  relationship_type: e.target.value,
                }))
              }
              className="flex h-11 w-full rounded border border-border bg-background px-4 py-2 text-sm"
            >
              <option value="parent">A 是 B 的父/母</option>
              <option value="spouse">A 是 B 的配偶</option>
              <option value="sibling">A 是 B 的兄弟姐妹</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>成员B</Label>
            <select
              value={relationForm.related_member_id || ''}
              onChange={(e) =>
                setRelationForm((p) => ({
                  ...p,
                  related_member_id: Number(e.target.value),
                }))
              }
              className="flex h-11 w-full rounded border border-border bg-background px-4 py-2 text-sm"
              required
            >
              <option value="">选择成员</option>
              {members
                .filter((m) => m.id !== relationForm.member_id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setShowAddRelation(false)}
            >
              取消
            </Button>
            <Button type="submit" variant="apple" glow className="flex-1">
              添加
            </Button>
          </div>
        </form>
      </Modal>

      {/* 快速建家庭弹窗 */}
      <Suspense fallback={null}>
        <QuickAddFamily
          isOpen={showQuickFamily}
          formData={quickFamilyForm}
          adding={addingQuickFamily}
          onClose={() => {
            setShowQuickFamily(false)
            setQuickFamilyForm({ ...defaultQuickFamilyForm })
          }}
          onSubmit={handleQuickFamilySubmit}
          onAddLayer={handleAddLayer}
          onRemoveLayer={handleRemoveLayer}
          onChangeLayerFather={handleChangeLayerFather}
          onChangeLayerMother={handleChangeLayerMother}
          onAddLayerChild={handleAddLayerChild}
          onRemoveLayerChild={handleRemoveLayerChild}
          onChangeLayerChild={handleChangeLayerChild}
        />
      </Suspense>

      {/* 批量导入弹窗 */}
      <Modal
        isOpen={showImport}
        onClose={() => {
          setShowImport(false)
          setImportResult(null)
        }}
        title="批量导入成员"
      >
        <div className="space-y-4">
          <div className="rounded border bg-muted/20 p-4 text-sm text-muted-foreground">
            <p className="mb-2 font-medium text-foreground">文件格式说明：</p>
            <ul className="list-inside list-disc space-y-1">
              <li>支持 <strong>.csv</strong> 和 <strong>.xlsx</strong> / <strong>.xls</strong> 格式</li>
              <li>必须包含 <strong>name</strong>（姓名）列</li>
              <li>可选列：gender（性别）、birth_date（出生日期）、death_date（逝世日期）、generation（辈分）、generation_name（辈分名称）、bio（简介）、is_alive（在世）</li>
              <li>gender 可选值：male（男）、female（女）、unknown（未知）</li>
              <li>is_alive 可选值：1 / yes / true / 是（在世），0 / no / false / 否（已故）</li>
            </ul>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => api.downloadTemplate(familyId, 'excel')}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              下载 Excel 模板
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => api.downloadTemplate(familyId, 'csv')}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              下载 CSV 模板
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {importing ? '导入中...' : '选择文件'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>

          {importResult && (
            <div className={`rounded border p-4 ${importResult.error_count > 0 ? 'border-destructive/30 bg-destructive/10' : 'border-border bg-muted/50'}`}>
              <p className="mb-2 font-medium text-foreground">
                导入完成：成功 {importResult.added_count} 条
                {importResult.error_count > 0 && `，失败 ${importResult.error_count} 条`}
              </p>
              {importResult.errors.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto">
                  <p className="mb-1 text-xs font-medium text-destructive">错误详情：</p>
                  {importResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-destructive/90">{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="border-t pt-4">
            <p className="mb-2 text-sm font-medium text-foreground">导出成员</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => api.exportFullBook(familyId, family?.name || 'family')}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                完整谱书 PDF
              </Button>
                            <Button
                variant="outline"
                size="sm"
                onClick={() => api.exportMembersCsv(familyId)}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                导出 CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => api.exportMembersExcel(familyId)}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                导出 Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await api.exportGedcom(familyId)
                    showToast('GEDCOM 已导出', 'success')
                  } catch (err: any) {
                    showToast(err?.message || 'GEDCOM 导出失败', 'error')
                  }
                }}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                导出 GEDCOM
              </Button>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => {
              setShowImport(false)
              setImportResult(null)
            }}
          >
            关闭
          </Button>
        </div>
      </Modal>

      {/* 示例数据集弹窗 */}
      <Modal
        isOpen={showSampleModal}
        onClose={() => setShowSampleModal(false)}
        title="加载示例族谱"
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            选择一个内置示例数据集，将其成员和关系添加到当前家族。
          </p>
          {sampleDatasets.length === 0 ? (
            <p className="text-sm text-muted-foreground">加载中…</p>
          ) : (
            <div className="space-y-2">
              {sampleDatasets.map((ds) => (
                <div
                  key={ds.key}
                  className="rounded-lg border bg-muted/20 p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-medium">{ds.name}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ds.description}
                      </p>
                      <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                        <span>{ds.member_count} 人</span>
                        <span>·</span>
                        <span>{ds.generation_count} 代</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleLoadSample(ds.key)}
                      disabled={loadingSample}
                      style={{ backgroundColor: PG_RED }}
                      className="shrink-0 rounded-md px-3 py-1.5 text-xs text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {loadingSample ? '加载中…' : '加载'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* 浮动：时光机入口 */}
      <button
        onClick={() => setShowTimeMachine((s) => !s)}
        style={{ backgroundColor: PG_RED }}
        className="fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-all hover:scale-110 active:scale-95 sm:bottom-6"
        aria-label="时光机"
        title="时光机模式"
      >
        <Clock className="h-5 w-5" aria-hidden="true" />
      </button>

      <TimeMachinePanel
        members={members}
        open={showTimeMachine}
        onClose={() => setShowTimeMachine(false)}
        isMemberAliveAt={(m, year) => {
          const by = m.birth_date ? parseInt(m.birth_date.toString().match(/(-?\d{1,4})/)?.[1] || '0', 10) : 0;
          const dy = m.death_date ? parseInt(m.death_date.toString().match(/(-?\d{1,4})/)?.[1] || '9999', 10) : 9999;
          if (by && year < by) return false;
          if (dy < 9999 && year > dy) return false;
          return true;
        }}
      />

      {/* 拖拽连线确认：A → B 选关系类型后建立真实关系 */}
      {connectDialog && (() => {
        const a = members.find((m) => m.id === connectDialog.sourceId)
        const b = members.find((m) => m.id === connectDialog.targetId)
        const confirmConnect = async () => {
          try {
            if (connectType === 'parent') {
              // parent 语义：member_id=子女，related_member_id=父/母（拖拽起点为长辈）
              await api.addRelationship(familyId, connectDialog.targetId, connectDialog.sourceId, 'parent')
            } else {
              await api.addRelationship(familyId, connectDialog.sourceId, connectDialog.targetId, connectType)
            }
            showToast('连线成功，关系已建立', 'success')
            setConnectDialog(null)
            loadData()
          } catch (err: any) {
            showToast(err.message || '建立关系失败', 'error')
          }
        }
        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setConnectDialog(null)} />
            <div
              className="relative z-10 w-full max-w-sm rounded-[4px] border p-5 shadow-xl"
              style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}
            >
              <h3 className="font-serif text-base font-semibold">确认连线</h3>
              <p className="mt-3 flex items-center gap-2 text-sm">
                <b className="font-serif">{a?.name || `#${connectDialog.sourceId}`}</b>
                <span className="text-muted-foreground">—→</span>
                <b className="font-serif">{b?.name || `#${connectDialog.targetId}`}</b>
              </p>
              <div className="mt-3 space-y-2">
                <Label>关系类型</Label>
                <select
                  value={connectType}
                  onChange={(e) => setConnectType(e.target.value as 'parent' | 'spouse' | 'sibling')}
                  className="flex h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm"
                  style={{ borderColor: 'hsl(var(--border))' }}
                >
                  <option value="parent">父母子女（{a?.name || '起点'} 为长辈）</option>
                  <option value="spouse">配偶（夫妻）</option>
                  <option value="sibling">兄弟姐妹</option>
                </select>
                <p className="text-xs text-muted-foreground">连线方向即辈分方向：从长辈拖到晚辈。</p>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setConnectDialog(null)}>
                  取消
                </Button>
                <Button size="sm" onClick={confirmConnect}>
                  建立连线
                </Button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 谱牒确认弹窗：替代原生 confirm */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setConfirmDialog(null)}
          />
          <div
            className="relative z-10 w-full max-w-sm rounded-[4px] border p-5 shadow-xl"
            style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--card))' }}
          >
            <h3 className="font-serif text-base font-semibold" style={confirmDialog.danger ? { color: '#A63A2E' } : undefined}>
              {confirmDialog.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{confirmDialog.description}</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmDialog(null)}>
                取消
              </Button>
              <Button
                size="sm"
                onClick={() => { const fn = confirmDialog.onConfirm; setConfirmDialog(null); fn() }}
                className={confirmDialog.danger ? 'text-white' : undefined}
                style={confirmDialog.danger ? { backgroundColor: '#A63A2E', borderColor: '#A63A2E' } : undefined}
              >
                确认
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 连线右键菜单：删除关系 */}
      {edgeContextMenu && (() => {
        const typeLabel = { parent: '父母子女', spouse: '配偶', sibling: '兄弟姐妹' }[
          edgeContextMenu.type as 'parent' | 'spouse' | 'sibling'
        ] || edgeContextMenu.type
        const removeEdge = async () => {
          try {
            await api.deleteRelationship(familyId, edgeContextMenu.id)
            showToast('连线已删除', 'success')
            setEdgeContextMenu(null)
            loadData()
          } catch (err: any) {
            showToast(err.message || '删除失败', 'error')
          }
        }
        setEdgeContextMenu(null)
        setConfirmDialog({
          title: '删除连线',
          description: `确定删除「${edgeContextMenu.sourceName} — ${edgeContextMenu.targetName}」的${typeLabel}关系吗？`,
          danger: true,
          onConfirm: removeEdge,
        })
        return (
          <>
            <div
              className="fixed inset-0 z-[60]"
              onClick={() => setEdgeContextMenu(null)}
              onContextMenu={(e) => { e.preventDefault(); setEdgeContextMenu(null) }}
            />
            <div
              className="fixed z-[61] w-52 overflow-hidden rounded-[4px] border bg-card py-1 shadow-xl"
              style={{
                left: Math.min(edgeContextMenu.x, window.innerWidth - 230),
                top: Math.min(edgeContextMenu.y, window.innerHeight - 120),
                borderColor: 'hsl(var(--border))',
              }}
            >
              <p className="mb-1 border-b px-3 py-1.5 text-xs text-muted-foreground" style={{ borderColor: 'hsl(var(--border))' }}>
                {edgeContextMenu.sourceName} — {edgeContextMenu.targetName}
                <span className="ml-1 text-[10px]">（{typeLabel}）</span>
              </p>
              <button
                onClick={removeEdge}
                className="block w-full px-3 py-1.5 text-left text-xs text-destructive transition-colors hover:bg-destructive/10"
              >
                删除连线
              </button>
            </div>
          </>
        )
      })()}

      {/* 树上右键菜单：管理员添加子女/配偶/父母、连线既有成员、编辑/删除 */}
      {treeContextMenu && (() => {
        const m = treeContextMenu.member
        const items: Array<{ label: string; action: () => void; danger?: boolean }> = [
          {
            label: '添加子女',
            action: () => {
              setPendingRelation({ kind: 'child-of', parentId: m.id })
              setMemberForm({ ...defaultMemberForm, generation: String((m.generation || 1) + 1), is_alive: true })
              setShowAddMember(true)
            },
          },
          {
            label: '添加配偶',
            action: () => {
              setPendingRelation({ kind: 'spouse-of', memberId: m.id })
              setMemberForm({
                ...defaultMemberForm,
                generation: String(m.generation || 1),
                gender: m.gender === 'male' ? 'female' : 'male',
                is_alive: true,
              })
              setShowAddMember(true)
            },
          },
          {
            label: '添加父母',
            action: () => {
              setPendingRelation({ kind: 'parent-of', childId: m.id })
              setMemberForm({
                ...defaultMemberForm,
                generation: String(Math.max(1, (m.generation || 2) - 1)),
                is_alive: false,
              })
              setShowAddMember(true)
            },
          },
          {
            label: '连接到…（既有成员）',
            action: () => {
              setRelationForm((p) => ({ ...p, member_id: m.id }))
              setShowAddRelation(true)
            },
          },
          { label: '编辑成员', action: () => openEditMember(m as unknown as Member) },
          {
            label: '删除成员',
            action: () => {
              setTreeContextMenu(null)
              setConfirmDialog({
                title: '删除成员',
                description: `确定删除「${m.name}」吗？相关关系也会一并删除。`,
                danger: true,
                onConfirm: () => actuallyDeleteMember(m.id),
              })
            },
            danger: true,
          },
        ]
        return (
          <>
            <div
              className="fixed inset-0 z-[60]"
              onClick={() => { setTreeContextMenu(null); setEdgeContextMenu(null) }}
              onContextMenu={(e) => { e.preventDefault(); setTreeContextMenu(null); setEdgeContextMenu(null) }}
            />
            <div
              className="fixed z-[61] w-44 overflow-hidden rounded-[4px] border bg-card py-1 shadow-xl"
              style={{
                left: Math.min(treeContextMenu.x, window.innerWidth - 190),
                top: Math.min(treeContextMenu.y, window.innerHeight - 250),
                borderColor: 'hsl(var(--border))',
              }}
            >
              <p className="mb-1 border-b px-3 py-1.5 font-serif text-xs text-muted-foreground" style={{ borderColor: 'hsl(var(--border))' }}>
                {m.name}
              </p>
              {items.map((it) => (
                <button
                  key={it.label}
                  onClick={() => { setTreeContextMenu(null); it.action() }}
                  className={`block w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-muted ${
                    it.danger ? 'text-destructive hover:bg-destructive/10' : 'text-foreground'
                  }`}
                >
                  {it.label}
                </button>
              ))}
            </div>
          </>
        )
      })()}
    </div>
    </ScrollReveal>
  )
}
