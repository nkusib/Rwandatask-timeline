import Link from 'next/link'
import { CheckCircle, Zap, Users, BarChart3, Shield, Globe, ArrowRight, Star } from 'lucide-react'

const PLANS = [
  {
    name: 'Free',
    price: 0,
    description: 'Perfect for personal projects',
    features: ['1 project', '10 tasks', 'Export to JSON', 'Shareable links'],
    cta: 'Get started free',
    href: '/auth/register',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 19,
    description: 'For serious project managers',
    features: [
      'Unlimited projects',
      'Unlimited tasks',
      'CSV & PDF export',
      'Custom colors & themes',
      'Priority support',
      'No TaskTimeline branding',
    ],
    cta: 'Start 14-day free trial',
    href: '/auth/register?plan=pro',
    highlight: true,
    badge: 'Most popular',
  },
  {
    name: 'Team',
    price: 49,
    description: 'For growing teams',
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Real-time collaboration',
      'Comments & mentions',
      'Role-based permissions',
      'Activity log',
    ],
    cta: 'Start 14-day free trial',
    href: '/auth/register?plan=team',
    highlight: false,
  },
  {
    name: 'Business',
    price: 199,
    description: 'For large organizations',
    features: [
      'Everything in Team',
      'Unlimited team members',
      'SSO / SAML',
      'REST API access',
      'White-label option',
      'Dedicated account manager',
      'SLA guarantee',
    ],
    cta: 'Contact sales',
    href: '/auth/register?plan=business',
    highlight: false,
  },
]

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Visual Gantt Timelines',
    desc: 'See every task on a color-coded timeline. Drag to reschedule, click to edit. Your entire project at a glance.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    desc: 'Invite teammates, assign owners, leave comments, and track progress together in real time.',
  },
  {
    icon: Zap,
    title: 'Blazing Fast',
    desc: 'No bloat. No 50-tab learning curve. You are up and running in under 2 minutes, guaranteed.',
  },
  {
    icon: Globe,
    title: 'Share Anywhere',
    desc: 'One link shares your entire timeline, read-only or editable. Works in Google Sites, Notion, and Confluence.',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    desc: 'Your data is encrypted at rest and in transit. GDPR compliant. We never sell your data.',
  },
  {
    icon: BarChart3,
    title: 'Export Everything',
    desc: 'CSV, PDF, PNG, or JSON — take your data anywhere, any time. No lock-in, ever.',
  },
]

