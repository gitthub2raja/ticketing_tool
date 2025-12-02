# How to Start the Backend Server

## Prerequisites

1. Python 3.11+ installed
2. Virtual environment created and activated
3. Dependencies installed

## Steps

### 1. Navigate to backend directory
```bash
cd backend
```

### 2. Activate virtual environment
```bash
source venv/bin/activate
```

### 3. Start the server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 5000
```

Or use the default port (8000):
```bash
uvicorn app.main:app --reload
```

## Server URLs

Once started, the server will be available at:
- **API**: http://localhost:5000 (or http://localhost:8000)
- **Swagger UI**: http://localhost:5000/docs
- **ReDoc**: http://localhost:5000/redoc
- **Health Check**: http://localhost:5000/api/health

## Environment Variables

Make sure to set up your `.env` file with:
- `MONGODB_URI` - MongoDB connection string
- `SECRET_KEY` - Secret key for JWT
- `JWT_SECRET` - JWT secret key
- Other configuration as needed

## Troubleshooting

### ModuleNotFoundError
If you get `ModuleNotFoundError: No module named 'fastapi'`:
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Port already in use
If port 5000 is already in use:
```bash
uvicorn app.main:app --reload --port 5001
```

### MongoDB connection error
Make sure MongoDB is running and the connection string in `.env` is correct.

