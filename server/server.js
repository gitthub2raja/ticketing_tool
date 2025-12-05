import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import connectDB from './config/database.js'
import createDemoData from './scripts/initDemoData.js'
import { startEmailWorker } from './workers/emailWorker.js'
import { startSLAWorker } from './workers/slaWorker.js'
import { startEmailAutomationWorker } from './workers/emailAutomationWorker.js'

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
import departmentRoutes from './routes/departments.js'
import reportRoutes from './routes/reports.js'
import apiKeyRoutes from './routes/apiKeys.js'
import emailTemplateRoutes from './routes/emailTemplates.js'
import emailAutomationRoutes from './routes/emailAutomation.js'
import chatbotRoutes from './routes/chatbot.js'
import faqRoutes from './routes/faq.js'
import teamsRoutes from './routes/teams.js'
import backupRoutes from './routes/backup.js'
import integrationRoutes from './routes/integrations.js'

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
  
  // Start SLA worker after DB is ready
  setTimeout(() => {
    startSLAWorker()
  }, 10000) // Wait 10 seconds for everything to be initialized
  
  // Start email automation worker after DB is ready
  setTimeout(() => {
    startEmailAutomationWorker()
  }, 15000) // Wait 15 seconds for everything to be initialized
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
app.use('/api/departments', departmentRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/api-keys', apiKeyRoutes)
app.use('/api/email-templates', emailTemplateRoutes)
app.use('/api/email-automation', emailAutomationRoutes)
app.use('/api/chatbot', chatbotRoutes)
app.use('/api/faq', faqRoutes)
app.use('/api/teams', teamsRoutes)
app.use('/api/backup', backupRoutes)
app.use('/api/integrations', integrationRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

