import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardContent, useToast, Button, Input, Label } from '@/components/ui'
import { api } from '@/lib/api'
import { ArrowLeft, Upload, Download, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

const BG = 'linear-gradient(135deg, #1c1410 0%, #2d1f1a 50%, #1c1410 100%)'

export default function GedcomImportPage() {
  const { id } = useParams<{ id: string }>()
  const familyId = Number(id)
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<{ imported: number; relations: number; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.ged')) {
      setError('请选择 .ged 格式文件')
      return
    }
    setFile(f)
    setError(null)
    setResult(null)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const token = localStorage.getItem('access_token')
      const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api') as string
      const resp = await fetch(`${API_BASE_URL}/export/${familyId}/import/gedcom`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const data = await resp.json()
      if (!resp.ok) {
        setError(data.error || '导入失败')
        showToast(data.error || '导入失败', 'error')
      } else {
        setResult({
          imported: data.members_count,
          relations: data.relations_count || 0,
          message: data.message,
        })
        showToast(data.message, 'success')
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    } catch (err: any) {
      setError(err.message || '导入失败')
    } finally {
      setUploading(false)
    }
  }

  function handleDownload() {
    api.exportGedcom(familyId).catch(() => {})
  }

  return (
    <div className="min-h-screen p-4 sm:p-8" style={{ background: BG }}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-2 text-amber-100">
          <a
            href={`/family/${familyId}`}
            className="flex items-center gap-1 text-sm hover:text-amber-300"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </a>
        </div>

        {/* 匾额 */}
        <div className="relative overflow-hidden rounded-lg border-2 border-amber-700/40 bg-gradient-to-br from-amber-900/40 to-stone-900/60 p-6 text-center shadow-2xl sm:p-8">
          <div className="absolute inset-0 opacity-20" style={{
            background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(245, 230, 211, 0.1) 10px, rgba(245, 230, 211, 0.1) 11px)',
          }} />
          <div className="relative">
            <div className="mb-2 text-xs tracking-[0.5em] text-amber-300/60">格 局 之 交</div>
            <h1 className="font-serif text-4xl font-bold text-amber-100 sm:text-5xl">
              GEDCOM 互换
            </h1>
            <div className="mt-3 text-sm text-amber-200/70">
              通用族谱交换格式 · 兼容 MyHeritage / Ancestry / Gramps 等
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 导出 */}
          <Card className="border-amber-700/30 bg-stone-900/50">
            <div className="border-b border-amber-700/30 px-5 py-3">
              <h2 className="flex items-center gap-2 font-serif text-lg text-amber-100">
                <Download className="h-5 w-5 text-amber-300/70" />
                导出为 GEDCOM
              </h2>
              <p className="mt-1 text-xs text-amber-200/50">将本族数据生成 .ged 文件</p>
            </div>
            <CardContent className="space-y-4 p-5">
              <p className="text-sm text-amber-200/70">
                导出内容包括所有成员、出生/死亡日期、配偶与亲子关系。生成的文件可在其他族谱软件中打开。
              </p>
              <Button
                onClick={handleDownload}
                className="w-full bg-amber-700/80 text-amber-50 hover:bg-amber-600"
              >
                <Download className="mr-2 h-4 w-4" />
                下载 .ged 文件
              </Button>
            </CardContent>
          </Card>

          {/* 导入 */}
          <Card className="border-amber-700/30 bg-stone-900/50">
            <div className="border-b border-amber-700/30 px-5 py-3">
              <h2 className="flex items-center gap-2 font-serif text-lg text-amber-100">
                <Upload className="h-5 w-5 text-amber-300/70" />
                从 GEDCOM 导入
              </h2>
              <p className="mt-1 text-xs text-amber-200/50">解析 .ged 文件并批量入库</p>
            </div>
            <CardContent className="space-y-4 p-5">
              <div>
                <Label className="text-xs text-amber-200/60">选择 .ged 文件</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".ged"
                  onChange={handleFileSelect}
                  className="mt-1 border-amber-700/30 bg-stone-950/40 text-amber-100 file:mr-3 file:rounded file:border-0 file:bg-amber-700/60 file:px-3 file:py-1 file:text-amber-50"
                />
                {file && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-amber-200/70">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="font-serif">{file.name}</span>
                    <span className="text-amber-200/40">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="w-full bg-amber-700/80 text-amber-50 hover:bg-amber-600 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    解析中...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    开始导入
                  </>
                )}
              </Button>

              {error && (
                <div className="flex items-start gap-2 rounded-md border border-rose-500/30 bg-rose-950/30 p-3 text-sm text-rose-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {result && (
                <div className="space-y-2 rounded-md border border-emerald-700/30 bg-emerald-950/30 p-3 text-sm">
                  <div className="flex items-center gap-2 text-emerald-200">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-serif">{result.message}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-emerald-200/70">
                    <div>成员：<span className="font-serif text-emerald-100">{result.imported}</span></div>
                    <div>关系：<span className="font-serif text-emerald-100">{result.relations}</span></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 说明 */}
        <Card className="border-amber-700/30 bg-stone-900/50">
          <div className="border-b border-amber-700/30 px-5 py-3">
            <h2 className="font-serif text-lg text-amber-100">关于 GEDCOM</h2>
          </div>
          <CardContent className="space-y-2 p-5 text-sm text-amber-200/70">
            <p>• GEDCOM 5.5.1 是族谱数据交换的开放标准，被全球主流家谱软件广泛支持。</p>
            <p>• 导出文件包含：INDI（个人）、FAM（家庭）、BIRT/DEAT（生死）、NAME（姓名）等核心标签。</p>
            <p>• 导入时：同姓自动补全姓；性别按 SEX 标记；日期格式自动识别 DD MON YYYY / MON YYYY / YYYY。</p>
            <p>• 提示：导入是追加操作，不会覆盖现有成员。多次导入同一文件会造成重复。</p>
          </CardContent>
        </Card>

        <p className="text-center font-serif text-xs text-amber-200/30">
          数据互通，源远流长
        </p>
      </div>
    </div>
  )
}
