import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  useToast,
  AvatarDisplay,
  MentionInput,
  useConfirm,
} from '@/components/ui'
import { PgPageHead, PgSectionHead, PgSeal } from '@/components/ui/pedigree'
import { Layout } from '@/components/layout/Layout'
import { api } from '@/lib/api'
import { smartBack } from '@/lib/smartBack'
import { useAppSelector } from '@/store'
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Pin,
  Trash2,
  Image,
  Send,
} from 'lucide-react'

/* ── 祠堂记事（家族动态）：时间脉络 + 记事笺 ── */

interface Post {
  id: number
  author_id: number
  author_name: string
  author_avatar: string | null
  content: string
  media_urls: string[]
  visibility: string
  pinned: boolean
  like_count: number
  comment_count: number
  liked: boolean
  created_at: string
}

interface Comment {
  id: number
  author_id: number
  author_name: string
  author_avatar: string | null
  content: string
  created_at: string
}

/** 相对时间：今天/昨天/前天 + 时分，更早显示日期 */
function relTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const dayStart = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((dayStart(now) - dayStart(d)) / 86400000)
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (diff <= 0) return `今天 ${hm}`
  if (diff === 1) return `昨天 ${hm}`
  if (diff === 2) return `前天 ${hm}`
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`
}

export default function FeedPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { ask, dialog } = useConfirm()
  const { showToast } = useToast()
  const { user } = useAppSelector((s) => s.auth)
  const familyId = Number(id)

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [composer, setComposer] = useState('')
  const [posting, setPosting] = useState(false)
  const [openComments, setOpenComments] = useState<number | null>(null)

  useEffect(() => {
    load()
  }, [familyId])

  async function load() {
    setLoading(true)
    try {
      const data = await api.listPosts(familyId)
      setPosts(data.posts || [])
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function submitPost() {
    if (!composer.trim()) return
    setPosting(true)
    try {
      await api.createPost(familyId, { content: composer })
      setComposer('')
      showToast('记好了', 'success')
      load()
    } catch (err: any) {
      showToast(err.message || '发布失败', 'error')
    } finally {
      setPosting(false)
    }
  }

  async function toggleLike(p: Post) {
    try {
      const data = await api.likePost(familyId, p.id)
      setPosts((arr) =>
        arr.map((x) => (x.id === p.id ? { ...x, liked: data.liked, like_count: data.like_count } : x))
      )
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error')
    }
  }

  async function removePost(p: Post) {
    if (!(await ask({ title: '删除记事', message: '确定要删除这条记事吗？此操作不可恢复。', confirmText: '确认删除', danger: true }))) return
    try {
      await api.deletePost(familyId, p.id)
      showToast('已删除', 'success')
      load()
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    }
  }

  const pinnedPosts = posts.filter((p) => p.pinned)
  const normalPosts = posts.filter((p) => !p.pinned)
  const isMe = (p: Post) => p.author_id === user?.id || isAdminUser()

  function isAdminUser(): boolean {
    return !!user?.is_admin
  }

  return (
    <Layout>
      {dialog}
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 pg-rise">
        <div className="mb-5 flex items-center gap-2">
          <button
            onClick={() => smartBack(navigate, `/family/${familyId}`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回族谱
          </button>
        </div>

        <PgPageHead
          eyebrow="谱 牒 · 动 态"
          title="祠堂记事"
          subtitle="族中近事，大家共叙一门"
          actions={<PgSeal char="记" size={52} title="祠堂记事" />}
        />

        {/* 记一笔 */}
        <div className="pg-composer">
          <div className="pg-composer-row">
            <AvatarDisplay
              avatar={user?.avatar || null}
              name={user?.display_name || user?.username || '我'}
              size={40}
            />
            <MentionInput
              familyId={familyId}
              value={composer}
              onChange={setComposer}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitPost()
              }}
              placeholder="记一笔族中近事…（支持 @提及族人，Ctrl+Enter 发布）"
              ariaLabel="撰写动态"
            />
          </div>
          <div className="pg-composer-foot">
            <button
              className="pg-composer-tool"
              onClick={() => showToast('图片上传即将支持，敬请期待', 'info')}
              disabled
              aria-label="插入图片（即将支持）"
            >
              <Image aria-hidden="true" />
              图片
            </button>
            <span className="pg-composer-spacer" />
            <button className="pg-composer-btn" onClick={submitPost} disabled={posting || !composer.trim()}>
              <Send aria-hidden="true" />
              {posting ? '记录中…' : '记 一 笔'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="pg-card mt-6 animate-pulse p-6" aria-busy="true" aria-live="polite">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-muted" />
              <div className="h-4 w-1/3 rounded bg-muted" />
            </div>
            <div className="mt-4 h-4 w-full rounded bg-muted" />
            <div className="mt-2 h-4 w-2/3 rounded bg-muted" />
          </div>
        ) : posts.length === 0 ? (
          <div className="pg-card mt-6 flex flex-col items-center justify-center py-14">
            <p className="pg-title text-base tracking-[0.12em] text-foreground/80">谱 面 清 静</p>
            <p className="mt-2 text-sm text-muted-foreground">还没有记事，来发布第一条，让族人知道家里的近况。</p>
          </div>
        ) : (
          <>
            {pinnedPosts.length > 0 && (
              <>
                <PgSectionHead
                  text="置 顶 公 告"
                  right={<span className="text-xs text-muted-foreground">{pinnedPosts.length} 条</span>}
                />
                <div className="pg-chronicle">
                  {pinnedPosts.map((p) => renderNote(p))}
                </div>
              </>
            )}
            <PgSectionHead
              text="族 中 近 事"
              right={<span className="text-xs text-muted-foreground">{normalPosts.length} 条</span>}
            />
            {normalPosts.length === 0 ? (
              <div className="pg-card py-8 text-center text-sm text-muted-foreground">其余记事已归档</div>
            ) : (
              <div className="pg-chronicle">
                {normalPosts.map((p) => renderNote(p))}
              </div>
            )}
          </>
        )}

        <div className="pg-colophon mt-8">
          <b>祠堂记事</b>
          <span className="pg-colophon-sep" />
          时间脉络一线贯穿
          <span className="pg-colophon-sep" />
          置顶公告居首
          <span className="pg-colophon-sep" />
          宋体行文如记族中事
          <span className="pg-colophon-sep" />
          赞 / 评论直书其下
        </div>
      </div>
    </Layout>
  )

  /* ══ 记事笺 ══ */
  function renderNote(p: Post) {
    const mine = isMe(p)
    const expanded = openComments === p.id
    return (
      <article key={p.id} className="pg-note">
        <div className="pg-note-card">
          <div className="pg-note-top">
            <AvatarDisplay avatar={p.author_avatar} name={p.author_name} size={40} />
            <div className="min-w-0 flex-1">
              <div className="pg-note-author">
                <span className="pg-note-name">{p.author_name}</span>
                <span className="pg-note-time">{relTime(p.created_at)}</span>
              </div>
            </div>
            <div className="pg-note-side">
              {p.pinned && (
                <span className="pg-note-pin" title="置顶">
                  <Pin aria-hidden="true" />
                  置顶
                </span>
              )}
              {mine && (
                <button
                  onClick={() => removePost(p)}
                  className="pg-note-del"
                  aria-label="删除记事"
                >
                  <Trash2 aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <div className="pg-note-text" dangerouslySetInnerHTML={{ __html: p.content }} />
          {p.media_urls && p.media_urls.length > 0 && (
            <div className="pg-note-media">
              {p.media_urls.map((url, i) => (
                <img key={i} src={url} alt="" className="aspect-square w-full object-cover" />
              ))}
            </div>
          )}
          <div className="pg-note-actions">
            <button
              className={`pg-note-act ${p.liked ? 'liked' : ''}`}
              onClick={() => toggleLike(p)}
              aria-pressed={p.liked}
              aria-label={`赞（${p.like_count}）`}
            >
              <Heart className={`h-4 w-4 ${p.liked ? 'fill-current' : ''}`} aria-hidden="true" />
              <span className="pg-note-act-n">{p.like_count}</span>
              赞
            </button>
            <button
              className="pg-note-act"
              onClick={() => setOpenComments(expanded ? null : p.id)}
              aria-expanded={expanded}
              aria-label={`评论（${p.comment_count}）`}
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span className="pg-note-act-n">{p.comment_count}</span>
              评论
            </button>
          </div>
          {expanded && (
            <NoteComments
              familyId={familyId}
              postId={p.id}
              onClose={() => setOpenComments(null)}
            />
          )}
        </div>
      </article>
    )
  }
}

/* ══ 内联评论面板（展开于记事笺之下） ══ */
function NoteComments({
  familyId,
  postId,
}: {
  familyId: number
  postId: number
  onClose?: () => void
}) {
  const { ask, dialog } = useConfirm()
  const { showToast } = useToast()
  const { user } = useAppSelector((s) => s.auth)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    load()
  }, [postId])

  async function load() {
    setLoading(true)
    try {
      const data = await api.listPostComments(familyId, postId)
      setComments(data.comments || [])
    } catch (err: any) {
      showToast(err.message || '加载评论失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function send() {
    if (!text.trim()) return
    setSending(true)
    try {
      await api.createPostComment(familyId, postId, { content: text })
      setText('')
      load()
    } catch (err: any) {
      showToast(err.message || '发送失败', 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="pg-note-comments">
      {loading ? (
        <p className="py-3 text-center text-xs text-muted-foreground">加载评论中…</p>
      ) : comments.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground">还没有评论，说点什么吧</p>
      ) : (
        comments.map((c) => (
          <div key={c.id} className="pg-note-comment group">
            <AvatarDisplay avatar={c.author_avatar} name={c.author_name} size={26} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <b>{c.author_name}</b>
                <span className="text-[10.5px] text-muted-foreground">{relTime(c.created_at)}</span>
                {(user?.id === c.author_id || user?.is_admin) && (
                  <button
                    onClick={async () => {
                      if (
                        !(await ask({
                          title: '删除评论',
                          message: '确定要删除这条评论吗？',
                          confirmText: '确认删除',
                          danger: true,
                        }))
                      )
                        return
                      try {
                        await api.deletePostComment(familyId, postId, c.id)
                        load()
                      } catch (err: any) {
                        showToast(err.message, 'error')
                      }
                    }}
                    className="ml-auto text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    aria-label="删除评论"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="pg-note-comment-text" dangerouslySetInnerHTML={{ __html: c.content }} />
            </div>
          </div>
        ))
      )}
      <div className="pg-note-comment-input">
        <AvatarDisplay
          avatar={user?.avatar || null}
          name={user?.display_name || user?.username || '我'}
          size={26}
        />
        <MentionInput
          familyId={familyId}
          value={text}
          onChange={setText}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="写下你的评论… 输入 @ 提及族人"
          ariaLabel="评论输入"
        />
        <button className="pg-note-comment-send" onClick={send} disabled={sending || !text.trim()}>
          发送
        </button>
      </div>
      {dialog}
    </div>
  )
}
