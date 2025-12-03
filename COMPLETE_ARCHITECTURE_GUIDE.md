# Complete Ticketing Tool Architecture Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Database Architecture](#database-architecture)
5. [How Everything Connects](#how-everything-connects)
6. [Key Flows & Code Examples](#key-flows--code-examples)
7. [API Endpoints Reference](#api-endpoints-reference)

---

## System Overview

### Technology Stack
- **Frontend**: React.js (Vite) with React Router, Context API, TailwindCSS
- **Backend**: FastAPI (Python) with async/await
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Deployment**: Docker Compose with Nginx reverse proxy

### Architecture Diagram
```
┌─────────────────┐
│   React Frontend │
│   (Port 80/443)  │
└────────┬─────────┘
         │ HTTP/HTTPS
         │
┌────────▼─────────┐
│   Nginx Proxy    │
│  (Routes /api/*)  │
└────────┬─────────┘
         │
┌────────▼─────────┐
│  FastAPI Backend │
│   (Port 5000)    │
└────────┬─────────┘
         │ MongoDB Driver (Motor)
         │
┌────────▼─────────┐
│   MongoDB        │
│   (Port 27017)   │
└──────────────────┘
```

---

## Frontend Architecture

### Folder Structure
```
frontend/src/
├── components/          # Reusable UI components
│   ├── layout/         # Layout components (Sidebar, TopBar, Layout)
│   ├── ui/             # Base UI components (Button, Input, Card, Modal, etc.)
│   ├── ProtectedRoute.jsx
│   └── ChatWidget.jsx
├── pages/              # Page components
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Tickets/        # Ticket-related pages
│   ├── Admin/          # Admin pages
│   └── SSO/            # SSO login pages
├── contexts/           # React Context providers
│   ├── AuthContext.jsx
│   ├── LogoContext.jsx
│   ├── SSOContext.jsx
│   └── ThemeContext.jsx
├── services/           # API service layer
│   ├── api.js          # Main API service with all endpoints
│   ├── emailService.js
│   └── securityService.js
├── utils/              # Utility functions
│   ├── dateHelpers.js
│   └── soundEffects.js
├── config/             # Configuration
│   └── theme.js
├── App.jsx             # Main app component with routing
└── main.jsx            # Entry point
```

### Key Frontend Concepts

#### 1. State Management with Context API

**AuthContext** (`contexts/AuthContext.jsx`):
```javascript
// Provides authentication state and methods
const { user, login, logout, updateUser, loading } = useAuth()

// Usage in components:
import { useAuth } from '../contexts/AuthContext'

function MyComponent() {
  const { user, logout } = useAuth()
  
  return (
    <div>
      <p>Welcome, {user?.name}</p>
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

#### 2. API Service Layer

**Centralized API Service** (`services/api.js`):
```javascript
// Base API call function with JWT token injection
const apiCall = async (endpoint, options = {}) => {
  const token = getAuthToken() // Gets token from localStorage
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })
  
  // Handles 401 errors (token expired)
  if (response.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }
  
  return response.json()
}

// Organized API modules
export const authAPI = {
  login: async (email, password) => { /* ... */ },
  getMe: async () => apiCall('/auth/me'),
}

export const ticketsAPI = {
  getAll: async () => apiCall('/tickets/'),
  create: async (ticketData) => apiCall('/tickets/', {
    method: 'POST',
    body: JSON.stringify(ticketData),
  }),
}
```

#### 3. Protected Routes

**ProtectedRoute Component** (`components/ProtectedRoute.jsx`):
```javascript
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading } = useAuth()
  
  if (loading) return <div>Loading...</div>
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }
  
  return children
}
```

#### 4. Routing Structure

**App.jsx** - Main routing:
```javascript
<Routes>
  {/* Public Routes */}
  <Route path="/login" element={<Login />} />
  
  {/* Protected Routes */}
  <Route
    path="/dashboard"
    element={
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    }
  />
  
  {/* Admin Routes */}
  <Route
    path="/admin/users"
    element={
      <ProtectedRoute requireAdmin>
        <Users />
      </ProtectedRoute>
    }
  />
