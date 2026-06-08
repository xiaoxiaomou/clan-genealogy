import { useEffect, useState } from 'react'
import { Card, CardContent, Button, Input, Label, useToast } from '@/components/ui'
import { api } from '@/lib/api'
import { parseChars, formatPoem, charForGeneration, type ZibeiConfig } from '@/lib/zibei'
import { Save, Sparkles, Wand2, Loader2 } from 'lucide-react'

interface ZibeiPoemEditorProps {
  familyId: number
  canEdit: boolean
  familySurname?: string
  onConfigChange?: (config: ZibeiConfig) => void
}

export default function ZibeiPoemEditor({ familyId, canEdit, familySurname = '', onConfigChange }: ZibeiPoemEditorProps) {
  const { showToast } = useToast()
  const [config, setConfig] = useState<ZibeiConfig>({
    zibei_text: '',
    zibei_start_generation: 1,
    zibei_assignment: 'sequential',
    zibei_description: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [previewGen, setPreviewGen] = useState<number>(1)

  const [suggestGen, setSuggestGen] = useState<number>(1)
  const [suggestGender, setSuggestGender] = useState<'male' | 'female' | 'unknown'>('male')
  const [suggestSurname, setSuggestSurname] = useState<string>('')
  const [suggestions, setSuggestions] = useState<Array<{ name: string; form: string; zibei_char: string; given_char: string }>>([])
  const [suggesting, setSuggesting] = useState(false)

  useEffect(() => {
    load()
  }, [familyId])

  useEffect(() => {
    onConfigChange?.(config)
  }, [config, onConfigChange])

  async function load() {
    setLoading(true)
    try {
      const data = await api.getZibei(familyId)
      const next = {
        zibei_text: data.zibei_text || '',
        zibei_start_generation: data.zibei_start_generation || 1,
        zibei_assignment: data.zibei_assignment || 'sequential',
        zibei_description: data.zibei_description || '',
      }
      setConfig(next)
      setSuggestSurname(familySurname)
    } catch (err: any) {
      showToast(err.message || '加载字辈诗失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      const data = await api.updateZibei(familyId, config)
      const next = {
        zibei_text: data.zibei_text,
        zibei_start_generation: data.zibei_start_generation,
        zibei_assignment: data.zibei_assignment,
        zibei_description: data.zibei_description || '',
      }
      setConfig(next)
      showToast('字辈诗已镌刻', 'success')
    } catch (err: any) {
      showToast(err.message || '保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function fetchSuggestions() {
    if (!config.zibei_text) {
      showToast('请先设置字辈诗', 'error')
      return
    }
    setSuggesting(true)
    try {
      const res = await api.suggestZibeiNames(familyId, {
        surname: suggestSurname || familySurname || '',
        generation: suggestGen,
        gender: suggestGender,
        count: 8,
      })
      setSuggestions(res.candidates || [])
      if ((res.candidates || []).length === 0) {
        showToast(res.reason || '暂无建议', 'info')
      }
    } catch (err: any) {
      showToast(err.message || '生成名字失败', 'error')
    } finally {
      setSuggesting(false)
    }
  }

  if (loading) {
    return (
      <Card className="border-amber-700/30 bg-stone-900/50">
        <CardContent className="py-10 text-center text-sm text-amber-200/60">
          展卷候...
        </CardContent>
      </Card>
    )
  }

  const chars = parseChars(config.zibei_text)
  const poem = formatPoem(config.zibei_text, 10)
  const previewChar = charForGeneration(config, previewGen)

  const inputClass = "mt-1 w-full rounded-md border border-amber-700/30 bg-stone-950/40 px-3 py-2 text-sm text-amber-100 placeholder:text-amber-200/30 focus:border-amber-600/60 focus:outline-none focus:ring-1 focus:ring-amber-600/30"

  return (
    <div className="space-y-6">
      {/* 字辈诗原文 */}
      <Card className="border-amber-700/30 bg-stone-900/50">
        <CardContent className="p-6">
          <h2 className="mb-4 flex items-center gap-2 font-serif text-xl text-amber-200">
            <Sparkles className="h-4 w-4" />
            字辈诗
          </h2>
          <div className="space-y-4">
            <div>
              <Label className="text-amber-200/80">诗作原文</Label>
              <textarea
                className={`${inputClass} font-serif text-base leading-loose`}
                rows={6}
                disabled={!canEdit}
                placeholder="例：&#10;道德建鸿勋，家声丕焕新。&#10;诗书承祖训，礼义裕孙昆。&#10;本固枝荣远，源深流自清。&#10;文章开运泰，福祉耀庭前。"
                value={config.zibei_text}
                onChange={(e) => setConfig({ ...config, zibei_text: e.target.value })}
              />
              <p className="mt-1 text-xs text-amber-200/40">
                共 {chars.length} 个字辈字（标点/空格/换行将自动剔除）
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-amber-200/80">排辈规则</Label>
                <select
                  className={inputClass}
                  disabled={!canEdit}
                  value={config.zibei_assignment}
                  onChange={(e) => setConfig({ ...config, zibei_assignment: e.target.value as any })}
                >
                  <option value="sequential">顺序排辈（第N字给第N代）</option>
                  <option value="generation_based">按起始世代</option>
                </select>
              </div>
              {config.zibei_assignment === 'generation_based' && (
                <div>
                  <Label className="text-amber-200/80">起始世代</Label>
                  <Input
                    type="number"
                    min={1}
                    className={`${inputClass} mt-1`}
                    disabled={!canEdit}
                    value={config.zibei_start_generation}
                    onChange={(e) => setConfig({ ...config, zibei_start_generation: parseInt(e.target.value) || 1 })}
                  />
                </div>
              )}
            </div>

            <div>
              <Label className="text-amber-200/80">释义（可选）</Label>
              <textarea
                className={`${inputClass} leading-relaxed`}
                rows={2}
                disabled={!canEdit}
                placeholder="例：此诗为民国二十六年阖族议定..."
                value={config.zibei_description}
                onChange={(e) => setConfig({ ...config, zibei_description: e.target.value })}
              />
            </div>

            {canEdit && (
              <div className="flex justify-end">
                <Button
                  onClick={save}
                  disabled={saving}
                  className="bg-amber-700/80 text-amber-50 hover:bg-amber-600"
                >
                  <Save className="mr-1 h-4 w-4" />
                  {saving ? '镌刻中...' : '镌刻诗牒'}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 字辈预览 */}
      {chars.length > 0 && (
        <Card className="border-amber-700/30 bg-stone-900/50">
          <CardContent className="p-6">
            <h2 className="mb-3 flex items-center gap-2 font-serif text-xl text-amber-200">
              <Sparkles className="h-4 w-4" />
              字辈长卷
            </h2>
            <p className="mb-4 text-sm text-amber-200/50">每字下方标注对应世代</p>

            <div className="relative overflow-hidden rounded border border-amber-700/30 bg-stone-950/50 p-5">
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  background: 'repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(176,141,87,0.2) 24px, rgba(176,141,87,0.2) 25px)',
                }}
              />
              <div className="relative space-y-2 font-serif text-lg leading-loose">
                {poem.map((line, lineIdx) => (
                  <div key={lineIdx} className="flex flex-wrap justify-center gap-x-2">
                    {line.split('').map((c, idx) => {
                      const genIdx = lineIdx * 10 + idx
                      const gen = config.zibei_assignment === 'generation_based'
                        ? config.zibei_start_generation + genIdx
                        : genIdx + 1
                      return (
                        <div key={idx} className="group relative flex flex-col items-center">
                          <span className="text-3xl font-medium text-amber-100">{c}</span>
                          <span className="text-[10px] text-amber-300/50">{gen}</span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <Label className="m-0 text-amber-200/80">查字辈：</Label>
              <Input
                type="number"
                min={1}
                value={previewGen}
                onChange={(e) => setPreviewGen(parseInt(e.target.value) || 1)}
                className={`${inputClass} w-20`}
              />
              <span className="text-amber-200/50">代 →</span>
              <span className="font-serif text-2xl text-amber-100">{previewChar || '（无）'}</span>
              {previewChar && (
                <button
                  onClick={() => setPreviewGen((g) => g + 1)}
                  className="text-xs text-amber-200/40 hover:text-amber-200"
                >
                  下一字
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 名字建议 */}
      {chars.length > 0 && (
        <Card className="border-amber-700/30 bg-stone-900/50">
          <CardContent className="p-6">
            <h2 className="mb-3 flex items-center gap-2 font-serif text-xl" style={{ color: '#c08494' }}>
              <Wand2 className="h-4 w-4" />
              拟名
            </h2>
            <p className="mb-4 text-sm text-amber-200/50">按字辈诗 + 姓氏 + 世代 + 性别生成候选全名（点击誊录）</p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <Label className="text-xs text-amber-200/70">姓氏</Label>
                <Input
                  value={suggestSurname}
                  onChange={(e) => setSuggestSurname(e.target.value)}
                  placeholder={familySurname || '姓'}
                  className={`${inputClass} h-9`}
                />
              </div>
              <div>
                <Label className="text-xs text-amber-200/70">世代</Label>
                <Input
                  type="number"
                  min={1}
                  value={suggestGen}
                  onChange={(e) => setSuggestGen(parseInt(e.target.value) || 1)}
                  className={`${inputClass} h-9`}
                />
              </div>
              <div>
                <Label className="text-xs text-amber-200/70">性别</Label>
                <select
                  value={suggestGender}
                  onChange={(e) => setSuggestGender(e.target.value as any)}
                  className={`${inputClass} h-9`}
                >
                  <option value="male">男</option>
                  <option value="female">女</option>
                  <option value="unknown">不限</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={fetchSuggestions}
                  disabled={suggesting}
                  size="sm"
                  className="h-9 w-full bg-rose-700/70 text-rose-50 hover:bg-rose-600"
                >
                  {suggesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                  <span className="ml-1">拟名</span>
                </Button>
              </div>
            </div>

            {suggestions.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      navigator.clipboard.writeText(s.name).then(
                        () => showToast(`已誊录：${s.name}`, 'success'),
                        () => showToast('复制失败', 'error'),
                      )
                    }}
                    className="group flex flex-col items-start rounded-lg border border-rose-700/30 bg-rose-950/30 p-3 text-left transition-colors hover:border-rose-500/60 hover:bg-rose-900/30"
                    title="点击誊录"
                  >
                    <span className="font-serif text-2xl font-semibold text-amber-100">{s.name}</span>
                    <span className="mt-0.5 text-[10px] text-rose-300/70">
                      {s.form} · 字辈「{s.zibei_char}」
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
