# 古风登录页实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development or executing-plans to implement this plan task-by-task.

**Goal:** 将登录/注册/忘记密码三个认证页面从 Stripe 风格改造为水墨画卷古风风格

**Architecture:** 
- 新增 `AncientAuthLayout` 替代 `StripeAuthLayout`，复用 `InkWashBackground` 作为背景
- 新增 CSS 类（`ancient-*` 系列）实现毛笔笔触、印章按钮等古风效果
- 三个页面仅修改布局层，保留所有表单验证和数据流逻辑不变
- 新增 `BrushInput` 封装输入框 + 笔触线 + 密码切换，跨页面复用

**Tech Stack:** React 19, Tailwind CSS v4, shadcn/ui, Lucide icons, Noto Serif SC

---

### Task 1: 创建 AncientAuthLayout 布局组件

**Files:**
- Create: `frontend/src/components/auth/AncientAuthLayout.tsx`

- [ ] **Step 1: 创建文件**

```tsx
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { InkWashBackground } from '@/components/ui/InkWashBackground'

interface AncientAuthLayoutProps {
  children: ReactNode
  title: string
  subtitle: string
  footerText: string
  footerLinkText: string
  footerLinkTo: string
}

export function AncientAuthLayout({
  children,
  title,
  subtitle,
  footerText,
  footerLinkText,
  footerLinkTo,
}: AncientAuthLayoutProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <InkWashBackground />
      <div className="fixed inset-0 pointer-events-none z-[1] bg-gradient-to-b from-[#f5e6c8]/40 via-[#e0d0b8]/25 to-[#c4b08a]/40" aria-hidden="true" />

      <div className="relative z-[2] flex min-h-screen">
        {/* 左侧装饰区 - 桌面端显示竖排诗文 */}
        <div className="hidden lg:flex lg:w-[30%] items-center justify-center">
          <div
            className="text-[13px] leading-[2.4] tracking-[8px] text-[rgba(80,70,58,0.20)] select-none"
            style={{ writingMode: 'vertical-rl' }}
          >
            家族源流远 · 万代继书香
          </div>
        </div>

        {/* 右侧表单区 */}
        <div className="flex flex-1 items-center justify-center px-4 py-8 lg:px-8">
          <div className="w-full max-w-sm">
            {/* 品牌标题 */}
            <div className="text-center mb-8">
              <h1 className="font-serif text-[28px] text-[#3a3228] tracking-[12px] dark:text-[#e0d0b8]">
                族谱
              </h1>
              <div className="mt-2 h-px bg-gradient-to-r from-transparent via-[#c4b08a] to-transparent" />
              <h2 className="mt-4 font-serif text-[18px] text-[#5a4a3a] tracking-[6px] dark:text-[#c4b08a]">
                {title}
              </h2>
              <p className="mt-2 text-[13px] text-[#8b7d6b] tracking-[2px] dark:text-[#a09070]">
                {subtitle}
              </p>
            </div>

            {/* 表单卡片 */}
            <div className="rounded-sm border border-[rgba(200,185,160,0.4)] bg-[rgba(245,235,215,0.90)] px-8 py-10 shadow-[0_8px_32px_rgba(60,50,40,0.10)] backdrop-blur-sm dark:border-[rgba(160,140,110,0.25)] dark:bg-[rgba(40,35,30,0.90)]">
              {/* 顶部装饰线 */}
              <div className="mb-6 h-[2px] bg-gradient-to-r from-transparent via-[#8b7d6b] to-transparent opacity-50" />

              {children}

              {/* 底部装饰线 */}
              <div className="mt-6 h-[2px] bg-gradient-to-r from-transparent via-[#8b7d6b] to-transparent opacity-50" />
            </div>

            {/* 底部链接 */}
            {footerText || footerLinkText ? (
              <div className="mt-6 text-center">
                {footerText && (
                  <span className="text-[12px] text-[#a09070] tracking-[1px] dark:text-[#8b7d6b]">
                    {footerText}
                  </span>
                )}
                {footerLinkText && footerLinkTo && (
                  <Link
                    to={footerLinkTo}
                    className="ml-2 text-[12px] text-[#5a4a3a] tracking-[1px] underline underline-offset-4 decoration-[rgba(90,74,58,0.3)] transition-all duration-300 hover:text-[#c43a31] hover:decoration-[#c43a31] dark:text-[#c4b08a] dark:decoration-[rgba(196,176,138,0.3)] dark:hover:text-[#e8c84a] dark:hover:decoration-[#e8c84a]"
                  >
                    {footerLinkText} →
                  </Link>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证可导入**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | Select-String -Pattern "AncientAuthLayout"` (clean build later)

---

### Task 2: 添加古风 CSS 样式

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: 在 `index.css` 末尾添加古风样式类**

在文件末尾（最后一个 `}` 之后）添加：

