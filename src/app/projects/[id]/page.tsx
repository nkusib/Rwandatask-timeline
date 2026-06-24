'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Plus, Trash2, Edit3, CheckCircle2, Clock, AlertTriangle,
  BarChart3, Share2, Download, Copy
} from 'lucide-react'

type Task = {
  id: string
  title: string
  owner: string
  start_date: string
  end_date: string | null
  status: 'Planned' | 'In Progress' | 'Blocked' | 'Done'
  notes: string
}

type Project = {
  id: string
  name: string
  description: string
  color: string
}

const STATUSES = ['Planned', 'In Progress', 'Blocked', 'Done'] as const
const STATUS_STYLES: Record<string, string> = {
  'Done': 'bg-emerald-100 border-emerald-200 text-emerald-800',
  'In Progress': 'bg-blue-100 border-blue-200 text-blue-800',
  'Blocked': 'bg-rose-100 border-rose-200 text-rose-800',
  'Planned': 'bg-amber-100 border-amber-200 text-amber-800',
}
const BAR_STYLES: Record<string, string> = {
  'Done': 'bg-emerald-100 border-emerald-200',
  'In Progress': 'bg-blue-100 border-blue-200',
  'Blocked': 'bg-rose-100 border-rose-200',
  'Planned': 'bg-amber-100 border-amber-200',
}

