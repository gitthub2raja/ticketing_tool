import { useState, useEffect } from 'react'
import { Layout } from '../../components/layout/Layout'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Modal } from '../../components/ui/Modal'
import { Badge } from '../../components/ui/Badge'
import { Plus, Edit, Trash2, Search } from 'lucide-react'
import { usersAPI, organizationsAPI } from '../../services/api'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

export const Users = () => {
  const [users, setUsers] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    status: 'active',
    organization: '',
  })

  useEffect(() => {
    loadUsers()
    loadOrganizations()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await usersAPI.getAll()
      setUsers(data)
    } catch (error) {
      toast.error('Failed to load users')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const loadOrganizations = async () => {
    try {
      const data = await organizationsAPI.getAll()
      setOrganizations(data)
    } catch (error) {
      console.error('Failed to load organizations', error)
    }
  }

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        name: user.name,
        email: user.email,
        password: '', // Don't show existing password
        role: user.role,
        status: user.status,
        organization: user.organization?._id || user.organization || '',
      })
    } else {
      setEditingUser(null)
      setFormData({ name: '', email: '', password: '', role: '', status: 'active', organization: '' })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingUser(null)
    setFormData({ name: '', email: '', password: '', role: '', status: 'active', organization: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // Prepare data - only include password if provided
      const submitData = { ...formData }
      if (editingUser && !submitData.password) {
        // Remove password if editing and not provided
        delete submitData.password
      }

      if (editingUser) {
        await usersAPI.update(editingUser._id || editingUser.id, submitData)
        toast.success('User updated successfully!')
      } else {
        // Password and organization are required for new users
        if (!submitData.password) {
          toast.error('Password is required for new users')
          return
        }
        if (!submitData.organization) {
          toast.error('Organization is required for new users')
          return
        }
        await usersAPI.create(submitData)
        toast.success('User created successfully!')
      }
      handleCloseModal()
      loadUsers()
    } catch (error) {
      toast.error(error.message || 'Failed to save user')
    }
  }

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await usersAPI.delete(userId)
      toast.success('User deleted successfully!')
        loadUsers()
      } catch (error) {
        toast.error(error.message || 'Failed to delete user')
      }
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-cyber font-bold neon-text uppercase tracking-wider mb-2">User Management</h1>
            <p className="text-cyber-neon-cyan/70 font-mono uppercase tracking-widest text-sm">Manage System Users and Their Permissions</p>
          </div>
          <Button onClick={() => handleOpenModal()} className="btn-primary">
            <Plus size={20} className="mr-2" />
            Add User
          </Button>
        </div>

        <Card className="p-6">
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-cyber-neon-cyan/50" size={20} />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y-2 divide-cyber-neon-cyan/20">
              <thead className="bg-cyber-darker/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">Organization</th>
                  <th className="px-6 py-3 text-left text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-cyber font-bold text-cyber-neon-cyan uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-cyber-neon-cyan/10">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-cyber-neon-cyan/70 font-mono">Loading...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-cyber-neon-cyan/70 font-mono">No users found</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user._id || user.id} className="hover:bg-cyber-neon-cyan/5 transition-all duration-300 border-l-2 border-transparent hover:border-cyber-neon-cyan/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-cyber font-bold uppercase tracking-wider bg-cyber-neon-cyan/20 text-cyber-neon-cyan border-2 border-cyber-neon-cyan/50 glow-cyber">
                        {user.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-cyber-neon-cyan/80 font-mono">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-cyber-neon-cyan/70 font-mono">
                      {user.organization?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={user.role === 'admin' ? 'danger' : user.role === 'agent' ? 'info' : 'info'}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={user.status === 'active' ? 'success' : 'warning'}>
                        {user.status}
                      </Badge>
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-cyber-neon-cyan/70 font-mono">
                        {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                      </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleOpenModal(user)}
                          className="text-cyber-neon-cyan hover:text-cyber-neon-cyan/80 transition-colors"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                            onClick={() => handleDelete(user._id || user.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingUser ? 'Edit User' : 'Add New User'}
          footer={
            <>
              <Button variant="outline" onClick={handleCloseModal}>Cancel</Button>
              <Button onClick={handleSubmit}>Save</Button>
            </>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              type="email"
              label="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
            <Input
              type="password"
              label={editingUser ? "Password (Leave empty to keep current)" : "Password *"}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
              placeholder={editingUser ? "Enter new password or leave empty" : "Enter password"}
            />
            <Select
              label="Organization *"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              options={organizations.map(org => ({
                value: org._id || org.id,
                label: org.name,
              }))}
              required
            />
            <Select
              label="Role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              options={[
                { value: 'user', label: 'User' },
                { value: 'agent', label: 'Agent' },
                { value: 'admin', label: 'Admin' },
              ]}
              required
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              required
            />
          </form>
        </Modal>
      </div>
    </Layout>
  )
}

