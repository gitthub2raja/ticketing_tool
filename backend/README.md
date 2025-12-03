# Backend API - Python/FastAPI

FastAPI-based backend for the Ticketing Tool application.

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- MongoDB (running locally or via Docker)

### Local Development

1. **Create virtual environment:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Run the server:**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 5000
```

The API will be available at:
- **API**: http://localhost:5000
- **Swagger UI**: http://localhost:5000/docs
- **ReDoc**: http://localhost:5000/redoc

### Docker

```bash
# From project root
docker-compose build backend
docker-compose up backend
```

## 📁 Project Structure

See [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md) for detailed structure.

## 🔧 Configuration

Environment variables are configured in `.env` file. See `.env.example` for template.

Key settings:
- `MONGODB_URI`: MongoDB connection string
- `SECRET_KEY`: Secret key for encryption
- `JWT_SECRET`: JWT token secret
- `FRONTEND_URL`: Frontend URL for CORS

## 📚 API Documentation

FastAPI automatically generates interactive API documentation:
- **Swagger UI**: `/docs`
- **ReDoc**: `/redoc`
- **OpenAPI JSON**: `/api/openapi.json`

## 🧪 Testing

```bash
pytest tests/
```

## 📦 Dependencies

See `requirements.txt` for all dependencies.

Main dependencies:
- **FastAPI**: Web framework
- **Uvicorn**: ASGI server
- **Motor**: Async MongoDB driver
- **Pydantic**: Data validation
- **python-jose**: JWT handling

## 🔐 Security

- JWT-based authentication
- Password hashing with bcrypt
- CORS middleware
- Input validation with Pydantic

## 📝 Development Notes

- All endpoints are async
- Database operations use Motor (async MongoDB driver)
- Type hints throughout codebase
- Automatic API documentation




