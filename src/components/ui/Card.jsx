export const Card = ({ 
  children, 
  className = '',
  title,
  actions 
}) => {
  return (
    <div className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-6 relative z-10">
          {title && (
            <h3 className="text-xl font-cyber font-bold text-cyber-neon-cyan neon-text">
              {title}
            </h3>
          )}
          {actions && <div className="relative z-10">{actions}</div>}
        </div>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
