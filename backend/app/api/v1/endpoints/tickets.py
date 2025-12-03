"""
Ticket endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from typing import List, Optional
from app.api.v1.schemas.ticket import (
    TicketCreate, TicketUpdate, TicketResponse,
    CommentCreate, TicketApproveRequest, TicketRejectRequest
)
from app.middleware.auth import get_current_user, get_current_admin
from app.db.database import get_database
from app.db.models import TicketModel
from bson import ObjectId
from datetime import datetime
import aiofiles
import os
from app.core.config import settings

router = APIRouter()


def normalize_ticket(ticket: dict) -> dict:
    """Normalize ticket data for API response"""
    if not ticket:
        return ticket
    
    # Create a copy to avoid modifying the original
    normalized = dict(ticket)
    
    # Convert ObjectId to string
    normalized["id"] = str(ticket["_id"])
    # Ensure ticketId is always set - use ticket_id from DB or generate from _id
    normalized["ticketId"] = ticket.get("ticket_id") or f"TKT-{str(ticket['_id'])[-8:].upper()}"
    
    # Convert creator
    if ticket.get("creator"):
        normalized["creator"] = str(ticket["creator"])
    
    # Convert assignee
    if ticket.get("assignee"):
        normalized["assignee"] = str(ticket["assignee"])
    
    # Convert category
    if ticket.get("category"):
        normalized["category"] = str(ticket["category"])
    
    # Convert department
    if ticket.get("department"):
        normalized["department"] = str(ticket["department"])
    
    # Convert organization
    if ticket.get("organization"):
        normalized["organization"] = str(ticket["organization"])
    
    # Convert date fields to camelCase and ISO strings
    # Handle potential non-datetime objects gracefully
    for old_key, new_key in [
        ("created_at", "createdAt"),
        ("updated_at", "updatedAt"),
        ("due_date", "dueDate"),
        ("approved_at", "approvedAt"),
    ]:
        if old_key in ticket and ticket[old_key] is not None:
            dt = ticket[old_key]
            normalized[new_key] = dt.isoformat() if hasattr(dt, "isoformat") else str(dt)
        else:
            normalized[new_key] = None  # Ensure key exists even if null
    
    # Handle approved_by - will be populated by calling function if needed
    if ticket.get("approved_by"):
        normalized["approvedBy"] = str(ticket["approved_by"])
    
    # Remove _id and original snake_case fields (keep camelCase versions)
    for key in ["_id", "created_at", "updated_at", "due_date", "approved_at", "ticket_id", "approved_by"]:
        if key in normalized:
            del normalized[key]
    
    # Ensure all required fields exist
    if "ticketId" not in normalized:
        normalized["ticketId"] = f"TKT-{str(ticket['_id'])[-8:].upper()}"
    if "createdAt" not in normalized:
        normalized["createdAt"] = datetime.utcnow().isoformat()
    if "updatedAt" not in normalized:
        normalized["updatedAt"] = datetime.utcnow().isoformat()
    
    return normalized


def generate_ticket_id() -> str:
    """Generate unique ticket ID"""
    import random
    import string
    return f"TKT-{''.join(random.choices(string.ascii_uppercase + string.digits, k=8))}"


@router.get("/", response_model=List[TicketResponse])
async def get_tickets(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    organization: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get all tickets with filters"""
    db = await get_database()
    query = {}
    
    # Role-based filtering
    if current_user.get("role") not in ["admin", "agent"]:
        # Regular users only see their own tickets
        query["creator"] = ObjectId(current_user["id"])
    
    # Apply filters
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
    if organization:
        query["organization"] = ObjectId(organization)
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"ticket_id": {"$regex": search, "$options": "i"}}
        ]
    
    cursor = db.tickets.find(query).sort("created_at", -1)
    tickets = await cursor.to_list(length=100)
    
    result = [normalize_ticket(ticket) for ticket in tickets]
    return result


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(ticket_id: str, current_user: dict = Depends(get_current_user)):
    """Get ticket by ID (supports both ObjectId and ticketId like TKT-xxx)"""
    db = await get_database()
    
    # Try to find by ObjectId first
    ticket = None
    try:
        ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
    except:
        pass
    
    # If not found by ObjectId, try to find by ticket_id (string like TKT-xxx)
    if not ticket:
        ticket = await db.tickets.find_one({"ticket_id": ticket_id})
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Check permissions
    if current_user.get("role") not in ["admin", "agent"]:
        if str(ticket["creator"]) != current_user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this ticket"
            )
    
    return normalize_ticket(ticket)


