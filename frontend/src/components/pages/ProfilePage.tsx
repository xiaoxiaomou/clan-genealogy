import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { User } from '@/types'
import {
  AvatarUploader,
  useToast,
} from '@/components/ui'
import { PG_RED, PG_SERIF } from '@/components/ui/pedigree'
import { Layout } from '@/components/layout/Layout'
import { ArrowLeft, Save, Lock, KeyRound, AtSign, Mail, AlertCircle } from 'lucide-react'

/* ═══════════════════════════════════════════════════════
   谱页 · 修名帖 —— 墨案上的一纸名帖
   墨案（desk）固定暖墨色，纸帖（sheet）随主题明暗取材；
   表单为下划线式编辑框；朱砂印为唯一固定强调色。
   ═══════════════════════════════════════════════════════ */

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

  const createdLabel = user?.created_at
    ? `入谱于 ${new Date(user.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}`
    : null

  /* 下划线编辑框：纸帖上的书写感 */
  const InkField = ({
    id,
    label,
    error,
    children,
  }: {
    id: string
    label: React.ReactNode
    error?: string
    children: React.ReactNode
  }) => (
    <div className="fi-field">
      <label htmlFor={id} className="fi-field-label">{label}</label>
      {children}
      {error && (
        <p className="fi-field-error" role="alert">
          <AlertCircle className="h-3 w-3" aria-hidden="true" /> {error}
        </p>
      )}
    </div>
  )

  return (
    <Layout>
      <div className="fi-desk relative" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
        <style>{`
          .fi-desk {
            background:
              radial-gradient(1100px 500px at 18% -8%, rgba(214,186,148,.10), transparent 60%),
              radial-gradient(900px 600px at 100% 110%, rgba(0,0,0,.32), transparent 55%),
              #1C1611;
            color: #EFE8DC;
            padding: 40px 20px 56px;
          }
          .fi-sheet {
            background: linear-gradient(180deg, #FAF6EF 0%, #F4EFE5 100%);
            border-radius: 4px;
            box-shadow:
              0 1px 2px rgba(0,0,0,.22),
              0 14px 34px -10px rgba(0,0,0,.38),
              0 40px 90px -28px rgba(0,0,0,.5);
            color: #2A241D;
            position: relative;
          }
          .fi-sheet::before {
            content: '';
            position: absolute; inset: 10px;
            border: 1px solid rgba(166,58,46,.14);
            pointer-events: none;
          }
          .dark .fi-desk .fi-sheet {
            background: linear-gradient(180deg, #262019 0%, #1F1A14 100%);
            color: #ECE4D6;
          }
          .dark .fi-desk .fi-sheet::before { border-color: rgba(166,58,46,.22); }
          .fi-eyebrow {
            font-size: 11px; letter-spacing: .35em;
            color: rgba(239,232,220,.55);
          }
          .fi-sheet-eyebrow {
            font-size: 11px; letter-spacing: .32em; color: ${PG_RED};
          }
          .fi-name {
            font-family: ${PG_SERIF};
            font-size: clamp(26px, 3.4vw, 36px);
            font-weight: 600; letter-spacing: .1em; line-height: 1.15;
          }
          .fi-rule { width: 44px; height: 2px; background: ${PG_RED}; margin-top: 12px; }
          .fi-meta { font-size: 13px; color: #8A8071; display: inline-flex; align-items: center; gap: 6px; }
          .dark .fi-desk .fi-meta { color: #9C917F; }
          .fi-spine {
            writing-mode: vertical-rl;
            font-family: ${PG_SERIF};
            letter-spacing: .42em;
            color: rgba(239,232,220,.6);
            font-size: 15px;
          }
          .fi-spine::before {
            content: '';
            display: block; width: 5px; height: 5px;
            border-radius: 2px; background: ${PG_RED};
            margin-bottom: 14px; margin-left: 2px;
          }
          .fi-section-label {
            font-size: 11px; letter-spacing: .3em; color: #8A8071;
            display: flex; align-items: center; gap: 10px;
          }
          .dark .fi-desk .fi-section-label { color: #9C917F; }
          .fi-section-label::before {
            content: ''; width: 5px; height: 5px; border-radius: 2px;
            background: ${PG_RED};
          }
          .fi-section-label::after {
            content: ''; flex: 1; height: 1px; background: rgba(0,0,0,.08);
          }
          .dark .fi-desk .fi-section-label::after { background: rgba(255,255,255,.09); }
          .fi-field { margin-top: 18px; }
          .fi-field-label {
            display: block; font-size: 11.5px; letter-spacing: .14em;
            color: #8A8071; margin-bottom: 2px;
          }
          .dark .fi-desk .fi-field-label { color: #9C917F; }
          .fi-input {
            width: 100%; height: 40px;
            background: transparent; border: 0;
            border-bottom: 1px solid rgba(0,0,0,.16);
            font-size: 15px; color: inherit;
            padding: 0 2px; outline: none;
            transition: border-color .2s ease, box-shadow .2s ease;
          }
          .dark .fi-desk .fi-input { border-bottom-color: rgba(255,255,255,.18); }
          .fi-input::placeholder { color: rgba(0,0,0,.28); }
          .dark .fi-desk .fi-input::placeholder { color: rgba(255,255,255,.3); }
          .fi-input:focus {
            border-bottom-color: ${PG_RED};
            box-shadow: 0 1px 0 ${PG_RED};
          }
          .fi-input:disabled { color: rgba(0,0,0,.4); }
          .dark .fi-desk .fi-input:disabled { color: rgba(255,255,255,.4); }
          .fi-input:focus-visible { outline: none; }
          .fi-field-error {
            display: flex; align-items: center; gap: 4px;
            font-size: 11.5px; color: #A63A2E; margin-top: 6px;
          }
          .fi-quiet {
            border-bottom-style: dashed;
            border-bottom-color: rgba(0,0,0,.12);
            padding-bottom: 9px;
            font-size: 15px;
          }
          .dark .fi-desk .fi-quiet { border-bottom-color: rgba(255,255,255,.12); }
          .fi-seal {
            display: flex; align-items: center; justify-content: center;
            color: #F6EFE3;
            font-family: ${PG_SERIF}; font-weight: 600;
            background: radial-gradient(120% 120% at 32% 26%, #B74437 0%, #9E3126 62%, #8D2A20 100%);
            box-shadow:
              inset 0 0 8px rgba(0,0,0,.28),
              0 2px 10px rgba(120,30,20,.45);
            border-radius: 10% 14% 9% 15% / 13% 9% 15% 10%;
            user-select: none;
          }
          .fi-divider { height: 1px; background: rgba(0,0,0,.08); }
          .dark .fi-desk .fi-divider { background: rgba(255,255,255,.08); }
          .fi-footer {
            text-align: center; font-family: ${PG_SERIF};
            letter-spacing: .4em; font-size: 11px;
            color: rgba(239,232,220,.4);
          }
          .fi-btn-save {
            display: inline-flex; align-items: center; justify-content: center;
            gap: 8px; height: 42px; padding: 0 26px;
            background: linear-gradient(160deg, #B23E31 0%, #96301F 100%);
            color: #F6EFE3; border: 0; border-radius: 3px;
            font-size: 14px; letter-spacing: .1em;
            box-shadow: 0 6px 18px -6px rgba(140,35,25,.55);
            transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
          }
          .fi-btn-save:hover:not(:disabled) { filter: brightness(1.06); transform: translateY(-1px); }
          .fi-btn-save:active:not(:disabled) { transform: translateY(0); }
          .fi-btn-save:disabled { opacity: .55; }
          .fi-btn-ghost {
            display: inline-flex; align-items: center; justify-content: center;
            gap: 8px; height: 42px; padding: 0 22px;
            background: transparent; color: inherit;
            border: 1px solid rgba(0,0,0,.2); border-radius: 3px;
            font-size: 14px; letter-spacing: .08em;
            transition: border-color .15s ease, color .15s ease;
          }
          .dark .fi-desk .fi-btn-ghost { border-color: rgba(255,255,255,.22); }
          .fi-btn-ghost:hover:not(:disabled) { border-color: ${PG_RED}; color: ${PG_RED}; }
          .fi-btn-ghost:disabled { opacity: .5; }
          .fi-sheet-btn { border: 0; background: none; cursor: pointer; color: inherit; }
          @media (max-width: 640px) {
            .fi-desk { padding: 24px 14px 72px; }
            .fi-spine-col { display: none; }
          }
          @media (prefers-reduced-motion: reduce) {
            .fi-desk * { transition: none !important; animation: none !important; }
          }
        `}</style>

        {/* 墨案顶部：返回 + 命题 */}
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="返回首页"
            className="fi-sheet-btn flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-[#EFE8DC]/70 transition-colors hover:border-[#EFE8DC]/30 hover:text-[#EFE8DC]"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <p className="fi-eyebrow">谱 牒 · 修 名 帖</p>
        </div>

        {/* ══ 纸帖：题签(案上) + 帖面 ══ */}
        <div className="mx-auto mt-6 flex max-w-4xl gap-5">
          {/* 案上题签 */}
          <div className="fi-spine-col flex items-start pt-2" aria-hidden="true">
            <span className="fi-spine">谱牒修名 · 以存其真</span>
          </div>

          {/* 纸帖 */}
          <div className="fi-sheet min-w-0 flex-1 px-7 py-9 sm:px-12 sm:py-11">
            {/* 帖头：钤印头像 + 名讳 */}
            <div className="flex flex-wrap items-center gap-7">
              <div className="relative shrink-0">
                <span
                  aria-hidden="true"
                  className="absolute -inset-1.5 rounded-full"
                  style={{ border: `2px solid ${PG_RED}4D` }}
                />
                <AvatarUploader
                  currentAvatar={avatar}
                  onUpload={(url) => setAvatar(url)}
                  name={user?.display_name || user?.username || '用户'}
                  size={96}
                  type="user"
                />
                <span
                  aria-hidden="true"
                  className="fi-seal absolute -right-4 bottom-0 z-10"
                  style={{ width: 36, height: 36, fontSize: 19, transform: 'rotate(7deg)' }}
                >
                  谱
                </span>
              </div>
              <div className="min-w-0">
                <p className="fi-sheet-eyebrow">修 名 帖</p>
                <h1 className="fi-name mt-2">{user?.display_name || user?.username || '—'}</h1>
                <div className="fi-rule" aria-hidden="true" />
                <p className="fi-meta mt-3">
                  {user?.is_admin ? '谱局 · 管理员' : '族人'}
                  {createdLabel && <span className="opacity-70">· {createdLabel}</span>}
                </p>
              </div>
            </div>

            {/* 账号行 */}
            <div className="mt-7 flex flex-wrap gap-x-9 gap-y-2">
              <span className="fi-meta"><AtSign className="h-3.5 w-3.5" aria-hidden="true" /> {user?.username || '—'}</span>
              <span className="fi-meta"><Mail className="h-3.5 w-3.5" aria-hidden="true" /> {user?.email || '—'}</span>
            </div>

            <div className="fi-divider my-9" aria-hidden="true" />

            {/* 基本与关联 */}
            <section aria-labelledby="fi-sec-basic">
              <p id="fi-sec-basic" className="fi-section-label">基 本 与 关 联</p>
              <div className="mt-2 grid gap-x-10 sm:grid-cols-2">
                <InkField id="display-name" label="显示名称">
                  <input
                    id="display-name"
                    className="fi-input"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="您的称呼"
                    autoComplete="name"
                  />
                </InkField>
                <InkField id="relationship" label="在谱称谓">
                  <input
                    id="relationship"
                    className="fi-input"
                    value={relationshipToCreator}
                    onChange={(e) => setRelationshipToCreator(e.target.value)}
                    placeholder="如：子女、侄子、配偶"
                  />
                </InkField>
                <InkField id="location" label="居住地">
                  <input
                    id="location"
                    className="fi-input"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="如：浙江省杭州市"
                  />
                </InkField>
                <div className="fi-field">
                  <span className="fi-field-label">用户名 / 邮箱</span>
                  <p className="fi-quiet truncate">{user?.username} · {user?.email}</p>
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <button
                  type="button"
                  className="fi-btn-save"
                  onClick={handleSave}
                  disabled={isLoading}
                  aria-busy={isLoading}
                >
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {isLoading ? '保存中…' : '保存资料'}
                </button>
              </div>
            </section>

            <div className="fi-divider my-9" aria-hidden="true" />

            {/* 安全 */}
            <section aria-labelledby="fi-sec-security">
              <p id="fi-sec-security" className="fi-section-label">登 录 安 全</p>
              <div className="mt-2 grid gap-x-10 sm:grid-cols-3">
                <InkField id="old-password" label={<>原密码 <span style={{ color: PG_RED }}>*</span></>}>
                  <input
                    id="old-password"
                    type="password"
                    className="fi-input"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="当前密码"
                    autoComplete="current-password"
                    required
                    aria-required="true"
                  />
                </InkField>
                <InkField id="new-password" label={<>新密码 <span style={{ color: PG_RED }}>*</span></>}>
                  <input
                    id="new-password"
                    type="password"
                    className="fi-input"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      validatePassword('newPassword', e.target.value)
                    }}
                    onBlur={() => validatePassword('newPassword', newPassword)}
                    aria-invalid={!!passwordErrors.newPassword}
                    placeholder="至少 6 位"
                    autoComplete="new-password"
                    required
                    aria-required="true"
                  />
                </InkField>
                <InkField id="confirm-password" label={<>确认 <span style={{ color: PG_RED }}>*</span></>}>
                  <input
                    id="confirm-password"
                    type="password"
                    className="fi-input"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      validatePassword('confirmPassword', e.target.value)
                    }}
                    onBlur={() => validatePassword('confirmPassword', confirmPassword)}
                    aria-invalid={!!passwordErrors.confirmPassword}
                    placeholder="再次输入"
                    autoComplete="new-password"
                    required
                    aria-required="true"
                  />
                </InkField>
              </div>
              {(passwordErrors.newPassword || passwordErrors.confirmPassword) && (
                <p className="fi-field-error" role="alert">
                  <AlertCircle className="h-3 w-3" aria-hidden="true" />
                  {passwordErrors.newPassword || passwordErrors.confirmPassword}
                </p>
              )}
              <div className="mt-8 flex items-center justify-between gap-3">
                <p className="fi-meta">
                  <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                  定期更换密码，守护族册
                </p>
                <button
                  type="button"
                  className="fi-btn-ghost"
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !oldPassword || !newPassword || !confirmPassword}
                  aria-busy={isChangingPassword}
                >
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  {isChangingPassword ? '更新中…' : '更新密码'}
                </button>
              </div>
            </section>
          </div>
        </div>

        <p className="fi-footer mt-10">谱 牒 修 名 · 以 存 其 真</p>
      </div>
    </Layout>
  )
}
