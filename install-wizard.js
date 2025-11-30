#!/usr/bin/env node

/**
 * Ticketing Tool - GLPI-Style Installation Wizard
 * 
 * This interactive installation wizard guides users through the complete
 * setup process including environment verification, configuration, and initialization.
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import readline from 'readline'
import crypto from 'crypto'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Get project root (parent of this script's directory when copied to project root)
const projectRoot = process.cwd()

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logStep(step, total, message) {
  log(`\n[Step ${step}/${total}] ${message}`, 'cyan')
  log('─'.repeat(60), 'cyan')
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green')
}

function logError(message) {
  log(`✗ ${message}`, 'red')
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow')
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue')
}

// Readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

function questionHidden(query) {
  return new Promise((resolve) => {
    process.stdout.write(query)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    
    let input = ''
    process.stdin.on('data', function(char) {
      char = char.toString()
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdin.setRawMode(false)
          process.stdin.pause()
          process.stdout.write('\n')
          resolve(input)
          break
        case '\u0003':
          process.exit()
          break
        case '\u007f':
          if (input.length > 0) {
            input = input.slice(0, -1)
            process.stdout.write('\b \b')
          }
          break
        default:
          input += char
          process.stdout.write('*')
          break
      }
    })
  })
}

// Check if command exists
function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

// Get version of a command
function getVersion(command) {
  try {
    const version = execSync(`${command} --version`, { encoding: 'utf8' })
    return version.trim().split('\n')[0]
  } catch {
    return null
  }
}

// Step 1: Welcome Screen
async function showWelcome() {
  console.clear()
  log('\n' + '═'.repeat(60), 'cyan')
  log('  Ticketing Tool - Installation Wizard', 'bright')
  log('═'.repeat(60), 'cyan')
  log('\nWelcome to the Ticketing Tool installation process!', 'bright')
  log('\nThis wizard will guide you through:', 'reset')
  log('  • Environment verification', 'reset')
  log('  • Dependency checking', 'reset')
  log('  • Server configuration', 'reset')
  log('  • Database setup', 'reset')
  log('  • Admin user creation', 'reset')
  log('  • Application startup', 'reset')
  log('\n' + '─'.repeat(60), 'cyan')
  log('\nPress Ctrl+C at any time to cancel the installation.\n', 'yellow')
  
  await question('Press Enter to continue...')
}

// Step 2: Environment Verification
async function verifyEnvironment() {
  logStep(1, 8, 'Environment Verification')
  
  const checks = {
    node: { name: 'Node.js', command: 'node', minVersion: 16 },
    npm: { name: 'npm', command: 'npm', minVersion: 7 },
    mongodb: { name: 'MongoDB', command: 'mongod', optional: true },
  }
  
  let allPassed = true
  
  for (const [key, check] of Object.entries(checks)) {
    log(`\nChecking ${check.name}...`, 'blue')
    
    if (!commandExists(check.command)) {
      if (check.optional) {
        logWarning(`${check.name} not found (optional - can use MongoDB Atlas)`)
      } else {
        logError(`${check.name} is not installed`)
        logInfo(`Please install ${check.name} ${check.minVersion}+ and run this wizard again`)
        allPassed = false
      }
    } else {
      const version = getVersion(check.command)
      if (version) {
        logSuccess(`${check.name} found: ${version}`)
        
        // Check version if specified
        if (check.minVersion && key === 'node') {
          const majorVersion = parseInt(version.match(/v?(\d+)/)?.[1] || '0')
          if (majorVersion < check.minVersion) {
            logError(`${check.name} version ${majorVersion} is below minimum required (${check.minVersion}+)`)
            allPassed = false
          }
        }
      }
    }
  }
  
  // Check PM2
  log('\nChecking PM2...', 'blue')
  if (commandExists('pm2')) {
    const version = getVersion('pm2')
    logSuccess(`PM2 found: ${version}`)
  } else {
    logWarning('PM2 not found (optional - recommended for production)')
  }
  
  if (!allPassed) {
    logError('\nSome required dependencies are missing. Please install them and run this wizard again.')
    process.exit(1)
  }
  
  logSuccess('\nEnvironment verification completed!')
  await question('\nPress Enter to continue...')
  return true
}

// Step 3: MongoDB Connection Configuration
async function configureMongoDB() {
  logStep(2, 8, 'MongoDB Configuration')
  
  log('\nChoose your MongoDB setup:', 'blue')
  log('  1. Local MongoDB installation', 'reset')
  log('  2. MongoDB Atlas (Cloud)', 'reset')
  log('  3. Custom connection string', 'reset')
  
  const choice = await question('\nEnter your choice (1-3): ')
  
  let mongoUri = ''
  let mongoTLS = false
  let mongoCAFile = ''
  
  switch (choice.trim()) {
    case '1':
      logInfo('Using local MongoDB installation')
      const localHost = await question('MongoDB host [localhost]: ') || 'localhost'
      const localPort = await question('MongoDB port [27017]: ') || '27017'
      const localDB = await question('Database name [ticketing_tool]: ') || 'ticketing_tool'
      const localAuth = await question('Require authentication? (y/n) [n]: ') || 'n'
      
      if (localAuth.toLowerCase() === 'y') {
        const localUser = await question('MongoDB username: ')
        const localPass = await questionHidden('MongoDB password: ')
        const localAuthDB = await question('Authentication database [admin]: ') || 'admin'
        // URL-encode the password to handle special characters like @
        const encodedPass = encodeURIComponent(localPass)
        mongoUri = `mongodb://${localUser}:${encodedPass}@${localHost}:${localPort}/${localDB}?authSource=${localAuthDB}`
      } else {
        mongoUri = `mongodb://${localHost}:${localPort}/${localDB}`
      }
      break
      
    case '2':
      logInfo('Using MongoDB Atlas')
      mongoUri = await question('Enter your MongoDB Atlas connection string: ')
      mongoTLS = true
      break
      
    case '3':
      logInfo('Using custom connection string')
      mongoUri = await question('Enter your MongoDB connection string: ')
      const useTLS = await question('Use TLS/SSL? (y/n) [n]: ') || 'n'
      mongoTLS = useTLS.toLowerCase() === 'y'
      if (mongoTLS) {
        mongoCAFile = await question('Path to CA certificate file (optional): ') || ''
      }
      break
      
    default:
      logError('Invalid choice')
      process.exit(1)
  }
  
  // Validate the URI format
  log('\nValidating MongoDB connection string...', 'blue')
  if (mongoUri.startsWith('mongodb://') || mongoUri.startsWith('mongodb+srv://')) {
    logSuccess('MongoDB connection string format is valid')
  } else {
    logError('Invalid MongoDB connection string format')
    process.exit(1)
  }
  
  return { mongoUri, mongoTLS, mongoCAFile }
}

// Step 4: Server Configuration
async function configureServer() {
  logStep(3, 8, 'Server Configuration')
  
  const port = await question('Backend server port [5000]: ') || '5000'
  const nodeEnv = await question('Environment (development/production) [production]: ') || 'production'
  
  // Generate JWT secret
  const generateSecret = await question('Generate new JWT secret? (y/n) [y]: ') || 'y'
  let jwtSecret = ''
  
  if (generateSecret.toLowerCase() === 'y') {
    jwtSecret = crypto.randomBytes(64).toString('hex')
    logSuccess('JWT secret generated')
  } else {
    jwtSecret = await question('Enter JWT secret (min 32 characters): ')
    if (jwtSecret.length < 32) {
      logError('JWT secret must be at least 32 characters')
      process.exit(1)
    }
  }
  
  const frontendUrl = await question('Frontend URL [http://localhost:3000]: ') || 'http://localhost:3000'
  
  return { port, nodeEnv, jwtSecret, frontendUrl }
}

// Step 5: Frontend Configuration
async function configureFrontend() {
  logStep(4, 8, 'Frontend Configuration')
  
  const apiUrl = await question('Backend API URL [http://localhost:5000/api]: ') || 'http://localhost:5000/api'
  
  return { apiUrl }
}

// Step 6: Create .env Files
async function createEnvFiles(config) {
  logStep(5, 8, 'Creating Configuration Files')
  
  // Backend .env
  const backendEnvPath = join(projectRoot, 'server', '.env')
  const backendEnvContent = `# Ticketing Tool - Backend Configuration
# Generated by Installation Wizard

# Server Configuration
PORT=${config.server.port}
NODE_ENV=${config.server.nodeEnv}

# MongoDB Configuration
MONGODB_URI=${config.mongodb.mongoUri}
${config.mongodb.mongoTLS ? `MONGODB_TLS=true` : ''}
${config.mongodb.mongoCAFile ? `MONGODB_CA_FILE=${config.mongodb.mongoCAFile}` : ''}

# JWT Configuration
JWT_SECRET=${config.server.jwtSecret}

# Frontend URL
FRONTEND_URL=${config.server.frontendUrl}

# Email Configuration (Optional - configure later)
# SMTP_HOST=
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# SMTP_FROM=

# IMAP Configuration (Optional - configure later)
# IMAP_HOST=
# IMAP_PORT=993
# IMAP_USER=
# IMAP_PASS=
`
  
  try {
    writeFileSync(backendEnvPath, backendEnvContent)
    logSuccess(`Backend .env file created at ${backendEnvPath}`)
  } catch (error) {
    logError(`Failed to create backend .env: ${error.message}`)
    process.exit(1)
  }
  
  // Frontend .env
  const frontendEnvPath = join(projectRoot, '.env')
  const frontendEnvContent = `# Ticketing Tool - Frontend Configuration
# Generated by Installation Wizard

VITE_API_URL=${config.frontend.apiUrl}
`
  
  try {
    writeFileSync(frontendEnvPath, frontendEnvContent)
    logSuccess(`Frontend .env file created at ${frontendEnvPath}`)
  } catch (error) {
    logError(`Failed to create frontend .env: ${error.message}`)
    process.exit(1)
  }
  
  logSuccess('\nConfiguration files created successfully!')
  await question('\nPress Enter to continue...')
}

// Step 7: Install Dependencies
async function installDependencies() {
  logStep(6, 8, 'Installing Dependencies')
  
  // Install backend dependencies
  log('\nInstalling backend dependencies...', 'blue')
  try {
    const originalDir = process.cwd()
    process.chdir(join(projectRoot, 'server'))
    execSync('npm install', { stdio: 'inherit' })
    process.chdir(originalDir)
    logSuccess('Backend dependencies installed')
  } catch (error) {
    logError('Failed to install backend dependencies')
    process.exit(1)
  }
  
  // Install frontend dependencies
  log('\nInstalling frontend dependencies...', 'blue')
  try {
    process.chdir(projectRoot)
    execSync('npm install', { stdio: 'inherit' })
    logSuccess('Frontend dependencies installed')
  } catch (error) {
    logError('Failed to install frontend dependencies')
    process.exit(1)
  }
  
  logSuccess('\nAll dependencies installed successfully!')
  await question('\nPress Enter to continue...')
}

// Step 8: Build Frontend
async function buildFrontend() {
  logStep(7, 8, 'Building Frontend Application')
  
  log('\nBuilding React application...', 'blue')
  try {
    process.chdir(projectRoot)
    execSync('npm run build', { stdio: 'inherit' })
    logSuccess('Frontend build completed')
  } catch (error) {
    logError('Failed to build frontend')
    process.exit(1)
  }
  
  await question('\nPress Enter to continue...')
}

// Step 9: Database Initialization & Admin User
async function initializeDatabase(config) {
  logStep(8, 8, 'Database Initialization')
  
  log('\nConnecting to database...', 'blue')
  
  // Change to project root to import modules
  process.chdir(projectRoot)
  
  // Import database connection and models
  const { default: connectDB } = await import('./server/config/database.js')
  const { default: User } = await import('./server/models/User.js')
  const { default: Organization } = await import('./server/models/Organization.js')
  const bcrypt = (await import('bcryptjs')).default
  
  try {
    await connectDB()
    logSuccess('Connected to MongoDB')
  } catch (error) {
    logError(`Failed to connect to database: ${error.message}`)
    process.exit(1)
  }
  
  // Create default organization if needed
  log('\nChecking for default organization...', 'blue')
  let organization
  try {
    organization = await Organization.findOne({ name: 'Default Organization' })
    if (!organization) {
      organization = await Organization.create({
        name: 'Default Organization',
        description: 'Default organization created during installation',
      })
      logSuccess('Default organization created')
    } else {
      logInfo('Default organization already exists')
      organization = organization
    }
  } catch (error) {
    logError(`Failed to create organization: ${error.message}`)
    process.exit(1)
  }
  
  // Create admin user
  log('\nCreating admin user...', 'blue')
  const adminEmail = await question('Admin email [admin@example.com]: ') || 'admin@example.com'
  const adminName = await question('Admin name [Administrator]: ') || 'Administrator'
  const adminPassword = await questionHidden('Admin password (min 8 characters): ')
  
  if (adminPassword.length < 8) {
    logError('Password must be at least 8 characters')
    process.exit(1)
  }
  
  const confirmPassword = await questionHidden('Confirm admin password: ')
  
  if (adminPassword !== confirmPassword) {
    logError('Passwords do not match')
    process.exit(1)
  }
  
  try {
    const existingAdmin = await User.findOne({ email: adminEmail })
    if (existingAdmin) {
      logWarning(`User with email ${adminEmail} already exists. Skipping creation.`)
    } else {
      const hashedPassword = await bcrypt.hash(adminPassword, 10)
      await User.create({
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: 'admin',
        status: 'active',
        organization: organization._id,
      })
      logSuccess(`Admin user created: ${adminEmail}`)
    }
  } catch (error) {
    logError(`Failed to create admin user: ${error.message}`)
    process.exit(1)
  }
  
  logSuccess('\nDatabase initialization completed!')
  await question('\nPress Enter to continue...')
}

// Step 10: Final Summary & Startup Instructions
async function showSummary(config) {
  console.clear()
  log('\n' + '═'.repeat(60), 'green')
  log('  Installation Completed Successfully!', 'bright')
  log('═'.repeat(60), 'green')
  
  log('\n📋 Installation Summary:', 'bright')
  log('─'.repeat(60), 'cyan')
  
  log('\n✓ Environment verified', 'green')
  log('✓ Dependencies installed', 'green')
  log('✓ Configuration files created', 'green')
  log('✓ Frontend built', 'green')
  log('✓ Database initialized', 'green')
  log('✓ Admin user created', 'green')
  
  log('\n📝 Configuration Details:', 'bright')
  log('─'.repeat(60), 'cyan')
  log(`Backend Port: ${config.server.port}`, 'reset')
  log(`Environment: ${config.server.nodeEnv}`, 'reset')
  log(`Frontend URL: ${config.server.frontendUrl}`, 'reset')
  log(`MongoDB: ${config.mongodb.mongoUri.replace(/:[^:@]+@/, ':****@')}`, 'reset')
  
  log('\n🚀 Next Steps:', 'bright')
  log('─'.repeat(60), 'cyan')
  log('\n1. Start the backend server:', 'reset')
  log('   cd server && npm start', 'yellow')
  log('\n2. (Optional) Use PM2 for process management:', 'reset')
  log('   pm2 start server/server.js --name ticketing-backend', 'yellow')
  log('\n3. Serve the frontend:', 'reset')
  log('   npm run preview  # or use nginx/apache', 'yellow')
  log('\n4. Access the application:', 'reset')
  log(`   ${config.server.frontendUrl}`, 'yellow')
  
  log('\n📚 Documentation:', 'bright')
  log('─'.repeat(60), 'cyan')
  log('   See INSTALLATION.md for detailed setup instructions', 'reset')
  log('   See README.md for application documentation', 'reset')
  
  log('\n' + '═'.repeat(60), 'green')
  log('\nThank you for installing Ticketing Tool!', 'bright')
  log('═'.repeat(60), 'green')
  
  rl.close()
}

// Main installation flow
async function main() {
  try {
    // Ensure we're in the project root
    process.chdir(projectRoot)
    
    const config = {
      mongodb: {},
      server: {},
      frontend: {},
    }
    
    await showWelcome()
    await verifyEnvironment()
    config.mongodb = await configureMongoDB()
    config.server = await configureServer()
    config.frontend = await configureFrontend()
    await createEnvFiles(config)
    await installDependencies()
    await buildFrontend()
    await initializeDatabase(config)
    await showSummary(config)
    
    process.exit(0)
  } catch (error) {
    logError(`\nInstallation failed: ${error.message}`)
    console.error(error)
    rl.close()
    process.exit(1)
  }
}

// Run the wizard
main()

