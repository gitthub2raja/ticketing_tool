"""
API Key endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.middleware.auth import get_current_admin
from app.db.database import get_database
from bson import ObjectId
from datetime import datetime
import secrets

router = APIRouter()


@router.get("/")
async def get_api_keys(
    organization: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin)
):
    """Get all API keys (admin only)"""
    db = await get_database()
    query = {}
    
    if organization:
        query["organization"] = ObjectId(organization)
    
    cursor = db.api_keys.find(query)
    keys = await cursor.to_list(length=100)
    
    result = []
    for key in keys:
        key["id"] = str(key["_id"])
        if key.get("organization"):
            key["organization"] = str(key["organization"])
        # Don't return the actual key, only metadata
        if "key" in key:
            del key["key"]
        del key["_id"]
        result.append(key)
    
    return result


@router.post("/")
async def create_api_key(key_data: dict, current_user: dict = Depends(get_current_admin)):
    """Create API key (admin only)"""
    db = await get_database()
    
    # Generate API key
    api_key = secrets.token_urlsafe(32)
    
    key_doc = {
        "name": key_data.get("name", "API Key"),
        "key": api_key,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "last_used": None
    }
    
    if key_data.get("organization"):
        key_doc["organization"] = ObjectId(key_data["organization"])
    elif current_user.get("organization"):
        key_doc["organization"] = ObjectId(current_user["organization"])
    
    result = await db.api_keys.insert_one(key_doc)
    
    # Return key only once
    return {
        "id": str(result.inserted_id),
        "name": key_doc["name"],
        "key": api_key,  # Only returned on creation
        "is_active": True,
        "created_at": key_doc["created_at"]
    }


@router.put("/{key_id}")
async def update_api_key(key_id: str, key_data: dict, current_user: dict = Depends(get_current_admin)):
    """Update API key (admin only)"""
    db = await get_database()
    
    update_doc = {}
    if key_data.get("name"):
        update_doc["name"] = key_data["name"]
    if "is_active" in key_data:
        update_doc["is_active"] = key_data["is_active"]
    
    await db.api_keys.update_one(
        {"_id": ObjectId(key_id)},
        {"$set": update_doc}
    )
    
    key = await db.api_keys.find_one({"_id": ObjectId(key_id)})
    key["id"] = str(key["_id"])
    if key.get("organization"):
        key["organization"] = str(key["organization"])
    if "key" in key:
        del key["key"]
    del key["_id"]
    
    return key


@router.delete("/{key_id}")
async def delete_api_key(key_id: str, current_user: dict = Depends(get_current_admin)):
    """Delete API key (admin only)"""
    db = await get_database()
    
    await db.api_keys.delete_one({"_id": ObjectId(key_id)})
    
    return {"message": "API key deleted successfully"}


@router.post("/{key_id}/revoke")
async def revoke_api_key(key_id: str, current_user: dict = Depends(get_current_admin)):
    """Revoke API key (admin only)"""
    db = await get_database()
    
    await db.api_keys.update_one(
        {"_id": ObjectId(key_id)},
        {"$set": {"is_active": False}}
    )
    
    return {"message": "API key revoked successfully"}


@router.post("/{key_id}/activate")
async def activate_api_key(key_id: str, current_user: dict = Depends(get_current_admin)):
    """Activate API key (admin only)"""
    db = await get_database()
    
    await db.api_keys.update_one(
        {"_id": ObjectId(key_id)},
        {"$set": {"is_active": True}}
    )
    
    return {"message": "API key activated successfully"}
