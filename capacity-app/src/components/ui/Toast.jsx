import { AnimatePresence, motion } from 'framer-motion'

export default function Toast({ message, type = 'success' }) {
  const bg = type === 'success' ? 'var(--brand-green)' : type === 'danger' ? 'var(--brand-red)' : 'var(--brand-orange)'
  const icon = type === 'success' ? '✓' : '✗'

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10 }}
          style={{
            position: 'fixed', bottom: 22, right: 22, zIndex: 400,
            padding: '11px 18px', borderRadius: 11, background: bg,
            color: 'white', fontWeight: 700, fontSize: 12.5,
            boxShadow: 'var(--s-lg)', fontFamily: 'Outfit, sans-serif',
          }}
        >
          {icon} {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
