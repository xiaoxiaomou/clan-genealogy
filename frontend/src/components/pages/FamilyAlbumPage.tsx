import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { smartBack } from '@/lib/smartBack'
import type { FamilyAlbum, FamilyPhoto } from '@/types'
import { formatDate } from '@/lib/date'
import {
  Button,
  Modal,
  Input,
  Label,
  useToast,
} from '@/components/ui'
import { useConfirm } from '@/components/ui'
import { PgPageHead, PgSectionHead, PG_SERIF } from '@/components/ui/pedigree'
import { Layout } from '@/components/layout/Layout'
import {
  ArrowLeft,
  Plus,
  Image,
  Trash2,
  Upload,
  X,
  ChevronLeft,
  Loader2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Grid3X3,
} from 'lucide-react'

export default function FamilyAlbumPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { ask, dialog } = useConfirm()
  const { showToast } = useToast()
  const familyId = Number(id)

  const [albums, setAlbums] = useState<FamilyAlbum[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [view, setView] = useState<'grid' | 'detail'>('grid')
  const [currentAlbum, setCurrentAlbum] = useState<FamilyAlbum | null>(null)
  const [albumPhotos, setAlbumPhotos] = useState<FamilyPhoto[]>([])

  // Create album modal
  const [showCreateAlbum, setShowCreateAlbum] = useState(false)
  const [albumForm, setAlbumForm] = useState({ name: '', description: '' })
  const [creatingAlbum, setCreatingAlbum] = useState(false)

  // Upload modal
  const [showUpload, setShowUpload] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Multi-upload modal
  const [showMultiUpload, setShowMultiUpload] = useState(false)
  const [multiFiles, setMultiFiles] = useState<File[]>([])
  const [multiPreviews, setMultiPreviews] = useState<string[]>([])
  const [multiUploadTitles, setMultiUploadTitles] = useState<Record<number, string>>({})
  const [multiUploadIndex, setMultiUploadIndex] = useState(0)
  const [multiUploading, setMultiUploading] = useState(false)
  const multiFileInputRef = useRef<HTMLInputElement>(null)

  // Photo lightbox
  const [lightboxPhoto, setLightboxPhoto] = useState<FamilyPhoto | null>(null)

  // Slideshow state
  const [isSlideshow, setIsSlideshow] = useState(false)
  const [slideshowPlaying, setSlideshowPlaying] = useState(false)
  const [slideshowIndex, setSlideshowIndex] = useState(0)
  const slideshowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [familySurname, setFamilySurname] = useState('')
  const [, setFamilyName] = useState('')

  const loadAlbums = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await api.getAlbums(familyId)
      setAlbums(data.albums || [])
    } catch (err: any) {
      showToast(err.message || '加载相册失败', 'error')
    } finally {
      setIsLoading(false)
    }
  }, [familyId, showToast])

  useEffect(() => {
    if (familyId) loadAlbums()
  }, [familyId, loadAlbums])

  const loadAlbumDetail = async (album: FamilyAlbum) => {
    try {
      const data = await api.getAlbum(familyId, album.id)
      setCurrentAlbum(data.album)
      setAlbumPhotos(data.album.photos || [])
      setView('detail')
    } catch (err: any) {
      showToast(err.message || '加载相册详情失败', 'error')
    }
  }

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!albumForm.name.trim()) {
      showToast('请输入相册名称', 'error')
      return
    }
    setCreatingAlbum(true)
    try {
      await api.createAlbum(familyId, {
        name: albumForm.name.trim(),
        description: albumForm.description.trim() || undefined,
      })
      showToast('相册创建成功', 'success')
      setShowCreateAlbum(false)
      setAlbumForm({ name: '', description: '' })
      loadAlbums()
    } catch (err: any) {
      showToast(err.message || '创建失败', 'error')
    } finally {
      setCreatingAlbum(false)
    }
  }

  const handleDeleteAlbum = async (albumId: number) => {
    if (!(await ask({ title: '删除相册', message: '确定要删除该相册吗？相册中的所有照片也将被删除，此操作不可恢复。', confirmText: '确认删除', danger: true }))) return
    try {
      await api.deleteAlbum(familyId, albumId)
      showToast('相册已删除', 'success')
      if (currentAlbum?.id === albumId) {
        setView('grid')
        setCurrentAlbum(null)
      }
      loadAlbums()
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    }
  }

  const handleUploadFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setUploadPreview(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
    setShowUpload(true)
  }

  const handleUploadSubmit = async () => {
    if (!uploadFile || !currentAlbum) return
    setUploading(true)
    try {
      await api.uploadPhoto(
        familyId,
        currentAlbum.id,
        uploadFile,
        uploadTitle.trim() || undefined,
        undefined
      )
      showToast('照片上传成功', 'success')
      setShowUpload(false)
      setUploadFile(null)
      setUploadPreview(null)
      setUploadTitle('')
      loadAlbumDetail(currentAlbum)
    } catch (err: any) {
      showToast(err.message || '上传失败', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleDeletePhoto = async (photoId: number) => {
    if (!(await ask({ title: '删除照片', message: '确定要删除这张照片吗？', confirmText: '确认删除', danger: true }))) return
    try {
      await api.deletePhoto(familyId, currentAlbum!.id, photoId)
      showToast('照片已删除', 'success')
      setAlbumPhotos((prev) => prev.filter((p) => p.id !== photoId))
      if (lightboxPhoto?.id === photoId) setLightboxPhoto(null)
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    }
  }

  const handleMultiFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const validFiles: File[] = []

    files.forEach((file) => {
      if (file.type.startsWith('image/')) {
        validFiles.push(file)
        const reader = new FileReader()
        reader.onload = (ev) => {
          setMultiPreviews((prev) => [...prev, ev.target?.result as string])
        }
        reader.readAsDataURL(file)
      }
    })

    if (validFiles.length > 0) {
      setMultiFiles(validFiles)
      setMultiUploadTitles({})
      setMultiUploadIndex(0)
      setShowMultiUpload(true)
    }
  }

  const handleMultiUploadNext = () => {
    if (multiUploadIndex < multiFiles.length - 1) {
      setMultiUploadIndex(multiUploadIndex + 1)
    }
  }

  const handleMultiUploadPrev = () => {
    if (multiUploadIndex > 0) {
      setMultiUploadIndex(multiUploadIndex - 1)
    }
  }

  const handleMultiUploadSubmit = async () => {
    if (!currentAlbum || multiFiles.length === 0) return
    setMultiUploading(true)

    try {
      for (let i = 0; i < multiFiles.length; i++) {
        const title = multiUploadTitles[i]?.trim() || undefined
        await api.uploadPhoto(familyId, currentAlbum.id, multiFiles[i], title, undefined)
      }
      showToast(`成功上传 ${multiFiles.length} 张照片`, 'success')
      setShowMultiUpload(false)
      setMultiFiles([])
      setMultiPreviews([])
      setMultiUploadTitles({})
      setMultiUploadIndex(0)
      loadAlbumDetail(currentAlbum)
    } catch (err: any) {
      showToast(err.message || '批量上传失败', 'error')
    } finally {
      setMultiUploading(false)
    }
  }

  const startSlideshow = (startIndex: number = 0) => {
    setSlideshowIndex(startIndex)
    setSlideshowPlaying(true)
    setIsSlideshow(true)
  }

  const stopSlideshow = () => {
    setSlideshowPlaying(false)
    setIsSlideshow(false)
    if (slideshowTimerRef.current) {
      clearTimeout(slideshowTimerRef.current)
    }
  }

  const toggleSlideshowPlay = () => {
    setSlideshowPlaying(!slideshowPlaying)
  }

  const nextSlideshowPhoto = () => {
    if (slideshowIndex < albumPhotos.length - 1) {
      setSlideshowIndex(slideshowIndex + 1)
    } else {
      setSlideshowIndex(0)
    }
  }

  const prevSlideshowPhoto = () => {
    if (slideshowIndex > 0) {
      setSlideshowIndex(slideshowIndex - 1)
    } else {
      setSlideshowIndex(albumPhotos.length - 1)
    }
  }

  useEffect(() => {
    if (slideshowPlaying && isSlideshow) {
      slideshowTimerRef.current = setTimeout(() => {
        nextSlideshowPhoto()
      }, 3000)
    }
    return () => {
      if (slideshowTimerRef.current) {
        clearTimeout(slideshowTimerRef.current)
      }
    }
  }, [slideshowPlaying, slideshowIndex, isSlideshow])

  const getPhotoUrl = (photo: FamilyPhoto) => {
    // file_path 已经以 /static/... 开头，直接使用即可
    // Vite 开发服务器已将 /static 代理到 Flask 后端（端口 5000）
    if (photo.file_path?.startsWith('http')) return photo.file_path
    return photo.file_path
  }

  useEffect(() => {
    if (familyId) {
      api.getFamily(familyId).then((r) => {
        setFamilySurname(r?.family?.surname || '')
        setFamilyName(r?.family?.name || '')
      }).catch(() => {})
    }
  }, [familyId])

  const titleText = (familySurname ? familySurname + '氏 · ' : '') + '家族影集'

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 pg-rise">
        <div className="mb-5 flex items-center gap-2">
          {view === 'detail' ? (
            <button
              onClick={() => {
                setView('grid')
                setCurrentAlbum(null)
                setAlbumPhotos([])
              }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
              返回影集
            </button>
          ) : (
            <button
              onClick={() => smartBack(navigate, `/family/${familyId}`)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              返回族谱
            </button>
          )}
        </div>

        {/* 页头 */}
        <PgPageHead
          eyebrow="谱 牒 · 影 存"
          title={view === 'detail' && currentAlbum ? currentAlbum.name : titleText}
          subtitle={
            view === 'detail' && currentAlbum
              ? currentAlbum.description || '记录家族珍贵瞬间'
              : '留影存照，传家之宝'
          }
          actions={
            view === 'detail' && currentAlbum ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadFileSelect}
                  aria-label="选择照片上传"
                />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  上传
                </Button>
                <input
                  ref={multiFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleMultiFileSelect}
                  aria-label="批量选择照片上传"
                />
                <Button variant="outline" size="sm" onClick={() => multiFileInputRef.current?.click()} className="gap-1.5">
                  <Grid3X3 className="h-3.5 w-3.5" />
                  批量
                </Button>
                {albumPhotos.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => startSlideshow(0)} className="gap-1.5">
                    <Play className="h-3.5 w-3.5" />
                    幻灯片
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => handleDeleteAlbum(currentAlbum.id)} className="gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" />
                  删除相册
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setShowCreateAlbum(true)} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                新建相册
              </Button>
            )
          }
        />

        {isLoading ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div key={i} className="pg-card animate-pulse overflow-hidden">
                <div className="aspect-video bg-muted" />
                <div className="p-4">
                  <div className="mb-2 h-5 w-2/3 rounded bg-muted" />
                  <div className="h-4 w-1/3 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : view === 'grid' ? (
          <div className="mt-6">
            <PgSectionHead text="影 集 目 次" />
            {albums.length === 0 ? (
              <div className="pg-card flex flex-col items-center justify-center py-20">
                <h2 className="pg-title mb-2 text-xl font-semibold">影集尚空</h2>
                <p className="mb-8 max-w-md text-center text-sm text-muted-foreground">
                  创建相册来保存家族照片，记录珍贵时刻。点击右上「新建相册」开始。
                </p>
                <Button onClick={() => setShowCreateAlbum(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  创建第一个相册
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {albums.map((album, index) => (
                  <div
                    key={album.id}
                    className="pg-card pg-rise cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
                    style={{ animationDelay: `${index * 60}ms` }}
                    onClick={() => loadAlbumDetail(album)}
                  >
                    {/* 封面 */}
                    <div
                      className="relative flex aspect-video items-center justify-center overflow-hidden"
                      style={{ background: 'hsl(var(--muted) / 0.4)' }}
                    >
                      {album.cover_url ? (
                        <img
                          src={album.cover_url}
                          alt={album.name}
                          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      ) : (
                        <span className="select-none text-3xl" style={{ fontFamily: PG_SERIF, color: 'hsl(var(--muted-foreground))', opacity: 0.45 }} aria-hidden="true">
                          影
                        </span>
                      )}
                      <div
                        className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                        style={{
                          borderColor: 'hsl(var(--border))',
                          background: 'hsl(var(--card))',
                          color: 'hsl(var(--muted-foreground))',
                        }}
                      >
                        <Image className="h-3 w-3" />
                        {album.photo_count} 张
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="pg-title mb-1 truncate font-medium">{album.name}</h3>
                      {album.description && (
                        <p className="mb-2 line-clamp-1 text-xs text-muted-foreground">{album.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{formatDate(album.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* 相册详情 - 照片网格 */
          <div className="mt-6">
            <PgSectionHead text={currentAlbum ? `${currentAlbum.name} · ${albumPhotos.length} 张` : '照 片'} />
            {albumPhotos.length === 0 ? (
              <div className="pg-card flex flex-col items-center justify-center py-20">
                <h2 className="pg-title mb-2 text-xl font-semibold">尚无存照</h2>
                <p className="mb-8 max-w-md text-center text-sm text-muted-foreground">
                  点击右上「上传」按钮，把照片收进这本相册。
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  上传第一张照片
                </Button>
              </div>
            ) : (
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
                {albumPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="pg-card pg-rise group relative cursor-pointer break-inside-avoid overflow-hidden transition-shadow hover:shadow-md"
                    style={{ animationDelay: `${index * 40}ms` }}
                    onClick={() => setLightboxPhoto(photo)}
                  >
                    <img
                      src={getPhotoUrl(photo)}
                      alt={photo.title || '家族照片'}
                      className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                    {photo.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                        <p className="truncate text-sm text-white">{photo.title}</p>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="absolute right-2 top-2 rounded-full bg-black/60 text-white hover:bg-black/80 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePhoto(photo.id)
                      }}
                      aria-label="删除照片"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-muted-foreground" style={{ fontFamily: PG_SERIF, letterSpacing: '0.3em' }}>
          影存家史 · 光影传家
        </p>
      </div>

      {/* 创建相册弹窗 */}
      <Modal
        isOpen={showCreateAlbum}
        onClose={() => {
          setShowCreateAlbum(false)
          setAlbumForm({ name: '', description: '' })
        }}
        title="新建相册"
      >
        <form onSubmit={handleCreateAlbum} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="album-name">
              相册名称 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="album-name"
              placeholder="例如：2024年祭祖大典"
              value={albumForm.name}
              onChange={(e) => setAlbumForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="album-desc">描述</Label>
            <textarea
              id="album-desc"
              placeholder="描述这个相册的内容..."
              value={albumForm.description}
              onChange={(e) => setAlbumForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="flex w-full rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCreateAlbum(false)}>
              取消
            </Button>
            <Button type="submit" variant="apple" glow className="flex-1" disabled={creatingAlbum}>
              {creatingAlbum ? '创建中...' : '创建'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* 上传照片弹窗 */}
      <Modal
        isOpen={showUpload}
        onClose={() => {
          setShowUpload(false)
          setUploadFile(null)
          setUploadPreview(null)
          setUploadTitle('')
        }}
        title="上传照片"
      >
        <div className="space-y-4">
          {uploadPreview && (
            <div className="pg-card-soft relative overflow-hidden">
              <img src={uploadPreview} alt="预览" className="max-h-64 w-full object-contain bg-muted" />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="photo-title">照片标题（可选）</Label>
            <Input
              id="photo-title"
              placeholder="为这张照片添加标题"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowUpload(false)
                setUploadFile(null)
                setUploadPreview(null)
                setUploadTitle('')
              }}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="apple" glow
              className="flex-1"
              onClick={handleUploadSubmit}
              disabled={uploading}
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  上传中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  确认上传
                </span>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 照片灯箱 */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxPhoto(null)}
          role="dialog"
          aria-modal="true"
          aria-label="照片预览"
        >
          <button
            className="absolute right-4 top-4 z-10 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60"
            onClick={() => setLightboxPhoto(null)}
            aria-label="关闭预览"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img
              src={getPhotoUrl(lightboxPhoto)}
              alt={lightboxPhoto.title || '家族照片'}
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain"
            />
            {lightboxPhoto.title && (
              <p className="mt-3 text-center text-sm text-white/80">{lightboxPhoto.title}</p>
            )}
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 bg-black/40 text-white hover:bg-black/60"
              onClick={(e) => {
                e.stopPropagation()
                startSlideshow(albumPhotos.findIndex(p => p.id === lightboxPhoto.id))
              }}
            >
              <Play className="h-4 w-4" />
              幻灯片
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 bg-black/40 text-white hover:bg-black/60"
              onClick={(e) => {
                e.stopPropagation()
                handleDeletePhoto(lightboxPhoto.id)
              }}
            >
              <Trash2 className="h-4 w-4" />
              删除
            </Button>
          </div>
        </div>
      )}

      {/* 批量上传弹窗 */}
      <Modal
        isOpen={showMultiUpload}
        onClose={() => {
          setShowMultiUpload(false)
          setMultiFiles([])
          setMultiPreviews([])
          setMultiUploadTitles({})
          setMultiUploadIndex(0)
        }}
        title={`批量上传 (${multiFiles.length} 张)`}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>第 {multiUploadIndex + 1} / {multiFiles.length} 张</span>
            <div className="flex gap-1">
              {multiFiles.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setMultiUploadIndex(idx)}
                  className={`h-2 w-2 rounded-full ${idx === multiUploadIndex ? 'bg-primary' : 'bg-muted'}`}
                  aria-label={`切换到第 ${idx + 1} 张`}
                />
              ))}
            </div>
          </div>

          {multiPreviews[multiUploadIndex] && (
            <div className="pg-card-soft relative overflow-hidden">
              <img
                src={multiPreviews[multiUploadIndex]}
                alt={`预览 ${multiUploadIndex + 1}`}
                className="max-h-64 w-full object-contain bg-muted"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={`multi-title-${multiUploadIndex}`}>
              照片标题（可选）
            </Label>
            <Input
              id={`multi-title-${multiUploadIndex}`}
              placeholder="为这张照片添加标题"
              value={multiUploadTitles[multiUploadIndex] || ''}
              onChange={(e) => setMultiUploadTitles((prev) => ({
                ...prev,
                [multiUploadIndex]: e.target.value,
              }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handleMultiUploadPrev}
              disabled={multiUploadIndex === 0}
            >
              <SkipBack className="h-4 w-4 mr-1" />
              上一张
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMultiUploadNext}
              disabled={multiUploadIndex === multiFiles.length - 1}
            >
              下一张
              <SkipForward className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowMultiUpload(false)
                setMultiFiles([])
                setMultiPreviews([])
                setMultiUploadTitles({})
                setMultiUploadIndex(0)
              }}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="apple" glow
              className="flex-1"
              onClick={handleMultiUploadSubmit}
              disabled={multiUploading}
            >
              {multiUploading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  上传中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  上传全部
                </span>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {isSlideshow && albumPhotos.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label="幻灯片播放"
        >
          <button
            className="absolute right-4 top-4 z-10 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60"
            onClick={stopSlideshow}
            aria-label="关闭幻灯片"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full bg-black/40 text-white hover:bg-black/60"
              onClick={prevSlideshowPhoto}
              aria-label="上一张"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          </div>

          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full bg-black/40 text-white hover:bg-black/60"
              onClick={nextSlideshowPhoto}
              aria-label="下一张"
            >
              <ChevronLeft className="h-6 w-6 rotate-180" />
            </Button>
          </div>

          <div className="max-h-[85vh] max-w-[85vw]" onClick={toggleSlideshowPlay}>
            <img
              src={getPhotoUrl(albumPhotos[slideshowIndex])}
              alt={albumPhotos[slideshowIndex].title || '幻灯片照片'}
              className="max-h-[85vh] max-w-[85vw] rounded-lg object-contain cursor-pointer"
            />
            {albumPhotos[slideshowIndex].title && (
              <p className="mt-3 text-center text-sm text-white/80">
                {albumPhotos[slideshowIndex].title}
              </p>
            )}
          </div>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <span className="text-sm text-white/60">
              {slideshowIndex + 1} / {albumPhotos.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-black/40 text-white hover:bg-black/60"
              onClick={toggleSlideshowPlay}
              aria-label={slideshowPlaying ? '暂停' : '播放'}
            >
              {slideshowPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-black/40 text-white hover:bg-black/60"
              onClick={() => {
                const fullscreen = document.fullscreenElement
                if (fullscreen) {
                  document.exitFullscreen()
                } else {
                  document.documentElement.requestFullscreen()
                }
              }}
              aria-label="全屏"
            >
              <Maximize2 className="h-5 w-5" />
            </Button>
          </div>

          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1">
            {albumPhotos.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setSlideshowIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === slideshowIndex
                    ? 'w-8 bg-white'
                    : 'w-1.5 bg-white/40'
                }`}
                aria-label={`切换到第 ${idx + 1} 张`}
              />
            ))}
          </div>
        </div>
      )}
      {dialog}
    </Layout>
  )
}
