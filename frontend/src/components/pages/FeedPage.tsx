import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  Button,
  useToast,
  AvatarDisplay,
  MentionInput,
} from '@/components/ui'
import { api } from '@/lib/api'
import { useAppSelector } from '@/store'
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Trash2,
  Pin,
  Send,
} from 'lucide-react'

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

export default function FeedPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
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
      showToast('发布成功', 'success')
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
    if (!confirm('确定要删除这条动态吗？')) return
    try {
      await api.deletePost(familyId, p.id)
      showToast('已删除', 'success')
      load()
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/family/${familyId}`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回族谱
          </button>
          <h1 className="text-lg font-semibold">家族动态</h1>
        </div>

        {/* 发帖编辑器 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <AvatarDisplay
                avatar={user?.avatar || null}
                name={user?.display_name || user?.username || '我'}
                size={36}
              />
              <div className="flex-1 space-y-2">
                <textarea
                  rows={3}
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  placeholder="分享家族里的新鲜事..."
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="flex justify-end">
                  <Button onClick={submitPost} disabled={posting || !composer.trim()}>
                    <Send className="mr-1 h-4 w-4" />
                    {posting ? '发布中...' : '发布'}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              加载中...
            </CardContent>
          </Card>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              暂无动态，来发布第一条吧
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                isMine={p.author_id === user?.id || !!user?.is_admin}
                onLike={() => toggleLike(p)}
                onDelete={() => removePost(p)}
                onOpenComments={() => setOpenComments(p.id)}
              />
            ))}
          </div>
        )}
      </div>

      {openComments && (
        <CommentsPanel
          familyId={familyId}
          postId={openComments}
          onClose={() => setOpenComments(null)}
        />
      )}
    </div>
  )
}

function PostCard({
  post,
  isMine,
  onLike,
  onDelete,
  onOpenComments,
}: {
  post: Post
  isMine: boolean
  onLike: () => void
  onDelete: () => void
  onOpenComments: () => void
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <AvatarDisplay avatar={post.author_avatar} name={post.author_name} size={36} />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold">{post.author_name}</span>
                  {post.pinned && <Pin className="h-3 w-3 text-amber-500" />}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(post.created_at).toLocaleString('zh-CN')}
                </div>
              </div>
              {isMine && (
                <button
                  onClick={onDelete}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
            {post.media_urls && post.media_urls.length > 0 && (
              <div className="grid grid-cols-3 gap-1">
                {post.media_urls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="aspect-square w-full rounded object-cover"
                  />
                ))}
              </div>
            )}
            <div className="flex items-center gap-4 pt-1 text-xs text-muted-foreground">
              <button
                onClick={onLike}
                className={`flex items-center gap-1 transition-colors hover:text-foreground ${
                  post.liked ? 'text-pink-500' : ''
                }`}
              >
                <Heart className={`h-4 w-4 ${post.liked ? 'fill-current' : ''}`} />
                {post.like_count}
              </button>
              <button
                onClick={onOpenComments}
                className="flex items-center gap-1 transition-colors hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4" />
                {post.comment_count}
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CommentsPanel({
  familyId,
  postId,
  onClose,
}: {
  familyId: number
  postId: number
  onClose: () => void
}) {
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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative z-10 flex h-[80vh] w-full max-w-lg flex-col rounded-t-2xl bg-background shadow-2xl sm:h-[600px] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border p-3">
          <h3 className="font-semibold">评论 ({comments.length})</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-center text-sm text-muted-foreground">加载中...</p>
          ) : comments.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">暂无评论</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2 group">
                  <AvatarDisplay
                    avatar={c.author_avatar}
                    name={c.author_name}
                    size={28}
                  />
                  <div className="flex-1 rounded-lg bg-muted/50 px-3 py-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-semibold">{c.author_name}</span>
                      <span className="text-muted-foreground">
                        {new Date(c.created_at).toLocaleString('zh-CN')}
                      </span>
                      {(user?.id === c.author_id || user?.is_admin) && (
                        <button
                          onClick={async () => {
                            if (!confirm('删除这条评论？')) return
                            try {
                              await api.deletePostComment(familyId, postId, c.id)
                              load()
                            } catch (err: any) { showToast(err.message, 'error') }
                          }}
                          className="ml-auto text-muted-foreground opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"
                          aria-label="删除评论"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <div className="mt-1 text-sm" dangerouslySetInnerHTML={{ __html: c.content }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 border-t border-border p-3">
          <AvatarDisplay
            avatar={user?.avatar || null}
            name={user?.display_name || user?.username || '我'}
            size={32}
          />
          <MentionInput
            familyId={familyId}
            value={text}
            onChange={setText}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="说点什么... 输入 @ 提及成员"
            ariaLabel="评论输入"
          />
          <Button size="sm" onClick={send} disabled={sending || !text.trim()}>
            发送
          </Button>
        </div>
      </div>
    </div>
  )
}
