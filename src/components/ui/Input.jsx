export const Input = ({ 
  label, 
  error, 
  className = '', 
  required = false,
  icon,
  ...props 
}) => {
  return (
    <div className="mb-6">
      {label && (
        <label className="block text-sm font-cyber font-semibold text-cyber-neon-cyan mb-2 uppercase tracking-wider">
          {label}
          {required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-cyber-neon-cyan/70 z-10">
            {icon}
          </div>
        )}
        <input
          className={`input ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''} ${icon ? 'pl-12' : ''} ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm text-red-400 font-mono animate-pulse">{error}</p>
        )}
      </div>
    </div>
  )
}
