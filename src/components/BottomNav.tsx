'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, LayoutGroup } from 'framer-motion'
import { Home, Send, Users, BarChart2, User } from 'lucide-react'

const NAV_ITEMS = [
  { icon: Home,     label: 'Home',       href: '/dashboard',  matchPrefix: '/dashboard' },
  { icon: Send,     label: 'Send',       href: '/send',       matchPrefix: '/send' },
  { icon: Users,    label: 'Recipients', href: '/recipients', matchPrefix: '/recipients' },
  { icon: BarChart2,label: 'Rates',      href: '/send',       matchPrefix: null },
  { icon: User,     label: 'Profile',    href: '/settings',   matchPrefix: '/settings' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-6 left-4 right-4 z-50 md:hidden">
      <LayoutGroup>
        <div className="rounded-full flex items-center justify-around py-3 px-4 glass-pill-nav">
          {NAV_ITEMS.map(({ icon: Icon, label, href, matchPrefix }) => {
            const isActive = matchPrefix ? pathname.startsWith(matchPrefix) : false
            return (
              <Link
                key={label}
                href={href}
                className="relative flex flex-col items-center gap-1 px-3 py-1.5 rounded-full z-0"
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.15)' }}
                    transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                  />
                )}
                <Icon
                  className="w-[18px] h-[18px] relative z-10 transition-colors"
                  style={{ color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)' }}
                />
                <span
                  className="text-[10px] font-medium relative z-10 transition-colors"
                  style={{ color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)' }}
                >
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </LayoutGroup>
    </div>
  )
}
