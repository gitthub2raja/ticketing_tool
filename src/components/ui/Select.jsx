export const Select = ({ 
  label, 
  error, 
  className = '', 
  required = false,
  options = [],
  placeholder = 'Select an option',
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
      <select
        className={`input ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''} ${className} cursor-pointer`}
        {...props}
      >
        <option value="" className="bg-cyber-darker text-cyber-neon-cyan">
          {placeholder}
        </option>
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            className="bg-cyber-darker text-cyber-neon-cyan"
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-2 text-sm text-red-400 font-mono animate-pulse">{error}</p>
      )}
    </div>
  )
}
