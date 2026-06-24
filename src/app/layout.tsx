import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'TaskTimeline Pro — Visual Project Planning',
  description: 'The most intuitive Gantt-style timeline for teams. Plan, track, and collaborate on any project — beautifully.',
  keywords: 'project management, gantt chart, timeline, task management, team collaboration',
  openGraph: {
    title: 'TaskTimeline Pro',
    description: 'Visual project timelines for modern teams',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  )
}
