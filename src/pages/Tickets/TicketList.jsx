import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { Select } from '../../components/ui/Select'
import { Plus, Search, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { ticketsAPI } from '../../services/api'
import toast from 'react-hot-toast'

export const TicketList = () => {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const navigate = useNavigate()

  // Load tickets when filters change (not on every search keystroke)
  useEffect(() => {
    loadTickets()
  }, [statusFilter, priorityFilter])

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      loadTickets()
    }, 500) // Wait 500ms after user stops typing

    return () => clearTimeout(timer)
  }, [searchTerm])

  const loadTickets = async () => {
    try {
      setLoading(true)
      const filters = {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        search: searchTerm || undefined,
      }
      const data = await ticketsAPI.getAll(filters)
      setTickets(data || [])
    } catch (error) {
      // Only show error if it's not a network error or if tickets array is empty
      if (tickets.length === 0) {
        toast.error(error.message || 'Failed to load tickets')
      }
      console.error('Error loading tickets:', error)
      // Set empty array on error to prevent UI issues
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  // No need for client-side filtering since search is handled by API
  const filteredTickets = tickets

  const getPriorityVariant = (priority) => {
    if (priority === 'urgent' || priority === 'high') return 'danger'
    if (priority === 'medium') return 'warning'
    return 'info'
  }

  const getStatusVariant = (status) => {
    if (status === 'resolved') return 'success'
    if (status === 'in-progress') return 'info'
    return 'warning'
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-cyber font-bold neon-text uppercase tracking-wider mb-2">Tickets</h1>
            <p className="text-cyber-neon-cyan/70 font-mono uppercase tracking-widest text-sm">Manage and Track All Support Tickets</p>
          </div>
          <Button onClick={() => navigate('/tickets/new')} className="btn-primary">
            <Plus size={20} className="mr-2" />
            New Ticket
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyber-neon-cyan/50" size={20} />
              <Input
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'open', label: 'Open' },
                { value: 'in-progress', label: 'In Progress' },
                { value: 'resolved', label: 'Resolved' },
              ]}
            />
            <Select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Priorities' },
                { value: 'urgent', label: 'Urgent' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
            />
            <Button variant="outline" className="w-full">
              <Filter size={20} className="mr-2" />
              More Filters
            </Button>
          </div>
        </Card>

        {/* Tickets Table */}
        <Card className="p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y-2 divide-cyber-neon-cyan/20">
              <thead className="bg-cyber-darker/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">Assignee</th>
                  <th className="px-6 py-3 text-left text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-cyber-neon-cyan/10">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-cyber-neon-cyan/70 font-mono">Loading...</td>
                  </tr>
                ) : filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-cyber-neon-cyan/70 font-mono">No tickets found matching your criteria.</td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => {
                    const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date() && (ticket.status === 'open' || ticket.status === 'in-progress')
                    return (
                      <tr 
                        key={ticket._id} 
                        className="hover:bg-cyber-neon-cyan/5 cursor-pointer transition-all duration-300 border-l-2 border-transparent hover:border-cyber-neon-cyan/50" 
                        onClick={() => navigate(`/tickets/${ticket.ticketId}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-cyber font-bold text-cyber-neon-cyan">#{ticket.ticketId}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-cyber font-medium text-cyber-neon-cyan">{ticket.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-cyber-neon-cyan/70 font-mono">{ticket.category}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={getPriorityVariant(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={getStatusVariant(ticket.status)}>
                            {ticket.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-cyber-neon-cyan/80 font-mono">
                          {ticket.assignee?.name || <span className="text-cyber-neon-cyan/50">Unassigned</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                          {ticket.dueDate ? (
                            <span className={isOverdue ? 'text-red-400' : 'text-cyber-neon-cyan/70'}>
                              {format(new Date(ticket.dueDate), 'MMM dd, yyyy')}
                              {isOverdue && <span className="ml-1 text-red-400">⚠</span>}
                            </span>
                          ) : (
                            <span className="text-cyber-neon-cyan/50">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-cyber-neon-cyan/70 font-mono">
                          {format(new Date(ticket.createdAt), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/tickets/${ticket.ticketId}`)
                            }}
                            className="text-cyber-neon-cyan hover:text-cyber-neon-cyan/80 transition-colors font-cyber"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  )
}

