// LivingBookPage.tsx
// Living Book - 把家族成员生平以"翻书"形式呈现
// 左右两页 + 翻页动画
import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, useToast } from '@/components/ui';
import { api } from '@/lib/api';
import { BookOpen, ChevronLeft, ChevronRight, Calendar, MapPin, Users } from 'lucide-react';

interface Member {
  id: number;
  name: string;
  gender: string;
  birth_date: string | null;
  death_date: string | null;
  birth_place: string | null;
  death_place: string | null;
  bio: string | null;
  avatar: string | null;
  generation: number;
  is_alive: boolean;
}

interface BookPage {
  left: { type: 'cover' | 'overview' | 'member'; payload?: any };
  right: { type: 'overview' | 'member' | 'blank'; payload?: any };
}

export default function LivingBookPage() {
  const { id } = useParams<{ id: string }>()
  const familyId = Number(id)
  const { showToast } = useToast()
  const [family, setFamily] = useState<any>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [pageIdx, setPageIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const totalPages = useRef(0)

  useEffect(() => {
    if (!familyId) return
    load()
  }, [familyId])

  async function load() {
    setLoading(true)
    try {
      const [f, m] = await Promise.all([
        api.getFamily(familyId),
        api.getMembers(familyId),
      ])
      setFamily(f.family)
      setMembers(m.members || [])
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  // 按世代排序的成员
  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => (a.generation || 0) - (b.generation || 0) || (a.birth_date || '').localeCompare(b.birth_date || '')),
    [members]
  )

  // 分页（每 2 个成员一页）
  const pages: BookPage[] = useMemo(() => {
    const result: BookPage[] = []
    // 第 1 页：封面
    result.push({ left: { type: 'cover' }, right: { type: 'blank' } })
    // 第 2 页：家族总览 + 第 1、2 个成员
    if (sortedMembers.length > 0) {
      result.push({ left: { type: 'overview' }, right: { type: 'member', payload: sortedMembers[0] } })
      for (let i = 1; i < sortedMembers.length; i += 2) {
        result.push({
          left: { type: 'member', payload: sortedMembers[i] },
          right: i + 1 < sortedMembers.length
            ? { type: 'member', payload: sortedMembers[i + 1] }
            : { type: 'blank' },
        })
      }
    } else {
      result.push({ left: { type: 'overview' }, right: { type: 'blank' } })
    }
    return result
  }, [sortedMembers])

  useEffect(() => {
    totalPages.current = pages.length
  }, [pages])

  // 键盘翻页
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setPageIdx((i) => Math.min(i + 1, pages.length - 1))
      if (e.key === 'ArrowLeft') setPageIdx((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pages.length])

  const current = pages[pageIdx] || pages[0]

  if (loading) {
    return (
      <Layout>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-xl font-semibold sm:text-2xl">
            <BookOpen className="h-6 w-6 text-amber-600" aria-hidden="true" />
            {family?.name || '家族'} · 活的书
          </h1>
          <div className="text-xs text-muted-foreground tabular-nums">
            第 {pageIdx + 1} / {pages.length} 页 · ←/→ 翻页
          </div>
        </header>

        {/* 翻书容器 */}
        <div
          className="relative mx-auto aspect-[3/2] w-full max-w-4xl overflow-hidden rounded-xl border-2 border-amber-700/30 bg-gradient-to-br from-amber-50 to-amber-100 shadow-2xl dark:from-amber-950 dark:to-stone-900"
          style={{ perspective: '1500px' }}
        >
          <div className="grid h-full grid-cols-2">
            {/* 左页 */}
            <div
              className="book-page relative h-full overflow-y-auto border-r border-amber-700/20 p-6 sm:p-10"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {current.left.type === 'cover' && <CoverPage family={family} members={members} />}
              {current.left.type === 'overview' && <OverviewPage family={family} members={members} />}
              {current.left.type === 'member' && <MemberPage member={current.left.payload} />}
            </div>
            {/* 右页 */}
            <div
              className="book-page relative h-full overflow-y-auto p-6 sm:p-10"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {current.right.type === 'overview' && <OverviewPage family={family} members={members} />}
              {current.right.type === 'member' && <MemberPage member={current.right.payload} />}
              {current.right.type === 'blank' && <BlankPage />}
            </div>
          </div>

          {/* 翻页按钮 */}
          <button
            onClick={() => setPageIdx((i) => Math.max(i - 1, 0))}
            disabled={pageIdx === 0}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-amber-700/30 bg-background/80 p-2 text-amber-700 transition-all hover:scale-110 disabled:opacity-30"
            aria-label="上一页"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => setPageIdx((i) => Math.min(i + 1, pages.length - 1))}
            disabled={pageIdx === pages.length - 1}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-amber-700/30 bg-background/80 p-2 text-amber-700 transition-all hover:scale-110 disabled:opacity-30"
            aria-label="下一页"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* 进度条 */}
        <div className="mx-auto mt-3 max-w-4xl">
          <div className="h-1 w-full overflow-hidden rounded-full bg-amber-700/10">
            <div
              className="h-full bg-amber-600 transition-all duration-500"
              style={{ width: `${((pageIdx + 1) / pages.length) * 100}%` }}
            />
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          ← / → 键翻页 · 共 {members.length} 位成员 · {pages.length} 页
        </p>
      </div>

      <style>{`
        .book-page {
          background-image:
            repeating-linear-gradient(0deg, transparent, transparent 30px, rgba(180, 140, 80, 0.04) 30px, rgba(180, 140, 80, 0.04) 31px);
        }
        @media (prefers-reduced-motion: reduce) {
          .book-page { transition: none !important; }
        }
      `}</style>
    </Layout>
  )
}

