import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Select } from '../components/ui/Select'
import { Ticket, Clock, CheckCircle, AlertCircle, TrendingUp, Users, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { ticketsAPI, organizationsAPI } from '../services/api'
import { format, subDays } from 'date-fns'
import toast from 'react-hot-toast'

export const Dashboard = () => {
  const [stats, setStats] = useState({
    totalTickets: 0,
    pendingTickets: 0,
    closedTickets: 0,
    overdueTickets: 0,
  })
  const [recentTickets, setRecentTickets] = useState([])
  const [myOpenTickets, setMyOpenTickets] = useState([])
  const [statusData, setStatusData] = useState([])
  const [priorityData, setPriorityData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrganization, setSelectedOrganization] = useState(null)
  const [organizations, setOrganizations] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    loadOrganizations()
    loadDashboardData()
  }, [selectedOrganization])

  const loadOrganizations = async () => {
    try {
      const { organizationsAPI } = await import('../services/api')
      const data = await organizationsAPI.getAll()
      setOrganizations(data)
    } catch (error) {
      console.error('Failed to load organizations', error)
    }
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const data = await ticketsAPI.getDashboardStats(selectedOrganization)
      setStats({
        totalTickets: data.totalTickets || 0,
        pendingTickets: data.pendingTickets || 0,
        closedTickets: data.closedTickets || 0,
        overdueTickets: data.overdueTickets || 0,
      })
      setRecentTickets(data.recentTickets || [])
      console.log('=== Dashboard Data Debug ===')
      console.log('Recent Tickets:', data.recentTickets?.length || 0)
      console.log('My Open Tickets from API:', data.myOpenTickets)
      console.log('My Open Tickets count:', data.myOpenTickets?.length || 0)
      
      // Fallback: If myOpenTickets is empty but recentTickets has open tickets, filter them
      let openTicketsToShow = data.myOpenTickets || []
      if (openTicketsToShow.length === 0 && data.recentTickets && data.recentTickets.length > 0) {
        const openFromRecent = data.recentTickets.filter(t => 
          t.status === 'open' || t.status === 'in-progress'
        )
        if (openFromRecent.length > 0) {
          console.log('Using fallback: Found', openFromRecent.length, 'open tickets from Recent Tickets')
          openTicketsToShow = openFromRecent
        }
      }
      
      if (openTicketsToShow.length > 0) {
        console.log('First open ticket:', {
          id: openTicketsToShow[0].ticketId,
          status: openTicketsToShow[0].status,
          title: openTicketsToShow[0].title
        })
      }
      console.log('=== End Debug ===')
      setMyOpenTickets(openTicketsToShow)
      setStatusData(data.statusDistribution || [])
      
      // Calculate percentages for priority distribution
      const totalPriorityTickets = (data.priorityDistribution || []).reduce((sum, item) => sum + item.value, 0)
      const priorityWithPercentages = (data.priorityDistribution || []).map(item => ({
        ...item,
        percentage: totalPriorityTickets > 0 ? Math.round((item.value / totalPriorityTickets) * 100) : 0
      }))
      setPriorityData(priorityWithPercentages)
    } catch (error) {
      console.error('Dashboard data error:', error)
      toast.error('Failed to load dashboard data. Showing default view.')
      // Set default stats so page still renders
      setStats({
        totalTickets: 0,
        pendingTickets: 0,
        closedTickets: 0,
        overdueTickets: 0,
      })
      setRecentTickets([])
      setMyOpenTickets([])
      setStatusData([])
      setPriorityData([])
    } finally {
      setLoading(false)
    }
  }

  const statsData = [
    { label: 'Total Tickets', value: stats.totalTickets.toLocaleString(), icon: Ticket, color: 'text-cyber-neon-cyan', bgColor: 'bg-cyber-neon-cyan/20', borderColor: 'border-cyber-neon-cyan' },
    { label: 'Pending Tickets', value: stats.pendingTickets.toLocaleString(), icon: Clock, color: 'text-orange-400', bgColor: 'bg-orange-500/20', borderColor: 'border-orange-500' },
    { label: 'Closed Tickets', value: stats.closedTickets.toLocaleString(), icon: CheckCircle, color: 'text-cyber-neon-green', bgColor: 'bg-cyber-neon-green/20', borderColor: 'border-cyber-neon-green' },
    { label: 'Overdue Tickets', value: stats.overdueTickets.toLocaleString(), icon: AlertTriangle, color: 'text-red-400', bgColor: 'bg-red-500/20', borderColor: 'border-red-500' },
]
  return (
    <Layout>
      <div className="space-y-6">
        {loading && (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="text-center">
              <div className="inline-block animate-spin text-cyber-neon-cyan text-6xl mb-4">⟳</div>
              <p className="text-cyber-neon-cyan font-cyber uppercase tracking-wider">Loading Dashboard...</p>
            </div>
          </div>
        )}
        {!loading && (
          <>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-cyber font-bold neon-text uppercase tracking-wider mb-2">Dashboard</h1>
            <p className="text-cyber-neon-cyan/70 font-mono uppercase tracking-widest text-sm">System Status Overview</p>
          </div>
          {organizations.length > 0 && (
            <div className="w-full sm:w-64">
              <Select
                label="Filter by Organization"
                value={selectedOrganization || ''}
                onChange={(e) => setSelectedOrganization(e.target.value || null)}
                options={[
                  { value: '', label: 'All Organizations' },
                  ...organizations.map(org => ({
                    value: org._id || org.id,
                    label: org.name,
                  })),
                ]}
              />
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsData.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className={`p-6 border-2 ${stat.borderColor}/50 hover:${stat.borderColor} transition-all duration-300 cyber-3d`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-cyber font-semibold text-cyber-neon-cyan/70 uppercase tracking-widest mb-2">{stat.label}</p>
                    <p className={`text-3xl font-cyber font-bold ${stat.color} neon-text`}>{stat.value}</p>
                  </div>
                  <div className={`${stat.bgColor} p-4 rounded-lg border-2 ${stat.borderColor}/30 glow-cyber`}>
                    <Icon className={stat.color} size={28} />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Tickets by Status">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statusData.length > 0 ? statusData : [{ name: 'No Data', value: 0 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#00ffff" strokeOpacity={0.2} />
                <XAxis dataKey="name" stroke="#00ffff" />
                <YAxis stroke="#00ffff" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0a0e27', 
                    border: '2px solid #00ffff',
                    borderRadius: '8px',
                    color: '#00ffff'
                  }}
                />
                <Bar dataKey="value" name="Tickets">
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Tickets by Priority">
            <ResponsiveContainer width="100%" height={300}>
              {priorityData.length > 0 ? (
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0a0e27', 
                      border: '2px solid #00ffff',
                      borderRadius: '8px',
                      color: '#00ffff'
                    }}
                    formatter={(value, name, props) => [`${value} (${props.payload.percentage}%)`, name]}
                  />
                </PieChart>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-cyber-neon-cyan/70 font-mono">No priority data available</p>
                </div>
              )}
            </ResponsiveContainer>
          </Card>
        </div>

        {/* My Open Tickets and Recent Activity Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="My Open Tickets">
            <div className="space-y-4">
              {loading ? (
                <div className="text-center text-cyber-neon-cyan/70 font-mono py-8">Loading...</div>
              ) : myOpenTickets.length === 0 ? (
                <div className="text-center text-cyber-neon-cyan/70 font-mono py-8">No open tickets</div>
              ) : (
                myOpenTickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    className="p-4 border-2 border-cyber-neon-cyan/20 rounded-lg hover:border-cyber-neon-cyan/50 cursor-pointer transition-all duration-300 bg-cyber-darker/30"
                    onClick={() => navigate(`/tickets/${ticket.ticketId}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-cyber font-bold text-cyber-neon-cyan">#{ticket.ticketId}</span>
                          <Badge
                            variant={
                              ticket.priority === 'urgent' ? 'danger' :
                              ticket.priority === 'high' ? 'danger' :
                              ticket.priority === 'medium' ? 'warning' : 'info'
                            }
                          >
                            {ticket.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-cyber-neon-cyan/90 font-mono mb-1">{ticket.title}</p>
                        <p className="text-xs text-cyber-neon-cyan/60 font-mono">
                          {ticket.organization?.name || 'No Organization'} • {format(new Date(ticket.createdAt), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card title="Recent Activity">
            <div className="space-y-4">
              {loading ? (
                <div className="text-center text-cyber-neon-cyan/70 font-mono py-8">Loading...</div>
              ) : recentTickets.length === 0 ? (
                <div className="text-center text-cyber-neon-cyan/70 font-mono py-8">No recent activity</div>
              ) : (
                recentTickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    className="p-4 border-2 border-cyber-neon-cyan/20 rounded-lg hover:border-cyber-neon-cyan/50 cursor-pointer transition-all duration-300 bg-cyber-darker/30"
                    onClick={() => navigate(`/tickets/${ticket.ticketId}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-cyber font-bold text-cyber-neon-cyan">#{ticket.ticketId}</span>
                          <Badge
                            variant={
                              ticket.priority === 'urgent' ? 'danger' :
                              ticket.priority === 'high' ? 'danger' :
                              ticket.priority === 'medium' ? 'warning' : 'info'
                            }
                          >
                            {ticket.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-cyber-neon-cyan/90 font-mono mb-1">{ticket.title}</p>
                        <p className="text-xs text-cyber-neon-cyan/60 font-mono">
                          {ticket.organization?.name || 'No Organization'} • {format(new Date(ticket.createdAt), 'dd/MM/yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Recent Tickets Table - Keep for detailed view */}
        <Card title="Recent Tickets">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y-2 divide-cyber-neon-cyan/20">
              <thead className="bg-cyber-darker/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">Ticket</th>
                  <th className="px-6 py-3 text-left text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">Assignee</th>
                  <th className="px-6 py-3 text-left text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-cyber-neon-cyan/10">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-cyber-neon-cyan/70 font-mono">Loading...</td>
                  </tr>
                ) : recentTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-cyber-neon-cyan/70 font-mono">No recent tickets</td>
                  </tr>
                ) : (
                  recentTickets.map((ticket) => {
                    const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date() && (ticket.status === 'open' || ticket.status === 'in-progress')
                    return (
                      <tr key={ticket._id} className="hover:bg-cyber-neon-cyan/5 cursor-pointer transition-all duration-300 border-l-2 border-transparent hover:border-cyber-neon-cyan/50" onClick={() => navigate(`/tickets/${ticket.ticketId}`)}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-cyber font-bold text-cyber-neon-cyan">#{ticket.ticketId}</div>
                          <div className="text-sm text-cyber-neon-cyan/70 font-mono">{ticket.title}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant={
                              ticket.priority === 'urgent' ? 'danger' :
                              ticket.priority === 'high' ? 'danger' :
                              ticket.priority === 'medium' ? 'warning' : 'info'
                            }
                          >
                            {ticket.priority}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge 
                            variant={
                              ticket.status === 'resolved' ? 'success' :
                              ticket.status === 'in-progress' ? 'info' : 'warning'
                            }
                          >
                            {ticket.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-cyber-neon-cyan/80 font-mono">{ticket.assignee?.name || 'Unassigned'}</td>
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-cyber-neon-cyan/70 font-mono">{format(new Date(ticket.createdAt), 'MMM dd, yyyy')}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
          </>
        )}
      </div>
    </Layout>
  )
}

