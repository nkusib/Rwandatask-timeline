import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { BarChart3, Plus, FolderOpen, Clock, CheckCircle2, AlertCircle, Settings, CreditCard, LogOut } from 'lucide-react'
import { planColor } from '@/lib/utils'

export default async function DashboardPage() {
  const user = await getSession()
  if (!user) redirect('/auth/login')

  const projects = db.prepare(`
    SELECT p.*, COUNT(t.id) as task_count,
      SUM(CASE WHEN t.status = 'Done' THEN 1 ELSE 0 END) as done_count
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    WHERE p.user_id = ?
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `).all(user.id) as any[]

  const totalTasks = (db.prepare(`
    SELECT COUNT(*) as c FROM tasks t
    JOIN projects p ON p.id = t.project_id WHERE p.user_id = ?
  `).get(user.id) as any).c

  const doneTasks = (db.prepare(`
    SELECT COUNT(*) as c FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE p.user_id = ? AND t.status = 'Done'
  `).get(user.id) as any).c

  const inProgress = (db.prepare(`
    SELECT COUNT(*) as c FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE p.user_id = ? AND t.status = 'In Progress'
  `).get(user.id) as any).c

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">TaskTimeline Pro</span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${planColor(user.plan)}`}>
              {user.plan}
            </span>
            <Link href="/billing" className="text-gray-400 hover:text-gray-700">
              <CreditCard className="w-5 h-5" />
            </Link>
            <Link href="/settings" className="text-gray-400 hover:text-gray-700">
              <Settings className="w-5 h-5" />
            </Link>
            <form action="/api/auth/logout" method="POST">
              <button type="submit" className="text-gray-400 hover:text-gray-700">
                <LogOut className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Good morning, {user.name.split(' ')[0]}!</h1>
            <p className="text-gray-500 mt-1">Here&apos;s an overview of all your projects.</p>
          </div>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white font-semibold text-sm hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New project
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Projects', value: projects.length, icon: FolderOpen, color: 'text-brand-600 bg-brand-50' },
            { label: 'Total tasks', value: totalTasks, icon: BarChart3, color: 'text-purple-600 bg-purple-50' },
            { label: 'In progress', value: inProgress, icon: Clock, color: 'text-amber-600 bg-amber-50' },
            { label: 'Completed', value: doneTasks, icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Upgrade banner for free users */}
        {user.plan === 'free' && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-brand-600 to-purple-600 text-white flex items-center justify-between">
            <div>
              <div className="font-semibold">Upgrade to Pro — 14 days free</div>
              <div className="text-sm text-white/80">Unlock unlimited projects, tasks, exports, and more.</div>
            </div>
            <Link href="/billing" className="px-4 py-2 rounded-xl bg-white text-brand-700 font-semibold text-sm hover:bg-brand-50 transition-colors shrink-0">
              Upgrade now
            </Link>
          </div>
        )}

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-200">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-700 mb-2">No projects yet</h3>
            <p className="text-gray-400 text-sm mb-4">Create your first project to get started.</p>
            <Link href="/projects/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700">
              <Plus className="w-4 h-4" /> Create project
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p: any) => {
              const pct = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-brand-200 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: p.color + '20' }}>
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: p.color }}></div>
                    </div>
                    <span className="text-xs text-gray-400">{p.task_count} tasks</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-brand-700 transition-colors">{p.name}</h3>
                  {p.description && <p className="text-xs text-gray-400 mb-3 truncate">{p.description}</p>}
                  <div className="mt-auto">
                    <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                </Link>
              )
            })}
            <Link
              href="/projects/new"
              className="border-2 border-dashed border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center text-gray-400 hover:border-brand-300 hover:text-brand-500 transition-colors min-h-[160px]"
            >
              <Plus className="w-8 h-8 mb-2" />
              <span className="text-sm font-medium">New project</span>
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
