import { useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useToast, Button, Input, Label } from '@/components/ui'
import { Layout } from '@/components/layout/Layout'
import { PgPageHead, PG_RED, PG_SERIF } from '@/components/ui/pedigree'
import { api } from '@/lib/api'
import { ArrowLeft, Upload, Download, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

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
    <Layout>
      <div className="pg-rise mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex items-center gap-2">
          <a
            href={`/family/${familyId}`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回族谱
          </a>
        </div>

        <PgPageHead
          eyebrow="谱 牒 · 互 换"
          title="GEDCOM 互换"
          subtitle="通用族谱交换格式 · 兼容 MyHeritage / Ancestry / Gramps 等"
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 导出 */}
          <section className="pg-card flex flex-col">
            <div className="border-b px-5 py-4" style={{ borderColor: 'hsl(var(--border))' }}>
              <h2 className="pg-title flex items-center gap-2 text-lg font-semibold">
                <Download className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                导出为 GEDCOM
              </h2>
              <p className="pg-subtitle mt-1">将本族数据生成 .ged 文件</p>
            </div>
            <div className="flex flex-1 flex-col justify-between gap-4 p-5">
              <p className="text-sm leading-relaxed text-muted-foreground">
                导出内容包括所有成员、出生/死亡日期、配偶与亲子关系。生成的文件可在其他族谱软件中打开。
              </p>
              <Button variant="apple" className="w-full gap-2" onClick={handleDownload}>
                <Download className="h-4 w-4" aria-hidden="true" />
                下载 .ged 文件
              </Button>
            </div>
          </section>

          {/* 导入 */}
          <section className="pg-card flex flex-col">
            <div className="border-b px-5 py-4" style={{ borderColor: 'hsl(var(--border))' }}>
              <h2 className="pg-title flex items-center gap-2 text-lg font-semibold">
                <Upload className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                从 GEDCOM 导入
              </h2>
              <p className="pg-subtitle mt-1">解析 .ged 文件并批量入库</p>
            </div>
            <div className="flex flex-1 flex-col gap-4 p-5">
              <div>
                <Label className="text-xs text-muted-foreground">选择 .ged 文件</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".ged"
                  onChange={handleFileSelect}
                  className="mt-1 file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-foreground hover:file:bg-accent"
                />
                {file && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                    <span style={{ fontFamily: PG_SERIF }}>{file.name}</span>
                    <span>({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>
              <Button
                variant="apple"
                className="w-full gap-2"
                onClick={handleUpload}
                disabled={!file || uploading}
                aria-busy={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    解析中...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    开始导入
                  </>
                )}
              </Button>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border p-3 text-sm"
                  style={{
                    borderColor: 'hsl(var(--destructive) / 0.4)',
                    background: 'hsl(var(--destructive) / 0.08)',
                    color: 'hsl(var(--destructive))',
                  }}
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{error}</span>
                </div>
              )}

              {result && (
                <div
                  role="status"
                  className="pg-card-soft space-y-2 p-3 text-sm"
                >
                  <div className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span style={{ fontFamily: PG_SERIF }}>{result.message}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      入谱 <b style={{ fontFamily: PG_SERIF, color: PG_RED }}>{result.imported}</b> 人
                    </div>
                    <div>
                      关系 <b style={{ fontFamily: PG_SERIF, color: PG_RED }}>{result.relations}</b> 条
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* 说明 */}
        <section className="pg-card-soft p-5">
          <h2 className="pg-title mb-3 text-base font-semibold">关于 GEDCOM</h2>
          <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            <p>• GEDCOM 5.5.1 是族谱数据交换的开放标准，被全球主流家谱软件广泛支持。</p>
            <p>• 导出文件包含：INDI（个人）、FAM（家庭）、BIRT/DEAT（生死）、NAME（姓名）等核心标签。</p>
            <p>• 导入时：同姓自动补全姓；性别按 SEX 标记；日期格式自动识别 DD MON YYYY / MON YYYY / YYYY。</p>
            <p>• 提示：导入是追加操作，不会覆盖现有成员。多次导入同一文件会造成重复。</p>
          </div>
        </section>

        <p
          className="text-center text-xs tracking-[0.3em] text-muted-foreground"
          style={{ fontFamily: PG_SERIF }}
        >
          数据互通 · 源远流长
        </p>
      </div>
    </Layout>
  )
}
