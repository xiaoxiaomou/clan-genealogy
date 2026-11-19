import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { Family } from '@/types'
import {
  Button,
  Modal,
  Input,
  Label,
  useToast,
} from '@/components/ui'
import { Layout } from '@/components/layout/Layout'
import { PgPageHead, PgSeal } from '@/components/ui/pedigree'
import {
  Plus,
  Users,
  Globe,
  Lock,
  MapPin,
  ArrowRight,
  Shield,
  Trash2,
} from 'lucide-react'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [families, setFamilies] = useState<Family[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    surname: '',
    origin: '',
    description: '',
    is_public: false,
  })
  const [formErrors, setFormErrors] = useState<{
    name?: string
  }>({})

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      try {
        const user = JSON.parse(stored)
        setIsAdmin(user.is_admin || false)
      } catch {
        /* ignore */
      }
    }
    loadFamilies()
  }, [])

  const loadFamilies = async () => {
    try {
      const data = await api.getFamilies()
      setFamilies(data.families)
    } catch (err: any) {
      showToast(err.message || '加载族谱失败', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!createForm.name.trim()) {
      setFormErrors({ name: '请输入族谱名称' })
      return
    }
    
    setFormErrors({})
    
    try {
      const data = await api.createFamily(createForm)
      showToast('族谱创建成功', 'success')
      setShowCreate(false)
      setCreateForm({
        name: '',
        surname: '',
        origin: '',
        description: '',
        is_public: false,
      })
      await loadFamilies()
      navigate(`/family/${data.family.id}`)
    } catch (err: any) {
      showToast(err.message || '创建失败', 'error')
    }
  }

  const handleDeleteFamily = async (e: React.MouseEvent, familyId: number) => {
    e.stopPropagation()
    if (!confirm('确定要删除该族谱吗？此操作不可恢复，所有成员和关系数据也将被删除。')) return
    try {
      await api.deleteFamily(familyId)
      showToast('族谱已删除', 'success')
      loadFamilies()
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    }
  }

  return (
    <Layout>
      

      <div className="mx-auto max-w-6xl px-6 py-8">
        <PgPageHead
          eyebrow="谱 牒 · 总 目"
          title="我的族谱"
          subtitle="收录您名下的族谱卷帙，管理与浏览家族传承"
          actions={
            <>
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => navigate('/admin/users')}
                  className="gap-2"
                >
                  <Shield className="h-4 w-4" aria-hidden="true" />
                  用户管理
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="apple"
                  onClick={() => setShowCreate(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  创建族谱
                </Button>
              )}
            </>
          }
        />

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-live="polite">
            {[1, 2, 3].map((i) => (
              <div key={i} className="pg-card animate-pulse p-5">
                <div className="h-12 w-12 rounded-lg bg-muted" />
                <div className="mt-4 h-5 w-2/3 rounded bg-muted" />
                <div className="mt-2 h-4 w-1/2 rounded bg-muted" />
                <div className="mt-6 h-4 w-full rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : families.length === 0 ? (
          <div className="pg-card pg-rise flex flex-col items-center justify-center py-16">
            <PgSeal char="谱" size={72} title="谱印" />
            <h2 className="pg-title mt-6 text-xl font-semibold">
              {isAdmin ? '开始创建您的第一个族谱' : '暂无族谱'}
            </h2>
            <p className="mt-2 mb-6 max-w-md text-center text-sm leading-7 text-muted-foreground">
              {isAdmin
                ? '族谱是记录家族传承的载体。点击下方按钮，创建属于您家族的族谱吧。'
                : '您暂未被授权访问任何族谱，请联系管理员获取权限。'}
            </p>
            {isAdmin && (
              <Button
                variant="apple"
                size="lg"
                onClick={() => setShowCreate(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                创建族谱
              </Button>
            )}
          </div>
        ) : (
          <div className="pg-rise grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {families.map((family) => (
              <div
                key={family.id}
                className="pg-card group cursor-pointer p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                onClick={() => navigate(`/family/${family.id}/intro`)}
              >
                <div className="flex items-start justify-between">
                  <PgSeal
                    char={family.surname || '谱'}
                    size={48}
                    title={`${family.name} · 姓氏印`}
                  />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDeleteFamily(e, family.id)}
                      className="rounded p-2 text-muted-foreground opacity-0 transition-all hover:bg-destructive/8 hover:text-destructive group-hover:opacity-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label={`删除族谱：${family.name}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                    {family.is_public ? (
                      <Globe className="h-4 w-4 text-muted-foreground" aria-label="公开族谱" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" aria-label="私有族谱" />
                    )}
                  </div>
                </div>
                <h3 className="pg-title mt-4 text-lg font-semibold text-foreground">
                  {family.name}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {family.surname ? `${family.surname}氏家族` : '族谱一卷'}
                </p>
                {family.description && (
                  <p className="mt-3 text-sm leading-6 text-muted-foreground line-clamp-2">
                    {family.description}
                  </p>
                )}
                <div
                  className="mt-4 flex items-center justify-between border-t pt-3 text-sm text-muted-foreground"
                  style={{ borderColor: 'hsl(var(--border))' }}
                >
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      {family.member_count} 人
                    </span>
                    {family.origin && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {family.origin}
                      </span>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showCreate}
        onClose={() => {
          setShowCreate(false)
          setFormErrors({})
        }}
        title="创建族谱"
      >
        <form onSubmit={handleCreate} className="space-y-4" noValidate aria-label="创建族谱表单">
          <div className="space-y-2">
            <Label htmlFor="family-name">
              族谱名称 <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="family-name"
              placeholder="例如：张氏族谱"
              value={createForm.name}
              onChange={(e) => {
                setCreateForm((prev) => ({ ...prev, name: e.target.value }))
                if (e.target.value.trim()) {
                  setFormErrors({})
                }
              }}
              onBlur={() => {
                if (!createForm.name.trim()) {
                  setFormErrors({ name: '请输入族谱名称' })
                }
              }}
              error={formErrors.name}
              aria-invalid={!!formErrors.name}
              required
              aria-required="true"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="surname">姓氏</Label>
              <Input
                id="surname"
                placeholder="张"
                value={createForm.surname}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, surname: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="origin">籍贯</Label>
              <Input
                id="origin"
                placeholder="山东济南"
                value={createForm.origin}
                onChange={(e) =>
                  setCreateForm((prev) => ({ ...prev, origin: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">简介</Label>
            <textarea
              id="desc"
              placeholder="描述这个族谱的历史和来源..."
              value={createForm.description}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={3}
              className="flex w-full rounded-lg border-0 bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_public"
              checked={createForm.is_public}
              onChange={(e) =>
                setCreateForm((prev) => ({
                  ...prev,
                  is_public: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <Label htmlFor="is_public" className="cursor-pointer">
              公开族谱（允许他人查看）
            </Label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowCreate(false)
                setFormErrors({})
              }}
            >
              取消
            </Button>
            <Button type="submit" variant="apple" glow className="flex-1">
              创建
            </Button>
          </div>
        </form>
      </Modal>
    </Layout>
  )
}