```css
/* ===== Ancient Auth Theme ===== */

/* Brush-stroke input */
.ancient-input-wrap {
  position: relative;
}
.ancient-input-wrap .ancient-input {
  width: 100%;
  padding: 8px 4px;
  border: none;
  border-bottom: 1px solid #d4c5a9;
  background: transparent;
  font-size: 14px;
  color: #3a3228;
  outline: none;
  transition: border-color 0.3s ease;
}
.dark .ancient-input-wrap .ancient-input {
  border-bottom-color: rgba(180, 160, 130, 0.5);
  color: #d4c5a9;
}
.ancient-input-wrap .ancient-input::placeholder {
  color: #b8a88a;
  font-size: 12px;
}
.dark .ancient-input-wrap .ancient-input::placeholder {
  color: rgba(180, 160, 130, 0.4);
}
.ancient-input-brush {
  height: 2px;
  background: linear-gradient(90deg, transparent 10%, #c4b08a, transparent 80%);
  margin-top: -1px;
  opacity: 0.4;
  transition: opacity 0.3s ease, height 0.3s ease;
}
.dark .ancient-input-brush {
  background: linear-gradient(90deg, transparent 10%, rgba(196, 176, 138, 0.6), transparent 80%);
}
.ancient-input-wrap:focus-within .ancient-input-brush {
  opacity: 0.9;
  height: 2.5px;
  animation: brush-stroke-in 0.4s ease-out;
}
.ancient-input-wrap:focus-within .ancient-input {
  border-bottom-color: #8b7d6b;
}
.dark .ancient-input-wrap:focus-within .ancient-input {
  border-bottom-color: rgba(196, 176, 138, 0.8);
}

/* Eye toggle button */
.ancient-eye-toggle {
  position: absolute;
  right: 4px;
  bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #a09070;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s ease;
}
.dark .ancient-eye-toggle {
  color: rgba(160, 140, 110, 0.6);
}
.ancient-eye-toggle:hover {
  color: #5a4a3a;
}
.dark .ancient-eye-toggle:hover {
  color: #c4b08a;
}

/* Seal button */
.ancient-btn-seal {
  position: relative;
  width: 100%;
  padding: 10px 16px;
  background: #c43a31;
  color: #f5e6c8;
  border: none;
  border-radius: 3px;
  font-family: 'Noto Serif SC', 'SimSun', 'STSong', serif;
  font-size: 16px;
  letter-spacing: 8px;
  cursor: pointer;
  transition: background 0.3s ease, transform 0.2s ease, box-shadow 0.3s ease;
  overflow: hidden;
}
.dark .ancient-btn-seal {
  background: #a03028;
  color: #e0d0b8;
}
.ancient-btn-seal:hover:not(:disabled) {
  background: #a83028;
  box-shadow: 0 2px 12px rgba(196, 58, 49, 0.3);
  transform: translateY(-1px);
}
.dark .ancient-btn-seal:hover:not(:disabled) {
  box-shadow: 0 2px 12px rgba(160, 48, 40, 0.4);
}
.ancient-btn-seal:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: none;
}
.ancient-btn-seal:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Checkbox (classical style) */
.ancient-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border: 1px solid #c4b08a;
  border-radius: 2px;
  background: transparent;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  transition: background 0.2s ease, border-color 0.2s ease;
}
.dark .ancient-checkbox {
  border-color: rgba(180, 160, 130, 0.5);
}
.ancient-checkbox:checked {
  background: #c43a31;
  border-color: #c43a31;
}
.dark .ancient-checkbox:checked {
  background: #a03028;
  border-color: #a03028;
}
.ancient-checkbox:checked::after {
  content: '';
  position: absolute;
  top: 1px;
  left: 4px;
  width: 4px;
  height: 7px;
  border: solid #f5e6c8;
  border-width: 0 1.5px 1.5px 0;
  transform: rotate(45deg);
}

/* Error message */
.ancient-error {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 14px;
  border: 1px solid rgba(196, 58, 49, 0.2);
  background: rgba(196, 58, 49, 0.06);
  border-radius: 3px;
  font-size: 13px;
  color: #b83028;
  animation: fade-in 0.4s ease-out;
}

/* Label */
.ancient-label {
  display: block;
  font-size: 12px;
  color: #8b7d6b;
  letter-spacing: 2px;
  margin-bottom: 4px;
}
.dark .ancient-label {
  color: rgba(160, 140, 110, 0.7);
}
.ancient-label .required {
  color: #c43a31;
}

/* Field error */
.ancient-field-error {
  font-size: 11px;
  color: #b83028;
  margin-top: 4px;
  margin-left: 2px;
}

/* Animations */
@keyframes brush-stroke-in {
  0% {
    transform: scaleX(0.3);
    opacity: 0.2;
  }
  100% {
    transform: scaleX(1);
    opacity: 0.9;
  }
}

/* Success state styling */
.ancient-success {
  text-align: center;
  animation: fade-in 0.5s ease-out;
}
.ancient-success .icon {
  margin: 0 auto 20px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ancient-success .icon svg {
  width: 36px;
  height: 36px;
  color: #c43a31;
}
.ancient-success h3 {
  font-family: 'Noto Serif SC', serif;
  font-size: 20px;
  color: #3a3228;
  letter-spacing: 4px;
  margin-bottom: 8px;
}
.dark .ancient-success h3 {
  color: #e0d0b8;
}
.ancient-success p {
  font-size: 13px;
  color: #8b7d6b;
  line-height: 1.6;
  margin-bottom: 8px;
}
.dark .ancient-success p {
  color: rgba(160, 140, 110, 0.7);
}

/* Password strength indicator */
.ancient-strength {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #8b7d6b;
  margin-top: 8px;
}
```

