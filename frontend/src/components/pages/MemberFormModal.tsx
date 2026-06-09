import { useEffect, useState } from 'react'
import { Button, Modal, Input, Label, AvatarUploader, RichTextEditor } from '@/components/ui'
import { Sparkles, Check, X as XIcon, Loader2 } from 'lucide-react'
import type { Member } from '@/types'

export interface MemberFormData {
  name: string
  gender: string
  birth_date: string
  death_date: string
  generation: string
  generation_name: string
  bio: string
  avatar: string
  is_alive: boolean
  courtesy_name: string
  art_name: string
  posthumous_name: string
}

interface MemberFormModalProps {
  showAdd: boolean
  showEdit: boolean
  formData: MemberFormData
  editingMember: Member | null
  formRefAdd: React.RefObject<HTMLFormElement>
  formRefEdit: React.RefObject<HTMLFormElement>
  saveShortcutKeys: string
  saveShortcutHint: string
  familyId: number
  onChange: (field: string, value: any) => void
  onCloseAdd: () => void
  onCloseEdit: () => void
  onSubmitAdd: (e: React.FormEvent) => void
  onSubmitEdit: (e: React.FormEvent) => void
  generationSuggestion: string | null
  onApplySuggestion: () => void
}

export default function MemberFormModal({
  showAdd,
  showEdit,
  formData,
  editingMember,
  formRefAdd,
  formRefEdit,
  saveShortcutKeys,
  saveShortcutHint,
  familyId,
  onChange,
  onCloseAdd,
  onCloseEdit,
  onSubmitAdd,
  onSubmitEdit,
  generationSuggestion,
  onApplySuggestion,
}: MemberFormModalProps) {
  const [compliance, setCompliance] = useState<{ match: boolean; reason: string; zibei_char: string | null; actual_zibei_char: string | null } | null>(null)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    setCompliance(null)
  }, [showAdd, showEdit, formData.name, formData.generation])

  useEffect(() => {
    async function checkCompliance() {
      if (!formData.name || !formData.generation) {
        setCompliance(null)
        return
      }
      setChecking(true)
      try {
        const mod = await import('@/lib/api')
        const res = await mod.api.checkZibeiCompliance(familyId, {
          name: formData.name,
          generation: Number(formData.generation),
        })
        setCompliance(res)
      } catch {
        setCompliance(null)
      } finally {
        setChecking(false)
      }
    }
    const t = setTimeout(checkCompliance, 400)
    return () => clearTimeout(t)
  }, [formData.name, formData.generation, familyId, showAdd, showEdit])

  const renderFormFields = (
    formRef: React.RefObject<HTMLFormElement>,
    onSubmit: (e: React.FormEvent) => void,
    isEdit: boolean
  ) => (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <div className="flex justify-center">
        <AvatarUploader
          currentAvatar={formData.avatar || null}
          onUpload={(url: string) => onChange('avatar', url)}
          name={formData.name || '新成员'}
          gender={formData.gender}
          size={80}
          memberId={isEdit ? editingMember?.id : undefined}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="m-name">姓名 *</Label>
        <Input
          id="m-name"
          value={formData.name}
          onChange={(e) => onChange('name', e.target.value)}
          required
        />
        {formData.name && formData.generation && (
          <div className="flex items-center gap-1.5 text-xs">
            {checking ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />校验字辈中...
              </span>
            ) : compliance ? compliance.match ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                <Check className="h-3 w-3" />符合字辈「{compliance.zibei_char}」
              </span>
            ) : (
              <span
                className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                title={compliance.reason}
              >
                <XIcon className="h-3 w-3" />{compliance.reason}
              </span>
            ) : null}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>性别</Label>
          <select
            value={formData.gender}
            onChange={(e) => onChange('gender', e.target.value)}
            className="flex h-11 w-full rounded border border-border bg-background px-4 py-2 text-sm"
          >
            <option value="male">男</option>
            <option value="female">女</option>
            <option value="unknown">未知</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label>辈分（第几代）</Label>
          <Input
            type="number"
            value={formData.generation}
            onChange={(e) => onChange('generation', e.target.value)}
            placeholder="1"
          />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>辈分名称</Label>
          {generationSuggestion && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs text-primary border-primary/50 hover:text-primary"
              onClick={onApplySuggestion}
            >
              <Sparkles className="h-3 w-3" />
              使用建议：{generationSuggestion}
            </Button>
          )}
        </div>
        <Input
          value={formData.generation_name}
          onChange={(e) => onChange('generation_name', e.target.value)}
          placeholder="如：德、建、伟"
        />
      </div>
      <div className="space-y-2 border-t pt-3 mt-2">
        <Label className="text-xs text-muted-foreground font-medium">传统信息</Label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">字</Label>
            <Input value={formData.courtesy_name} onChange={(e) => onChange('courtesy_name', e.target.value)} placeholder="如：子瞻" />
          </div>
          <div>
            <Label className="text-xs">号</Label>
            <Input value={formData.art_name} onChange={(e) => onChange('art_name', e.target.value)} placeholder="如：东坡居士" />
          </div>
          <div>
            <Label className="text-xs">谥</Label>
            <Input value={formData.posthumous_name} onChange={(e) => onChange('posthumous_name', e.target.value)} placeholder="如：文忠" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>出生日期</Label>
          <Input
            type="date"
            value={formData.birth_date}
            onChange={(e) => onChange('birth_date', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>逝世日期</Label>
          <Input
            type="date"
            value={formData.death_date}
            onChange={(e) => onChange('death_date', e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>生平简介（支持富文本）</Label>
        <RichTextEditor
          value={formData.bio || ''}
          onChange={(html) => onChange('bio', html)}
          placeholder={isEdit ? '编辑生平简介...' : '记录此人的生平事迹、功绩、轶事...'}
          minHeight={isEdit ? '180px' : '120px'}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="m-alive"
          checked={formData.is_alive}
          onChange={(e) => onChange('is_alive', e.target.checked)}
          className="h-4 w-4 rounded"
        />
        <Label htmlFor="m-alive">在世</Label>
      </div>

      {/* 隐私设置 */}
      <div className="space-y-2 rounded border bg-muted/20 p-3">
        <Label className="text-xs font-medium text-muted-foreground">隐私设置</Label>
        <div className="flex items-center gap-2">
          <select
            value={formData.privacy_level || 'public'}
            onChange={(e) => onChange('privacy_level', e.target.value)}
            className="flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm transition-colors"
          >
            <option value="public">公开</option>
            <option value="family">仅家族成员可见</option>
            <option value="private">仅管理员可见</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            id="m-privacy-override"
            checked={formData.privacy_override || false}
            onChange={(e) => onChange('privacy_override', e.target.checked)}
            className="h-3.5 w-3.5 rounded"
          />
          <Label htmlFor="m-privacy-override">手动覆盖（关闭活人自动保护）</Label>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <p className="mr-2 self-center text-xs text-muted-foreground">
          {saveShortcutHint}
        </p>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={isEdit ? onCloseEdit : onCloseAdd}
        >
          取消
        </Button>
        <Button type="submit" variant="apple" glow className="flex-1">
          {isEdit ? '保存' : '添加'}
        </Button>
      </div>
    </form>
  )

  return (
    <>
      {/* 添加成员弹窗 */}
      <Modal
        isOpen={showAdd}
        onClose={onCloseAdd}
        title={`添加家族成员（保存：${saveShortcutKeys}）`}
      >
        {renderFormFields(formRefAdd, onSubmitAdd, false)}
      </Modal>

      {/* 编辑成员弹窗 */}
      <Modal
        isOpen={showEdit}
        onClose={onCloseEdit}
        title={`编辑成员（保存：${saveShortcutKeys}）`}
      >
        {renderFormFields(formRefEdit, onSubmitEdit, true)}
      </Modal>
    </>
  )
}
