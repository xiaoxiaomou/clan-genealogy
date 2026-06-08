import { Card, CardContent } from '@/components/ui'
import {
  InkBrush, InkSeal, InkMountain, InkBamboo, InkLotus, InkCloud,
  InkTree, InkScroll, InkCenser, InkGoBoard, InkLantern, InkTeapot,
  InkGuqin, InkCoin, InkJade,
} from '@/components/icons/InkIcons'

const BG = 'linear-gradient(135deg, #f5e6d3 0%, #ede0c8 50%, #f5e6d3 100%)'
const ICONS = [
  { C: InkBrush, name: '毛笔', use: '题字·书写' },
  { C: InkSeal, name: '印章', use: '署名·认证' },
  { C: InkMountain, name: '山峦', use: '祖籍·远眺' },
  { C: InkBamboo, name: '墨竹', use: '气节·君子' },
  { C: InkLotus, name: '莲花', use: '清白·家风' },
  { C: InkCloud, name: '祥云', use: '吉祥·祈福' },
  { C: InkTree, name: '古树', use: '传承·根基' },
  { C: InkScroll, name: '卷轴', use: '族谱·文献' },
  { C: InkCenser, name: '香炉', use: '祭祀·追远' },
  { C: InkGoBoard, name: '棋盘', use: '对弈·谋略' },
  { C: InkLantern, name: '灯笼', use: '节庆·团圆' },
  { C: InkTeapot, name: '茶壶', use: '清谈·待客' },
  { C: InkGuqin, name: '古琴', use: '雅集·修身' },
  { C: InkCoin, name: '古钱', use: '财富·流通' },
  { C: InkJade, name: '玉佩', use: '德行·配饰' },
]

export default function InkIconsShowcase() {
  return (
    <div className="min-h-screen p-4 sm:p-8" style={{ background: BG }}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="relative overflow-hidden rounded-lg border-2 border-amber-700/40 bg-gradient-to-br from-amber-100 to-amber-50 p-6 text-center shadow-2xl sm:p-8">
          <div className="mb-2 text-xs tracking-[0.5em] text-amber-700/60">墨 韵 笔 意</div>
          <h1 className="font-serif text-4xl font-bold text-amber-900 sm:text-5xl">
            墨水笔触图标
          </h1>
          <div className="mt-3 font-serif text-sm text-amber-800/70">
            飞白 · 晕染 · 留白 · 写意
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {ICONS.map(({ C, name, use }) => (
            <Card key={name} className="border-amber-700/20 bg-stone-50/80">
              <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                <C size={48} color="#2d1f1a" />
                <h3 className="font-serif text-base text-amber-900">{name}</h3>
                <p className="font-serif text-xs text-amber-800/60">{use}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-center font-serif text-xs text-amber-800/40">
          取法传统笔墨，得古人之意
        </p>
      </div>
    </div>
  )
}