@router.post("/")
async def create_ticket(
    title: str = Form(...),
    description: str = Form(...),
    category: Optional[str] = Form(None),
    priority: str = Form("medium"),
    assignee: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    ticketId: Optional[int] = Form(None),
    attachments: List[UploadFile] = File([]),
    current_user: dict = Depends(get_current_user)
):
    """Create new ticket with file upload support"""
    db = await get_database()
    
    # Check ticket settings for manual/auto ticket ID
    ticket_settings = await db.ticket_settings.find_one({})
    manual_ticket_id_enabled = ticket_settings.get("manualTicketId", False) if ticket_settings else False
    
    # Generate or use manual ticket ID
    if manual_ticket_id_enabled and ticketId:
        # Use manual ticket ID - validate it doesn't exist
        existing = await db.tickets.find_one({"ticket_id": str(ticketId)})
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ticket ID {ticketId} already exists"
            )
        ticket_id = str(ticketId)
    else:
        # Auto-generate ticket ID
        ticket_id = generate_ticket_id()
    
    # Handle file uploads
    attachment_paths = []
    if attachments:
        for file in attachments:
            if file.filename:
                # Save file
                file_path = os.path.join(settings.UPLOAD_DIR, f"{ticket_id}_{file.filename}")
                os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
                content = await file.read()
                async with aiofiles.open(file_path, 'wb') as f:
                    await f.write(content)
                attachment_paths.append(file_path)
    
    # Create ticket document
    ticket_doc = {
        "ticket_id": ticket_id,
        "title": title,
        "description": description,
        "status": "open",
        "priority": priority,
        "creator": ObjectId(current_user["id"]),
        "attachments": attachment_paths,
        "comments": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    if category:
        try:
            # Try as ObjectId first
            ticket_doc["category"] = ObjectId(category)
        except:
            # If category is a name, try to find by name
            cat = await db.categories.find_one({"name": category})
            if cat:
                ticket_doc["category"] = cat["_id"]
    if department:
        try:
            ticket_doc["department"] = ObjectId(department)
        except:
            pass
    if assignee:
        try:
            ticket_doc["assignee"] = ObjectId(assignee)
        except:
            pass
    if current_user.get("organization"):
        ticket_doc["organization"] = ObjectId(current_user["organization"])
    
    result = await db.tickets.insert_one(ticket_doc)
    
    # Fetch created ticket
    ticket = await db.tickets.find_one({"_id": result.inserted_id})
    return normalize_ticket(ticket)


@router.post("/{ticket_id}/comments", response_model=TicketResponse)
async def add_comment(
    ticket_id: str,
    comment_data: CommentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add comment to ticket (supports both ObjectId and ticketId like TKT-xxx)"""
    db = await get_database()
    
    # Try to find by ObjectId first
    ticket = None
    try:
        ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
    except:
        pass
    
    # If not found by ObjectId, try to find by ticket_id (string like TKT-xxx)
    if not ticket:
        ticket = await db.tickets.find_one({"ticket_id": ticket_id})
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Add comment
    comment = {
        "message": comment_data.message,
        "is_internal": comment_data.is_internal,
        "user": ObjectId(current_user["id"]),
        "user_name": current_user["name"],
        "created_at": datetime.utcnow()
    }
    
    await db.tickets.update_one(
        {"_id": ticket["_id"]},
        {
            "$push": {"comments": comment},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    # Return updated ticket
    updated_ticket = await db.tickets.find_one({"_id": ticket["_id"]})
    return normalize_ticket(updated_ticket)


@router.put("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: str,
    ticket_data: TicketUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update ticket (supports both ObjectId and ticketId like TKT-xxx)"""
    db = await get_database()
    
    # Try to find by ObjectId first
    ticket = None
    try:
        ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
    except:
        pass
    
    # If not found by ObjectId, try to find by ticket_id (string like TKT-xxx)
    if not ticket:
        ticket = await db.tickets.find_one({"ticket_id": ticket_id})
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Check permissions
    is_creator = str(ticket["creator"]) == current_user["id"]
    is_admin = current_user.get("role") in ["admin", "agent"]
    
    if not (is_creator or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this ticket"
        )
    
    # Build update document
    update_doc = {"updated_at": datetime.utcnow()}
    
    if ticket_data.title:
        update_doc["title"] = ticket_data.title
    if ticket_data.description:
        update_doc["description"] = ticket_data.description
    # Allow status update for admins or ticket creator (for certain statuses)
    if ticket_data.status:
        # Admins can change to any status
        # Creators can change to certain statuses (e.g., closed, resolved)
        if is_admin:
            update_doc["status"] = ticket_data.status
        elif is_creator and ticket_data.status in ["closed", "resolved"]:
            update_doc["status"] = ticket_data.status
    if ticket_data.priority:
        update_doc["priority"] = ticket_data.priority
    if ticket_data.category:
        update_doc["category"] = ObjectId(ticket_data.category)
    if ticket_data.department:
        update_doc["department"] = ObjectId(ticket_data.department)
    if ticket_data.assignee and is_admin:
        update_doc["assignee"] = ObjectId(ticket_data.assignee)
    if ticket_data.due_date:
        update_doc["due_date"] = ticket_data.due_date
    
    # Use the ticket's _id for update (we already have the ticket object)
    await db.tickets.update_one(
        {"_id": ticket["_id"]},
        {"$set": update_doc}
    )
    
    # Return updated ticket
    updated_ticket = await db.tickets.find_one({"_id": ticket["_id"]})
    return normalize_ticket(updated_ticket)


@router.post("/{ticket_id}/approve", response_model=TicketResponse)
async def approve_ticket(
    ticket_id: str,
    current_user: dict = Depends(get_current_admin)
):
    """Approve ticket (admin only)"""
    db = await get_database()
    
    # Try to find by ObjectId first
    ticket = None
    try:
        ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
    except:
        pass
    
    # If not found by ObjectId, try to find by ticket_id (string like TKT-xxx)
    if not ticket:
        ticket = await db.tickets.find_one({"ticket_id": ticket_id})
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    # Update ticket with approval info
    update_doc = {
        "status": "approved",
        "approved_by": ObjectId(current_user["id"]),
        "approved_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.tickets.update_one(
        {"_id": ticket["_id"]},
        {"$set": update_doc}
    )
    
    # Fetch updated ticket
    updated_ticket = await db.tickets.find_one({"_id": ticket["_id"]})
    normalized = normalize_ticket(updated_ticket)
    
    # Fetch approved_by user details
    if updated_ticket.get("approved_by"):
        try:
            approved_by_user = await db.users.find_one({"_id": ObjectId(updated_ticket["approved_by"])})
            if approved_by_user:
                normalized["approvedBy"] = {
                    "_id": str(approved_by_user["_id"]),
                    "id": str(approved_by_user["_id"]),
                    "name": approved_by_user.get("name", "Unknown"),
                    "email": approved_by_user.get("email", "")
                }
        except Exception as e:
            print(f"Error fetching approved_by user: {e}")
            normalized["approvedBy"] = str(updated_ticket["approved_by"])
    
    return normalized


@router.post("/{ticket_id}/reject")
async def reject_ticket(
    ticket_id: str,
    request: TicketRejectRequest,
    current_user: dict = Depends(get_current_admin)
):
    """Reject ticket (admin only)"""
    db = await get_database()
    
    try:
        ticket = await db.tickets.find_one({"_id": ObjectId(ticket_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    if not ticket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found"
        )
    
    await db.tickets.update_one(
        {"_id": ObjectId(ticket_id)},
        {
            "$set": {
                "status": "rejected",
                "updated_at": datetime.utcnow()
            },
            "$push": {
                "comments": {
                    "message": f"Ticket rejected: {request.rejection_reason}",
                    "is_internal": False,
                    "user": current_user["id"],
                    "user_name": current_user["name"],
                    "created_at": datetime.utcnow()
                }
            }
        }
    )
    
    return {"message": "Ticket rejected successfully"}


@router.get("/stats/dashboard")
async def get_dashboard_stats(
    organization: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get dashboard statistics"""
    db = await get_database()
    query = {}
    
    # Role-based filtering
    if current_user.get("role") not in ["admin", "agent"]:
        query["creator"] = ObjectId(current_user["id"])
    
    if organization:
        query["organization"] = ObjectId(organization)
    
    total = await db.tickets.count_documents(query)
    open_count = await db.tickets.count_documents({**query, "status": "open"})
    closed_count = await db.tickets.count_documents({**query, "status": "closed"})
    in_progress = await db.tickets.count_documents({**query, "status": "in-progress"})
    
    # Get recent tickets
    recent_tickets = await db.tickets.find(query).sort("created_at", -1).limit(10).to_list(length=10)
    
    return {
        "totalTickets": total,
        "pendingTickets": open_count,
        "closedTickets": closed_count,
        "inProgressTickets": in_progress,
        "recentTickets": [normalize_ticket(t) for t in recent_tickets]
    }
