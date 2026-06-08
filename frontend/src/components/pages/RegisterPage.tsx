import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store'
import { registerUser, clearError } from '@/store/slices/authSlice'
import { usePasswordToggle } from '@/hooks'
import { AncientAuthLayout } from '@/components/auth/AncientAuthLayout'
import { Eye, EyeOff, CheckCircle, XCircle, PartyPopper, AlertCircle } from 'lucide-react'

export default function RegisterPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { isLoading } = useAppSelector((state) => state.auth)
  const { show: showPassword, toggle: togglePassword } = usePasswordToggle()
  const { show: showConfirm, toggle: toggleConfirm } = usePasswordToggle()

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    display_name: '',
  })
  const [error, setError] = useState('')
  const [registered, setRegistered] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string
    email?: string
    password?: string
    confirmPassword?: string
  }>({})

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    dispatch(clearError())

    const errors: typeof fieldErrors = {}
    if (!form.username.trim()) errors.username = '请输入用户名'
    else if (form.username.length < 3) errors.username = '用户名至少 3 个字符'
    else if (!/^[a-zA-Z0-9_]+$/.test(form.username)) errors.username = '用户名只能包含字母、数字和下划线'
    if (!form.email) errors.email = '请输入邮箱'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = '邮箱格式不正确'
    if (!form.password) errors.password = '请输入密码'
    else if (form.password.length < 6) errors.password = '密码至少 6 个字符'
    if (!form.confirmPassword) errors.confirmPassword = '请确认密码'
    else if (form.password !== form.confirmPassword) errors.confirmPassword = '两次输入的密码不一致'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const result = await dispatch(registerUser({
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      display_name: form.display_name.trim() || undefined,
    }))

    if (registerUser.fulfilled.match(result)) {
      setRegistered(true)
    } else if (registerUser.rejected.match(result)) {
      setError(result.payload as string || '注册失败')
    }
  }

  if (registered) {
    return (
      <AncientAuthLayout
        title="注 册"
        subtitle="创建您的家族档案"
        footerText=""
        footerLinkText=""
        footerLinkTo=""
      >
        <div className="ancient-success">
          <div className="icon">
            <PartyPopper />
          </div>
          <h3>注册成功</h3>
          <p>您的账户已提交，请等待管理员审核</p>
          <p style={{ fontSize: '11px', color: '#b8a88a', marginBottom: '24px' }}>
            审核通过后，您将可以正常登录使用
          </p>
          <button className="ancient-btn-seal" onClick={() => navigate('/login')}>
            前往登录页
          </button>
        </div>
      </AncientAuthLayout>
    )
  }

  return (
    <AncientAuthLayout
      title="注 册"
      subtitle="开始记录您的家族故事"
      footerText="已有账户？"
      footerLinkText="立即登录"
      footerLinkTo="/login"
    >
      {error && (
        <div className="ancient-error" role="alert" aria-live="assertive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate aria-label="注册表单">
        <div className="space-y-4">
          <div>
            <label htmlFor="display_name" className="ancient-label">
              显示名称
            </label>
            <div className="ancient-input-wrap">
              <input
                id="display_name"
                placeholder="您的称呼（选填）"
                value={form.display_name}
                onChange={handleChange('display_name')}
                autoComplete="name"
                className="ancient-input"
              />
              <div className="ancient-input-brush" />
            </div>
          </div>

          <div>
            <label htmlFor="username" className="ancient-label">
              用户名 <span className="required">*</span>
            </label>
            <div className="ancient-input-wrap">
              <input
                id="username"
                placeholder="用于登录的用户名"
                value={form.username}
                onChange={handleChange('username')}
                aria-invalid={!!fieldErrors.username}
                autoComplete="username"
                required
                className="ancient-input"
              />
              <div className="ancient-input-brush" />
            </div>
            {fieldErrors.username && <p className="ancient-field-error">{fieldErrors.username}</p>}
          </div>

          <div>
            <label htmlFor="email" className="ancient-label">
              邮箱 <span className="required">*</span>
            </label>
            <div className="ancient-input-wrap">
              <input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={handleChange('email')}
                aria-invalid={!!fieldErrors.email}
                autoComplete="email"
                required
                className="ancient-input"
              />
              <div className="ancient-input-brush" />
            </div>
            {fieldErrors.email && <p className="ancient-field-error">{fieldErrors.email}</p>}
          </div>

          <div>
            <label htmlFor="password" className="ancient-label">
              密码 <span className="required">*</span>
            </label>
            <div className="ancient-input-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="至少6位字符"
                value={form.password}
                className="ancient-input pr-8"
                onChange={handleChange('password')}
                aria-invalid={!!fieldErrors.password}
                autoComplete="new-password"
                required
              />
              <div className="ancient-input-brush" />
              <button
                type="button"
                onClick={togglePassword}
                className="ancient-eye-toggle"
                tabIndex={-1}
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && <p className="ancient-field-error">{fieldErrors.password}</p>}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="ancient-label">
              确认密码 <span className="required">*</span>
            </label>
            <div className="ancient-input-wrap">
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                placeholder="再次输入密码"
                value={form.confirmPassword}
                className="ancient-input pr-8"
                onChange={handleChange('confirmPassword')}
                aria-invalid={!!fieldErrors.confirmPassword}
                autoComplete="new-password"
                required
              />
              <div className="ancient-input-brush" />
              <button
                type="button"
                onClick={toggleConfirm}
                className="ancient-eye-toggle"
                tabIndex={-1}
                aria-label={showConfirm ? '隐藏密码' : '显示密码'}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.confirmPassword && <p className="ancient-field-error">{fieldErrors.confirmPassword}</p>}
          </div>

          {form.password && (
            <div className="ancient-strength">
              {form.password.length >= 6
                ? <><CheckCircle className="h-3 w-3 text-green-600 dark:text-green-500" /><span className="text-green-700 dark:text-green-400">至少6位</span></>
                : <><XCircle className="h-3 w-3 text-[#a09070]" /><span>至少6位</span></>}
              {form.confirmPassword && (
                <>
                  <span className="mx-1 text-[#d4c5a9]">·</span>
                  {form.password === form.confirmPassword
                    ? <><CheckCircle className="h-3 w-3 text-green-600 dark:text-green-500" /><span className="text-green-700 dark:text-green-400">密码一致</span></>
                    : <><XCircle className="h-3 w-3 text-[#b83028]" /><span className="text-[#b83028]">密码一致</span></>}
                </>
              )}
            </div>
          )}

          <button
            type="submit"
            className="ancient-btn-seal"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? '注册中...' : '注 册'}
          </button>
        </div>
      </form>
    </AncientAuthLayout>
  )
}
