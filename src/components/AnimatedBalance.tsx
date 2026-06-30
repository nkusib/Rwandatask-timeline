'use client'
import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'

interface Props {
  amount: number
  symbol: string
  currency: string
  label?: string
}

export function AnimatedBalance({ amount, symbol, label = 'Available balance' }: Props) {
  const [display, setDisplay] = useState(0)
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true
    const controls = animate(0, amount, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: v => setDisplay(v),
    })
    return () => controls.stop()
  }, [amount])

  return (
    <>
      <div
        className="font-bold text-white mb-1"
        style={{ fontSize: 'clamp(42px,10vw,64px)', lineHeight: '1.05', letterSpacing: '-0.03em' }}
      >
        {symbol}
        {display.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className="text-white/35 text-sm mb-5">{label}</div>
    </>
  )
}
