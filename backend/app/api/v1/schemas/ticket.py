"""
Ticket schemas
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class TicketCreate(BaseModel):
    """Create ticket request"""
    title: str
    description: str
    priority: str = "medium"
    category: Optional[str] = None
    department: Optional[str] = None
    due_date: Optional[datetime] = None


class TicketUpdate(BaseModel):
    """Update ticket request"""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    department: Optional[str] = None
    assignee: Optional[str] = None
    due_date: Optional[datetime] = None


class TicketResponse(BaseModel):
    """Ticket response (camelCase for frontend compatibility)"""
    id: str
    ticketId: str
    title: str
    description: str
    status: str
    priority: str
    category: Optional[str] = None
    department: Optional[str] = None
    organization: Optional[str] = None
    creator: str
    assignee: Optional[str] = None
    dueDate: Optional[str] = None  # ISO string
    attachments: List[str] = []
    comments: List[dict] = []
    createdAt: str  # ISO string
    updatedAt: str  # ISO string
    approvedAt: Optional[str] = None  # ISO string
    approvedBy: Optional[str] = None
    
    class Config:
        populate_by_name = True  # Allow both field name and alias


class CommentCreate(BaseModel):
    """Create comment request"""
    message: str
    is_internal: bool = False


class TicketApproveRequest(BaseModel):
    """Approve ticket request"""
    pass


class TicketRejectRequest(BaseModel):
    """Reject ticket request"""
    rejection_reason: str

