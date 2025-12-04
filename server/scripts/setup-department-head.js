import mongoose from 'mongoose'
import User from '../models/User.js'
import Department from '../models/Department.js'
import Ticket from '../models/Ticket.js'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://mongoadmin:mongopassword@localhost:27018/ticketing_tool?authSource=admin'

async function setupDepartmentHead() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Get user email from command line args or use default
    const userEmail = process.argv[2] || 'avenkadesh@rezilyens.com'
    const departmentName = process.argv[3] || null

    console.log(`\n🔍 Looking for user: ${userEmail}`)
    const user = await User.findOne({ email: userEmail })
    
    if (!user) {
      console.error(`❌ User not found: ${userEmail}`)
      process.exit(1)
    }

    console.log(`✅ Found user: ${user.name} (${user.email})`)
    console.log(`   Current role: ${user.role}`)
    console.log(`   Current department: ${user.department || 'None'}`)

    // Find or create department
    let department = null
    if (departmentName) {
      department = await Department.findOne({ name: departmentName })
      if (!department) {
        console.log(`\n⚠️  Department "${departmentName}" not found. Creating...`)
        // Get user's organization
        const org = user.organization
        if (!org) {
          console.error('❌ User has no organization. Cannot create department.')
          process.exit(1)
        }
        department = await Department.create({
          name: departmentName,
          organization: org,
          departmentHead: user._id,
          isActive: true,
        })
        console.log(`✅ Created department: ${department.name}`)
      } else {
        console.log(`✅ Found department: ${department.name}`)
      }
    } else {
      // Try to find user's existing department
      if (user.department) {
        department = await Department.findById(user.department)
        if (department) {
          console.log(`✅ Found user's existing department: ${department.name}`)
        }
      }
      
      // If no department, find first available department
      if (!department) {
        const org = user.organization
        if (org) {
          department = await Department.findOne({ organization: org })
          if (department) {
            console.log(`✅ Found first available department: ${department.name}`)
          } else {
            console.log(`\n⚠️  No departments found. Creating default department...`)
            department = await Department.create({
              name: 'Default Department',
              organization: org,
              departmentHead: user._id,
              isActive: true,
            })
            console.log(`✅ Created default department: ${department.name}`)
          }
        }
      }
    }

    if (!department) {
      console.error('❌ Could not find or create a department')
      process.exit(1)
    }

    // Update user to be department head
    user.role = 'department-head'
    user.department = department._id
    await user.save()
    console.log(`\n✅ Updated user:`)
    console.log(`   Role: ${user.role}`)
    console.log(`   Department: ${department.name}`)

    // Update department to have this user as head
    department.departmentHead = user._id
    await department.save()
    console.log(`✅ Updated department head: ${user.name}`)

    // Update tickets without departments to have this department
    const org = user.organization
    const ticketsWithoutDept = await Ticket.find({
      organization: org,
      $or: [
        { department: null },
        { department: { $exists: false } }
      ]
    })

    if (ticketsWithoutDept.length > 0) {
      console.log(`\n📝 Found ${ticketsWithoutDept.length} tickets without departments`)
      await Ticket.updateMany(
        {
          organization: org,
          $or: [
            { department: null },
            { department: { $exists: false } }
          ]
        },
        { department: department._id }
      )
      console.log(`✅ Assigned ${ticketsWithoutDept.length} tickets to department: ${department.name}`)
    }

    // Show approval pending tickets
    const approvalPendingTickets = await Ticket.find({
      department: department._id,
      status: 'approval-pending'
    }).populate('creator', 'name email')

    console.log(`\n📋 Approval Pending Tickets (${approvalPendingTickets.length}):`)
    if (approvalPendingTickets.length === 0) {
      console.log('   No approval pending tickets found')
    } else {
      approvalPendingTickets.forEach(ticket => {
        console.log(`   #${ticket.ticketId}: ${ticket.title} (Created by: ${ticket.creator?.name || 'Unknown'})`)
      })
    }

    console.log(`\n✅ Setup complete!`)
    console.log(`\n📌 Summary:`)
    console.log(`   User: ${user.name} (${user.email})`)
    console.log(`   Role: ${user.role}`)
    console.log(`   Department: ${department.name}`)
    console.log(`   Approval Pending Tickets: ${approvalPendingTickets.length}`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

setupDepartmentHead()

