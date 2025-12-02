"""
Chatbot endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List, Optional
from app.middleware.auth import get_current_user
from app.db.database import get_database
from bson import ObjectId
from datetime import datetime
import secrets

router = APIRouter()


@router.post("/session")
async def create_session(session_data: dict, current_user: dict = Depends(get_current_user)):
    """Create chat session"""
    db = await get_database()
    
    session_doc = {
        "user": ObjectId(current_user["id"]),
        "platform": session_data.get("platform", "web"),
        "created_at": datetime.utcnow(),
        "messages": []
    }
    
    result = await db.chat_sessions.insert_one(session_doc)
    session_doc["id"] = str(result.inserted_id)
    session_doc["user"] = str(session_doc["user"])
    del session_doc["_id"]
    
    return {"session": session_doc, "messages": []}


@router.post("/message")
async def send_message(
    message: Optional[str] = None,
    session_id: Optional[str] = None,
    attachments: List[UploadFile] = File([]),
    current_user: dict = Depends(get_current_user)
):
    """Send message to chatbot"""
    db = await get_database()
    
    # Get or create session
    if not session_id:
        session_doc = {
            "user": ObjectId(current_user["id"]),
            "platform": "web",
            "created_at": datetime.utcnow(),
            "messages": []
        }
        session_result = await db.chat_sessions.insert_one(session_doc)
        session_id = str(session_result.inserted_id)
    
    # Create message
    message_doc = {
        "message": message or "",
        "user": current_user["id"],
        "user_name": current_user["name"],
        "attachments": [],
        "created_at": datetime.utcnow(),
        "is_bot": False
    }
    
    # Handle attachments
    # TODO: Save attachments to disk
    
    # Add message to session
    await db.chat_sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$push": {"messages": message_doc}}
    )
    
    # TODO: Process message with chatbot and generate response
    bot_response = {
        "message": "This is a placeholder response. Chatbot implementation pending.",
        "created_at": datetime.utcnow(),
        "is_bot": True
    }
    
    await db.chat_sessions.update_one(
        {"_id": ObjectId(session_id)},
        {"$push": {"messages": bot_response}}
    )
    
    return {
        "message": bot_response,
        "session_id": session_id
    }


@router.post("/create-ticket")
async def create_ticket_from_chat(ticket_data: dict, current_user: dict = Depends(get_current_user)):
    """Create ticket from chat session"""
    db = await get_database()
    
    # Generate ticket ID
    import random
    import string
    ticket_id = f"TKT-{''.join(random.choices(string.ascii_uppercase + string.digits, k=8))}"
    
    ticket_doc = {
        "ticket_id": ticket_id,
        "title": ticket_data.get("title", "Ticket from Chat"),
        "description": ticket_data.get("description", ""),
        "status": "open",
        "priority": ticket_data.get("priority", "medium"),
        "creator": ObjectId(current_user["id"]),
        "attachments": [],
        "comments": [],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    if ticket_data.get("category"):
        ticket_doc["category"] = ObjectId(ticket_data["category"])
    if ticket_data.get("department"):
        ticket_doc["department"] = ObjectId(ticket_data["department"])
    if current_user.get("organization"):
        ticket_doc["organization"] = ObjectId(current_user["organization"])
    
    result = await db.tickets.insert_one(ticket_doc)
    
    return {
        "id": str(result.inserted_id),
        "ticket_id": ticket_id,
        "message": "Ticket created successfully"
    }


@router.get("/history")
async def get_chat_history(
    userId: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get chat history"""
    db = await get_database()
    query = {}
    
    if userId and current_user.get("role") == "admin":
        query["user"] = ObjectId(userId)
    else:
        query["user"] = ObjectId(current_user["id"])
    
    cursor = db.chat_sessions.find(query).sort("created_at", -1).limit(limit)
    sessions = await cursor.to_list(length=limit)
    
    result = []
    for session in sessions:
        session["id"] = str(session["_id"])
        session["user"] = str(session["user"])
        del session["_id"]
        result.append(session)
    
    return result


@router.get("/session/{session_id}")
async def get_session(session_id: str, current_user: dict = Depends(get_current_user)):
    """Get chat session by ID"""
    db = await get_database()
    
    try:
        session = await db.chat_sessions.find_one({"_id": ObjectId(session_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Check permissions
    if str(session["user"]) != current_user["id"] and current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    session["id"] = str(session["_id"])
    session["user"] = str(session["user"])
    del session["_id"]
    
    return session


@router.post("/escalate")
async def escalate_chat(escalate_data: dict, current_user: dict = Depends(get_current_user)):
    """Escalate chat to human agent"""
    db = await get_database()
    
    session_id = escalate_data.get("sessionId")
    department_id = escalate_data.get("departmentId")
    
    await db.chat_sessions.update_one(
        {"_id": ObjectId(session_id)},
        {
            "$set": {
                "escalated": True,
                "escalated_to": ObjectId(department_id) if department_id else None,
                "escalated_at": datetime.utcnow()
            }
        }
    )
    
    return {"message": "Chat escalated successfully"}
