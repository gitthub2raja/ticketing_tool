import { format, parseISO, isValid } from 'date-fns'

/**
 * Safely parse a date value to a Date object
 * Handles ISO strings, Date objects, and invalid values
 */
export const safeDate = (dateValue) => {
  if (!dateValue) return null
  
  // If it's already a Date object and valid
  if (dateValue instanceof Date) {
    return isValid(dateValue) ? dateValue : null
  }
  
  // If it's a string, try to parse it
  if (typeof dateValue === 'string') {
    // Try ISO format first
    try {
      const date = parseISO(dateValue)
      if (isValid(date)) return date
    } catch (e) {
      // Fall through to try regular Date constructor
    }
    
    // Try regular Date constructor
    try {
      const date = new Date(dateValue)
      return isValid(date) ? date : null
    } catch (e) {
      return null
    }
  }
  
  // If it's a number (timestamp)
  if (typeof dateValue === 'number') {
    const date = new Date(dateValue)
    return isValid(date) ? date : null
  }
  
  return null
}

/**
 * Safely format a date value
 * @param {string|Date|number} dateValue - The date to format
 * @param {string} formatStr - The format string (date-fns format)
 * @param {string} fallback - The fallback text if date is invalid
 * @returns {string} Formatted date string or fallback
 */
export const safeFormat = (dateValue, formatStr, fallback = '—') => {
  const date = safeDate(dateValue)
  if (!date) return fallback
  
  try {
    return format(date, formatStr)
  } catch (error) {
    console.error('Date formatting error:', error, dateValue)
    return fallback
  }
}

/**
 * Check if a date is overdue
 * @param {string|Date} dueDate - The due date to check
 * @param {string} status - The ticket status
 * @returns {boolean} True if overdue
 */
export const isOverdue = (dueDate, status = 'open') => {
  const date = safeDate(dueDate)
  if (!date) return false
  
  const now = new Date()
  const isActiveStatus = status === 'open' || status === 'in-progress'
  return date < now && isActiveStatus
}




