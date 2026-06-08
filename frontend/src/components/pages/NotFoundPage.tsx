import { useNavigate } from 'react-router-dom'
import { Button, BorderGlow } from '@/components/ui'
import { TreePine, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <BorderGlow
        backgroundColor="transparent"
        className="!bg-transparent border-0 p-0"
        colors={['#4facfe', '#00f2fe', '#43e97b']}
        glowIntensity={0.4}
      >
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded bg-primary/8 border border-primary/15">
          <TreePine className="h-10 w-10 text-primary" />
        </div>
        <h1 className="mb-2 text-4xl font-bold tracking-tight">404</h1>
        <p className="mb-8 text-lg text-muted-foreground">
          页面不存在
        </p>
        <Button
          variant="apple"
          glow
          onClick={() => navigate('/')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          返回首页
        </Button>
      </BorderGlow>
    </div>
  )
}
