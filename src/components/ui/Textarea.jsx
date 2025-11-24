import { forwardRef } from 'react'

export const Textarea = forwardRef(({ 
  label, 
  error, 
  className = '', 
  required = false,
  rows = 4,
  ...props 
}, ref) => {
  return (
    <div className="mb-6">
      {label && (
        <label className="block text-sm font-cyber font-semibold text-cyber-neon-cyan mb-2 uppercase tracking-wider">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={`input ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''} ${className} resize-none`}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm text-red-400 font-mono animate-pulse">{error}</p>
      )}
    </div>
  )
})