</Routes>
```

---

## Backend Architecture

### Folder Structure
```
backend/app/
├── main.py                    # FastAPI app entry point
├── core/                      # Core configuration
│   ├── config.py             # Settings (env vars, database URI)
│   └── security.py           # JWT token creation/validation
├── db/                        # Database layer
│   ├── database.py           # MongoDB connection (Motor)
│   └── models.py             # Pydantic models for validation
├── middleware/                # Middleware
│   └── auth.py               # Authentication middleware
├── api/v1/                    # API version 1
│   ├── endpoints/            # Route handlers
│   │   ├── auth.py           # Login, register, JWT
│   │   ├── tickets.py        # Ticket CRUD
│   │   ├── users.py          # User management
│   │   ├── admin.py          # Admin operations
│   │   └── ...
│   ├── schemas/              # Pydantic request/response models
│   └── models/               # Database models
├── services/                 # Business logic services
│   ├── email_service.py      # Email sending logic
│   └── email_oauth2.py       # OAuth2 for email
└── utils/                     # Utility functions
```

### Key Backend Concepts

#### 1. FastAPI Application Setup

**main.py**:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import init_db
from app.api.v1.endpoints import auth, tickets, users

app = FastAPI(title="Ticketing Tool API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup():
    await init_db()

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(tickets.router, prefix="/api/v1/tickets", tags=["tickets"])
```

#### 2. Database Connection (Motor)

**database.py**:
```python
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client: AsyncIOMotorClient = None
database = None

async def init_db():
    """Initialize MongoDB connection"""
    global client, database
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    database = client[settings.DATABASE_NAME]
    return database

async def get_database():
    """Get database instance"""
    return database
```

#### 3. Authentication Middleware

**middleware/auth.py**:
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.security import decode_access_token
from app.db.database import get_database
from bson import ObjectId

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme)
):
    """Validate JWT token and return current user"""
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    user_id = payload.get("sub")
    db = await get_database()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Convert ObjectId to string for JSON serialization
    user["id"] = str(user["_id"])
    user["_id"] = str(user["_id"])
    
    return user

