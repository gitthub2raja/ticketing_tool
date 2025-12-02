# Backend Folder Structure

## 📁 Complete Directory Overview

```
backend/
├── 📄 Configuration Files
│   ├── requirements.txt         # Python dependencies
│   ├── Dockerfile               # Docker configuration
│   ├── .env.example             # Environment variables template
│   └── README.md                # Backend documentation
│
├── 📁 app/                      # Application package
│   ├── main.py                  # FastAPI application entry point
│   ├── __init__.py              # Package initialization
│   │
│   ├── 📁 api/                  # API layer
│   │   └── v1/                  # API version 1
│   │       ├── endpoints/       # API endpoints (routers)
│   │       │   ├── __init__.py
│   │       │   ├── auth.py      # Authentication endpoints
│   │       │   ├── tickets.py   # Ticket endpoints
│   │       │   ├── users.py     # User endpoints
│   │       │   ├── admin.py     # Admin endpoints
│   │       │   ├── organizations.py
│   │       │   ├── categories.py
│   │       │   ├── departments.py
│   │       │   ├── reports.py
│   │       │   ├── api_keys.py
│   │       │   ├── email.py
│   │       │   ├── email_templates.py
│   │       │   ├── email_automation.py
│   │       │   ├── chatbot.py
│   │       │   ├── faq.py
│   │       │   ├── teams.py
│   │       │   ├── backup.py
│   │       │   └── mfa.py
│   │       │
│   │       ├── models/           # Pydantic models
│   │       │   ├── __init__.py
│   │       │   ├── user.py      # User model
│   │       │   ├── ticket.py    # Ticket model
│   │       │   ├── category.py
│   │       │   └── ...
│   │       │
│   │       └── schemas/          # Request/Response schemas
│   │           ├── __init__.py
│   │           ├── user.py
│   │           ├── ticket.py
│   │           └── ...
│   │
│   ├── 📁 core/                 # Core functionality
│   │   ├── __init__.py
│   │   ├── config.py            # Application settings
│   │   └── security.py          # Security utilities (JWT, password hashing)
│   │
│   ├── 📁 db/                   # Database layer
│   │   ├── __init__.py
│   │   ├── database.py          # MongoDB connection
│   │   └── models/              # MongoDB models (if using ODM)
│   │       ├── user.py
│   │       ├── ticket.py
│   │       └── ...
│   │
│   ├── 📁 services/             # Business logic layer
│   │   ├── __init__.py
│   │   ├── email_service.py     # Email sending service
│   │   ├── chatbot_service.py   # Chatbot service
│   │   ├── sla_service.py       # SLA calculation service
│   │   ├── teams_service.py     # Teams integration service
│   │   └── backup_service.py    # Backup/restore service
│   │
│   ├── 📁 middleware/           # Custom middleware
│   │   ├── __init__.py
│   │   ├── auth.py             # Authentication middleware
│   │   └── logging.py          # Logging middleware
│   │
│   └── 📁 utils/               # Utility functions
│       ├── __init__.py
│       ├── helpers.py          # Helper functions
│       └── validators.py       # Validation utilities
│
├── 📁 tests/                    # Test files
│   ├── __init__.py
│   ├── test_auth.py
│   ├── test_tickets.py
│   └── ...
│
├── 📁 scripts/                  # Utility scripts
│   ├── create_admin.py         # Create admin user
│   ├── init_demo_data.py       # Initialize demo data
│   └── ...
│
└── 📁 uploads/                  # File uploads directory
```

## 📊 Statistics

- **Framework**: FastAPI 0.104.1
- **Python Version**: 3.11
- **Database**: MongoDB (Motor async driver)
- **API Endpoints**: ~17 endpoint modules
- **Architecture**: Clean architecture with separation of concerns

## 🎯 Key Directories Explained

### `app/api/v1/endpoints/`
FastAPI routers (endpoints):
- **auth.py**: Login, register, token management
- **tickets.py**: Ticket CRUD operations
- **users.py**: User management
- **admin.py**: Admin operations
- **Other endpoints**: Organizations, categories, departments, etc.

### `app/api/v1/models/`
Pydantic models for data validation:
- Request/response models
- Data validation schemas
- Type definitions

### `app/api/v1/schemas/`
Request/response schemas:
- Input validation
- Output serialization
- API documentation

### `app/core/`
Core application functionality:
- **config.py**: Settings and configuration
- **security.py**: JWT, password hashing, authentication

