// Script to create admin user - run inside Docker container
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import User from '../models/User.js'

dotenv.config()

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/ticketing_tool'
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
    
    const caPath = '/etc/ssl/mongodb/ca.crt'
    const fs = await import('fs')
    if (fs.existsSync(caPath)) {
      options.tls = true
      options.tlsCAFile = caPath
      options.tlsAllowInvalidCertificates = true
    }

    await mongoose.connect(mongoUri, options)
    console.log('Connected to MongoDB')
  } catch (error) {
    console.error('Connection error:', error.message)
    process.exit(1)
  }
}

async function createUsers() {
  await connectDB()

  try {
    // Create admin user
    let admin = await User.findOne({ email: 'admin@example.com' })
    if (!admin) {
      const hashedPassword = await bcrypt.hash('admin123', 10)
      admin = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        status: 'active',
      })
      console.log('✅ Admin user created: admin@example.com / admin123')
    } else {
      console.log('ℹ️  Admin user already exists')
    }

    // Create regular user
    let user = await User.findOne({ email: 'user@example.com' })
    if (!user) {
      const hashedPassword = await bcrypt.hash('user123', 10)
      user = await User.create({
        name: 'Regular User',
        email: 'user@example.com',
        password: hashedPassword,
        role: 'user',
        status: 'active',
      })
      console.log('✅ User created: user@example.com / user123')
    } else {
      console.log('ℹ️  User already exists')
    }

    // Create agent user
    let agent = await User.findOne({ email: 'agent@example.com' })
    if (!agent) {
      const hashedPassword = await bcrypt.hash('agent123', 10)
      agent = await User.create({
        name: 'Agent User',
        email: 'agent@example.com',
        password: hashedPassword,
        role: 'agent',
        status: 'active',
      })
      console.log('✅ Agent user created: agent@example.com / agent123')
    } else {
      console.log('ℹ️  Agent user already exists')
    }

    console.log('\n✅ All demo users created successfully!')
    await mongoose.disconnect()
    process.exit(0)
  } catch (error) {
    console.error('Error creating users:', error.message)
    await mongoose.disconnect()
    process.exit(1)
  }
}

createUsers()