async def get_current_admin(
    current_user: dict = Depends(get_current_user)
):
    """Ensure user is admin"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
```

#### 4. Endpoint Example

**endpoints/tickets.py**:
```python
from fastapi import APIRouter, Depends, HTTPException, status
from app.middleware.auth import get_current_user
from app.db.database import get_database
from bson import ObjectId
from datetime import datetime

router = APIRouter()

@router.get("/")
async def get_tickets(
    current_user: dict = Depends(get_current_user)
):
    """Get all tickets for current user"""
    db = await get_database()
    
    # Build query based on user role
    query = {}
    if current_user.get("role") == "user":
        query["created_by"] = ObjectId(current_user["id"])
    elif current_user.get("role") == "agent":
        query["assigned_to"] = ObjectId(current_user["id"])
    
    cursor = db.tickets.find(query)
    tickets = await cursor.to_list(length=100)
    
    # Convert ObjectId to string for JSON
    result = []
    for ticket in tickets:
        ticket["id"] = str(ticket["_id"])
        if ticket.get("created_by"):
            ticket["created_by"] = str(ticket["created_by"])
        del ticket["_id"]
        result.append(ticket)
    
    return result

@router.post("/")
async def create_ticket(
    ticket_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Create a new ticket"""
    db = await get_database()
    
    ticket_doc = {
        "title": ticket_data.get("title"),
        "description": ticket_data.get("description"),
        "status": "open",
        "priority": ticket_data.get("priority", "medium"),
        "created_by": ObjectId(current_user["id"]),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    result = await db.tickets.insert_one(ticket_doc)
    ticket_doc["id"] = str(result.inserted_id)
    ticket_doc["created_by"] = str(ticket_doc["created_by"])
    del ticket_doc["_id"]
    
    return ticket_doc
```

---

## Database Architecture

### MongoDB Collections

#### Users Collection
```javascript
{
  _id: ObjectId,
  email: String (unique, required),
  name: String (required),
  password: String (hashed with bcrypt),
  role: String (enum: "user", "agent", "admin", "department-head"),
  organization: ObjectId (ref: organizations),
  department: ObjectId (ref: departments),
  mfa_enabled: Boolean,
  mfa_secret: String,
  is_active: Boolean,
  created_at: DateTime,
  updated_at: DateTime
}
```

#### Tickets Collection
```javascript
{
  _id: ObjectId,
  ticketId: String (unique, auto-increment or manual),
  title: String (required),
  description: String,
  status: String (enum: "open", "in-progress", "resolved", "closed", "approved", "rejected"),
  priority: String (enum: "low", "medium", "high", "urgent"),
  category: ObjectId (ref: categories),
  department: ObjectId (ref: departments),
  created_by: ObjectId (ref: users),
  assigned_to: ObjectId (ref: users),
  approved_by: ObjectId (ref: users),
  approved_at: DateTime,
  attachments: [{
    filename: String,
    url: String,
    uploaded_at: DateTime
  }],
  comments: [{
    user: ObjectId (ref: users),
    message: String,
    created_at: DateTime
  }],
  created_at: DateTime,
  updated_at: DateTime
}
```

#### Other Collections
- `organizations` - Company/Organization data
- `departments` - Department information
- `categories` - Ticket categories
- `roles` - User roles and permissions
- `sla_policies` - Service Level Agreement policies
- `email_templates` - Email template definitions
- `email_automations` - Automated email rules
- `faqs` - Frequently Asked Questions
- `chat_sessions` - Chatbot conversation sessions
- `apikeys` - API keys for external integrations
- `email_settings` - Email server configuration
- `logos` - Application logos
- `ticket_settings` - Ticket configuration

### Database Operations

**Query Example**:
```python
# Get tickets with filters
query = {
    "status": "open",
    "priority": {"$in": ["high", "urgent"]},
    "created_at": {"$gte": datetime.utcnow() - timedelta(days=7)}
}

cursor = db.tickets.find(query).sort("created_at", -1)
tickets = await cursor.to_list(length=50)
```

**Update Example**:
```python
await db.tickets.update_one(
    {"_id": ObjectId(ticket_id)},
    {
        "$set": {
            "status": "resolved",
            "updated_at": datetime.utcnow()
        },
        "$push": {
            "comments": {
                "user": ObjectId(current_user["id"]),
                "message": "Ticket resolved",
                "created_at": datetime.utcnow()
            }
        }
    }
)
```

---

## How Everything Connects

### 1. Frontend → Backend Connection

**Request Flow**:
```
React Component
    ↓
API Service (api.js)
    ↓
fetch() with JWT token in Authorization header
    ↓
Nginx Proxy (routes /api/* to backend:5000)
    ↓
FastAPI Backend
    ↓
Authentication Middleware (validates JWT)
    ↓
Endpoint Handler
    ↓
Database Query (Motor)
    ↓
MongoDB
```

**Example Flow - Login**:
```javascript
// Frontend: pages/Login.jsx
const handleLogin = async (e) => {
  e.preventDefault()
  try {
    const response = await authAPI.login(email, password)
    // authAPI.login() calls: POST /api/auth/login
    // Backend validates credentials, returns JWT token
    localStorage.setItem('token', response.token)
    navigate('/dashboard')
  } catch (error) {
    toast.error(error.message)
  }
}
```

```python
# Backend: endpoints/auth.py
@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # 1. Find user in MongoDB
    user = await db.users.find_one({"email": form_data.username})
    
    # 2. Verify password (bcrypt)
    if not verify_password(form_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # 3. Generate JWT token
    token = create_access_token(data={"sub": str(user["_id"])})
    
    # 4. Return token and user data
    return {"token": token, "user": user_data}
```

### 2. Backend → MongoDB Connection

**Connection Flow**:
```python
# 1. Initialize connection (on app startup)
await init_db()
# Creates: client = AsyncIOMotorClient(MONGODB_URI)
# Sets: database = client[DATABASE_NAME]

# 2. In endpoints, get database instance
db = await get_database()

# 3. Perform operations
result = await db.tickets.insert_one(ticket_doc)
ticket = await db.tickets.find_one({"_id": ObjectId(id)})
tickets = await db.tickets.find(query).to_list(length=100)
```

### 3. Authentication Flow

**Complete JWT Flow**:
```
1. User submits login form
   ↓
2. Frontend: POST /api/auth/login (email, password)
   ↓
3. Backend: Validates credentials against MongoDB
   ↓
4. Backend: Generates JWT token (expires in 24 hours)
   ↓
5. Frontend: Stores token in localStorage
   ↓
6. Frontend: Includes token in all subsequent requests
   Authorization: Bearer <token>
   ↓
7. Backend: Middleware validates token on each request
   ↓
8. Backend: Extracts user_id from token, fetches user from MongoDB
   ↓
9. Endpoint receives authenticated user object
```

---

## Key Flows & Code Examples

### Flow 1: Creating a Ticket

**Frontend** (`pages/Tickets/NewTicket.jsx`):
```javascript
import { useState } from 'react'
import { ticketsAPI } from '../../services/api'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export const NewTicket = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    category: '',
  })
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      // Create ticket via API
      const ticket = await ticketsAPI.create(formData)
      toast.success('Ticket created successfully!')
      navigate(`/tickets/${ticket.id}`)
    } catch (error) {
      toast.error(error.message || 'Failed to create ticket')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Ticket'}
      </button>
    </form>
  )
}
```

**Backend** (`endpoints/tickets.py`):
```python
@router.post("/")
async def create_ticket(
    ticket_data: dict,
    current_user: dict = Depends(get_current_user)
):
    db = await get_database()
    
    # Build ticket document
    ticket_doc = {
        "title": ticket_data.get("title"),
        "description": ticket_data.get("description"),
        "status": "open",
        "priority": ticket_data.get("priority", "medium"),
        "category": ObjectId(ticket_data.get("category")),
        "created_by": ObjectId(current_user["id"]),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    # Insert into MongoDB
    result = await db.tickets.insert_one(ticket_doc)
    
    # Format response
    ticket_doc["id"] = str(result.inserted_id)
    ticket_doc["created_by"] = str(ticket_doc["created_by"])
    del ticket_doc["_id"]
    
    return ticket_doc
```

### Flow 2: Fetching Tickets with Filters

**Frontend** (`pages/Tickets/TicketList.jsx`):
```javascript
import { useState, useEffect } from 'react'
import { ticketsAPI } from '../../services/api'

export const TicketList = () => {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
  })

  useEffect(() => {
    loadTickets()
  }, [filters])

  const loadTickets = async () => {
    try {
      setLoading(true)
      // API call with query parameters
      const data = await ticketsAPI.getAll(filters)
      setTickets(data)
    } catch (error) {
      toast.error('Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Filter UI */}
      <select onChange={(e) => setFilters({...filters, status: e.target.value})}>
        <option value="">All Statuses</option>
        <option value="open">Open</option>
        <option value="resolved">Resolved</option>
      </select>
      
      {/* Tickets list */}
      {tickets.map(ticket => (
        <TicketCard key={ticket.id} ticket={ticket} />
      ))}
    </div>
  )
}
```

**Backend** (`endpoints/tickets.py`):
```python
@router.get("/")
async def get_tickets(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    db = await get_database()
    
    # Build query
    query = {}
    
    # Role-based filtering
    if current_user.get("role") == "user":
        query["created_by"] = ObjectId(current_user["id"])
    elif current_user.get("role") == "agent":
        query["assigned_to"] = ObjectId(current_user["id"])
    
    # Apply filters
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    
    # Execute query
    cursor = db.tickets.find(query).sort("created_at", -1)
    tickets = await cursor.to_list(length=100)
    
    # Format response
    result = []
    for ticket in tickets:
        ticket["id"] = str(ticket["_id"])
        # Convert all ObjectIds to strings
        if ticket.get("created_by"):
            ticket["created_by"] = str(ticket["created_by"])
        del ticket["_id"]
        result.append(ticket)
    
    return result
```

### Flow 3: Adding Comments to Tickets

**Frontend**:
```javascript
const addComment = async (ticketId, comment) => {
  try {
    await ticketsAPI.addComment(ticketId, { message: comment })
    // Reload ticket to get updated comments
    await loadTicket(ticketId)
  } catch (error) {
    toast.error('Failed to add comment')
  }
}
```

**Backend**:
```python
@router.post("/{ticket_id}/comments")
async def add_comment(
    ticket_id: str,
    comment_data: dict,
    current_user: dict = Depends(get_current_user)
):
    db = await get_database()
    
    comment = {
        "user": ObjectId(current_user["id"]),
        "message": comment_data.get("message"),
        "created_at": datetime.utcnow()
    }
    
    await db.tickets.update_one(
        {"_id": ObjectId(ticket_id)},
        {
            "$push": {"comments": comment},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return {"message": "Comment added successfully"}
```

---

## API Endpoints Reference

### Authentication
- `POST /api/v1/auth/login` - Login (returns JWT token)
- `POST /api/v1/auth/register` - Register new user
- `GET /api/v1/auth/me` - Get current user info

### Tickets
- `GET /api/v1/tickets/` - Get all tickets (with filters)
- `GET /api/v1/tickets/{id}` - Get ticket details
- `POST /api/v1/tickets/` - Create new ticket
- `PUT /api/v1/tickets/{id}` - Update ticket
- `DELETE /api/v1/tickets/{id}` - Delete ticket
- `POST /api/v1/tickets/{id}/comments` - Add comment
- `POST /api/v1/tickets/{id}/approve` - Approve ticket (admin)

### Users
- `GET /api/v1/users/` - Get all users (admin)
- `GET /api/v1/users/{id}` - Get user details
- `POST /api/v1/users/` - Create user (admin)
- `PUT /api/v1/users/{id}` - Update user
- `DELETE /api/v1/users/{id}` - Delete user (admin)

### Admin
- `GET /api/v1/admin/organizations` - Get organizations
- `GET /api/v1/admin/departments` - Get departments
- `GET /api/v1/admin/roles` - Get roles
- `GET /api/v1/admin/api-keys` - Get API keys
- `POST /api/v1/admin/api-keys` - Create API key

### Email
- `GET /api/v1/email/settings` - Get email settings
- `POST /api/v1/email/settings` - Update email settings
- `GET /api/v1/email/templates` - Get email templates
- `POST /api/v1/email/send` - Send email

---

## Environment Variables

### Frontend (.env)
```bash
VITE_API_URL=/api  # Relative path (proxied by Nginx)
```

### Backend (.env)
```bash
MONGODB_URI=mongodb://mongoadmin:mongopassword@mongodb:27017/ticketing_tool?authSource=admin
DATABASE_NAME=ticketing_tool
SECRET_KEY=your-secret-key-here
JWT_SECRET=your-jwt-secret-here
ENVIRONMENT=production
```

---

## Running the Application

### Development
```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Access
Frontend: http://localhost
Backend API: http://localhost/api
MongoDB: localhost:27018
```

### Production
```bash
# Build and start
docker compose up -d --build

# Check status
docker compose ps

# Stop
docker compose down
```

---

## Key Takeaways

1. **Frontend** uses React Context for state, centralized API service for all backend calls
2. **Backend** uses FastAPI with async/await, Motor for MongoDB operations
3. **Authentication** via JWT tokens stored in localStorage, validated on each request
4. **Database** operations are async, ObjectIds are converted to strings for JSON
5. **Error Handling** is centralized in API service, shows user-friendly messages
6. **Role-Based Access** is enforced in backend middleware and frontend routes

This architecture provides a scalable, maintainable foundation for the ticketing tool.

