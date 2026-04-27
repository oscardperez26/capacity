import { motion, AnimatePresence } from 'framer-motion'
import Button from './Button'

export default function Modal({ open, onClose, iconCls, icon, title, desc, actions, wide, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal"
            style={wide ? { maxWidth: 560 } : {}}
            initial={{ opacity: 0, scale: 0.88, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {iconCls && <div className={`modal-icon ${iconCls}`}>{icon}</div>}
            {title && <h3 className="modal-title">{title}</h3>}
            {desc && <p className="modal-desc">{desc}</p>}
            {children}
            {actions && <div className="modal-actions">{actions}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
