import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Layout } from '@/components/layout/Layout'
import { Button, Input, useToast } from '@/components/ui'
import { useConfirm } from '@/components/ui'
import {
  ChevronDown, ChevronUp, Plus, Trash2, ArrowRight, BookOpen, PenLine, ArrowLeft,
} from 'lucide-react'
import { PgSectionHead } from '@/components/ui/pedigree'
import { smartBack } from '@/lib/smartBack'

/* ── 谱书卷首设计令牌：与个人设置页同源的朱砂 + 宋体 ── */
const SEAL_RED = '#A63A2E'
const SERIF_DISPLAY = "'Noto Serif SC', 'STSong', 'KaiTi', 'STKaiti', serif"

const CN_NUM = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十']

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
  const { ask, dialog } = useConfirm()
  const { showToast } = useToast()

  const [family, setFamily] = useState<any>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [stats, setStats] = useState<{ memberCount: number; maxGen: number; genSet: Set<number> }>({
    memberCount: 0, maxGen: 0, genSet: new Set(),
  })
  const [loading, setLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [aiDrafting, setAiDrafting] = useState(false)
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
      const [familyRes, articlesRes, roleRes, treeRes] = await Promise.all([
        api.getFamily(familyId),
        api.getFamilyArticles(familyId),
        api.getMyRole(familyId),
        api.getFamilyTree(familyId).catch(() => null),
      ])
      const fam = familyRes.family
      setFamily(fam)
      setArticles(articlesRes.articles || [])
      setCanEdit(roleRes.can_edit)
      setEditIntro(fam.intro || '')
      setEditMotto(fam.motto || '')
      const nodes = treeRes?.nodes || []
      const genSet = new Set<number>()
      let maxGen = 0
      for (const n of nodes) {
        if (typeof n.generation === 'number') {
          genSet.add(n.generation)
          if (n.generation > maxGen) maxGen = n.generation
        }
      }
      setStats({ memberCount: nodes.length || fam.member_count || 0, maxGen, genSet })
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAiDraft = async () => {
    setAiDrafting(true)
    try {
      const r = await api.aiDraft(familyId, { kind: 'preface' })
      setEditIntro(r.text)
      showToast('谱序已草拟，可自行润色后保存', 'success')
    } catch (err: any) {
      showToast(err.message || '草拟失败', 'error')
    } finally {
      setAiDrafting(false)
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
    if (!(await ask({ title: '删除文章', message: '确定要删除这篇文章吗？此操作不可恢复。', confirmText: '确认删除', danger: true }))) return
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

  /* 卷首语首字（去空白） */
  const introText = family.intro || ''
  const leadChar = introText.trim().charAt(0)
  const introRest = introText.trim().slice(1)

  /* 字辈字符及世代标注 */
  const zibeiChars: string[] = (family.zibei_text || '').replace(/\s+/g, '').split('')
  const zibeiStart = family.zibei_assignment === 'generation_based'
    ? (family.zibei_start_generation || 1)
    : 1

  /* 朱点分段标题（共享谱牒原语） */
  const SectionHead = ({ text }: { text: string }) => <PgSectionHead text={text} />

  return (
    <Layout>
      <div className="fi-intro pg-rise mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <style>{`
          .fi-intro { font-size: 14px; }
          .fi-intro .fi-dot { width: 6px; height: 6px; border-radius: 2px; background: ${SEAL_RED}; flex-shrink: 0; }
          .fi-intro .fi-section-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
          .fi-intro .fi-section-title {
            font-family: ${SERIF_DISPLAY}; font-size: 15px; font-weight: 600;
            letter-spacing: .18em; color: hsl(var(--foreground));
          }
          .fi-intro .fi-section-rule { flex: 1; height: 1px; background: hsl(var(--border)); }
          .fi-intro .fi-serif { font-family: ${SERIF_DISPLAY}; }

          /* 卷首 */
          .fi-intro .fi-volhead { overflow: hidden; border-radius: 12px; border: 1px solid hsl(var(--border)); background: hsl(var(--card)); }
          .fi-intro .fi-volhead-grid { display: grid; grid-template-columns: 1fr 200px; }
          .fi-intro .fi-volhead-main { padding: 30px 34px 26px; }
          .fi-intro .fi-eyebrow { display: flex; align-items: center; gap: 8px; font-size: 11px; letter-spacing: .32em; color: hsl(var(--muted-foreground)); }
          .fi-intro .fi-title-row { display: flex; align-items: center; gap: 18px; margin-top: 16px; }
          .fi-intro .fi-name-seal {
            width: 64px; height: 64px; border-radius: 8px; flex-shrink: 0;
            background: ${SEAL_RED}; color: #fff; display: flex; align-items: center; justify-content: center;
            font-family: ${SERIF_DISPLAY}; font-size: 34px; font-weight: 600;
            box-shadow: 0 2px 6px rgb(0 0 0 / .18); transform: rotate(-2deg);
          }
          .fi-intro .fi-family-name { font-family: ${SERIF_DISPLAY}; font-size: 34px; font-weight: 600; letter-spacing: .08em; line-height: 1.2; }
          .fi-intro .fi-family-sub { font-size: 11px; color: hsl(var(--muted-foreground)); margin-top: 2px; letter-spacing: .12em; }
          .fi-intro .fi-colophon {
            display: flex; flex-wrap: wrap; align-items: center; row-gap: 8px;
            margin-top: 22px; padding-top: 18px; border-top: 1px solid hsl(var(--border));
            font-size: 12.5px; color: hsl(var(--muted-foreground));
          }
          .fi-intro .fi-colophon b { color: hsl(var(--foreground)); font-weight: 500; }
          .fi-intro .fi-colophon .sep { margin: 0 14px; width: 1px; height: 12px; background: hsl(var(--border)); }

          /* 祖训挂轴 */
          .fi-intro .fi-scroll-panel {
            border-left: 1px solid hsl(var(--border));
            background: hsl(var(--muted) / .4);
            display: flex; align-items: center; justify-content: center;
            padding: 24px 18px 34px; position: relative;
          }
          .fi-intro .fi-motto-frame {
            border: 1px solid color-mix(in srgb, ${SEAL_RED} 35%, transparent);
            outline: 3px solid color-mix(in srgb, ${SEAL_RED} 10%, transparent);
            outline-offset: 3px; border-radius: 4px;
            padding: 20px 16px 12px; background: hsl(var(--card));
            display: flex; flex-direction: column; align-items: center; gap: 8px;
          }
          .fi-intro .fi-motto-text {
            writing-mode: vertical-rl;
            font-family: ${SERIF_DISPLAY}; font-size: 19px; font-weight: 600;
            letter-spacing: .34em; color: ${SEAL_RED}; max-height: 260px;
          }
          .fi-intro .fi-motto-seal {
            width: 22px; height: 22px; border-radius: 3px;
            background: ${SEAL_RED}; color: #fff;
            font-family: ${SERIF_DISPLAY}; font-size: 12px;
            display: flex; align-items: center; justify-content: center;
            transform: rotate(3deg); flex-shrink: 0;
          }
          .fi-intro .fi-motto-caption {
            position: absolute; bottom: 8px; left: 0; right: 0; text-align: center;
            font-size: 11px; letter-spacing: .3em; color: hsl(var(--muted-foreground));
          }

          /* 卷首语 */
          .fi-intro .fi-prose {
            border: 1px solid hsl(var(--border)); border-radius: 12px;
            padding: 24px 28px; background: hsl(var(--card));
            font-family: ${SERIF_DISPLAY}; font-size: 14.5px; line-height: 2.05;
            color: hsl(var(--foreground) / .85); white-space: pre-wrap;
          }
          .fi-intro .fi-lead-char {
            font-size: 30px; color: ${SEAL_RED}; font-weight: 600;
            margin-right: 6px; line-height: 1;
          }

          /* 字辈 */
          .fi-intro .fi-zibei-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
          .fi-intro .fi-zibei-char {
            width: 42px; height: 46px; display: flex; align-items: center; justify-content: center;
            border: 1px solid hsl(var(--border)); border-radius: 6px;
            font-family: ${SERIF_DISPLAY}; font-size: 19px; font-weight: 600;
            color: hsl(var(--foreground)); background: hsl(var(--card)); position: relative;
          }
          .fi-intro .fi-zibei-char small {
            position: absolute; bottom: 1px; left: 0; right: 0;
            font-size: 9px; color: hsl(var(--muted-foreground)); font-family: system-ui, sans-serif;
            font-weight: 400; text-align: center;
          }
          .fi-intro .fi-zibei-char.gen-present {
            border-color: color-mix(in srgb, ${SEAL_RED} 45%, transparent);
            color: ${SEAL_RED};
          }
          .fi-intro .fi-zibei-note { font-size: 11.5px; color: hsl(var(--muted-foreground)); margin-top: 12px; }

          /* 目次 */
          .fi-intro .fi-toc { border: 1px solid hsl(var(--border)); border-radius: 12px; background: hsl(var(--card)); overflow: hidden; }
          .fi-intro .fi-toc-item { border-bottom: 1px solid hsl(var(--border)); }
          .fi-intro .fi-toc-item:last-child { border-bottom: 0; }
          .fi-intro .fi-toc-row {
            display: flex; align-items: center; gap: 14px; width: 100%;
            padding: 14px 20px; background: transparent; border: 0;
            color: hsl(var(--foreground)); font-size: 13.5px; text-align: left; cursor: pointer;
          }
          .fi-intro .fi-toc-row:hover { background: hsl(var(--muted) / .3); }
          .fi-intro .fi-toc-row .vol {
            font-family: ${SERIF_DISPLAY}; font-size: 13px; letter-spacing: .1em;
            color: ${SEAL_RED}; flex-shrink: 0; width: 44px;
          }
          .fi-intro .fi-toc-row .title { flex: 1; font-weight: 500; }
          .fi-intro .fi-toc-row .tag {
            font-size: 10.5px; padding: 2px 8px; border-radius: 999px; flex-shrink: 0;
            background: hsl(var(--primary) / .1); color: hsl(var(--primary));
          }
          .fi-intro .fi-toc-row .chev { color: hsl(var(--muted-foreground)); display: flex; flex-shrink: 0; }
          .fi-intro .fi-toc-body { padding: 0 20px 16px 78px; font-size: 13px; color: hsl(var(--muted-foreground)); line-height: 1.9; font-family: ${SERIF_DISPLAY}; white-space: pre-wrap; }

          @media (max-width: 720px) {
            .fi-intro .fi-volhead-grid { grid-template-columns: 1fr; }
            .fi-intro .fi-scroll-panel { border-left: 0; border-top: 1px solid hsl(var(--border)); }
            .fi-intro .fi-toc-body { padding-left: 20px; }
          }
        `}</style>

        {/* 返回族谱 */}
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => smartBack(navigate, `/family/${familyId}`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            返回族谱
          </button>
        </div>

        {/* ══ 卷首：印 + 族名 + 版刻行 + 祖训挂轴 ══ */}
        <div className="fi-volhead">
          <div className="fi-volhead-grid">
            <div className="fi-volhead-main">
              <div className="fi-eyebrow">
                <span aria-hidden="true" className="fi-dot" />
                谱 牒 · 卷 首
              </div>
              <div className="fi-title-row">
                <div className="fi-name-seal" aria-hidden="true">{family.surname || '谱'}</div>
                <div>
                  <h1 className="fi-family-name">{family.name}</h1>
                  {family.origin && (
                    <p className="fi-family-sub">{family.origin}</p>
                  )}
                </div>
              </div>
              <div className="fi-colophon">
                {family.origin && <span>籍贯 <b>{family.origin}</b></span>}
                {stats.maxGen > 0 && (
                  <>
                    {!!family.origin && <span aria-hidden="true" className="sep" />}
                    <span>世系 <b>{stats.maxGen} 世</b></span>
                  </>
                )}
                {stats.memberCount > 0 && (
                  <>
                    <span aria-hidden="true" className="sep" />
                    <span>入谱 <b>{stats.memberCount} 人</b></span>
                  </>
                )}
                {zibeiChars.length > 0 && (
                  <>
                    <span aria-hidden="true" className="sep" />
                    <span>字辈 <b>{zibeiChars.slice(0, 4).join('')}</b></span>
                  </>
                )}
              </div>
            </div>

            {/* 祖训挂轴 */}
            {family.motto ? (
              <div className="fi-scroll-panel">
                <div className="fi-motto-frame">
                  <div className="fi-motto-text">{family.motto}</div>
                  <div className="fi-motto-seal" aria-hidden="true">训</div>
                </div>
                <div className="fi-motto-caption" aria-hidden="true">族 训</div>
              </div>
            ) : (
              <div className="fi-scroll-panel">
                <p className="text-xs leading-6 text-muted-foreground text-center px-3">
                  尚未立族训
                  {canEdit && (
                    <button
                      onClick={() => setEditMode(true)}
                      className="mt-2 block mx-auto text-xs text-primary hover:underline"
                    >
                      去撰写 →
                    </button>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ══ 编辑模式工具行 ══ */}
        {canEdit && (
          <div className="mt-4 flex items-center justify-end gap-2">
            {editMode ? (
              <>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs"
                  onClick={() => { setEditMode(false); setEditIntro(family.intro || ''); setEditMotto(family.motto || '') }}>
                  取消
                </Button>
                <Button variant="apple" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleSaveIntro}>
                  <BookOpen className="h-3.5 w-3.5" /> 保存卷首
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setEditMode(true)}>
                <PenLine className="h-3.5 w-3.5" /> 修卷首
              </Button>
            )}
          </div>
        )}

        {/* ══ 卷首语 ══ */}
        <div className="fi-section mt-9">
          <SectionHead text="卷 首 语" />
          {editMode ? (
            <div className="space-y-3">
              <textarea
                value={editIntro}
                onChange={(e) => setEditIntro(e.target.value)}
                className="w-full min-h-[120px] rounded-lg border bg-card p-3 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="记述家族源流、迁徙与世系……"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAiDraft}
                disabled={aiDrafting}
                className="gap-1"
              >
                {aiDrafting ? 'AI 撰写中…' : 'AI 草拟谱序'}
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">族训（竖排展示）</span>
                <Input
                  value={editMotto}
                  onChange={(e) => setEditMotto(e.target.value)}
                  placeholder="如：敬宗睦族 诗礼传家"
                  className="max-w-xs"
                />
              </div>
            </div>
          ) : introText ? (
            <div className="fi-prose">
              {leadChar && <span className="fi-lead-char">{leadChar}</span>}
              {introRest}
            </div>
          ) : (
            <div className="fi-prose text-center">
              <p className="text-sm" style={{ fontFamily: SERIF_DISPLAY }}>卷首尚虚，待修谱人补序。</p>
              {!canEdit && <p className="mt-1 text-xs text-muted-foreground">暂无家族简介</p>}
            </div>
          )}
        </div>

        {/* ══ 字辈 ══ */}
        {zibeiChars.length > 0 && (
          <div className="fi-section mt-9">
            <SectionHead text="字 辈" />
            <div className="rounded-xl border bg-card p-5" style={{ borderColor: 'hsl(var(--border))' }}>
              <div className="fi-zibei-row">
                {zibeiChars.map((ch, idx) => {
                  const gen = zibeiStart + idx
                  const present = stats.genSet.has(gen)
                  return (
                    <div key={idx} className={`fi-zibei-char ${present ? 'gen-present' : ''}`}>
                      {ch}
                      <small>第{gen}世</small>
                    </div>
                  )
                })}
              </div>
              <p className="fi-zibei-note">
                命名以字辈为序，同辈共取一字，昭穆分明。描红为已入谱世代。
              </p>
            </div>
          </div>
        )}

        {/* ══ 目次：家族故事 ══ */}
        <div className="fi-section mt-9">
          <SectionHead text="目 次" />
          {editMode && (
            <div className="mb-3 flex justify-end">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleAddArticle}>
                <Plus className="h-3.5 w-3.5" /> 添卷
              </Button>
            </div>
          )}

          {articles.length === 0 ? (
            <div className="rounded-xl border bg-card py-10 text-center" style={{ borderColor: 'hsl(var(--border))' }}>
              <p className="text-sm" style={{ fontFamily: SERIF_DISPLAY }}>目次尚空，族中故事待录。</p>
              {editMode && <p className="mt-1 text-xs text-muted-foreground">点击右上「添卷」开始</p>}
            </div>
          ) : (
            <div className="fi-toc">
              {articles.map((article, idx) => {
                const expanded = expandedIds.has(article.id)
                return (
                  <div key={article.id} className="fi-toc-item">
                    <div className="flex items-center">
                      <button
                        className="fi-toc-row flex-1"
                        onClick={() => toggleExpand(article.id)}
                        aria-expanded={expanded}
                      >
                        <span className="vol">{CN_NUM[idx] || idx + 1}</span>
                        {editMode ? (
                          <input
                            value={article.title}
                            onChange={(e) => handleUpdateArticle(article.id, 'title', e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 rounded border bg-background px-2 py-0.5 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                        ) : (
                          <span className="title">{article.title}</span>
                        )}
                        <span className="tag">{typeLabels[article.type] || article.type}</span>
                        <span className="chev" aria-hidden="true">
                          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </span>
                      </button>
                      {editMode && (
                        <button
                          onClick={() => handleDeleteArticle(article.id)}
                          className="mr-2 rounded p-1.5 text-muted-foreground hover:text-destructive"
                          aria-label={`删除 ${article.title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {expanded && (
                      <div className="fi-toc-body">
                        {editMode ? (
                          <div className="space-y-2">
                            <input
                              value={article.summary}
                              onChange={(e) => handleUpdateArticle(article.id, 'summary', e.target.value)}
                              className="w-full rounded border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                              placeholder="摘要..."
                            />
                            <textarea
                              value={article.content}
                              onChange={(e) => handleUpdateArticle(article.id, 'content', e.target.value)}
                              className="w-full min-h-[100px] rounded border bg-background p-2 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                              placeholder="文章内容..."
                            />
                          </div>
                        ) : (
                          <>
                            {article.summary && <p className="mb-2">{article.summary}</p>}
                            {article.content || '暂无内容'}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ══ 卷末 ══ */}
        <div className="mt-10 flex flex-col items-center border-t pt-8" style={{ borderColor: 'hsl(var(--border))' }}>
          <Button
            variant="apple"
            className="gap-2 px-8 h-11"
            onClick={() => navigate(`/family/${familyId}`)}
          >
            展卷入谱
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            {stats.maxGen > 0
              ? `进入世系图，查看 ${stats.maxGen} 世 ${stats.memberCount} 人的完整谱系`
              : '进入世系图，查看完整谱系'}
          </p>
        </div>
      </div>
      {dialog}
    </Layout>
  )
}
