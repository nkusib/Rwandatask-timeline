import type { Variants } from 'framer-motion'

export const slideVariants: Variants = {
  enter: (dir: number) => ({ x: dir > 0 ? '40%' : '-40%', opacity: 0 }),
  center: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 340, damping: 32, opacity: { duration: 0.18 } },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? '-25%' : '25%',
    opacity: 0,
    transition: { duration: 0.18, ease: [0.4, 0, 1, 1] },
  }),
}

export const slideUpVariants: Variants = {
  hidden: { y: '100%', opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 280, damping: 30 },
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: { duration: 0.22, ease: [0.4, 0, 1, 1] },
  },
}

export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  },
}

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 380, damping: 28 },
  },
}

export const cardHoverProps = {
  whileHover: { y: -2, boxShadow: '0 10px 40px rgba(0,0,0,0.40)', transition: { duration: 0.18 } },
  whileTap: { scale: 0.985, transition: { duration: 0.1 } },
}

export const buttonTapProps = {
  whileTap: { scale: 0.965, transition: { duration: 0.1 } },
}
