"""
Import Tickets endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.middleware.auth import get_current_admin
from app.db.database import get_database
from bson import ObjectId
from datetime import datetime
from typing import List, Optional

router = APIRouter()


@router.post("/import")
async def import_tickets(
    tickets_data: dict,
    current_user: dict = Depends(get_current_admin)
):
    """Import tickets from CSV/JSON (admin only)"""
    db = await get_database()
    
    tickets = tickets_data.get("tickets", [])
    if not tickets:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tickets provided"
        )
    
    imported = []
    errors = []
    
    for idx, ticket_data in enumerate(tickets):
        try:
            # Validate required fields
            if not ticket_data.get("title"):
                errors.append(f"Ticket {idx + 1}: Missing title")
                continue
            
            # Create ticket document
            ticket_doc = {
                "ticket_id": ticket_data.get("ticketId") or f"TKT-IMPORT-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{idx}",
                "title": ticket_data["title"],
                "description": ticket_data.get("description", ""),
                "status": ticket_data.get("status", "open"),
                "priority": ticket_data.get("priority", "medium"),
                "creator": ObjectId(current_user["id"]),
                "attachments": [],
                "comments": [],
                "created_at": datetime.fromisoformat(ticket_data.get("createdAt", datetime.utcnow().isoformat())) if isinstance(ticket_data.get("createdAt"), str) else (ticket_data.get("createdAt") or datetime.utcnow()),
                "updated_at": datetime.utcnow(),
            }
            
            # Handle optional fields
            if ticket_data.get("category"):
                ticket_doc["category"] = ObjectId(ticket_data["category"])
            if ticket_data.get("department"):
                ticket_doc["department"] = ObjectId(ticket_data["department"])
            if ticket_data.get("organization"):
                ticket_doc["organization"] = ObjectId(ticket_data["organization"])
            if ticket_data.get("assignee"):
                ticket_doc["assignee"] = ObjectId(ticket_data["assignee"])
            if ticket_data.get("dueDate"):
                due_date = ticket_data["dueDate"]
                if isinstance(due_date, str):
                    ticket_doc["due_date"] = datetime.fromisoformat(due_date)
                else:
                    ticket_doc["due_date"] = due_date
            
            # Insert ticket
            result = await db.tickets.insert_one(ticket_doc)
            imported.append({
                "id": str(result.inserted_id),
                "ticketId": ticket_doc["ticket_id"],
                "title": ticket_doc["title"]
            })
            
        except Exception as e:
            errors.append(f"Ticket {idx + 1}: {str(e)}")
    
    return {
        "message": f"Imported {len(imported)} tickets",
        "imported": imported,
        "errors": errors,
        "total": len(tickets),
        "success": len(imported),
        "failed": len(errors)
    }


@router.get("/template")
async def get_import_template(current_user: dict = Depends(get_current_admin)):
    """Get CSV/JSON import template (admin only)"""
    return {
        "csv_template": {
            "headers": ["ticketId", "title", "description", "status", "priority", "category", "department", "assignee", "dueDate", "createdAt"],
            "example": {
                "ticketId": "TKT-001",
                "title": "Sample Ticket",
                "description": "Ticket description",
                "status": "open",
                "priority": "high",
                "category": "category_id",
                "department": "department_id",
                "assignee": "user_id",
                "dueDate": "2025-12-31T23:59:59",
                "createdAt": "2025-01-01T00:00:00"
            }
        },
        "json_template": {
            "tickets": [
                {
                    "ticketId": "TKT-001",
                    "title": "Sample Ticket",
                    "description": "Ticket description",
                    "status": "open",
                    "priority": "high",
                    "category": "category_id",
                    "department": "department_id",
                    "assignee": "user_id",
                    "dueDate": "2025-12-31T23:59:59",
                    "createdAt": "2025-01-01T00:00:00"
                }
            ]
        }
    }