function CoverPage({ family, members }: { family: any; members: Member[] }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="mb-2 font-serif text-xs tracking-[0.5em] text-amber-700/60">家 之 史</div>
      <h2 className="mb-4 font-serif text-3xl font-bold text-amber-900 sm:text-5xl dark:text-amber-100">
        {family?.surname || ''}氏家谱
      </h2>
      <div className="font-serif text-sm text-amber-800 dark:text-amber-200">
        {family?.name}
      </div>
      <div className="mt-6 text-xs text-amber-700/50 dark:text-amber-300/50">
        <div>发源地：{family?.origin || '未记载'}</div>
        <div>家族成员：{members.length} 人</div>
        <div>建谱时间：{new Date().getFullYear()} 年</div>
      </div>
      <div className="mt-auto text-[10px] text-amber-700/40">翻页开启家族记忆</div>
    </div>
  )
}

function OverviewPage({ family, members }: { family: any; members: Member[] }) {
  const gens = Array.from(new Set(members.map((m) => m.generation || 0))).sort((a, b) => a - b)
  const totalAlive = members.filter((m) => m.is_alive).length
  const totalMale = members.filter((m) => m.gender === 'male').length
  return (
    <div className="space-y-4 font-serif">
      <h2 className="text-2xl font-bold text-amber-900 dark:text-amber-100">家族总览</h2>
      <p className="text-sm leading-relaxed text-amber-800/90 dark:text-amber-200/90">
        {family?.description || family?.intro || '本族源远流长，子孙繁衍，人才辈出。本书以世系为经，生平为纬，记述历代先祖懿德嘉言。'}
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded border border-amber-700/20 bg-amber-50/40 p-2 dark:bg-amber-900/20">
          <Users className="mb-1 h-3 w-3" aria-hidden="true" />
          <div className="text-base font-bold">{members.length}</div>
          <div className="text-amber-700/70">总人数</div>
        </div>
        <div className="rounded border border-amber-700/20 bg-amber-50/40 p-2 dark:bg-amber-900/20">
          <div className="text-base font-bold">{gens.length}</div>
          <div className="text-amber-700/70">世代数</div>
        </div>
        <div className="rounded border border-amber-700/20 bg-amber-50/40 p-2 dark:bg-amber-900/20">
          <div className="text-base font-bold">{totalAlive}</div>
          <div className="text-amber-700/70">在世</div>
        </div>
        <div className="rounded border border-amber-700/20 bg-amber-50/40 p-2 dark:bg-amber-900/20">
          <div className="text-base font-bold">{totalMale}/{members.length - totalMale}</div>
          <div className="text-amber-700/70">男/女</div>
        </div>
      </div>
      {family?.motto && (
        <blockquote className="rounded border-l-4 border-amber-700/40 bg-amber-50/40 p-2 text-sm italic dark:bg-amber-900/20">
          「{family.motto}」
        </blockquote>
      )}
    </div>
  )
}

function MemberPage({ member }: { member: Member }) {
  return (
    <article className="space-y-3 font-serif">
      <header className="border-b border-amber-700/30 pb-2">
        <h3 className="text-2xl font-bold text-amber-900 dark:text-amber-100">
          {member.name}
          {member.generation_name && <span className="ml-2 text-base font-normal text-amber-700/70">字「{member.generation_name}」</span>}
        </h3>
        <div className="text-xs text-amber-700/70">第 {member.generation} 代 · {member.gender === 'male' ? '男' : '女'}{!member.is_alive && ' · 已故'}</div>
      </header>

      <div className="space-y-1 text-xs text-amber-800/80 dark:text-amber-200/80">
        {(member.birth_date || member.death_date) && (
          <div className="flex items-start gap-1">
            <Calendar className="mt-0.5 h-3 w-3 flex-shrink-0" aria-hidden="true" />
            <span>{member.birth_date || '??'} — {member.death_date || (member.is_alive ? '至今' : '??')}</span>
          </div>
        )}
        {(member.birth_place || member.death_place) && (
          <div className="flex items-start gap-1">
            <MapPin className="mt-0.5 h-3 w-3 flex-shrink-0" aria-hidden="true" />
            <span>生：{member.birth_place || '未记'}{member.death_place && member.death_place !== member.birth_place ? ` · 殁：${member.death_place}` : ''}</span>
          </div>
        )}
      </div>

      {member.bio ? (
        <div
          className="prose prose-sm max-w-none text-sm leading-relaxed text-amber-900 dark:text-amber-100"
          dangerouslySetInnerHTML={{ __html: member.bio }}
        />
      ) : (
        <p className="italic text-amber-700/50">（暂无生平记载）</p>
      )}
    </article>
  )
}

function BlankPage() {
  return (
    <div className="flex h-full items-center justify-center text-amber-700/30">
      <div className="text-center">
        <div className="font-serif text-4xl">·</div>
        <div className="mt-2 text-xs">空白页</div>
      </div>
    </div>
  )
}
