import { useState, useRef } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { api } from '@/lib/api'
import { getCroppedImg } from '@/lib/cropImage'
import { AvatarDisplay } from './AvatarDisplay'
import { Modal, Button } from '@/components/ui'
import { Camera, Loader2 } from 'lucide-react'

interface AvatarUploaderProps {
  currentAvatar: string | null
  onUpload: (url: string) => void
  name: string
  gender?: string
  size?: number
  type?: 'user' | 'member'
  memberId?: number
  disabled?: boolean
}

export function AvatarUploader({
  currentAvatar,
  onUpload,
  name,
  gender,
  size = 96,
  type = 'member',
  memberId,
  disabled = false,
}: AvatarUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [cropModal, setCropModal] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 校验文件大小 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('图片大小不能超过 5MB')
      return
    }

    // 读取文件用于裁剪
    const reader = new FileReader()
    reader.onload = () => {
      setImageSrc(reader.result as string)
      setCropModal(true)
      setZoom(1)
    }
    reader.readAsDataURL(file)

    // 重置 input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleCropComplete = (_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return

    setIsUploading(true)
    try {
      // 裁剪图片
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)

      // 上传
      const result = await api.uploadAvatar(croppedBlob, type, memberId)

      // 回调
      onUpload(result.url)
      setCropModal(false)
      setImageSrc(null)
    } catch (err: any) {
      alert(err.message || '上传失败')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <>
      <div
        className="group relative inline-block cursor-pointer"
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
      >
        <AvatarDisplay
          avatar={currentAvatar}
          name={name}
          gender={gender}
          size={size}
        />

        {/* 悬浮遮罩 */}
        {!disabled && (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/40 opacity-0 transition-opacity group-hover:opacity-100"
          >
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            ) : (
              <Camera className="h-5 w-5 text-white" />
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
        />
      </div>

      {/* 裁剪弹窗 */}
      <Modal
        isOpen={cropModal}
        onClose={() => {
          setCropModal(false)
          setImageSrc(null)
        }}
        title="裁剪头像"
        className="max-w-md"
      >
        {imageSrc && (
          <>
            <div className="relative h-72 w-full rounded-xl overflow-hidden bg-black">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <label className="text-sm text-muted-foreground">缩放</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-10 text-right">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            <div className="mt-4 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setCropModal(false)
                  setImageSrc(null)
                }}
              >
                取消
              </Button>
              <Button
                variant="apple"
                glow
                className="flex-1"
                onClick={handleCropConfirm}
                disabled={isUploading}
              >
                {isUploading ? '上传中...' : '确认'}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  )
}
