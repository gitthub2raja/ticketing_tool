"""
Department schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DepartmentCreate(BaseModel):
    """Create department request"""
    name: str
    description: Optional[str] = None
    organization: Optional[str] = None
    head: Optional[str] = None


class DepartmentUpdate(BaseModel):
    """Update department request"""
    name: Optional[str] = None
    description: Optional[str] = None
    head: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentResponse(BaseModel):
    """Department response"""
    id: str
    name: str
    description: Optional[str] = None
    organization: Optional[str] = None
    head: Optional[str] = None
    is_active: bool
    created_at: datetime

