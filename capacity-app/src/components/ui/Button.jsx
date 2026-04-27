import { forwardRef } from 'react'
import { addRipple } from '../../utils/capacityUtils'

const Button = forwardRef(({ children, className = '', onClick, ...rest }, ref) => {
  const handle = (e) => {
    addRipple(e)
    onClick?.(e)
  }
  return (
    <button ref={ref} className={`btn ${className}`} onClick={handle} {...rest}>
      {children}
    </button>
  )
})

Button.displayName = 'Button'
export default Button
