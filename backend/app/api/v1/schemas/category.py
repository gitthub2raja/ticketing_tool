"""
Category schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CategoryCreate(BaseModel):
    """Create category request"""
    name: str
    description: Optional[str] = None
    organization: Optional[str] = None


class CategoryUpdate(BaseModel):
    """Update category request"""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class CategoryResponse(BaseModel):
    """Category response"""
    id: str
    name: str
    description: Optional[str] = None
    organization: Optional[str] = None
    is_active: bool
    created_at: datetime

