import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { User } from '@/types'
import {
  Button,
  Input,
  Label,
  AvatarUploader,
  useToast,
} from '@/components/ui'
import { Layout } from '@/components/layout/Layout'
import { ArrowLeft, Save, Lock, KeyRound, AtSign, Mail } from 'lucide-react'

/* 谱页设计令牌：朱砂印泥红（固定色，跨主题一致），其余全部走主题令牌 */
const SEAL_RED = '#A63A2E'
const SERIF_DISPLAY = "'Noto Serif SC', 'STSong', 'KaiTi', 'STKaiti', serif"

export default function ProfilePage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [relationshipToCreator, setRelationshipToCreator] = useState('')
  const [location, setLocation] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 密码修改
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<{
    oldPassword?: string
    newPassword?: string
    confirmPassword?: string
  }>({})

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const data = await api.getProfile()
      setUser(data.user)
      setDisplayName(data.user.display_name || '')
      setAvatar(data.user.avatar)
      setRelationshipToCreator(data.user.relationship_to_creator || '')
      setLocation(data.user.location || '')
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error')
    }
  }

  const validatePassword = (name: string, value: string) => {
    const errors = { ...passwordErrors }

    switch (name) {
      case 'newPassword':
        if (value && value.length < 6) {
          errors.newPassword = '新密码至少 6 位字符'
        } else {
          delete errors.newPassword
        }

        // 联动验证确认密码
        if (confirmPassword) {
          if (value !== confirmPassword) {
            errors.confirmPassword = '两次输入的新密码不一致'
          } else {
            delete errors.confirmPassword
          }
        }
        break

      case 'confirmPassword':
        if (value && value !== newPassword) {
          errors.confirmPassword = '两次输入的新密码不一致'
        } else {
          delete errors.confirmPassword
        }
        break
    }

    setPasswordErrors(errors)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const data = await api.updateProfile({
        display_name: displayName,
        avatar: avatar || undefined,
        relationship_to_creator: relationshipToCreator || undefined,
        location: location || undefined,
      })
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      showToast('资料已保存', 'success')
    } catch (err: any) {
      showToast(err.message || '保存失败', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangePassword = async () => {
    // 验证密码
    if (!oldPassword) {
      showToast('请输入原密码', 'error')
      return
    }

    if (!newPassword) {
      showToast('请输入新密码', 'error')
      return
    }

    if (newPassword.length < 6) {
      showToast('新密码长度不能少于6位', 'error')
      return
    }

    if (newPassword !== confirmPassword) {
      showToast('两次输入的新密码不一致', 'error')
      return
    }

    setIsChangingPassword(true)
    try {
      await api.changePassword(oldPassword, newPassword)
      showToast('密码已更新', 'success')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordErrors({})
    } catch (err: any) {
      showToast(err.message || '密码修改失败', 'error')
    } finally {
      setIsChangingPassword(false)
    }
  }

  /* 朱点分段标题：族谱条目的分段记号 */
  const SectionMark = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rounded-[2px]"
        style={{ backgroundColor: SEAL_RED }}
      />
      <span className="text-xs font-medium tracking-[0.2em] text-muted-foreground">
        {children}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-border" />
    </div>
  )

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* 页头 */}
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-xl"
            aria-label="返回首页"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={serifHead}>
              个人设置
            </h1>
            <p className="text-sm text-muted-foreground">头像、称谓与登录安全</p>
          </div>
        </div>

        {/* 谱页：题签 + 身份 + 编辑 */}
        <div
          className="motion-safe:animate-[page-rise_0.4s_ease-out] overflow-hidden rounded-xl border bg-card shadow-sm"
          style={{ borderColor: 'hsl(var(--border))' }}
        >
          <div className="grid lg:grid-cols-[56px_1fr_1.25fr]">
            {/* 题签（竖排，signature） */}
            <div
              aria-hidden="true"
              className="hidden items-center justify-center border-r lg:flex"
              style={{
                borderColor: 'hsl(var(--border))',
                background: 'hsl(var(--muted) / 0.4)',
              }}
            >
              <span
                className="select-none py-6 text-lg tracking-[0.5em]"
                style={{
                  fontFamily: SERIF_DISPLAY,
                  writingMode: 'vertical-rl',
                  color: SEAL_RED,
                }}
              >
                谱牒 · 修名
              </span>
            </div>
            {/* 移动端横向题签 */}
            <div
              aria-hidden="true"
              className="flex items-center gap-2 border-b px-5 py-3 lg:hidden"
              style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--muted) / 0.4)' }}
            >
              <span
                className="text-sm tracking-[0.4em]"
                style={{ fontFamily: SERIF_DISPLAY, color: SEAL_RED }}
              >
                谱牒 · 修名
              </span>
            </div>

            {/* 身份列：头像 + 名讳 + 账号 */}
            <div className="border-b p-6 sm:p-8 lg:border-b-0 lg:border-r" style={{ borderColor: 'hsl(var(--border))' }}>
              <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left lg:flex-col lg:items-center">
                <div className="relative motion-safe:animate-[seal-stamp_0.35s_ease-out_0.15s_both]">
                  <AvatarUploader
                    currentAvatar={avatar}
                    onUpload={(url) => setAvatar(url)}
                    name={user?.display_name || user?.username || '用户'}
                    size={112}
                    type="user"
                  />
                  {/* 朱印 */}
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1 -right-1 flex h-7 w-7 rotate-3 select-none items-center justify-center rounded-[4px] text-sm font-bold text-white shadow-sm"
                    style={{
                      backgroundColor: SEAL_RED,
                      fontFamily: SERIF_DISPLAY,
                      boxShadow: '0 1px 3px rgb(0 0 0 / 0.25)',
                    }}
                  >
                    谱
                  </span>
                </div>
                <div className="mt-5 sm:ml-6 sm:mt-0 lg:ml-0 lg:mt-4">
                  <p
                    className="text-2xl leading-snug"
                    style={{ fontFamily: SERIF_DISPLAY, letterSpacing: '0.06em' }}
                  >
                    {user?.display_name || user?.username || '—'}
                  </p>
                  <p className="mt-1 text-xs tracking-widest text-muted-foreground">
                    {user?.is_admin ? '谱局 · 管理员' : '族人'}
                  </p>
                </div>
              </div>

              {/* 账号信息：只读，安静呈现 */}
              <dl className="mt-8 space-y-3 border-t pt-6" style={{ borderColor: 'hsl(var(--border))' }}>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AtSign className="h-3.5 w-3.5" aria-hidden="true" /> 用户名
                  </dt>
                  <dd className="text-sm">{user?.username || '—'}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" aria-hidden="true" /> 邮箱
                  </dt>
                  <dd className="truncate text-sm">{user?.email || '—'}</dd>
                </div>
              </dl>
            </div>

            {/* 编辑列：基本 / 关联 / 安全 */}
            <div className="space-y-8 p-6 sm:p-8">
              <section className="space-y-4" aria-labelledby="sec-basic">
                <div id="sec-basic">
                  <SectionMark>基本</SectionMark>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display-name">显示名称</Label>
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="您的称呼"
                    autoComplete="name"
                  />
                </div>
              </section>

              <section className="space-y-4" aria-labelledby="sec-relation">
                <div id="sec-relation">
                  <SectionMark>关联</SectionMark>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="relationship">在谱称谓</Label>
                    <Input
                      id="relationship"
                      value={relationshipToCreator}
                      onChange={(e) => setRelationshipToCreator(e.target.value)}
                      placeholder="如：子女、侄子、配偶"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">居住地</Label>
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="如：浙江省杭州市"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="apple"
                    className="gap-2"
                    onClick={handleSave}
                    disabled={isLoading}
                    aria-busy={isLoading}
                  >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {isLoading ? '保存中...' : '保存资料'}
                  </Button>
                </div>
              </section>

              <section className="space-y-4" aria-labelledby="sec-security">
                <div id="sec-security">
                  <SectionMark>安全</SectionMark>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="old-password">
                      原密码 <span className="text-destructive" aria-hidden="true">*</span>
                    </Label>
                    <Input
                      id="old-password"
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="当前密码"
                      autoComplete="current-password"
                      required
                      aria-required="true"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">
                      新密码 <span className="text-destructive" aria-hidden="true">*</span>
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value)
                        validatePassword('newPassword', e.target.value)
                      }}
                      onBlur={() => validatePassword('newPassword', newPassword)}
                      error={passwordErrors.newPassword}
                      aria-invalid={!!passwordErrors.newPassword}
                      placeholder="至少 6 位"
                      autoComplete="new-password"
                      required
                      aria-required="true"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">
                      确认 <span className="text-destructive" aria-hidden="true">*</span>
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value)
                        validatePassword('confirmPassword', e.target.value)
                      }}
                      onBlur={() => validatePassword('confirmPassword', confirmPassword)}
                      error={passwordErrors.confirmPassword}
                      aria-invalid={!!passwordErrors.confirmPassword}
                      placeholder="再次输入"
                      autoComplete="new-password"
                      required
                      aria-required="true"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                    定期更换密码，保护族谱资料
                  </p>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={handleChangePassword}
                    disabled={isChangingPassword || !oldPassword || !newPassword || !confirmPassword}
                    aria-busy={isChangingPassword}
                  >
                    <Lock className="h-4 w-4" aria-hidden="true" />
                    {isChangingPassword ? '更新中...' : '更新密码'}
                  </Button>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes page-rise {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes seal-stamp {
          0% { opacity: 0; transform: scale(1.5) rotate(6deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .motion-safe\\:animate-\\[page-rise_0.4s_ease-out\\],
          .motion-safe\\:animate-\\[seal-stamp_0.35s_ease-out_0.15s_both\\] {
            animation: none;
          }
        }
      `}</style>
    </Layout>
  )
}

const serifHead: React.CSSProperties = {
  fontFamily: "'Noto Serif SC', 'STSong', 'KaiTi', 'STKaiti', serif",
  letterSpacing: '0.04em',
}
