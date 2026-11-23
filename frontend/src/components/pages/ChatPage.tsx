import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button,
  Input,
  Label,
  Modal,
  useToast,
} from '@/components/ui'
import { api } from '@/lib/api'
import { useAppSelector } from '@/store'
import { PgSectionHead, PG_RED } from '@/components/ui/pedigree'
import {
  ArrowLeft,
  Plus,
  Users,
  User as UserIcon,
  Image as ImageIcon,
  Mic,
  Square,
  Smile,
  Play,
  Pause,
  X,
  Loader2,
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
  msg_type: 'text' | 'image' | 'voice'
  media_url: string | null
  duration: number | null
  created_at: string
}

// 表情分组：古风信笺语境，按主题归类
const EMOJI_GROUPS: Array<{ label: string; items: string[] }> = [
  {
    label: '神情',
    items: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
      '😊', '🙂', '🙃', '😉', '😍', '🥰', '😘', '😗',
      '😋', '😜', '🤪', '😝', '🤗', '🤭', '🤔', '🤨',
      '😏', '😌', '😴', '🥱', '😪', '😎', '🥳', '😇',
      '🙁', '😕', '😟', '😢', '😭', '😤', '😠', '😡',
      '😳', '😱', '😨', '😰', '🥺', '😥', '🤯', '😵',
    ],
  },
  {
    label: '礼仪',
    items: [
      '🙏', '🤝', '👍', '👏', '🙌', '👋', '🤙', '💪',
      '✊', '🤞', '🤟', '👌', '🤌', '🫰', '🙌', '👐',
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
      '💕', '💞', '💖', '💗', '💓', '💝', '💔', '❣️',
    ],
  },
  {
    label: '风物',
    items: [
      '🌸', '🌺', '🌻', '🌷', '🌹', '💐', '🌼', '🌾',
      '🍃', '🍂', '🍁', '🌿', '🌱', '🌳', '🌲', '🎋',
      '🪷', '🌵', '🌴', '🎍', '🍵', '☕', '🍶', '🍚',
      '🍜', '🥟', '🥮', '🍰', '🍎', '🍊', '🍇', '🍑',
    ],
  },
  {
    label: '节庆',
    items: [
      '🏮', '🎑', '🌕', '🌙', '✨', '⭐', '🌟', '💫',
      '🎉', '🎊', '🎆', '🎇', '🧨', '🎈', '🎁', '🎋',
      '🐉', '🐲', '🦁', '🐯', '🐰', '🐖', '🐔', '🐶',
      '🎎', '🎏', '🎐', '🀄', '🎴', '🏆', '🥇', '🎖️',
    ],
  },
  {
    label: '卷牍',
    items: [
      '📜', '📖', '📚', '✍️', '🖋️', '🖌️', '📝', '📄',
      '🕯️', '🏯', '🏛️', '⛩️', '🛕', '🏞️', '🏔️', '🌊',
      '🧧', '💮', '㊗️', '㊙️', '🈵', '🈶', '🈚', '🉑',
      '✅', '❌', '⭕', '❗', '❓', '💤', '💢', '💥',
    ],
  },
]

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
  const [mobilePane, setMobilePane] = useState<'list' | 'thread'>('list')
  const [showEmoji, setShowEmoji] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null) // 待发送图片预览
  const [recording, setRecording] = useState(false)
  const [recordSeconds, setRecordSeconds] = useState(0)
  const recordSecondsRef = useRef(0) // onstop 闭包读 state 会拿到旧值，用 ref 同步真实秒数
  const [playingVoice, setPlayingVoice] = useState<number | null>(null)
  const pollRef = useRef<any>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const pendingImageRef = useRef<File | null>(null)
  const pendingImageUrlRef = useRef<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordTimerRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // 用 ref 记录最新一条消息 id：setInterval 闭包里的 state 是过期的，
  // 直接读 messages 会让 since 永远停留在切组时的值，导致增量拉取重复
  const lastMessageIdRef = useRef<number | undefined>(undefined)
  const activeGroupRef = useRef<ChatGroup | null>(null)

  useEffect(() => {
    loadGroups()
  }, [familyId])

  useEffect(() => {
    activeGroupRef.current = activeGroup
    if (activeGroup) {
      lastMessageIdRef.current = undefined
      setShowEmoji(false)
      if (recording) stopRecording()
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

  // 卸载清理：录音、定时器、音频、预览 URL
  useEffect(() => () => {
    clearInterval(recordTimerRef.current)
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    audioRef.current?.pause()
    if (pendingImageUrlRef.current) URL.revokeObjectURL(pendingImageUrlRef.current)
  }, [])

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
    const group = activeGroupRef.current
    if (!group) return
    if (!silent) setLoading(true)
    try {
      const since = lastMessageIdRef.current
      const data = await api.listChatMessages(familyId, group.id, since)
      if (since) {
        // 增量：按 id 去重，避免「手动发送后立即拉取」与 3s 轮询并发时重复追加同一批消息
        if (data.messages && data.messages.length > 0) {
          setMessages((prev) => {
            const seen = new Set(prev.map((m) => m.id))
            return [...prev, ...data.messages.filter((m: ChatMessage) => !seen.has(m.id))]
          })
          lastMessageIdRef.current = data.messages[data.messages.length - 1].id
        }
      } else {
        setMessages(data.messages || [])
        lastMessageIdRef.current = data.messages?.length
          ? data.messages[data.messages.length - 1].id
          : undefined
      }
    } catch (err: any) {
      if (!silent) showToast(err.message || '加载消息失败', 'error')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  async function send() {
    if (!text.trim() || !activeGroup) return
    const content = text
    setText('')
    setShowEmoji(false)
    try {
      await api.sendChatMessage(familyId, activeGroup.id, content)
      loadMessages(true)
    } catch (err: any) {
      setText(content)
      showToast(err.message || '发送失败', 'error')
    }
  }

  function appendEmoji(emoji: string) {
    setText((prev) => prev + emoji)
    textareaRef.current?.focus()
  }

  // 图片：选文件 → 本地预览 → 确认后上传并发送
  function pickImage() {
    imageInputRef.current?.click()
  }

  function onImageSelected(file: File | undefined) {
    if (!file) return
    // 清掉上一次的预览 URL
    if (pendingImageUrlRef.current) URL.revokeObjectURL(pendingImageUrlRef.current)
    pendingImageRef.current = file
    const previewUrl = URL.createObjectURL(file)
    pendingImageUrlRef.current = previewUrl
    setImagePreview(previewUrl)
  }

  function cancelImage() {
    setImagePreview(null)
    pendingImageRef.current = null
    if (pendingImageUrlRef.current) {
      URL.revokeObjectURL(pendingImageUrlRef.current)
      pendingImageUrlRef.current = null
    }
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  async function sendImage() {
    const file = pendingImageRef.current
    if (!file || !activeGroup) return
    setUploading(true)
    try {
      const { url } = await api.uploadChatMedia(familyId, file, 'image')
      await api.sendChatMessage(familyId, activeGroup.id, '[图片]', {
        msg_type: 'image',
        media_url: url,
      })
      loadMessages(true)
      cancelImage()
    } catch (err: any) {
      showToast(err.message || '图片发送失败', 'error')
    } finally {
      setUploading(false)
    }
  }

  // 语音：MediaRecorder 录制，松手/点击停止后上传
  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      showToast('当前浏览器不支持录音', 'error')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const seconds = Math.max(1, recordSecondsRef.current)
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        if (blob.size > 0) sendVoice(blob, seconds)
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
      setRecordSeconds(0)
      recordSecondsRef.current = 0
      recordTimerRef.current = setInterval(() => {
        recordSecondsRef.current += 1
        setRecordSeconds(recordSecondsRef.current)
        // 上限 60 秒，避免音频超过后端 5MB 限制；到点自动停止并寄出
        if (recordSecondsRef.current >= 60) {
          stopRecording()
          showToast('录音已达 60 秒上限，自动寄出', 'success')
        }
      }, 1000)
    } catch {
      showToast('无法访问麦克风，请检查权限', 'error')
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
    clearInterval(recordTimerRef.current)
  }

  async function sendVoice(blob: Blob, seconds: number) {
    if (!activeGroup) return
    // 从 blob 推断扩展名
    const ext = blob.type.includes('ogg') ? 'ogg'
      : blob.type.includes('mp4') ? 'm4a'
      : blob.type.includes('mpeg') ? 'mp3'
      : blob.type.includes('wav') ? 'wav' : 'webm'
    const file = new File([blob], `voice.${ext}`, { type: blob.type || 'audio/webm' })
    setUploading(true)
    try {
      const { url } = await api.uploadChatMedia(familyId, file, 'voice')
      await api.sendChatMessage(familyId, activeGroup.id, '[语音]', {
        msg_type: 'voice',
        media_url: url,
        duration: seconds,
      })
      loadMessages(true)
    } catch (err: any) {
      showToast(err.message || '语音发送失败', 'error')
    } finally {
      setUploading(false)
    }
  }

  function toggleVoicePlayback(msgId: number, url: string) {
    if (playingVoice === msgId) {
      audioRef.current?.pause()
      setPlayingVoice(null)
      return
    }
    if (!audioRef.current) audioRef.current = new Audio()
    audioRef.current.src = url.startsWith('http') ? url : `${window.location.origin}${url}`
    audioRef.current.onended = () => setPlayingVoice(null)
    audioRef.current.play().then(() => setPlayingVoice(msgId)).catch(() => {
      showToast('语音播放失败', 'error')
    })
  }

  // 消息按日期分组，插入日期分隔
  const groupedMessages: Array<{ type: 'day'; label: string } | { type: 'msg'; message: ChatMessage }> = []
  let lastDay = ''
  for (const m of messages) {
    const day = new Date(m.created_at).toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
    if (day !== lastDay) {
      groupedMessages.push({ type: 'day', label: day })
      lastDay = day
    }
    groupedMessages.push({ type: 'msg', message: m })
  }

  return (
    <div className="pg-chat-root" data-pane={mobilePane}>
      {/* ── 顶栏 ── */}
      <header className="pg-chat-topbar">
        <button
          onClick={() => navigate(`/family/${familyId}`)}
          className="pg-chat-back"
          aria-label="返回族谱"
        >
          <ArrowLeft aria-hidden="true" />
          返回
        </button>
        <span className="pg-chat-seal" aria-hidden="true">叙</span>
        <div className="pg-chat-brand">
          <h1>家族书简</h1>
          <span>尺 牍 往 来</span>
        </div>
        <div className="pg-chat-topbar-end">
          <span className="pg-chat-member-count" style={{ color: PG_RED }}>一纸家书 · 千里同心</span>
        </div>
      </header>

      <div className="pg-chat-body">
        {/* ── 卷宗目录 ── */}
        <aside className="pg-chat-dir" aria-label="会话目录">
          <div className="pg-chat-dir-head">
            <PgSectionHead
              text="卷 宗"
              right={
                <button
                  onClick={() => setShowCreate(true)}
                  className="pg-chat-dir-add"
                  aria-label="新建聊天组"
                  title="新建聊天组"
                >
                  <Plus aria-hidden="true" />
                </button>
              }
            />
          </div>
          <div className="pg-chat-dir-list">
            {loading && groups.length === 0 ? (
              <p className="pg-chat-dir-empty">展卷中…</p>
            ) : groups.length === 0 ? (
              <p className="pg-chat-dir-empty">
                尚无卷宗<br />点上方印记，起一函新叙
              </p>
            ) : (
              groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => {
                    setActiveGroup(g)
                    setMobilePane('thread')
                  }}
                  className={`pg-chat-entry ${activeGroup?.id === g.id ? 'is-active' : ''}`}
                  aria-current={activeGroup?.id === g.id ? 'true' : undefined}
                >
                  <span className="pg-chat-entry-mark" aria-hidden="true">
                    {g.type === 'dm' ? <UserIcon className="h-4 w-4" strokeWidth={1.7} /> : <Users className="h-4 w-4" strokeWidth={1.7} />}
                  </span>
                  <span className="pg-chat-entry-main">
                    <span className="pg-chat-entry-row">
                      <span className="pg-chat-entry-name">{g.name}</span>
                      {g.last_message && (
                        <span className="pg-chat-entry-time">
                          {new Date(g.last_message.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                        </span>
                      )}
                    </span>
                    <span className="pg-chat-entry-preview">
                      {g.last_message
                        ? `${g.last_message.sender_name}：${g.last_message.content}`
                        : '尚无来信'}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        {/* ── 书信区 ── */}
        <section className="pg-chat-thread" aria-label="会话内容">
          {activeGroup ? (
            <>
              <div className="pg-chat-thread-head">
                <button
                  onClick={() => setMobilePane('list')}
                  className="pg-chat-back pg-chat-mobile-only"
                  aria-label="返回会话目录"
                >
                  <ArrowLeft aria-hidden="true" />
                </button>
                <div>
                  <div className="pg-chat-thread-title">{activeGroup.name}</div>
                  <div className="pg-chat-thread-sub">{activeGroup.member_ids.length} 位族人在此</div>
                </div>
                <span className="pg-chat-thread-spine" aria-hidden="true">家 书</span>
              </div>

              <div ref={listRef} className="pg-chat-stream" role="log" aria-live="polite">
                {groupedMessages.length === 0 ? (
                  <div className="pg-chat-empty">
                    <div className="pg-chat-empty-env" aria-hidden="true" />
                    <p className="pg-chat-empty-title">此函尚空</p>
                    <p className="pg-chat-empty-sub">落笔为书，从一声问候起</p>
                  </div>
                ) : (
                  groupedMessages.map((item, idx) =>
                    item.type === 'day' ? (
                      <div key={`day-${idx}`} className="pg-chat-day">{item.label}</div>
                    ) : (
                      (() => {
                        const m = item.message
                        const isMine = m.sender_id === user?.id
                        return (
                          <article key={m.id} className={`pg-chat-letter ${isMine ? 'is-mine' : ''}`}>
                            <span className="pg-chat-letter-seal" aria-hidden="true">
                              {m.sender_name.slice(0, 1)}
                            </span>
                            <div className="pg-chat-letter-content">
                              <div className="pg-chat-letter-head">
                                <span className="pg-chat-letter-author">
                                  {isMine ? '我' : m.sender_name}
                                </span>
                                <time className="pg-chat-letter-time">
                                  {new Date(m.created_at).toLocaleTimeString('zh-CN', {
                                    hour: '2-digit', minute: '2-digit',
                                  })}
                                </time>
                              </div>
                              {m.msg_type === 'image' && m.media_url ? (
                                <button
                                  className="pg-chat-letter-paper pg-chat-media-paper"
                                  onClick={() => window.open(
                                    m.media_url!.startsWith('http') ? m.media_url! : `${window.location.origin}${m.media_url}`,
                                    '_blank', 'noopener,noreferrer',
                                  )}
                                  aria-label="查看图片"
                                >
                                  <img
                                    className="pg-chat-image"
                                    src={m.media_url.startsWith('http') ? m.media_url : `${window.location.origin}${m.media_url}`}
                                    alt={m.content || '族人发送的图片'}
                                    loading="lazy"
                                  />
                                </button>
                              ) : m.msg_type === 'voice' && m.media_url ? (
                                <div className="pg-chat-letter-paper pg-chat-voice-paper">
                                  <button
                                    onClick={() => toggleVoicePlayback(m.id, m.media_url!)}
                                    className="pg-chat-voice-btn"
                                    aria-label={playingVoice === m.id ? '暂停语音' : '播放语音'}
                                  >
                                    {playingVoice === m.id ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                                  </button>
                                  <div className="pg-chat-voice-track">
                                    <span className="pg-chat-voice-label">语音消息</span>
                                    <span className="pg-chat-voice-dur">{m.duration || 1}″</span>
                                    <span className="pg-chat-voice-wave" aria-hidden="true">
                                      {Array.from({ length: 14 }).map((_, i) => (
                                        <i key={i} style={{ height: `${6 + ((i * 7) % 13)}px` }} />
                                      ))}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="pg-chat-letter-paper">{m.content}</div>
                              )}
                            </div>
                          </article>
                        )
                      })()
                    )
                  )
                )}
              </div>

              {/* 表情面板 */}
              {showEmoji && (
                <div className="pg-chat-emoji-panel" role="dialog" aria-label="选择表情">
                  <div className="pg-chat-emoji-head">
                    <span>表情</span>
                    <button onClick={() => setShowEmoji(false)} aria-label="关闭表情">
                      <X aria-hidden="true" />
                    </button>
                  </div>
                  <div className="pg-chat-emoji-scroll">
                    {EMOJI_GROUPS.map((group) => (
                      <div key={group.label} className="pg-chat-emoji-group">
                        <div className="pg-chat-emoji-group-label">{group.label}</div>
                        <div className="pg-chat-emoji-grid">
                          {group.items.map((e, i) => (
                            <button key={`${e}-${i}`} onClick={() => appendEmoji(e)} aria-label={`插入表情 ${e}`}>
                              {e}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 录音中的提示条 */}
              {recording && (
                <div className="pg-chat-recording-bar" role="status">
                  <span className="pg-chat-rec-dot" aria-hidden="true" />
                  <span>正在录音 · {recordSeconds}″</span>
                  <button onClick={stopRecording} className="pg-chat-rec-stop">
                    <Square aria-hidden="true" /> 停止并寄出
                  </button>
                </div>
              )}

              <div className="pg-chat-compose">
                <div className="pg-chat-compose-tools">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="pg-chat-hidden-input"
                    onChange={(e) => onImageSelected(e.target.files?.[0])}
                  />
                  <button onClick={pickImage} className="pg-chat-tool" aria-label="发送图片" title="发送图片" disabled={uploading}>
                    <ImageIcon aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setShowEmoji((v) => !v)}
                    className={`pg-chat-tool ${showEmoji ? 'is-on' : ''}`}
                    aria-label="选择表情"
                    title="表情"
                  >
                    <Smile aria-hidden="true" />
                  </button>
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    className={`pg-chat-tool ${recording ? 'is-rec' : ''}`}
                    aria-label={recording ? '停止录音' : '录制语音'}
                    title={recording ? '停止录音' : '录制语音'}
                    disabled={uploading}
                  >
                    {recording ? <Square aria-hidden="true" /> : <Mic aria-hidden="true" />}
                  </button>
                </div>
                <textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send()
                    }
                  }}
                  placeholder="落笔书于此…（Enter 寄出，Shift+Enter 换行）"
                  className="pg-chat-compose-input"
                  rows={1}
                  aria-label="输入消息"
                />
                <button
                  onClick={send}
                  disabled={!text.trim() || uploading}
                  className="pg-chat-send"
                  aria-label="寄出消息"
                  title="寄出"
                >
                  {uploading ? <Loader2 className="pg-chat-spin" aria-hidden="true" /> : '寄'}
                </button>
              </div>
            </>
          ) : (
            <div className="pg-chat-empty">
              <div className="pg-chat-empty-env" aria-hidden="true" />
              <p className="pg-chat-empty-title">启一卷家书</p>
              <p className="pg-chat-empty-sub">择左侧卷宗，与族人叙话</p>
            </div>
          )}
        </section>
      </div>

      {/* 图片发送中 / 预览遮罩 */}
      {imagePreview && (
        <div className="pg-chat-preview-backdrop" role="dialog" aria-label="图片预览">
          <div className="pg-chat-preview-box">
            <img src={imagePreview} alt="待发送图片预览" />
            <div className="pg-chat-preview-bar">
              <span>{uploading ? '寄送中…' : '确认寄出这张图片？'}</span>
              <div className="pg-chat-preview-actions">
                <button
                  onClick={cancelImage}
                  disabled={uploading}
                  aria-label="取消"
                >取消</button>
                <button
                  onClick={sendImage}
                  disabled={uploading}
                  className="is-primary"
                  aria-label="寄出图片"
                >{uploading ? '寄送中…' : '寄出'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

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
                className={`pg-chat-type-btn ${type === t ? 'is-on' : ''}`}
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
              <div className="pg-chat-people mt-1">
                {users.map((u) => (
                  <label
                    key={u.user_id}
                    className={`pg-chat-person ${selected.includes(u.user_id) ? 'is-on' : ''}`}
                  >
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
            <div className="pg-chat-people mt-1">
              {users.map((u) => (
                <button
                  key={u.user_id}
                  onClick={() => setPeerId(u.user_id)}
                  className={`pg-chat-person ${peerId === u.user_id ? 'is-on' : ''}`}
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
