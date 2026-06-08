import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Layout } from '@/components/layout/Layout'
import { Button, useToast } from '@/components/ui'
import {
  TreePine, BookOpen, Quote, Edit3, Save, X, Plus, Trash2,
  ChevronDown, ChevronUp, ArrowRight,
} from 'lucide-react'

interface Article {
  id: number
  family_id: number
  title: string
  content: string
  summary: string
  type: string
  sort_order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

export default function FamilyIntroPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const familyId = Number(id)
  const { showToast } = useToast()

  const [family, setFamily] = useState<any>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  // Edit state
  const [editIntro, setEditIntro] = useState('')
  const [editMotto, setEditMotto] = useState('')

  useEffect(() => {
    if (!familyId) return
    loadData()
  }, [familyId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [familyRes, articlesRes, roleRes] = await Promise.all([
        api.getFamily(familyId),
        api.getFamilyArticles(familyId),
        api.getMyRole(familyId),
      ])
      setFamily(familyRes.family)
      setArticles(articlesRes.articles || [])
      setCanEdit(roleRes.can_edit)
      setEditIntro(familyRes.family.intro || '')
      setEditMotto(familyRes.family.motto || '')
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveIntro = async () => {
    try {
      await api.updateFamilyIntro(familyId, { intro: editIntro, motto: editMotto })
      setFamily((prev: any) => ({ ...prev, intro: editIntro, motto: editMotto }))
      showToast('简介已保存', 'success')
      setEditMode(false)
    } catch (err: any) {
      showToast(err.message || '保存失败', 'error')
    }
  }

  const toggleExpand = (articleId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(articleId)) next.delete(articleId); else next.add(articleId)
      return next
    })
  }

  const handleDeleteArticle = async (articleId: number) => {
    if (!confirm('确定删除此文章？')) return
    try {
      await api.deleteFamilyArticle(familyId, articleId)
      setArticles((prev) => prev.filter((a) => a.id !== articleId))
      showToast('文章已删除', 'success')
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    }
  }

  const handleAddArticle = async () => {
    const title = prompt('请输入文章标题：')
    if (!title?.trim()) return
    try {
      const res = await api.createFamilyArticle(familyId, {
        title: title.trim(),
        content: '',
        summary: '',
        type: 'story',
      })
      setArticles((prev) => [...prev, res.article])
      showToast('文章已创建', 'success')
    } catch (err: any) {
      showToast(err.message || '创建失败', 'error')
    }
  }

  const handleUpdateArticle = async (articleId: number, field: string, value: any) => {
    try {
      await api.updateFamilyArticle(familyId, articleId, { [field]: value })
      setArticles((prev) => prev.map((a) => (a.id === articleId ? { ...a, [field]: value } : a)))
    } catch (err: any) {
      showToast(err.message || '更新失败', 'error')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Layout>
    )
  }

  if (!family) {
    return (
      <Layout>
        <div className="flex h-[60vh] items-center justify-center">
          <p className="text-muted-foreground">族谱不存在</p>
        </div>
      </Layout>
    )
  }

  const typeLabels: Record<string, string> = { intro: '简介', story: '故事', motto: '家训', rule: '族规' }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* 顶部导航 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-card shadow-sm">
              <TreePine className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ fontFamily: "'Noto Serif SC',serif" }}>{family.name}</h1>
              {family.surname && <p className="text-xs text-muted-foreground">姓氏：{family.surname}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs"
                onClick={() => editMode ? handleSaveIntro() : setEditMode(true)}>
                {editMode ? <><Save className="h-3.5 w-3.5" />保存</> : <><Edit3 className="h-3.5 w-3.5" />编辑</>}
              </Button>
            )}
            {editMode && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => { setEditMode(false); setEditIntro(family.intro || ''); setEditMotto(family.motto || '') }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* 家族简介 */}
        <div className="mb-8 rounded-lg border bg-card/50 p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
            家族简介
          </div>
          {editMode ? (
            <textarea
              value={editIntro}
              onChange={(e) => setEditIntro(e.target.value)}
              className="w-full min-h-[120px] rounded border bg-background p-3 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-border"
              placeholder="请输入家族简介..."
            />
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {family.intro || '暂无简介'}
            </p>
          )}
        </div>

        {/* 家训 */}
        {family.motto || editMode ? (
          <div className="mb-8 rounded-lg border bg-card/50 p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Quote className="h-4 w-4 text-amber-500" />
              家训/族训
            </div>
            {editMode ? (
              <input
                value={editMotto}
                onChange={(e) => setEditMotto(e.target.value)}
                className="w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-border"
                placeholder="请输入家训..."
              />
            ) : (
              <blockquote className="border-l-2 border-amber-400 pl-4 text-sm italic text-muted-foreground">
                {family.motto}
              </blockquote>
            )}
          </div>
        ) : null}

        {/* 文章列表 */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <BookOpen className="h-4 w-4 text-primary" />
              家族故事
            </h2>
            {editMode && (
              <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={handleAddArticle}>
                <Plus className="h-3.5 w-3.5" />添加文章
              </Button>
            )}
          </div>

          {articles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">暂无文章</p>
          ) : (
            <div className="space-y-3">
              {articles.map((article) => {
                const expanded = expandedIds.has(article.id)
                return (
                  <div key={article.id} className="rounded-lg border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] rounded bg-primary/10 text-primary px-1.5 py-0.5 font-medium">
                            {typeLabels[article.type] || article.type}
                          </span>
                          {editMode ? (
                            <input
                              value={article.title}
                              onChange={(e) => handleUpdateArticle(article.id, 'title', e.target.value)}
                              className="flex-1 rounded border bg-background px-2 py-0.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-border"
                            />
                          ) : (
                            <h3 className="text-sm font-medium text-foreground">{article.title}</h3>
                          )}
                        </div>
                        {(article.summary || editMode) && !expanded && (
                          editMode ? (
                            <textarea
                              value={article.summary}
                              onChange={(e) => handleUpdateArticle(article.id, 'summary', e.target.value)}
                              className="w-full mt-1 rounded border bg-background p-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-border"
                              placeholder="摘要..."
                              rows={2}
                            />
                          ) : (
                            <p className="text-xs text-muted-foreground mt-1">{article.summary}</p>
                          )
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-3 shrink-0">
                        {editMode && (
                          <button onClick={() => handleDeleteArticle(article.id)}
                            className="rounded p-1 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={() => toggleExpand(article.id)}
                          className="rounded p-1 text-muted-foreground hover:text-foreground">
                          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="mt-3 border-t pt-3">
                        {editMode ? (
                          <textarea
                            value={article.content}
                            onChange={(e) => handleUpdateArticle(article.id, 'content', e.target.value)}
                            className="w-full min-h-[100px] rounded border bg-background p-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-border"
                            placeholder="文章内容..."
                          />
                        ) : (
                          <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {article.content || '暂无内容'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 进入族谱按钮 */}
        <div className="flex justify-center border-t pt-8">
          <Button
            variant="apple"
            glow
            className="gap-2 px-8 h-11"
            onClick={() => navigate(`/family/${familyId}`)}
          >
            进入族谱
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Layout>
  )
}
