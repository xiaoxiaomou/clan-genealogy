import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

interface AvatarDisplayProps {
  avatar: string | null
  name: string
  gender?: string
  size?: number
  className?: string
  lazy?: boolean
}

const getGenderColor = (gender?: string) => {
  switch (gender) {
    case 'male': return 'hsl(var(--primary))'
    case 'female': return '#E91E8C'
    default: return 'hsl(var(--muted-foreground))'
  }
}

export function AvatarDisplay({ avatar, name, gender, size = 40, className, lazy = true }: AvatarDisplayProps) {
  const [imgError, setImgError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(!lazy)
  const imgRef = useRef<HTMLImageElement>(null)
  const initial = name ? name.charAt(0) : '?'

  useEffect(() => {
    if (!lazy) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '50px' }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => observer.disconnect()
  }, [lazy])

  if (avatar && !imgError && isInView) {
    return (
      <div className="relative" style={{ width: size, height: size }}>
        {!isLoaded && (
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center rounded-full text-white font-medium shrink-0 animate-pulse',
              className
            )}
            style={{
              backgroundColor: getGenderColor(gender),
              fontSize: size * 0.4,
            }}
            aria-hidden="true"
          >
            {initial}
          </div>
        )}
        <img
          ref={imgRef}
          src={avatar}
          alt={`${name}的头像`}
          className={cn('rounded-full object-cover', className)}
          style={{ width: size, height: size }}
          loading={lazy ? 'lazy' : 'eager'}
          onLoad={() => setIsLoaded(true)}
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  return (
    <div
      ref={imgRef}
      className={cn(
        'flex items-center justify-center rounded-full text-white font-medium shrink-0',
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: getGenderColor(gender),
        fontSize: size * 0.4,
      }}
      role="img"
      aria-label={`${name}的头像`}
    >
      {initial}
    </div>
  )
}
