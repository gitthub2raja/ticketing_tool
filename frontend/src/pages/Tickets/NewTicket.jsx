import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { useAuth } from '../../contexts/AuthContext'
import { ticketsAPI, categoriesAPI, usersAPI } from '../../services/api'
import { sendTicketCreatedEmail } from '../../services/emailService'
import { Upload, X, File } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export const NewTicket = () => {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    priority: '',
    assignee: '',
    ticketId: '', // Optional manual ticket ID
  })
  const [categories, setCategories] = useState([])
  const [assignees, setAssignees] = useState([])
  const [showTicketId, setShowTicketId] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    loadCategories()
    loadAssignees()
  }, [])

  const loadCategories = async () => {
    try {
      const data = await categoriesAPI.getAll()
      setCategories(data)
    } catch (error) {
      console.error('Failed to load categories:', error)
      // Use default categories if API fails
      setCategories([
        { _id: 'it-support', name: 'IT Support' },
        { _id: 'hardware', name: 'Hardware' },
        { _id: 'software', name: 'Software' },
        { _id: 'network', name: 'Network' },
        { _id: 'email', name: 'Email' },
        { _id: 'other', name: 'Other' },
      ])
    }
  }

  const loadAssignees = async () => {
    try {
      const data = await usersAPI.getAll()
      // Filter to only show agents and admins as potential assignees
      const agentsAndAdmins = data.filter(u => 
        (u.role === 'agent' || u.role === 'admin') && u.status === 'active'
      )
      setAssignees(agentsAndAdmins)
    } catch (error) {
      console.error('Failed to load assignees:', error)
      setAssignees([])
    }
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    // Limit to 10 files and 10MB per file
    const validFiles = files.filter(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is 10MB.`)
        return false
      }
      return true
    }).slice(0, 10 - selectedFiles.length)
    
    setSelectedFiles([...selectedFiles, ...validFiles])
  }

  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Validate required fields
    if (!formData.title || !formData.description || !formData.category || !formData.priority) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      // Create FormData for file upload
      const formDataToSend = new FormData()
      formDataToSend.append('title', formData.title.trim())
      formDataToSend.append('description', formData.description.trim())
      formDataToSend.append('category', formData.category)
      formDataToSend.append('priority', formData.priority)
      if (formData.assignee) formDataToSend.append('assignee', formData.assignee)
      if (formData.ticketId && formData.ticketId.trim() !== '') {
        formDataToSend.append('ticketId', parseInt(formData.ticketId))
      }

      // Append files
      selectedFiles.forEach(file => {
        formDataToSend.append('attachments', file)
      })

      const ticket = await ticketsAPI.createWithFiles(formDataToSend)

      // Send email notification to user
      if (user?.email) {
        try {
          await sendTicketCreatedEmail(ticket, user.email)
          toast.success(`Ticket #${ticket.ticketId} created successfully! Email notification sent.`)
        } catch (emailError) {
          console.error('Email error:', emailError)
          toast.success(`Ticket #${ticket.ticketId} created successfully!`)
        }
      } else {
        toast.success(`Ticket #${ticket.ticketId} created successfully!`)
      }

      // Navigate after a short delay to ensure toast is visible
      setTimeout(() => {
        navigate(`/tickets/${ticket.ticketId}`)
      }, 500)
    } catch (error) {
      console.error('Ticket creation error:', error)
      const errorMessage = error.message || 'Failed to create ticket. Please try again.'
      toast.error(errorMessage)
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-4xl font-cyber font-bold neon-text uppercase tracking-wider mb-2">Create New Ticket</h1>
          <p className="text-cyber-neon-cyan/70 font-mono uppercase tracking-widest text-sm">Fill in the details below to create a new support ticket</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Optional: Manual Ticket ID (for first-time setup) */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => setShowTicketId(!showTicketId)}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                {showTicketId ? 'Hide' : 'Set'} Manual Ticket ID (Optional)
              </button>
              {showTicketId && (
                <div className="mt-2">
                  <Input
                    name="ticketId"
                    label="Ticket ID (Optional - leave empty for auto-increment)"
                    placeholder="e.g., 1000"
                    type="number"
                    value={formData.ticketId}
                    onChange={handleChange}
                    min="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    If provided, this will be used as the ticket ID. Otherwise, it will auto-increment from the highest existing ticket ID.
                  </p>
                </div>
              )}
            </div>

            <Input
              name="title"
              label="Title"
              placeholder="Brief description of the issue"
              value={formData.title}
              onChange={handleChange}
              required
            />

            <Textarea
              name="description"
              label="Description"
              placeholder="Provide detailed information about the issue..."
              value={formData.description}
              onChange={handleChange}
              rows={8}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                name="category"
                label="Category *"
                value={formData.category}
                onChange={handleChange}
                options={[
                  { value: '', label: 'Select an option' },
                  ...categories.map(cat => ({
                    value: cat.name,
                    label: cat.name,
                  })),
                ]}
                required
              />

              <Select
                name="priority"
                label="Priority"
                value={formData.priority}
                onChange={handleChange}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' },
                ]}
                required
              />
            </div>

            <Select
              name="assignee"
              label="Assignee (Optional)"
              value={formData.assignee}
              onChange={handleChange}
              options={[
                { value: '', label: 'Unassigned' },
                ...assignees.map(user => ({
                  value: user._id || user.id,
                  label: user.name,
                })),
              ]}
            />

            {/* File Upload Section */}
            <div>
              <label className="block text-sm font-cyber font-semibold text-cyber-neon-cyan mb-2 uppercase tracking-wider">
                Attachments (Optional)
              </label>
              <div className="border-2 border-cyber-neon-cyan/30 rounded-lg p-4 bg-cyber-darker/30">
                <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-cyber-neon-cyan/50 rounded-lg cursor-pointer hover:border-cyber-neon-cyan transition-all duration-300">
                  <div className="flex flex-col items-center">
                    <Upload size={24} className="text-cyber-neon-cyan mb-2" />
                    <span className="text-sm text-cyber-neon-cyan/80 font-mono">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-cyber-neon-cyan/60 font-mono mt-1">
                      PDF, Word, Excel, Images (Max 10MB per file, up to 10 files)
                    </span>
                  </div>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv"
                  />
                </label>
                
                {selectedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-cyber-darker/50 border border-cyber-neon-cyan/20 rounded"
                      >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <File size={16} className="text-cyber-neon-cyan flex-shrink-0" />
                          <span className="text-sm text-cyber-neon-cyan/90 font-mono truncate">
                            {file.name}
                          </span>
                          <span className="text-xs text-cyber-neon-cyan/60 font-mono">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="ml-2 text-cyber-neon-cyan/70 hover:text-cyber-neon-cyan transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/tickets')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Creating...' : 'Create Ticket'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </Layout>
  )
}

