import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { User } from '@/types'
import {
  BorderGlow,
  Button,
  Input,
  Label,
  AvatarUploader,
  useToast,
} from '@/components/ui'
import { Layout } from '@/components/layout/Layout'
import { ArrowLeft, Save, Lock, KeyRound } from 'lucide-react'

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
      showToast('资料已更新', 'success')
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
      showToast('密码修改成功', 'success')
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

  return (
    <Layout>
      

      <BorderGlow
        backgroundColor="transparent"
        className="!bg-transparent border-0 p-0"
        colors={['#4facfe', '#00f2fe', '#43e97b']}
        glowIntensity={0.3}
        edgeSensitivity={35}
      >
      <div className="mx-auto max-w-xl px-6 py-8">
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
            <h1 className="text-2xl font-bold tracking-tight">个人设置</h1>
            <p className="text-sm text-muted-foreground">管理您的个人资料</p>
          </div>
        </div>

        <div className="space-y-6 rounded-lg bg-white dark:bg-[#262628] border p-6">
          {/* 头像上传 */}
          <div className="flex flex-col items-center gap-3">
            <AvatarUploader
              currentAvatar={avatar}
              onUpload={(url) => setAvatar(url)}
              name={user?.display_name || user?.username || '用户'}
              size={100}
              type="user"
            />
            <p className="text-xs text-muted-foreground">点击头像更换</p>
          </div>

          {/* 显示名称 */}
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

          {/* 用户名（只读） */}
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input id="username" value={user?.username || ''} disabled aria-readonly="true" />
          </div>

          {/* 邮箱（只读） */}
          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" value={user?.email || ''} disabled aria-readonly="true" />
          </div>

          {/* 与创建者关系 */}
          <div className="space-y-2">
            <Label htmlFor="relationship">与创建者关系</Label>
            <Input
              id="relationship"
              value={relationshipToCreator}
              onChange={(e) => setRelationshipToCreator(e.target.value)}
              placeholder="如：子女、侄子、配偶等"
            />
          </div>

          {/* 居住地 */}
          <div className="space-y-2">
            <Label htmlFor="location">居住地</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="如：浙江省杭州市"
            />
          </div>

          <Button
            variant="apple"
            glow
            className="w-full gap-2"
            onClick={handleSave}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {isLoading ? '保存中...' : '保存修改'}
          </Button>
        </div>

        {/* 密码修改 */}
        <div className="mt-6 space-y-6 rounded-lg bg-white dark:bg-[#262628] border p-6">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-lg font-semibold">修改密码</h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="old-password">
              原密码 <span className="text-destructive" aria-hidden="true">*</span>
            </Label>
            <Input
              id="old-password"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="请输入当前密码"
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
              placeholder="至少6位字符"
              autoComplete="new-password"
              required
              aria-required="true"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">
              确认新密码 <span className="text-destructive" aria-hidden="true">*</span>
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
              placeholder="再次输入新密码"
              autoComplete="new-password"
              required
              aria-required="true"
            />
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleChangePassword}
            disabled={isChangingPassword || !oldPassword || !newPassword || !confirmPassword}
            aria-busy={isChangingPassword}
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            {isChangingPassword ? '修改中...' : '修改密码'}
          </Button>
        </div>
      </div>
      </BorderGlow>
    </Layout>
  )
}
