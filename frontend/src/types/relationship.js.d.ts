declare module 'relationship.js' {
  interface RelationshipOptions {
    text: string
    target?: string
    sex?: number
    type?: 'default' | 'chain' | 'pair'
    reverse?: boolean
    mode?: string
    optimal?: boolean
  }

  function relationship(options: RelationshipOptions | string): string[]

  namespace relationship {
    const data: Record<string, string[]>
    const dataCount: number
    function setMode(name: string, modeData: Record<string, string[]>): void
  }

  export default relationship
}
