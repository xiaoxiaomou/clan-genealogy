import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, useToast, Input, Label, OcrPipelinePanel } from '@/components/ui'
import { api } from '@/lib/api'
import { Sparkles, Upload, Loader2, Check, X, Edit2, Save, RotateCcw, FileImage, Zap } from 'lucide-react'

interface OcrMember {
  name: string
  gender: 'male' | 'female' | 'unknown'
  birth_date?: string
  death_date?: string
  generation?: number
  generation_name?: string
  is_alive?: boolean
  bio?: string
  birth_place?: string
}

interface OcrRelationship {
  from: string
  to: string
  type: 'parent' | 'spouse' | 'sibling'
}

interface OcrResult {
  members: OcrMember[]
  relationships: OcrRelationship[]
  note?: string
  mock?: boolean
  error?: string
  filename?: string
}

export default function OcrImportPage() {
  const { id } = useParams<{ id: string }>()
  const familyId = Number(id)
  const navigate = useNavigate()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<OcrResult | null>(null)
  const [editing, setEditing] = useState<Record<number, OcrMember>>({})
  const [importing, setImporting] = useState(false)
  const [includeRelationships, setIncludeRelationships] = useState(true)

  const handleFileSelect = (f: File | null) => {
    if (!f) return
    setFile(f)
    setResult(null)
    setEditing({})
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(f)
  }

  const handleRecognize = async () => {
    if (!file) return
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const resp = await fetch(`/api/family/${familyId}/ocr/recognize`, {
        method: 'POST',
        body: fd,
        headers: {
          Authorization: `Bearer ${localStorage.getItem('access_token') || ''}`,
        },
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        throw new Error(err.error || `识别失败: ${resp.status}`)
      }
      const data = await resp.json()
      setResult(data)
      if (data.error) {
        showToast(data.error, 'error')
      } else if (data.mock) {
        showToast('LLM_API_KEY 未配置，当前为演示模式', 'info')
      } else {
        showToast(`识别完成: ${data.members.length} 位成员`, 'success')
      }
    } catch (err: any) {
      showToast(err.message || '识别失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (idx: number, member: OcrMember) => {
    setEditing({ ...editing, [idx]: { ...member } })
  }

  const updateField = (idx: number, field: keyof OcrMember, value: any) => {
    setEditing({
      ...editing,
      [idx]: { ...editing[idx], [field]: value },
    })
  }

  const finishEdit = (idx: number) => {
    if (!result) return
    const newMembers = [...result.members]
    newMembers[idx] = editing[idx]
    setResult({ ...result, members: newMembers })
    const newEditing = { ...editing }
    delete newEditing[idx]
    setEditing(newEditing)
  }

  const cancelEdit = (idx: number) => {
    const newEditing = { ...editing }
    delete newEditing[idx]
    setEditing(newEditing)
  }

  const removeMember = (idx: number) => {
    if (!result) return
    if (!confirm('确认删除此识别项？')) return
    const removedName = result.members[idx].name
    setResult({
      ...result,
      members: result.members.filter((_, i) => i !== idx),
      relationships: result.relationships.filter(
        (r) => r.from !== removedName && r.to !== removedName
      ),
    })
  }

  const handleImport = async () => {
    if (!result || result.members.length === 0) return
    setImporting(true)
    try {
      const resp = await api.importOcrResult(familyId, {
        members: result.members,
        relationships: includeRelationships ? result.relationships : [],
      })
      showToast(resp.message || '导入成功', 'success')
      navigate(`/family/${familyId}`)
    } catch (err: any) {
      showToast(err.message || '导入失败', 'error')
    } finally {
      setImporting(false)
    }
  }

  const reset = () => {
    setFile(null)
    setPreview(null)
    setResult(null)
    setEditing({})
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6">
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground sm:text-3xl">
            <Sparkles className="h-7 w-7 text-primary" />
            AI 家谱识别
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            上传家谱图片（族谱印刷品、墓碑、手写世系图等），AI 自动识别成员信息
          </p>
        </div>

        {/* 流水线模式 */}
        <div className="mb-6">
          <OcrPipelinePanel
            familyId={familyId}
            onImported={(n) => showToast(`成功导入 ${n} 个成员`, 'success')}
          />
        </div>

        {/* 步骤 1: 上传 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              <FileImage className="mr-2 inline-block h-5 w-5" />
              1. 上传家谱图片
            </CardTitle>
            <CardDescription>
              支持 JPG / PNG / WebP，最大 10MB
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
                preview ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/30'
              }`}
            >
              {preview ? (
                <div className="space-y-3">
                  <img
                    src={preview}
                    alt="预览"
                    className="mx-auto max-h-80 rounded object-contain"
                  />
                  <p className="text-sm text-muted-foreground">{file?.name}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">点击或拖拽图片到此处</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              />
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  variant={preview ? 'outline' : 'default'}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-1 h-4 w-4" />
                  {preview ? '更换图片' : '选择图片'}
                </Button>
                {preview && (
                  <Button type="button" variant="ghost" onClick={reset}>
                    <RotateCcw className="mr-1 h-4 w-4" />
                    重置
                  </Button>
                )}
                {preview && !result && (
                  <Button type="button" onClick={handleRecognize} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        识别中...
                      </>
                    ) : (
                      <>
                        <Zap className="mr-1 h-4 w-4" />
                        开始识别
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 步骤 2: 识别结果 */}
        {result && (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>
                    <Check className="mr-2 inline-block h-5 w-5 text-green-500" />
                    2. 识别结果
                  </CardTitle>
                  <CardDescription>
                    {result.note && <span className="text-amber-600">提示：{result.note} · </span>}
                    共 {result.members.length} 位成员，{result.relationships.length} 条关系
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {result.relationships.length > 0 && (
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={includeRelationships}
                        onChange={(e) => setIncludeRelationships(e.target.checked)}
                        className="h-4 w-4"
                      />
                      包含关系
                    </label>
                  )}
                  <Button
                    type="button"
                    onClick={handleImport}
                    disabled={importing || result.members.length === 0}
                  >
                    {importing ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-1 h-4 w-4" />
                    )}
                    导入到族谱
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {result.members.length === 0 ? (
                <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 p-6 text-center dark:border-amber-800 dark:bg-amber-950/30">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    未识别到成员信息
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {result.mock
                      ? '请在 .env 中配置 LLM_API_KEY 后重试'
                      : '请尝试更清晰的图片，或手动添加成员'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {result.members.map((m, idx) => {
                    const m_editing = editing[idx]
                    const isEditing = !!m_editing
                    const m_view = m_editing || m
                    return (
                      <div
                        key={idx}
                        className={`rounded-lg border p-3 transition-colors ${
                          isEditing
                            ? 'border-primary/50 bg-primary/5'
                            : 'border-border bg-card hover:bg-muted/30'
                        }`}
                      >
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                              <div>
                                <Label className="text-xs">姓名</Label>
                                <Input
                                  value={m_view.name}
                                  onChange={(e) => updateField(idx, 'name', e.target.value)}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">性别</Label>
                                <select
                                  value={m_view.gender}
                                  onChange={(e) => updateField(idx, 'gender', e.target.value)}
                                  className="flex h-9 w-full rounded border border-border bg-background px-2 text-sm"
                                >
                                  <option value="male">男</option>
                                  <option value="female">女</option>
                                  <option value="unknown">未知</option>
                                </select>
                              </div>
                              <div>
                                <Label className="text-xs">辈分</Label>
                                <Input
                                  type="number"
                                  value={m_view.generation || ''}
                                  onChange={(e) =>
                                    updateField(
                                      idx,
                                      'generation',
                                      e.target.value ? Number(e.target.value) : undefined
                                    )
                                  }
                                />
                              </div>
                              <div>
                                <Label className="text-xs">出生日期</Label>
                                <Input
                                  type="date"
                                  value={m_view.birth_date || ''}
                                  onChange={(e) => updateField(idx, 'birth_date', e.target.value)}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">逝世日期</Label>
                                <Input
                                  type="date"
                                  value={m_view.death_date || ''}
                                  onChange={(e) => updateField(idx, 'death_date', e.target.value)}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">字辈</Label>
                                <Input
                                  value={m_view.generation_name || ''}
                                  onChange={(e) => updateField(idx, 'generation_name', e.target.value)}
                                />
                              </div>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="ghost" size="sm" onClick={() => cancelEdit(idx)}>
                                <X className="mr-1 h-3.5 w-3.5" />
                                取消
                              </Button>
                              <Button type="button" size="sm" onClick={() => finishEdit(idx)}>
                                <Check className="mr-1 h-3.5 w-3.5" />
                                完成
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                                m_view.gender === 'male'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                                  : m_view.gender === 'female'
                                  ? 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-200'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {m_view.gender === 'male' ? '♂' : m_view.gender === 'female' ? '♀' : '?'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="font-medium">{m_view.name}</span>
                                {m_view.generation != null && (
                                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-200">
                                    第{m_view.generation}代
                                  </span>
                                )}
                                {m_view.generation_name && (
                                  <span className="rounded bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700 dark:bg-purple-900 dark:text-purple-200">
                                    {m_view.generation_name}字辈
                                  </span>
                                )}
                                {m_view.birth_date && (
                                  <span className="text-xs text-muted-foreground">
                                    {m_view.birth_date} ~ {m_view.death_date || (m_view.is_alive ? '' : '?')}
                                  </span>
                                )}
                              </div>
                              {m_view.bio && (
                                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                                  {m_view.bio}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(idx, m)}
                                className="h-7 w-7 p-0"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeMember(idx)}
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* 关系预览 */}
              {includeRelationships && result.relationships.length > 0 && (
                <div className="mt-6 border-t border-border pt-4">
                  <h4 className="mb-2 text-sm font-medium text-foreground">关系预览</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {result.relationships.map((r, idx) => (
                      <span
                        key={idx}
                        className="rounded-full border border-border bg-muted/30 px-2.5 py-0.5 text-xs"
                      >
                        {r.from} → {r.to}{' '}
                        <span className="text-muted-foreground">
                          ({r.type === 'parent' ? '父子' : r.type === 'spouse' ? '夫妻' : '兄弟'})
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  )
}
