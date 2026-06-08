import { useState } from 'react'
import { AncientAuthLayout } from '@/components/auth/AncientAuthLayout'
import { CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) setSent(true)
  }

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
}
