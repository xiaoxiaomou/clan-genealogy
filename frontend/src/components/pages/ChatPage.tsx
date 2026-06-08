import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button,
  Input,
  Label,
  Modal,
  useToast,
  AvatarDisplay,
} from '@/components/ui'
import { api } from '@/lib/api'
import { useAppSelector } from '@/store'
import {
  ArrowLeft,
  Plus,
  Send,
  Users,
  MessageCircle,
  User as UserIcon,
} from 'lucide-react'

interface ChatGroup {
  id: number
  family_id: number
  name: string
  type: string
  member_ids: number[]
  last_message_at: string | null
  last_message: {
    sender_name: string
    content: string
    created_at: string
  } | null
}

interface ChatMessage {
  id: number
  group_id: number
  sender_id: number
  sender_name: string
  sender_avatar: string | null
  content: string
  created_at: string
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { user } = useAppSelector((s) => s.auth)
  const familyId = Number(id)

  const [groups, setGroups] = useState<ChatGroup[]>([])
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const pollRef = useRef<any>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadGroups()
  }, [familyId])

  useEffect(() => {
    if (activeGroup) {
      loadMessages()
      pollRef.current = setInterval(() => {
        loadMessages(true)
      }, 3000)
      return () => clearInterval(pollRef.current)
    }
  }, [activeGroup])

  useEffect(() => {
    if (messages.length > 0 && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  async function loadGroups() {
    setLoading(true)
    try {
      const data = await api.listChatGroups(familyId)
      setGroups(data.groups || [])
    } catch (err: any) {
      showToast(err.message || '加载聊天组失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function loadMessages(silent = false) {
    if (!activeGroup) return
    if (!silent) setLoading(true)
    try {
      const since = messages.length > 0 ? messages[messages.length - 1].id : undefined
      const data = await api.listChatMessages(familyId, activeGroup.id, since)
      if (since) {
        // 增量
        if (data.messages && data.messages.length > 0) {
          setMessages((prev) => [...prev, ...data.messages])
        }
      } else {
        setMessages(data.messages || [])
      }
    } catch (err: any) {
      if (!silent) showToast(err.message || '加载消息失败', 'error')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  async function send() {
    if (!text.trim() || !activeGroup) return
    try {
      await api.sendChatMessage(familyId, activeGroup.id, text)
      setText('')
      loadMessages(true)
    } catch (err: any) {
      showToast(err.message || '发送失败', 'error')
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <button
          onClick={() => navigate(`/family/${familyId}`)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </button>
        <h1 className="text-base font-semibold">家族聊天</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧聊天组列表 */}
        <div className="w-60 shrink-0 overflow-y-auto border-r border-border">
          <div className="flex items-center justify-between p-3">
            <h2 className="text-sm font-semibold">聊天组</h2>
            <button
              onClick={() => setShowCreate(true)}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {loading && groups.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">加载中...</p>
          ) : groups.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">暂无聊天组</p>
          ) : (
            groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setActiveGroup(g)}
                className={`flex w-full items-center gap-2 border-b border-border/50 px-3 py-2 text-left transition-colors hover:bg-muted ${
                  activeGroup?.id === g.id ? 'bg-muted' : ''
                }`}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  {g.type === 'dm' ? <UserIcon className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium">{g.name}</span>
                  </div>
                  {g.last_message && (
                    <p className="truncate text-xs text-muted-foreground">
                      {g.last_message.sender_name}: {g.last_message.content}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* 右侧消息区 */}
        <div className="flex flex-1 flex-col">
          {activeGroup ? (
            <>
              <div className="border-b border-border p-3">
                <h2 className="text-sm font-semibold">{activeGroup.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {activeGroup.member_ids.length} 位成员
                </p>
              </div>
              <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">暂无消息</p>
                ) : (
                  messages.map((m) => {
                    const isMine = m.sender_id === user?.id
                    return (
                      <div
                        key={m.id}
                        className={`flex gap-2 ${isMine ? 'flex-row-reverse' : ''}`}
                      >
                        {!isMine && (
                          <AvatarDisplay
                            avatar={m.sender_avatar}
                            name={m.sender_name}
                            size={32}
                          />
                        )}
                        <div className={`max-w-[60%] space-y-1 ${isMine ? 'items-end' : ''}`}>
                          {!isMine && (
                            <div className="text-xs text-muted-foreground">{m.sender_name}</div>
                          )}
                          <div
                            className={`rounded-2xl px-3 py-2 text-sm ${
                              isMine
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {m.content}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(m.created_at).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
              <div className="flex gap-2 border-t border-border p-3">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="输入消息..."
                  className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button onClick={send} disabled={!text.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <MessageCircle className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">选择左侧聊天组开始对话</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateGroupModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        familyId={familyId}
        onCreated={() => {
          setShowCreate(false)
          loadGroups()
        }}
      />
    </div>
  )
}

function CreateGroupModal({
  open,
  onClose,
  familyId,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  familyId: number
  onCreated: () => void
}) {
  const { showToast } = useToast()
  const [name, setName] = useState('')
  const [type, setType] = useState<'family' | 'custom' | 'dm'>('custom')
  const [users, setUsers] = useState<any[]>([])
  const [selected, setSelected] = useState<number[]>([])
  const [peerId, setPeerId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (open) {
      // 列出家族成员用户
      api.getFamilyUsers(familyId).then((d) => {
        const list = Array.isArray(d) ? d : d.users || []
        setUsers(list)
      })
    }
  }, [open, familyId])

  async function create() {
    setCreating(true)
    try {
      if (type === 'dm') {
        if (!peerId) {
          showToast('请选择私聊对象', 'error')
          setCreating(false)
          return
        }
        await api.createDMChannel(familyId, peerId)
      } else {
        if (!name.trim()) {
          showToast('请填写组名', 'error')
          setCreating(false)
          return
        }
        await api.createChatGroup(familyId, {
          name,
          type,
          member_ids: selected,
        })
      }
      onCreated()
    } catch (err: any) {
      showToast(err.message || '创建失败', 'error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="新建聊天" className="max-w-md">
      <div className="space-y-3">
        <div>
          <Label>类型</Label>
          <div className="mt-1 flex gap-2">
            {(['custom', 'dm'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`flex-1 rounded-md border px-3 py-1.5 text-sm ${
                  type === t ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                }`}
              >
                {t === 'custom' ? '群聊' : '私聊'}
              </button>
            ))}
          </div>
        </div>

        {type === 'custom' ? (
          <>
            <div>
              <Label>群组名称</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="如：长辈议事群"
              />
            </div>
            <div>
              <Label>选择成员</Label>
              <div className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded border border-border p-2">
                {users.map((u) => (
                  <label key={u.user_id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.includes(u.user_id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelected([...selected, u.user_id])
                        else setSelected(selected.filter((x) => x !== u.user_id))
                      }}
                    />
                    {u.display_name || u.username}
                  </label>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div>
            <Label>选择私聊对象</Label>
            <div className="mt-1 max-h-40 space-y-1 overflow-y-auto rounded border border-border p-2">
              {users.map((u) => (
                <button
                  key={u.user_id}
                  onClick={() => setPeerId(u.user_id)}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted ${
                    peerId === u.user_id ? 'bg-muted' : ''
                  }`}
                >
                  {u.display_name || u.username}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={create} disabled={creating}>
            {creating ? '创建中...' : '创建'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
