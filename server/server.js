import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import connectDB from './config/database.js'
import createDemoData from './scripts/initDemoData.js'
import { startEmailWorker } from './workers/emailWorker.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Import routes
import authRoutes from './routes/auth.js'
import ticketRoutes from './routes/tickets.js'
import userRoutes from './routes/users.js'
import adminRoutes from './routes/admin.js'
import mfaRoutes from './routes/mfa.js'
import emailRoutes from './routes/email.js'
import organizationRoutes from './routes/organizations.js'
import categoryRoutes from './routes/categories.js'

dotenv.config()

const app = express()

// Connect to MongoDB
connectDB().then(() => {
  // Create demo data after DB connection
  setTimeout(() => {
    createDemoData()
  }, 2000) // Wait 2 seconds for DB to be ready
  
  // Start email worker after DB is ready
  setTimeout(() => {
    startEmailWorker()
  }, 5000) // Wait 5 seconds for everything to be initialized
})

// Middleware
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Serve uploaded files
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/tickets', ticketRoutes)
app.use('/api/users', userRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/mfa', mfaRoutes)
app.use('/api/email', emailRoutes)
app.use('/api/organizations', organizationRoutes)
app.use('/api/categories', categoryRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