---

### Task 3: 改造登录页面 LoginPage

**Files:**
- Modify: `frontend/src/components/pages/LoginPage.tsx`

- [ ] **Step 1: 替换导入和布局**

```tsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store'
import { login, clearError } from '@/store/slices/authSlice'
import { usePasswordToggle, useRememberMe } from '@/hooks'
import { AncientAuthLayout } from '@/components/auth/AncientAuthLayout'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
```

- [ ] **Step 2: 替换 JSX 返回内容**

将整个 return 替换为：

```tsx
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
```

---

### Task 4: 改造注册页面 RegisterPage

**Files:**
- Modify: `frontend/src/components/pages/RegisterPage.tsx`

- [ ] **Step 1: 替换导入**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store'
import { registerUser, clearError } from '@/store/slices/authSlice'
import { usePasswordToggle } from '@/hooks'
import { AncientAuthLayout } from '@/components/auth/AncientAuthLayout'
import { Eye, EyeOff, CheckCircle, XCircle, PartyPopper } from 'lucide-react'
```

- [ ] **Step 2: 替换注册成功 JSX**

将 `if (registered)` 块中的 `StripeAuthLayout` 替换为 `AncientAuthLayout`：

```tsx
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
```

- [ ] **Step 3: 替换主表单 JSX**

将主 return 中的 `StripeAuthLayout` 替换为 `AncientAuthLayout`，所有 `stripe-input-wrap` / `stripe-input-field` / `stripe-eye-toggle` 替换为对应的 `ancient-input-wrap` / `ancient-input` / `ancient-eye-toggle`，`stripe-checkbox` 替换为 `ancient-checkbox`，表单结构参照 Task 3 的模式（div > label + input-wrap > input + brush + eye-toggle）。

```tsx
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
```

> 添加缺失的导入：需要在文件顶部添加上面 `{ AlertCircle }` 的导入。
> 注意：`showConfirm` 已在原组件中定义，保留。

- [ ] **Step 4: 确保删除了对 `Button`, `Input`, `Label` 和 `StripeAuthLayout` 的导入**

移除：`import { Button, Input, Label } from '@/components/ui'`
移除：`import { StripeAuthLayout } from '@/components/auth/StripeAuthLayout'`
新增：`import { AlertCircle } from 'lucide-react'`（如果原来没有）

---

### Task 5: 改造忘记密码页面 ForgotPasswordPage

**Files:**
- Modify: `frontend/src/components/pages/ForgotPasswordPage.tsx`

- [ ] **Step 1: 替换导入**

```tsx
import { useState } from 'react'
import { AncientAuthLayout } from '@/components/auth/AncientAuthLayout'
import { CheckCircle, AlertCircle } from 'lucide-react'
```

- [ ] **Step 2: 替换 JSX**

```tsx
  return (
    <AncientAuthLayout
      title="重置密码"
      subtitle={sent ? '请查看您的邮箱并按指引操作' : '输入注册邮箱，我们将发送重置链接'}
      footerText=""
      footerLinkText="返回登录"
      footerLinkTo="/login"
    >
      {sent ? (
        <div className="ancient-success">
          <div className="icon">
            <CheckCircle />
          </div>
          <h3>邮件已发送</h3>
          <p>如果该邮箱已注册，您将收到重置密码的邮件</p>
          <p className="text-[11px] text-[#b8a88a] mt-1 mb-6">请检查您的收件箱和垃圾邮件</p>
          <button className="ancient-btn-seal" onClick={() => setSent(false)}>
            重新发送
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-5">
            <div>
              <label htmlFor="email" className="ancient-label">
                注册邮箱 <span className="required">*</span>
              </label>
              <div className="ancient-input-wrap">
                <input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="ancient-input"
                />
                <div className="ancient-input-brush" />
              </div>
            </div>
            <button type="submit" className="ancient-btn-seal">
              发送重置链接
            </button>
          </div>
        </form>
      )}
    </AncientAuthLayout>
  )
```

---

### Task 6: 验证构建

- [ ] **运行构建检查**

```bash
cd frontend && npm run build 2>&1 | Select-String -Pattern "error"
```

Expected: No output (clean build).

---

### Task 7: 提交

```bash
git add -A
git commit -m "feat(ui): redesign auth pages with ink-wash ancient Chinese style

- Create AncientAuthLayout with InkWashBackground
- Add ancient-* CSS classes for brush-stroke inputs, seal buttons
- Refactor LoginPage, RegisterPage, ForgotPasswordPage
- Responsive layout with vertical poem decoration on desktop"
```
