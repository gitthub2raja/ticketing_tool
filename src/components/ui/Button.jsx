import { useSound } from '../../utils/soundEffects'

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  disabled = false,
  onClick,
  type = 'button',
  playSound = true,
  ...props 
}) => {
  const { playClick, playConfirm, playError } = useSound()
  
  const baseClasses = 'btn'
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    outline: 'btn-outline',
  }
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3',
    lg: 'px-8 py-4 text-lg',
  }

  const handleClick = (e) => {
    if (disabled) return
    
    if (playSound) {
      if (variant === 'danger') {
        playError()
      } else if (variant === 'primary') {
        playConfirm()
      } else {
        playClick()
      }
    }
    
    if (onClick) {
      onClick(e)
    }
  }

  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={disabled}
      onClick={handleClick}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </button>
  )
}
