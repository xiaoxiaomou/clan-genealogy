import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store'
import { login, clearError } from '@/store/slices/authSlice'
import { usePasswordToggle, useRememberMe } from '@/hooks'
import { AncientAuthLayout } from '@/components/auth/AncientAuthLayout'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { isLoading, error } = useAppSelector((state) => state.auth)
  const { show: showPassword, toggle: togglePassword } = usePasswordToggle()
  const { remembered, toggle: toggleRemember, save: saveRemember, savedUsername } = useRememberMe()

  const [username, setUsername] = useState(savedUsername)
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({})

  const validateField = (name: string, value: string) => {
    const errors: typeof fieldErrors = { ...fieldErrors }
    if (name === 'username') {
      if (!value.trim()) errors.username = '请输入用户名'
      else delete errors.username
    }
    if (name === 'password') {
      if (!value) errors.password = '请输入密码'
      else delete errors.password
    }
    setFieldErrors(errors)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    dispatch(clearError())

    const errors: typeof fieldErrors = {}
    if (!username.trim()) errors.username = '请输入用户名'
    if (!password) errors.password = '请输入密码'
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    const result = await dispatch(login({ username: username.trim(), password }))
    if (login.fulfilled.match(result)) {
      saveRemember(username.trim())
      navigate('/')
    }
  }

  return (
    <AncientAuthLayout
      title="登 录"
      subtitle="请输入您的账户信息以继续"
      footerText="还没有账户？"
      footerLinkText="立即注册"
      footerLinkTo="/register"
    >
      {error && (
        <div className="ancient-error" role="alert" aria-live="assertive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} aria-label="登录表单" noValidate>
        <div className="space-y-5">
          <div>
            <label htmlFor="username" className="ancient-label">
              账号 <span className="required">*</span>
            </label>
            <div className="ancient-input-wrap">
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="用户名或邮箱"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  if (fieldErrors.username) validateField('username', e.target.value)
                }}
                onBlur={() => validateField('username', username)}
                aria-invalid={!!fieldErrors.username}
                required
                className="ancient-input"
              />
              <div className="ancient-input-brush" />
            </div>
            {fieldErrors.username && <p className="ancient-field-error">{fieldErrors.username}</p>}
          </div>

          <div>
            <label htmlFor="password" className="ancient-label">
              密码 <span className="required">*</span>
            </label>
            <div className="ancient-input-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (fieldErrors.password) validateField('password', e.target.value)
                }}
                onBlur={() => validateField('password', password)}
                aria-invalid={!!fieldErrors.password}
                required
                className="ancient-input pr-8"
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

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remembered}
                onChange={toggleRemember}
                className="ancient-checkbox"
              />
              <span className="text-[12px] text-[#a09070] tracking-[1px] dark:text-[rgba(160,140,110,0.6)]">
                记住我 7 天
              </span>
            </label>
            <Link
              to="/forgot-password"
              className="text-[12px] text-[#a09070] tracking-[1px] transition-colors duration-200 hover:text-[#5a4a3a] dark:text-[rgba(160,140,110,0.6)] dark:hover:text-[#c4b08a]"
            >
              忘记密码？
            </Link>
          </div>

          <button
            type="submit"
            className="ancient-btn-seal"
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? '登录中...' : '登 录'}
          </button>
        </div>
      </form>
    </AncientAuthLayout>
  )
}
