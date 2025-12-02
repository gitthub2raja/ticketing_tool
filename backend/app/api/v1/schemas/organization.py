"""
Organization schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class OrganizationCreate(BaseModel):
    """Create organization request"""
    name: str
    description: Optional[str] = None


class OrganizationUpdate(BaseModel):
    """Update organization request"""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class OrganizationResponse(BaseModel):
    """Organization response"""
    id: str
    name: str
    description: Optional[str] = None
    is_active: bool
    created_at: datetime

