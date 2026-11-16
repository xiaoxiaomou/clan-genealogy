import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '@/lib/api'
import {
  Button,
  Input,
  Label,
  Modal,
  useToast,
} from '@/components/ui'
import { PgPageHead, PgSectionHead, PG_RED } from '@/components/ui/pedigree'
import { Layout } from '@/components/layout/Layout'
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react'

/* ═══ 谱局 · 待办 —— 修谱任务清单 ═══ */

interface TaskItem {
  id: number
  title: string
  detail: string | null
  assignee_id: number | null
  assignee_name: string | null
  status: 'open' | 'done'
  due_date: string | null
  done_at: string | null
}

export default function TasksPage() {
  const { id } = useParams<{ id: string }>()
  const familyId = Number(id)
  const { showToast } = useToast()
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', detail: '', assignee_id: '', due_date: '' })
  const [processing, setProcessing] = useState(false)

  const load = useCallback(async () => {
    if (!familyId) return
    setLoading(true)
    try {
      const r = await api.listTasks(familyId)
      setTasks(r.tasks || [])
    } catch (err: any) {
      showToast(err.message || '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [familyId, showToast])

  useEffect(() => {
    load()
  }, [load])

  const openTasks = tasks.filter((t) => t.status === 'open')
  const doneTasks = tasks.filter((t) => t.status === 'done')

  const handleCreate = async () => {
    if (!form.title.trim()) {
      showToast('请填写待办标题', 'error')
      return
    }
    setProcessing(true)
    try {
      await api.createTask(familyId, {
        title: form.title,
        detail: form.detail || undefined,
        assignee_id: form.assignee_id || undefined,
        due_date: form.due_date || undefined,
      })
      showToast('待办已创建', 'success')
      setShowForm(false)
      setForm({ title: '', detail: '', assignee_id: '', due_date: '' })
      load()
    } catch (err: any) {
      showToast(err.message || '创建失败', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const toggleDone = async (t: TaskItem) => {
    try {
      await api.updateTask(familyId, t.id, { status: t.status === 'done' ? 'open' : 'done' })
      load()
    } catch (err: any) {
      showToast(err.message || '操作失败', 'error')
    }
  }

  const handleDelete = async (t: TaskItem) => {
    try {
      await api.deleteTask(familyId, t.id)
      showToast('待办已删除', 'success')
      load()
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error')
    }
  }

  const renderTask = (t: TaskItem) => (
    <div key={t.id} className="flex items-start gap-3 rounded-md border px-3 py-2.5" style={{ borderColor: 'hsl(var(--border))' }}>
      <button
        onClick={() => toggleDone(t)}
        className="mt-0.5 shrink-0"
        aria-label={t.status === 'done' ? '标记未完成' : '标记完成'}
      >
        {t.status === 'done' ? (
          <CheckCircle2 className="h-5 w-5" style={{ color: PG_RED }} />
        ) : (
          <Circle className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${t.status === 'done' ? 'text-muted-foreground line-through' : ''}`}>
          {t.title}
        </p>
        {t.detail && <p className="mt-0.5 text-xs text-muted-foreground">{t.detail}</p>}
        <p className="mt-1 text-[10px] text-muted-foreground">
          {t.assignee_name ? `负责人 ${t.assignee_name} · ` : ''}
          {t.due_date ? `截止 ${t.due_date}` : ''}
        </p>
      </div>
      {t.status === 'done' && (
        <button
          onClick={() => handleDelete(t)}
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
          aria-label="删除待办"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )

  return (
    <Layout>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 pg-rise">
        <PgPageHead
          eyebrow="谱 局 · 待 办"
          title="修谱待办"
          subtitle="资料补齐、校对、联络——修谱事务逐条清账"
          actions={
            <Button onClick={() => setShowForm(true)} className="gap-1">
              <Plus className="h-4 w-4" aria-hidden="true" />
              新建待办
            </Button>
          }
        />

        {loading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">加载中…</p>
        ) : tasks.length === 0 ? (
          <div className="pg-card py-16 text-center">
            <p className="text-sm text-muted-foreground">暂无待办事项</p>
          </div>
        ) : (
          <>
            <div>
              <PgSectionHead text="未 完 成" right={<span className="text-xs text-muted-foreground">{openTasks.length} 项</span>} />
              <div className="space-y-2">{openTasks.map(renderTask)}</div>
            </div>
            {doneTasks.length > 0 && (
              <div className="opacity-70">
                <PgSectionHead text="已 完 成" right={<span className="text-xs text-muted-foreground">{doneTasks.length} 项</span>} />
                <div className="space-y-2">{doneTasks.map(renderTask)}</div>
              </div>
            )}
          </>
        )}

        {showForm && (
          <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="新建待办">
            <div className="space-y-4">
              <div>
                <Label>待办标题 *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="如：找三叔公核对生卒年月"
                  autoFocus
                />
              </div>
              <div>
                <Label>详情</Label>
                <Input
                  value={form.detail}
                  onChange={(e) => setForm({ ...form, detail: e.target.value })}
                  placeholder="补充说明（可选）"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>负责人</Label>
                  <Input
                    value={form.assignee_id}
                    onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}
                    placeholder="族人用户 id（可选）"
                  />
                </div>
                <div>
                  <Label>截止日期</Label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>取消</Button>
                <Button onClick={handleCreate} disabled={processing}>创建</Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  )
}
