import { useId } from 'react'

interface BeamsProps {
  className?: string
  beamWidth?: number
  beamHeight?: number
  beamCount?: number
  duration?: number
  colors?: string[]
}

export function Beams({
  className = '',
  beamWidth = 2,
  beamHeight = 100,
  beamCount = 20,
  duration = 8,
  colors = ['#0ea5e9', '#8b5cf6', '#ec4899', '#10b981'],
}: BeamsProps) {
  const id = useId()
  const gradientId = `beam-gradient-${id}`

  const beams = Array.from({ length: beamCount }, (_, i) => {
    const angle = (i * 180) / beamCount + Math.random() * 10
    const x = `${(i * 100) / beamCount}%`
    const delay = `${(i * duration) / beamCount}s`

    return (
      <rect
        key={i}
        x={x}
        y="-10%"
        width={beamWidth}
        height={beamHeight + '%'}
        fill={`url(#${gradientId})`}
        opacity={0.15}
        transform={`rotate(${angle} ${x} 50%)`}
        style={{
          animation: `beam-move ${duration}s linear infinite`,
          animationDelay: delay,
        }}
      >
        <animate
          attributeName="y"
          values="-10%;110%;-10%"
          dur={`${duration}s`}
          repeatCount="indefinite"
          begin={delay}
        />
      </rect>
    )
  })

  return (
    <>
      <style>{`
        @keyframes beam-move {
          0% { opacity: 0; }
          10% { opacity: 0.15; }
          90% { opacity: 0.15; }
          100% { opacity: 0; }
        }
      `}</style>
      <svg
        className={`absolute inset-0 w-full h-full pointer-events-none overflow-hidden ${className}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={colors[0]} stopOpacity="0" />
            <stop offset="50%" stopColor={colors[1]} stopOpacity="1" />
            <stop offset="100%" stopColor={colors[2]} stopOpacity="0" />
          </linearGradient>
        </defs>
        {beams}
      </svg>
    </>
  )
}
