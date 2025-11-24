import { X } from 'lucide-react'
import { Button } from './Button'

export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  footer 
}) => {
  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 transition-opacity bg-cyber-darker/90 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <div className={`inline-block align-bottom card text-left overflow-hidden transform transition-all sm:my-8 sm:align-middle w-full ${sizeClasses[size]} cyber-3d`}>
          <div className="px-6 pt-6 pb-4 sm:p-6 relative z-10">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-cyber font-bold text-cyber-neon-cyan neon-text uppercase tracking-wider">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="text-cyber-neon-cyan/70 hover:text-cyber-neon-cyan focus:outline-none transition-colors duration-300 hover:scale-110"
              >
                <X size={24} className="glow-cyber" />
              </button>
            </div>
            <div className="text-cyber-neon-cyan/90">{children}</div>
          </div>
          
          {footer && (
            <div className="bg-cyber-darker/50 border-t-2 border-cyber-neon-cyan/20 px-6 py-4 sm:px-6 sm:flex sm:flex-row-reverse relative z-10">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
