import { useEffect, useRef } from 'react'

export function InkWashBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let time = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Mountain layers - pre-computed for performance
    const layers = [
      { count: 3, baseY: 0.55, height: 0.2, alpha: 0.06, speed: 0.0003 },
      { count: 4, baseY: 0.6, height: 0.25, alpha: 0.08, speed: 0.0005 },
      { count: 5, baseY: 0.65, height: 0.28, alpha: 0.06, speed: 0.0004 },
      { count: 3, baseY: 0.7, height: 0.22, alpha: 0.05, speed: 0.0006 },
    ]

    const peaks: { x: number; w: number; h: number; layer: number }[] = []
    for (let l = 0; l < layers.length; l++) {
      const layer = layers[l]
      for (let i = 0; i < layer.count; i++) {
        peaks.push({
          x: Math.random(),
          w: 0.15 + Math.random() * 0.35,
          h: 0.3 + Math.random() * 0.5,
          layer: l,
        })
      }
    }

    // Pre-generate mountain silhouettes using sine waves
    const mountainHeights: number[][] = layers.map((_layer, l) => {
      const heights: number[] = []
      const steps = 200
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        let h = 0
        for (let p = 0; p < 4; p++) {
          h += Math.sin(t * Math.PI * (3 + p * 2) + l * 0.7) * (0.3 + p * 0.1)
        }
        heights.push(h)
      }
      return heights
    })

    const draw = () => {
      time += 0.005
      const w = canvas.width
      const h = canvas.height

      // Sky gradient - deep night to warm horizon
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.55)
      skyGrad.addColorStop(0, 'rgba(15, 15, 25, 1)')
      skyGrad.addColorStop(0.3, 'rgba(20, 18, 30, 1)')
      skyGrad.addColorStop(0.6, 'rgba(30, 25, 35, 0.95)')
      skyGrad.addColorStop(0.8, 'rgba(50, 40, 45, 0.7)')
      skyGrad.addColorStop(1, 'rgba(60, 50, 45, 0.3)')
      ctx.fillStyle = skyGrad
      ctx.fillRect(0, 0, w, h)

      // Subtle moon glow
      const moonX = w * 0.78
      const moonY = h * 0.15
      const moonGrad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, h * 0.4)
      moonGrad.addColorStop(0, 'rgba(255, 240, 200, 0.06)')
      moonGrad.addColorStop(0.3, 'rgba(200, 180, 150, 0.03)')
      moonGrad.addColorStop(1, 'rgba(200, 180, 150, 0)')
      ctx.fillStyle = moonGrad
      ctx.fillRect(0, 0, w, h)

      // Draw mountain layers (back to front)
      for (let l = layers.length - 1; l >= 0; l--) {
        const layer = layers[l]
        const baseY = h * layer.baseY
        const maxH = h * layer.height
        const heights = mountainHeights[l]
        const steps = heights.length - 1

        ctx.beginPath()
        ctx.moveTo(0, h)

        for (let i = 0; i <= steps; i++) {
          const x = (i / steps) * w
          const noise = Math.sin(i * 0.05 + time * layer.speed + l) * 0.15
          const heightVal = Math.max(0, heights[i] + noise)
          const y = baseY - heightVal * maxH
          ctx.lineTo(x, y)
        }

        ctx.lineTo(w, h)
        ctx.closePath()

        const mountainColor = [
          'rgba(40, 50, 60, 0.12)',
          'rgba(55, 65, 75, 0.10)',
          'rgba(35, 45, 55, 0.08)',
          'rgba(50, 60, 70, 0.06)',
        ][l]
        ctx.fillStyle = mountainColor
        ctx.fill()

        // Mist at the base
        if (l === 0) {
          const mistGrad = ctx.createLinearGradient(0, baseY - maxH * 0.3, 0, baseY + maxH * 0.3)
          mistGrad.addColorStop(0, 'rgba(60, 55, 50, 0)')
          mistGrad.addColorStop(0.5, 'rgba(60, 55, 50, 0.04)')
          mistGrad.addColorStop(1, 'rgba(60, 55, 50, 0)')
          ctx.fillStyle = mistGrad
          ctx.fillRect(0, baseY - maxH * 0.3, w, maxH * 0.6)
        }
      }

      // Mist/cloud wisps
      for (let i = 0; i < 3; i++) {
        const cx = w * (0.2 + i * 0.3) + Math.sin(time * 0.1 + i * 2) * w * 0.1
        const cy = h * (0.5 + i * 0.08)
        const rw = w * (0.3 + Math.sin(time * 0.05 + i) * 0.1)
        const mistGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rw)
        mistGrad.addColorStop(0, 'rgba(80, 75, 70, 0.04)')
        mistGrad.addColorStop(1, 'rgba(80, 75, 70, 0)')
        ctx.fillStyle = mistGrad
        ctx.fillRect(0, 0, w, h)
      }

      // Ink particles (drifting slowly)
      for (let i = 0; i < 5; i++) {
        const px = ((i * 137.5 + time * 3) % w)
        const py = h * (0.2 + Math.sin(i * 1.3 + time * 0.2) * 0.15)
        const size = 1 + Math.sin(i * 2 + time) * 0.5
        ctx.beginPath()
        ctx.arc(px, py, size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(100, 95, 90, ${0.02 + Math.sin(i + time * 0.5) * 0.01})`
        ctx.fill()
      }

      animationId = requestAnimationFrame(draw)
    }

    animationId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  )
}