function dateOnly(d: Date | string) {
  const dt = new Date(d)
  return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`
}
function addDays(d: string, n: number) {
  const dt = new Date(d); dt.setDate(dt.getDate()+n); return dateOnly(dt)
}
function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

type FormState = { id: string; title: string; owner: string; start_date: string; end_date: string; status: 'Planned' | 'In Progress' | 'Blocked' | 'Done'; notes: string }
const emptyForm: FormState = { id: '', title: '', owner: '', start_date: '', end_date: '', status: 'Planned', notes: '' }

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [filters, setFilters] = useState({ status: 'All', q: '' })
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => r.json())
      .then(d => { setProject(d.project); setTasks(d.tasks) })
      .catch(() => router.push('/dashboard'))
  }, [id, router])

  const filtered = useMemo(() => tasks.filter(t => {
    const statusOk = filters.status === 'All' || t.status === filters.status
    const q = filters.q.toLowerCase()
    return statusOk && (!q || [t.title, t.owner, t.notes].some(x => x?.toLowerCase().includes(q)))
  }), [tasks, filters])

  const bounds = useMemo(() => {
    if (!filtered.length) {
      const t = dateOnly(new Date())
      return { start: addDays(t, -2), end: addDays(t, 30) }
    }
    let min = filtered[0].start_date, max = filtered[0].end_date || filtered[0].start_date
    for (const t of filtered) {
      if (t.start_date < min) min = t.start_date
      const e = t.end_date || t.start_date
      if (e > max) max = e
    }
    return { start: addDays(min, -2), end: addDays(max, 4) }
  }, [filtered])

  const days = useMemo(() => {
    const n = Math.max(1, daysBetween(bounds.start, bounds.end))
    return Array.from({ length: n+1 }, (_, i) => addDays(bounds.start, i))
  }, [bounds])

  function openCreate() { setForm({ ...emptyForm, start_date: dateOnly(new Date()), end_date: addDays(dateOnly(new Date()), 7) }); setShowForm(true) }
  function openEdit(t: Task) { setForm({ ...t, end_date: t.end_date || '' }); setShowForm(true) }

  async function saveTask(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSaving(true)
    try {
      const method = form.id ? 'PUT' : 'POST'
      const res = await fetch(`/api/projects/${id}/tasks`, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      if (form.id) {
        setTasks(prev => prev.map(t => t.id === form.id ? { ...form } : t))
      } else {
        setTasks(prev => [...prev, data.task])
      }
      setShowForm(false); setForm(emptyForm)
    } catch { setError('Network error') }
    finally { setSaving(false) }
  }

  async function deleteTask(taskId: string) {
    if (!confirm('Delete this task?')) return
    await fetch(`/api/projects/${id}/tasks`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ taskId })
    })
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  function exportCSV() {
    const rows = [['Title', 'Owner', 'Start', 'End', 'Status', 'Notes'], ...tasks.map(t => [t.title, t.owner, t.start_date, t.end_date||'', t.status, t.notes])]
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`; a.download = `${project?.name}-tasks.csv`; a.click()
  }

  function copyShareLink() {
    const data = encodeURIComponent(btoa(JSON.stringify({ project, tasks })))
    navigator.clipboard.writeText(`${window.location.origin}/projects/${id}?data=${data}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  if (!project) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>

  const done = tasks.filter(t => t.status === 'Done').length
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/dashboard" className="text-gray-400 hover:text-gray-700 shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-7 h-7 rounded-lg shrink-0" style={{ backgroundColor: project.color }}></div>
            <h1 className="font-semibold text-gray-900 truncate">{project.name}</h1>
            {project.description && <span className="text-gray-400 text-sm hidden md:block truncate">— {project.description}</span>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={exportCSV} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={copyShareLink} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs hover:bg-gray-50">
              {copied ? <><Copy className="w-3.5 h-3.5" /> Copied!</> : <><Share2 className="w-3.5 h-3.5" /> Share</>}
            </button>
            <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors">
              <Plus className="w-4 h-4" /> Task
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Progress bar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium text-gray-700">{tasks.length} tasks · {done} done</span>
              <span className="font-semibold text-gray-900">{pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: project.color }}></div>
            </div>
          </div>
          <div className="flex gap-2">
            {(['Done', 'In Progress', 'Blocked', 'Planned'] as const).map(s => {
              const count = tasks.filter(t => t.status === s).length
              return (
                <div key={s} className="text-center hidden sm:block">
                  <div className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_STYLES[s]}`}>{s.split(' ')[0]}</div>
                  <div className="text-xs font-semibold text-gray-700 mt-0.5">{count}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <select
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white"
          >
            {['All', ...STATUSES].map(s => <option key={s}>{s}</option>)}
          </select>
          <input
            value={filters.q}
            onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
            placeholder="Search tasks…"
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white flex-1 min-w-[160px]"
          />
          <span className="px-3 py-2 text-sm text-gray-400">{filtered.length} shown</span>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <div className="grid" style={{ gridTemplateColumns: `220px repeat(${days.length}, minmax(28px, 1fr))` }}>
              {/* Header row */}
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b bg-gray-50 sticky left-0 z-[2]">Task</div>
              {days.map((d, i) => {
                const isToday = d === dateOnly(new Date())
                const isWeekStart = new Date(d).getDay() === 1
                return (
                  <div key={d} className={`px-0.5 py-2 text-[10px] text-center border-b ${isToday ? 'bg-brand-50 text-brand-700 font-bold' : isWeekStart ? 'bg-gray-50 text-gray-500 font-medium' : 'text-gray-400'}`}>
                    {d.slice(5)}
                  </div>
                )
              })}

              {/* Task rows */}
              {filtered.map((t, idx) => {
                const offset = Math.max(0, daysBetween(bounds.start, t.start_date))
                const end = t.end_date || t.start_date
                const span = Math.max(1, daysBetween(t.start_date, end) + 1)
                const isLast = idx === filtered.length - 1

                return [
                  <div key={t.id + '_info'} className={`px-3 py-2.5 border-t flex items-start gap-2 sticky left-0 bg-white z-[1] ${isLast ? 'rounded-bl-2xl' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900 truncate">{t.title}</div>
                      <div className="text-xs text-gray-400">{t.owner}</div>
                    </div>
                    <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full border ${STATUS_STYLES[t.status]}`}>
                      {t.status === 'In Progress' ? 'WIP' : t.status.charAt(0)}
                    </span>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(t)} className="text-gray-300 hover:text-gray-600 p-0.5">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteTask(t.id)} className="text-gray-300 hover:text-red-500 p-0.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>,
                  ...days.map((d, i) => {
                    const isToday = d === dateOnly(new Date())
                    return (
                      <div key={d + t.id} className={`relative border-t ${isToday ? 'bg-brand-50/30' : i % 7 === 0 ? 'bg-gray-50/50' : ''}`}>
                        {i === offset && (
                          <div
                            className={`absolute inset-y-1.5 rounded-lg border shadow-sm flex items-center px-1.5 overflow-hidden cursor-pointer ${BAR_STYLES[t.status]}`}
                            style={{ left: '2px', width: `calc(${span * 100}% - 4px)`, position: 'absolute' }}
                            onClick={() => openEdit(t)}
                          >
                            <span className="text-[10px] font-medium truncate">{t.title}</span>
                          </div>
                        )}
                      </div>
                    )
                  })
                ]
              })}

              {filtered.length === 0 && (
                <>
                  <div className="px-3 py-8 text-sm text-gray-400 text-center col-span-1">
                    No tasks match your filters.
                  </div>
                  <div className="border-t" style={{ gridColumn: `2 / ${days.length + 2}` }}></div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Task Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-50" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-900">{form.id ? 'Edit task' : 'New task'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700 text-sm">Close</button>
            </div>
            <form onSubmit={saveTask} className="p-5 space-y-4">
              {error && <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Title *</label>
                  <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Task name" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Owner *</label>
                  <input required value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" placeholder="Name" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Start date *</label>
                  <input required type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">End date</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 mb-1 block">Notes</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" placeholder="Optional notes…" />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50">
                  {saving ? 'Saving…' : form.id ? 'Update task' : 'Add task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
