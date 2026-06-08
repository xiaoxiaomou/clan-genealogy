import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import type { FamilyAlbum, FamilyPhoto } from '@/types'
import { formatDate } from '@/lib/date'
import {
  Button,
  Modal,
  Input,
  Label,
  useToast,
} from '@/components/ui'
import {
  ArrowLeft,
  Plus,
  Image,
  Trash2,
  Upload,
  X,
  Camera,
  ChevronLeft,
  ImageOff,
  Loader2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Grid3X3,
} from 'lucide-react'

  const PLACEHOLDER_COVERS = [
  'from-amber-900/60 to-stone-900',
  'from-stone-800 to-amber-950',
  'from-amber-950 to-stone-800',
  'from-stone-900 to-amber-900/40',
  'from-amber-900/40 to-stone-900/80',
  'from-stone-800/80 to-amber-900/30',
  ]

  const BG = 'linear-gradient(135deg, #1c1410 0%, #2d1f1a 50%, #1c1410 100%)'

export default function FamilyAlbumPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
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
  const [familyName, setFamilyName] = useState('')

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
    if (!confirm('确定要删除该相册吗？相册中的所有照片也将被删除。')) return
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
    if (!confirm('确定要删除这张照片吗？')) return
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

  const getCoverGradient = (index: number) => {
    return PLACEHOLDER_COVERS[index % PLACEHOLDER_COVERS.length]
  }

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

  return (
    <div className="min-h-screen p-4 sm:p-8" style={{ background: BG }}>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* 匾额 */}
        <div className="relative overflow-hidden rounded-lg border-2 border-amber-700/40 bg-gradient-to-br from-amber-900/40 to-stone-900/60 p-6 text-center shadow-2xl sm:p-8">
          <div className="absolute inset-0 opacity-20" style={{
            background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(245, 230, 211, 0.1) 10px, rgba(245, 230, 211, 0.1) 11px)',
          }} />
          <div className="relative">
            <div className="mb-2 text-xs tracking-[0.5em] text-amber-300/60">家 之 影 像</div>
            <h1 className="font-serif text-4xl font-bold text-amber-100 sm:text-5xl">
              {(familySurname ? familySurname + '氏' : '') + '·家族相册'}
            </h1>
            <div className="mt-3 text-sm text-amber-200/70">
              {view === 'detail' && currentAlbum
                ? currentAlbum.description || '记录家族珍贵瞬间'
                : '留影存照，传家之宝'}
            </div>
          </div>
        </div>

        {/* 顶部工具条 */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-700/30 bg-stone-900/50 px-4 py-3">
          <div className="flex items-center gap-2">
            {view === 'detail' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setView('grid')
                  setCurrentAlbum(null)
                  setAlbumPhotos([])
                }}
                className="gap-1 text-amber-200/80 hover:bg-amber-900/30 hover:text-amber-100"
              >
                <ChevronLeft className="h-4 w-4" />
                返回相册
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/family/${familyId}`)}
                className="gap-1 text-amber-200/80 hover:bg-amber-900/30 hover:text-amber-100"
              >
                <ArrowLeft className="h-4 w-4" />
                返回族谱
              </Button>
            )}
            {view === 'detail' && currentAlbum && (
              <span className="ml-2 font-serif text-lg text-amber-100">{currentAlbum.name}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {view === 'detail' ? (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadFileSelect}
                  aria-label="选择照片上传"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5 border-amber-700/30 bg-stone-950/40 text-amber-200/80 hover:bg-stone-800/60 hover:text-amber-100"
                >
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => multiFileInputRef.current?.click()}
                  className="gap-1.5 border-amber-700/30 bg-stone-950/40 text-amber-200/80 hover:bg-stone-800/60 hover:text-amber-100"
                >
                  <Grid3X3 className="h-3.5 w-3.5" />
                  批量
                </Button>
                {albumPhotos.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startSlideshow(0)}
                    className="gap-1.5 border-amber-700/30 bg-stone-950/40 text-amber-200/80 hover:bg-stone-800/60 hover:text-amber-100"
                  >
                    <Play className="h-3.5 w-3.5" />
                    幻灯片
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteAlbum(currentAlbum!.id)}
                  className="gap-1.5 text-amber-200/60 hover:bg-amber-900/30 hover:text-amber-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  删除
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => setShowCreateAlbum(true)}
                className="gap-1.5 bg-amber-700/80 text-amber-50 hover:bg-amber-600"
              >
                <Plus className="h-3.5 w-3.5" />
                新建相册
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-lg border border-amber-700/20 bg-stone-900/50 overflow-hidden">
                <div className="aspect-video bg-stone-800" />
                <div className="p-4">
                  <div className="mb-2 h-5 w-2/3 rounded bg-stone-800" />
                  <div className="h-4 w-1/3 rounded bg-stone-800" />
                </div>
              </div>
            ))}
          </div>
        ) : view === 'grid' ? (
          albums.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-amber-700/30 bg-stone-900/50 py-24">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-amber-700/40 bg-amber-900/20">
                <Camera className="h-10 w-10 text-amber-300/60" />
              </div>
              <h2 className="mb-2 font-serif text-xl text-amber-100">暂无相册</h2>
              <p className="mb-8 max-w-md text-center text-sm text-amber-200/50">
                创建相册来保存家族照片，记录珍贵时刻。
              </p>
              <Button onClick={() => setShowCreateAlbum(true)} className="gap-2 bg-amber-700/80 text-amber-50 hover:bg-amber-600">
                <Plus className="h-4 w-4" />
                创建第一个相册
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {albums.map((album, index) => (
                <div
                  key={album.id}
                  className="cursor-pointer overflow-hidden rounded-lg border border-amber-700/30 bg-stone-900/50 transition-all hover:-translate-y-0.5 hover:border-amber-600/50 hover:shadow-lg hover:shadow-amber-900/20"
                  style={{ animationDelay: `${index * 60}ms` }}
                  onClick={() => loadAlbumDetail(album)}
                >
                  {/* 封面 */}
                  <div className={`relative flex aspect-video items-center justify-center overflow-hidden bg-gradient-to-br ${getCoverGradient(index)}`}>
                    {album.cover_url ? (
                      <img
                        src={album.cover_url}
                        alt={album.name}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    ) : (
                      <Camera className="h-12 w-12 text-amber-100/30" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 to-transparent" />
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-amber-700/40 bg-stone-900/70 px-2.5 py-1 text-xs text-amber-100">
                      <Image className="h-3 w-3" />
                      {album.photo_count} 张
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="mb-1 truncate font-serif text-amber-100">{album.name}</h3>
                    {album.description && (
                      <p className="mb-2 line-clamp-1 text-xs text-amber-200/50">{album.description}</p>
                    )}
                    <p className="text-xs text-amber-200/40">{formatDate(album.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* 相册详情 - 照片网格 */
          <div>
            {albumPhotos.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-amber-700/30 bg-stone-900/50 py-24">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-amber-700/30 bg-stone-800">
                  <ImageOff className="h-10 w-10 text-amber-200/40" />
                </div>
                <h2 className="mb-2 font-serif text-xl text-amber-100">暂无照片</h2>
                <p className="mb-8 max-w-md text-center text-sm text-amber-200/50">
                  点击上方"上传"按钮添加照片到这个相册。
                </p>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 bg-amber-700/80 text-amber-50 hover:bg-amber-600"
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
                    className="group relative cursor-pointer break-inside-avoid overflow-hidden rounded-lg border border-amber-700/20 bg-stone-900/50 transition-all hover:border-amber-600/50"
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
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-stone-900/80 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                        <p className="truncate text-sm text-amber-100">{photo.title}</p>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-7 w-7 rounded-full bg-stone-900/60 text-amber-100 opacity-0 transition-opacity hover:bg-stone-900/80 group-hover:opacity-100"
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

        <p className="text-center font-serif text-xs text-amber-200/30">
          影存家史，光影传家
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
              className="flex w-full rounded-lg border bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 resize-none"
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
            <div className="relative overflow-hidden rounded border">
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
            <div className="relative overflow-hidden rounded border">
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

      <div className="mt-8" />
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
    </div>
  )
}
