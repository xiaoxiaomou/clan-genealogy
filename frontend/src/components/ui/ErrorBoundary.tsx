import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="mx-auto max-w-md text-center">
            <div className="mb-6 inline-flex items-center justify-center h-16 w-16 rounded-md bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold mb-2">出现了一些问题</h1>
            <p className="text-muted-foreground mb-4">
              页面渲染时发生了错误，请尝试刷新页面或返回首页。
            </p>
            {this.state.error && (
              <details className="mb-6 text-left text-xs bg-destructive/5 border border-destructive/20 rounded-md p-3 max-h-48 overflow-auto">
                <summary className="cursor-pointer font-semibold text-destructive mb-2">错误详情（点开查看）</summary>
                <div className="text-destructive font-mono whitespace-pre-wrap break-all mb-2">
                  {this.state.error.message}
                </div>
                {this.state.error.stack && (
                  <div className="text-muted-foreground font-mono whitespace-pre-wrap break-all text-[10px]">
                    {this.state.error.stack.split('\n').slice(0, 8).join('\n')}
                  </div>
                )}
              </details>
            )}
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                刷新页面
              </Button>
              <Button
                variant="apple"
                glow
                onClick={this.handleReset}
                className="gap-2"
              >
                返回首页
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
