/**
 * 家族成员传记页 · 行状卷轴
 * 把一位族人的生平做成一卷展开的行状：卷首名讳 + 朱砂名印 + 字号，
 * 正文如行状叙事，侧栏年表如刻碑纪年，亲属如谱牒旁注。
 */
import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { smartBack } from '@/lib/smartBack'
import { Layout } from '@/components/layout/Layout'
import {
  AvatarDisplay,
  RichTextRenderer,
  useToast,
} from '@/components/ui'
import {
  PgPageHead,
  PgSectionHead,
  PgSeal,
  PgColophon,
  PG_RED,
} from '@/components/ui/pedigree'
import {
  ArrowLeft,
  MapPin,
  Calendar,
  BookOpenText,
  GitBranch,
  Users,
  ScrollText,
} from 'lucide-react'

interface BioMember {
  id: number
  name: string
  gender: string
  birth_date: string | null
  death_date: string | null
  birth_place: string | null
  death_place: string | null
  burial_place: string | null
  migration_note: string | null
  spouse_family_name: string | null
  bio: string | null
  avatar: string | null
  is_alive: boolean
  generation: number | null
  generation_name: string | null
  courtesy_name: string | null
  art_name: string | null
  posthumous_name: string | null
  branch_id: number | null
  parents: BioMember[]
  spouses: BioMember[]
}

interface TimelineEntry {
  key: string
  date: string
  text: string
  major: boolean
}

