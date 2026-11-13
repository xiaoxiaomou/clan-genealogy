import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { PgSeal } from '@/components/ui/pedigree'
import { ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="pg-rise flex flex-col items-center text-center">
        <PgSeal char="阙" size={88} title="此卷阙如" />
        <p className="pg-eyebrow mt-10">谱 牒 · 四 零 四</p>
        <h1 className="pg-title mt-3 text-3xl font-semibold">此卷阙如</h1>
        <p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
          您要访问的页面不在谱中，可能已被移除，或卷号有误。
        </p>
        <Button
          variant="apple"
          onClick={() => navigate('/')}
          className="mt-8 gap-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回首页
        </Button>
      </div>
    </div>
  )
}
