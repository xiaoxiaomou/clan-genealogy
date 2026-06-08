import { Button, Modal, Input, Label } from '@/components/ui'
import { UserPlus, Users, Plus, Trash2, Layers } from 'lucide-react'

export interface QuickFamilyMember {
  name: string
  birth_date: string
  death_date: string
  generation: string
  generation_name: string
  bio: string
  is_alive: boolean
}

export interface QuickFamilyChild {
  name: string
  gender: string
  birth_date: string
  is_alive: boolean
}

export interface QuickFamilyLayer {
  father: QuickFamilyMember
  mother: QuickFamilyMember
  children: QuickFamilyChild[]
}

export interface QuickFamilyFormData {
  layers: QuickFamilyLayer[]
}

export function createDefaultMember(): QuickFamilyMember {
  return { name: '', birth_date: '', death_date: '', generation: '', generation_name: '', bio: '', is_alive: true }
}

export function createDefaultLayer(): QuickFamilyLayer {
  return { father: createDefaultMember(), mother: createDefaultMember(), children: [{ name: '', gender: 'male', birth_date: '', is_alive: true }] }
}

interface QuickAddFamilyProps {
  isOpen: boolean
  formData: QuickFamilyFormData
  adding: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  onAddLayer: () => void
  onRemoveLayer: (idx: number) => void
  onChangeLayerFather: (layerIdx: number, field: string, value: any) => void
  onChangeLayerMother: (layerIdx: number, field: string, value: any) => void
  onAddLayerChild: (layerIdx: number) => void
  onRemoveLayerChild: (layerIdx: number, childIdx: number) => void
  onChangeLayerChild: (layerIdx: number, childIdx: number, field: string, value: any) => void
}

const layerColors = ['from-amber-100/40 to-amber-50/20', 'from-emerald-100/40 to-emerald-50/20', 'from-sky-100/40 to-sky-50/20', 'from-violet-100/40 to-violet-50/20']
const layerLabels = ['第一代', '第二代', '第三代', '第四代']

export default function QuickAddFamily({
  isOpen,
  formData,
  adding,
  onClose,
  onSubmit,
  onAddLayer,
  onRemoveLayer,
  onChangeLayerFather,
  onChangeLayerMother,
  onAddLayerChild,
  onRemoveLayerChild,
  onChangeLayerChild,
}: QuickAddFamilyProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="快速建家庭（多代）">
      <form onSubmit={onSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {formData.layers.map((layer, layerIdx) => {
          const color = layerColors[layerIdx % layerColors.length]
          const label = layerLabels[layerIdx] || `第${layerIdx + 1}代`
          return (
            <div key={layerIdx} className={`rounded border bg-gradient-to-br ${color} p-4 relative`}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Layers className="h-4 w-4 text-primary" />
                  {label}
                </h3>
                {formData.layers.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => onRemoveLayer(layerIdx)} title="删除此代">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              {/* 父亲 */}
              <div className="mb-3 rounded border bg-background/60 p-3">
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <UserPlus className="h-3.5 w-3.5 text-primary" />
                  父亲 <span className="text-destructive">*</span>
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-xs">姓名</Label>
                    <Input size="sm" placeholder="姓名" value={layer.father.name} onChange={(e) => onChangeLayerFather(layerIdx, 'name', e.target.value)} required />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-xs">出生日期</Label>
                    <Input type="date" size="sm" value={layer.father.birth_date} onChange={(e) => onChangeLayerFather(layerIdx, 'birth_date', e.target.value)} />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-xs">辈分</Label>
                    <Input type="number" size="sm" placeholder="如：1" value={layer.father.generation} onChange={(e) => onChangeLayerFather(layerIdx, 'generation', e.target.value)} />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-xs">辈分名称</Label>
                    <Input size="sm" placeholder="如：文" value={layer.father.generation_name} onChange={(e) => onChangeLayerFather(layerIdx, 'generation_name', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* 母亲 */}
              <div className="mb-3 rounded border bg-background/60 p-3">
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-pink-600">
                  <UserPlus className="h-3.5 w-3.5 text-pink-500" />
                  母亲（可选）
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-xs">姓名</Label>
                    <Input size="sm" placeholder="姓名" value={layer.mother.name} onChange={(e) => onChangeLayerMother(layerIdx, 'name', e.target.value)} />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-xs">出生日期</Label>
                    <Input type="date" size="sm" value={layer.mother.birth_date} onChange={(e) => onChangeLayerMother(layerIdx, 'birth_date', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* 子女 */}
              <div className="rounded border bg-background/60 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Users className="h-3.5 w-3.5 text-green-500" />
                    子女
                  </h4>
                  <Button type="button" variant="ghost" size="sm" onClick={() => onAddLayerChild(layerIdx)} className="gap-0.5 text-xs h-6 px-2">
                    <Plus className="h-3 w-3" />
                    添加
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {layer.children.map((child, childIdx) => (
                    <div key={childIdx} className="flex items-end gap-1.5 rounded bg-background p-1.5">
                      <div className="flex-1 space-y-0.5">
                        <Label className="text-[10px]">姓名</Label>
                        <Input size="sm" placeholder={`子女 ${childIdx + 1}`} value={child.name} onChange={(e) => onChangeLayerChild(layerIdx, childIdx, 'name', e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div className="w-16 space-y-0.5">
                        <Label className="text-[10px]">性别</Label>
                        <select value={child.gender} onChange={(e) => onChangeLayerChild(layerIdx, childIdx, 'gender', e.target.value)} className="flex h-8 w-full rounded border border-border bg-background px-1.5 text-xs">
                          <option value="male">男</option>
                          <option value="female">女</option>
                          <option value="unknown">未知</option>
                        </select>
                      </div>
                      {layer.children.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 shrink-0" onClick={() => onRemoveLayerChild(layerIdx, childIdx)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onAddLayer} className="gap-1.5 flex-1">
            <Plus className="h-4 w-4" />
            添加一代
          </Button>
        </div>

        <div className="flex gap-3 pt-2 border-t">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" variant="apple" glow className="flex-1" disabled={adding}>
            {adding ? '创建中...' : '创建家庭'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
