"""User model"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserBase(BaseModel):
    """Base user model"""
    email: EmailStr
    name: str
    role: str = "user"


class UserCreate(UserBase):
    """User creation model"""
    password: str


class UserUpdate(BaseModel):
    """User update model"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None


class User(UserBase):
    """User model"""
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True