export default function MemberBiographyPage() {
  const { id, memberId } = useParams<{ id: string; memberId: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const familyId = Number(id)
  const mId = Number(memberId)

  const [member, setMember] = useState<BioMember | null>(null)
  const [family, setFamily] = useState<{ name: string; surname: string | null } | null>(null)
  const [children, setChildren] = useState<BioMember[]>([])
  const [honors, setHonors] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const [memberRes, familyRes, treeRes, honorsRes, eventsRes, branchesRes] = await Promise.all([
          api.getMember(familyId, mId),
          api.getFamily(familyId),
          api.getFamilyTree(familyId).catch(() => ({ nodes: [], edges: [] })),
          api.listHonors(familyId).catch(() => ({ honors: [] })),
          api.getEvents(familyId).catch(() => ({ events: [] })),
          api.getBranches(familyId).catch(() => []),
        ])
        if (!alive) return
        const m = memberRes.member
        setMember(m)
        setFamily(familyRes.family || familyRes)
        setHonors(honorsRes.honors || [])
        setEvents(eventsRes.events || [])
        const bList = Array.isArray(branchesRes) ? branchesRes : (branchesRes as any)?.branches || []
        setBranches(bList)

        // 子女：从世系 edges 计算（source = 本人，type = parent → target 为子女）
        const edges = (treeRes as any)?.edges || []
        const nodes = (treeRes as any)?.nodes || []
        const childIds = edges
          .filter((e: any) => e.type === 'parent' && e.source === mId)
          .map((e: any) => e.target)
        setChildren(nodes.filter((n: any) => childIds.includes(n.id)) as BioMember[])
      } catch (err: any) {
        if (alive) showToast(err.message || '加载传记失败', 'error')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [familyId, mId])

  // 生平年表：出生 → 荣誉 → 在世期间家族大事 → 逝世，按时间排序
  const timeline = useMemo<TimelineEntry[]>(() => {
    if (!member) return []
    const list: TimelineEntry[] = []
    if (member.birth_date) {
      list.push({ key: 'birth', date: String(member.birth_date), text: '降生', major: true })
    }
    for (const h of honors) {
      if (h.member_id !== member.id) continue
      list.push({
        key: `honor-${h.id}`,
        date: h.year ? `${h.year} 年` : '年份不详',
        text: `荣膺「${h.title}」${h.awarder ? ` · ${h.awarder}` : ''}`,
        major: true,
      })
    }
    const birth = member.birth_date ? String(member.birth_date) : null
    const death = member.death_date ? String(member.death_date) : null
    for (const ev of events) {
      const d = ev.event_date ? String(ev.event_date) : null
      if (!d) continue
      if (birth && d < birth) continue
      if (death && d > death) continue
      list.push({ key: `event-${ev.id}`, date: d, text: `家族纪事 · ${ev.title}`, major: false })
    }
    if (member.death_date) {
      list.push({ key: 'death', date: String(member.death_date), text: '辞世', major: true })
    }
    return list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  }, [member, honors, events])

  // 字号/号/谥号组合
  const styleNames = useMemo(() => {
    if (!member) return []
    const items: Array<{ label: string; value: string }> = []
    if (member.courtesy_name) items.push({ label: '字', value: member.courtesy_name })
    if (member.art_name) items.push({ label: '号', value: member.art_name })
    if (member.posthumous_name) items.push({ label: '谥', value: member.posthumous_name })
    return items
  }, [member])

  const branchName = useMemo(() => {
    if (!member?.branch_id) return null
    const b = branches.find((x: any) => x.id === member.branch_id)
    return b?.name || null
  }, [member, branches])

  // 配偶去重（数据里可能出现本人），排除自身
  const spouses = useMemo(
    () => (member?.spouses || []).filter((s) => s.id !== member?.id),
    [member]
  )

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="加载中" />
        </div>
      </Layout>
    )
  }

  if (!member) {
    return (
      <Layout>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <ScrollText className="mx-auto h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
          <p className="pg-title mt-4 text-lg text-muted-foreground">此卷未寻</p>
          <p className="mt-1 text-sm text-muted-foreground">未能找到这位族人的传记</p>
          <button
            onClick={() => smartBack(navigate, `/family/${familyId}`)}
            className="pg-bio-back mt-6"
          >
            <ArrowLeft aria-hidden="true" /> 返回族谱
          </button>
        </div>
      </Layout>
    )
  }

  const isFemale = member.gender === 'female'
  const lifeSpan = member.birth_date
    ? `${member.birth_date}${member.death_date ? ` — ${member.death_date}` : ' — 今'}`
    : null

  return (
    <Layout>
      <div className="pg-bio-root mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <button
          onClick={() => smartBack(navigate, `/family/${familyId}/member/${mId}`)}
          className="pg-bio-back"
        >
          <ArrowLeft aria-hidden="true" /> 返回成员详情
        </button>

        <PgPageHead
          eyebrow="谱 牒 · 行 状"
          title={<><span className="pg-bio-head-name">{member.name}</span> 行状</>}
          subtitle={`${family?.name || '家族'} · 第 ${member.generation ?? '—'} 世${member.generation_name ? ` · ${member.generation_name}字辈` : ''}`}
          actions={
            <span className="pg-bio-head-seal" style={{ borderColor: `color-mix(in srgb, ${PG_RED} 50%, transparent)` }}>
              谱
            </span>
          }
        />

        <div className="pg-bio-grid">
          {/* ── 主卷：行状正文 ── */}
          <div className="pg-bio-main">
            <article className="pg-bio-scroll">
              {/* 卷轴轴头装饰 */}
              <div className="pg-bio-scroll-rod" aria-hidden="true" />

              {/* 卷首：名讳 + 名印 + 字号 */}
              <header className="pg-bio-hero">
                <div className="pg-bio-hero-left">
                  <span className="pg-bio-eyebrow">家 传 · 行 状</span>
                  <h2 className="pg-bio-name">{member.name}</h2>
                  {styleNames.length > 0 && (
                    <div className="pg-bio-style-names">
                      {styleNames.map((s) => (
                        <span key={s.label}>
                          <b>{s.label}</b> {s.value}
                        </span>
                      ))}
                    </div>
                  )}
                  {lifeSpan && <div className="pg-bio-lifespan">{lifeSpan}</div>}
                </div>
                <div className="pg-bio-hero-right">
                  <div className="pg-bio-portrait">
                    <AvatarDisplay avatar={member.avatar} name={member.name} size={92} lazy={false} />
                  </div>
                  <div className="pg-bio-name-seal">
                    <PgSeal char={member.name.slice(0, 1)} size={60} title={`名印 · ${member.name}`} />
                  </div>
                </div>
              </header>

              {/* 版刻信息行 */}
              <div className="pg-bio-meta">
                <PgColophon
                  items={[
                    ['名讳', member.name],
                    ['性别', isFemale ? '女' : member.gender === 'male' ? '男' : '未详'],
                    ['行辈', member.generation_name ? `第${member.generation}世 · ${member.generation_name}` : (member.generation ? `第${member.generation}世` : '未详')],
                    ['籍贯', member.birth_place || '未详'],
                    ...(branchName ? [['房支', branchName] as [string, string]] : []),
                    ...(member.spouse_family_name ? [['适', member.spouse_family_name] as [string, string]] : []),
                  ]}
                />
              </div>

              {/* 生平正文 */}
              <section className="pg-bio-body-section">
                <div className="pg-bio-section-mark">
                  <PgSectionHead text="生 平 纪 略" />
                </div>
                {member.bio ? (
                  <div className="pg-bio-prose">
                    <RichTextRenderer
                      html={/<[a-z][\s\S]*>/i.test(member.bio) ? member.bio : `<p>${member.bio}</p>`}
                    />
                  </div>
                ) : (
                  <div className="pg-bio-empty-prose">
                    <p className="pg-bio-empty-glyph" aria-hidden="true">阙</p>
                    <p>生平未详，待后人补述。</p>
                  </div>
                )}
              </section>

              {/* 补充纪事：迁徙 / 葬地 */}
              {(member.migration_note || member.burial_place || member.death_place) && (
                <section className="pg-bio-extra">
                  {member.migration_note && (
                    <div className="pg-bio-extra-item">
                      <GitBranch className="pg-bio-extra-icon" aria-hidden="true" />
                      <div>
                        <span className="pg-bio-extra-label">迁徙</span>
                        <p>{member.migration_note}</p>
                      </div>
                    </div>
                  )}
                  {member.death_place && (
                    <div className="pg-bio-extra-item">
                      <MapPin className="pg-bio-extra-icon" aria-hidden="true" />
                      <div>
                        <span className="pg-bio-extra-label">辞世之地</span>
                        <p>{member.death_place}</p>
                      </div>
                    </div>
                  )}
                  {member.burial_place && (
                    <div className="pg-bio-extra-item">
                      <BookOpenText className="pg-bio-extra-icon" aria-hidden="true" />
                      <div>
                        <span className="pg-bio-extra-label">葬地</span>
                        <p>{member.burial_place}</p>
                      </div>
                    </div>
                  )}
                </section>
              )}

              <div className="pg-bio-scroll-rod pg-bio-scroll-rod-bottom" aria-hidden="true" />
            </article>
          </div>

          {/* ── 侧考：年表 + 亲属 ── */}
          <aside className="pg-bio-side">
            {/* 年表 */}
            <section className="pg-bio-panel">
              <div className="pg-bio-panel-head">
                <Calendar className="pg-bio-panel-icon" aria-hidden="true" />
                <PgSectionHead text="生 平 年 表" />
              </div>
              {timeline.length > 0 ? (
                <ol className="pg-bio-timeline">
                  {timeline.map((t) => (
                    <li key={t.key} className={t.major ? 'is-major' : ''}>
                      <span className="pg-bio-timeline-dot" aria-hidden="true" />
                      <div className="pg-bio-timeline-date">{t.date}</div>
                      <div className="pg-bio-timeline-text">{t.text}</div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="pg-bio-panel-empty">年表未详</p>
              )}
            </section>

            {/* 亲属 */}
            <section className="pg-bio-panel">
              <div className="pg-bio-panel-head">
                <Users className="pg-bio-panel-icon" aria-hidden="true" />
                <PgSectionHead text="亲 属 谱 系" />
              </div>
              <div className="pg-bio-relatives">
                <RelativeGroup label="先考妣" people={member.parents} navigate={(p) => navigate(`/family/${familyId}/member/${p.id}`)} />
                <RelativeGroup label="配偶" people={spouses} navigate={(p) => navigate(`/family/${familyId}/member/${p.id}`)} />
                <RelativeGroup label="子嗣" people={children} navigate={(p) => navigate(`/family/${familyId}/member/${p.id}`)} />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </Layout>
  )
}

function RelativeGroup({
  label,
  people,
  navigate,
}: {
  label: string
  people: BioMember[]
  navigate: (p: BioMember) => void
}) {
  if (!people || people.length === 0) return null
  return (
    <div className="pg-bio-rel-group">
      <div className="pg-bio-rel-label">{label}</div>
      <div className="pg-bio-rel-list">
        {people.map((p) => (
          <button key={p.id} className="pg-bio-rel-person" onClick={() => navigate(p)}>
            <AvatarDisplay avatar={p.avatar} name={p.name} size={28} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