const TESTIMONIALS = [
  {
    name: 'Sarah Chen',
    role: 'Engineering Manager @ Stripe',
    avatar: 'SC',
    quote: 'TaskTimeline replaced our $500/month project management tool. The team was up and running in an hour. Absolutely love it.',
  },
  {
    name: 'Marcus Johnson',
    role: 'Product Director @ Shopify',
    avatar: 'MJ',
    quote: 'The cleanest Gantt tool I have ever used. No bloat, no endless settings — just a beautiful timeline that actually makes sense.',
  },
  {
    name: 'Aisha Kamara',
    role: 'Founder @ BuildFast',
    avatar: 'AK',
    quote: 'I moved my entire agency of 12 people onto this. Clients love the shared links. We cut our status-meeting time in half.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">TaskTimeline Pro</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#features" className="hover:text-gray-900">Features</a>
            <a href="#pricing" className="hover:text-gray-900">Pricing</a>
            <a href="#testimonials" className="hover:text-gray-900">Testimonials</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900 font-medium">
              Sign in
            </Link>
            <Link href="/auth/register" className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            <span>New — AI-powered task suggestions in Pro</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight mb-6">
            Project timelines your{' '}
            <span className="gradient-text">team will actually use</span>
          </h1>
          <p className="text-xl text-gray-500 mb-8 max-w-2xl mx-auto leading-relaxed">
            The simplest, most beautiful Gantt chart tool for modern teams.
            Plan your work, track progress, and share with stakeholders — all in one gorgeous timeline.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200"
            >
              Start for free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/register?plan=pro"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors"
            >
              Try Pro free for 14 days
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-400">No credit card required. Cancel anytime.</p>
        </div>

        {/* Mock product screenshot */}
        <div className="max-w-6xl mx-auto mt-16 rounded-2xl border border-gray-200 shadow-2xl shadow-gray-100 overflow-hidden">
          <div className="bg-gray-800 px-4 py-2.5 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span className="ml-3 text-gray-400 text-xs">tasktimeline.pro/dashboard</span>
          </div>
          <div className="bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-semibold text-gray-900">Q3 Product Launch</div>
                <div className="text-xs text-gray-400">8 tasks · 3 members</div>
              </div>
              <div className="flex gap-2">
                <span className="px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">In Progress</span>
                <span className="px-2 py-1 rounded-full text-xs bg-amber-50 text-amber-700 border border-amber-200">Planned</span>
                <span className="px-2 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">Done</span>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { title: 'Market research', owner: 'Sarah', w: '20%', l: '0%', color: 'bg-emerald-100 border-emerald-200', status: 'Done' },
                { title: 'Competitive analysis', owner: 'Marcus', w: '25%', l: '18%', color: 'bg-emerald-100 border-emerald-200', status: 'Done' },
                { title: 'Feature specification', owner: 'Sarah', w: '30%', l: '20%', color: 'bg-blue-100 border-blue-200', status: 'In Progress' },
                { title: 'Design system', owner: 'Aisha', w: '35%', l: '30%', color: 'bg-blue-100 border-blue-200', status: 'In Progress' },
                { title: 'Backend API', owner: 'Marcus', w: '40%', l: '38%', color: 'bg-amber-100 border-amber-200', status: 'Planned' },
                { title: 'Frontend build', owner: 'Aisha', w: '35%', l: '50%', color: 'bg-amber-100 border-amber-200', status: 'Planned' },
                { title: 'QA testing', owner: 'Sarah', w: '20%', l: '70%', color: 'bg-amber-100 border-amber-200', status: 'Planned' },
                { title: 'Launch & monitor', owner: 'Marcus', w: '15%', l: '85%', color: 'bg-amber-100 border-amber-200', status: 'Planned' },
              ].map((task, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-40 shrink-0">
                    <div className="text-xs font-medium text-gray-800 truncate">{task.title}</div>
                    <div className="text-[11px] text-gray-400">{task.owner}</div>
                  </div>
                  <div className="flex-1 relative h-7 bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                    <div
                      className={`absolute inset-y-1 rounded-md border ${task.color} flex items-center px-2`}
                      style={{ left: task.l, width: task.w }}
                    >
                      <span className="text-[10px] font-medium truncate">{task.title}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="py-10 border-y border-gray-100 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-400 mb-6">Trusted by 5,000+ project managers worldwide</p>
          <div className="flex flex-wrap justify-center items-center gap-8 text-gray-400 text-sm font-medium">
            {['Acme Inc', 'TechCorp', 'Startup XYZ', 'Design Co', 'Agency Pro', 'ScaleUp'].map(c => (
              <span key={c} className="opacity-50 hover:opacity-100 transition-opacity">{c}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything you need, nothing you don&apos;t</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Built for the way real teams work. Powerful enough for complex projects, simple enough for daily standups.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-50 transition-all">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-xl text-gray-500">Start free. Upgrade when you need more. Cancel anytime.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative p-6 rounded-2xl border bg-white flex flex-col ${
                  plan.highlight ? 'border-brand-400 shadow-xl shadow-brand-100 ring-2 ring-brand-400' : 'border-gray-200'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-brand-600 text-white text-xs font-semibold">
                    {plan.badge}
                  </div>
                )}
                <div className="mb-4">
                  <div className="font-bold text-gray-900 text-lg">{plan.name}</div>
                  <div className="text-sm text-gray-500 mt-1">{plan.description}</div>
                </div>
                <div className="mb-6">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-bold text-gray-900">Free</span>
                  ) : (
                    <div>
                      <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                      <span className="text-gray-400 text-sm">/month</span>
                    </div>
                  )}
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold text-center transition-colors ${
                    plan.highlight
                      ? 'bg-brand-600 text-white hover:bg-brand-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Teams love TaskTimeline</h2>
            <div className="flex items-center justify-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-gray-500">4.9/5 from 1,200+ reviews</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="p-6 rounded-2xl border border-gray-100 bg-white">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 text-sm leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-gray-900">{t.name}</div>
                    <div className="text-xs text-gray-400">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-brand-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to plan smarter?</h2>
          <p className="text-brand-100 text-xl mb-8">
            Join 5,000+ teams using TaskTimeline Pro. Free forever plan, no credit card needed.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-brand-700 font-bold text-lg hover:bg-brand-50 transition-colors shadow-lg"
          >
            Get started for free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm">TaskTimeline Pro</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-gray-700">Privacy</a>
            <a href="#" className="hover:text-gray-700">Terms</a>
            <a href="#" className="hover:text-gray-700">Contact</a>
          </div>
          <p className="text-sm text-gray-400">&copy; 2025 TaskTimeline Pro. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