### `app/db/`
Database layer:
- **database.py**: MongoDB connection setup
- **models/**: Database models (if using ODM like Beanie)

### `app/services/`
Business logic layer:
- **email_service.py**: Email sending functionality
- **chatbot_service.py**: Chatbot integration
- **sla_service.py**: SLA calculations
- **teams_service.py**: Microsoft Teams integration

### `app/middleware/`
Custom middleware:
- Authentication middleware
- Logging middleware
- Error handling middleware

### `app/utils/`
Utility functions:
- Helper functions
- Validators
- Common utilities

## 🔧 Configuration Files

### `requirements.txt`
Python dependencies:
- **FastAPI**: Web framework
- **Uvicorn**: ASGI server
- **Motor**: Async MongoDB driver
- **Pydantic**: Data validation
- **python-jose**: JWT handling
- **passlib**: Password hashing
- **aiosmtplib**: Async email sending

### `Dockerfile`
- **Base Image**: Python 3.11-slim
- **Port**: 5000
- **Command**: Uvicorn ASGI server

### `.env.example`
Environment variables template:
- Database connection
- Security keys
- Email configuration
- Application settings

## 🚀 Development Workflow

### Local Development
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 5000
```

### Docker Build
```bash
# From project root
docker-compose build backend
docker-compose up backend
```

### Running Tests
```bash
pytest tests/
```

## 📝 Architecture Patterns

### 1. Clean Architecture
- **API Layer**: Endpoints and routers
- **Service Layer**: Business logic
- **Database Layer**: Data access
- **Core Layer**: Configuration and security

### 2. Dependency Injection
FastAPI's dependency injection system:
```python
from fastapi import Depends

async def get_current_user(token: str = Depends(oauth2_scheme)):
    # Dependency injection
    pass
```

### 3. Async/Await
All database and I/O operations are async:
```python
async def get_tickets():
    db = await get_database()
    tickets = await db.tickets.find().to_list()
    return tickets
```

### 4. Pydantic Models
Type-safe request/response validation:
```python
from pydantic import BaseModel

class TicketCreate(BaseModel):
    title: str
    description: str
    priority: str
```

## 🔍 Important Files

### Entry Points
- `app/main.py`: FastAPI application initialization

### Core Files
- `app/core/config.py`: Application settings
- `app/core/security.py`: Security utilities
- `app/db/database.py`: Database connection

### Key Endpoints
- `app/api/v1/endpoints/auth.py`: Authentication
- `app/api/v1/endpoints/tickets.py`: Ticket operations
- `app/api/v1/endpoints/admin.py`: Admin operations

## 🔐 Security Features

- **JWT Authentication**: Token-based authentication
- **Password Hashing**: Bcrypt password hashing
- **CORS**: Configurable CORS middleware
- **Input Validation**: Pydantic model validation
- **Environment Variables**: Secure configuration management

## 📚 API Documentation

FastAPI automatically generates:
- **Swagger UI**: Available at `/docs`
- **ReDoc**: Available at `/redoc`
- **OpenAPI Schema**: Available at `/api/openapi.json`

## 🗄️ Database

- **Database**: MongoDB
- **Driver**: Motor (async MongoDB driver)
- **ODM**: Can use Beanie or raw Motor
- **Connection**: Async connection pooling

## 🧪 Testing

- **Framework**: pytest
- **Location**: `tests/` directory
- **Coverage**: Unit tests, integration tests

## 📦 Dependencies

### Core
- **FastAPI 0.104.1**: Modern web framework
- **Uvicorn**: ASGI server
- **Motor 3.3.2**: Async MongoDB driver

### Security
- **python-jose**: JWT handling
- **passlib**: Password hashing
- **python-multipart**: File uploads

### Utilities
- **pydantic**: Data validation
- **python-dotenv**: Environment variables
- **aiosmtplib**: Async email
- **qrcode**: QR code generation (MFA)

## ✅ Migration from Node.js

This Python/FastAPI backend replaces the Node.js/Express backend:
- ✅ Same API endpoints structure
- ✅ Same MongoDB database
- ✅ Same authentication flow
- ✅ Async/await for better performance
- ✅ Type safety with Pydantic
- ✅ Automatic API documentation

## 🎯 Next Steps

1. Implement all endpoint logic
2. Create database models
3. Implement services
4. Add authentication middleware
5. Write tests
6. Set up CI/CD

