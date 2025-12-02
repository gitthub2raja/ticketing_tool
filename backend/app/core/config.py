"""
Application Configuration
"""
from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # Project
    PROJECT_NAME: str = "Ticketing Tool API"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Ticketing Tool Backend API"
    API_V1_STR: str = "/api"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 5000
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # Database
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://mongoadmin:mongopassword@mongodb:27017/ticketing_tool?authSource=admin")
    DATABASE_NAME: str = "ticketing_tool"
    
    # Security
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # JWT
    JWT_SECRET: str = "change-this-jwt-secret-in-production"
    JWT_ALGORITHM: str = "HS256"
    
    # Frontend
    FRONTEND_URL: str = "http://localhost"
    
    # Email
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "Ticketing Tool"
    
    # File Upload
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

