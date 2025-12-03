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
        # Handle organization - could be ObjectId or string
        if key.get("organization"):
            if isinstance(key["organization"], ObjectId):
                # Try to get organization name
                org = await db.organizations.find_one({"_id": key["organization"]})
                if org:
                    key["organization"] = {"_id": str(key["organization"]), "id": str(key["organization"]), "name": org.get("name", "Unknown")}
                else:
                    key["organization"] = {"_id": str(key["organization"]), "id": str(key["organization"]), "name": "Unknown"}
            elif isinstance(key["organization"], str):
                # Already a string, try to get org details
                try:
                    org = await db.organizations.find_one({"_id": ObjectId(key["organization"])})
                    if org:
                        key["organization"] = {"_id": key["organization"], "id": key["organization"], "name": org.get("name", "Unknown")}
                except:
                    pass
        
        # Don't return the actual key, only metadata
        if "key" in key:
            # Create key prefix for display (first 8 chars)
            key["keyPrefix"] = key["key"][:8] + "..." if len(key["key"]) > 8 else key["key"]
            del key["key"]
        
        # Ensure required fields exist with defaults
        if "permissions" not in key or not key.get("permissions"):
            key["permissions"] = ["read"]
        if not isinstance(key.get("permissions"), list):
            key["permissions"] = ["read"]
        
        # Map snake_case to camelCase for frontend compatibility
        if "is_active" in key:
            key["isActive"] = key["is_active"]
        elif "isActive" not in key:
            key["isActive"] = key.get("is_active", True)
        
        if "usageCount" not in key and "usage_count" in key:
            key["usageCount"] = key["usage_count"]
        elif "usageCount" not in key:
            key["usageCount"] = 0
        
        if "lastUsed" not in key:
            key["lastUsed"] = key.get("last_used")
        
        del key["_id"]
        result.append(key)
    
    return result


@router.post("/")
async def create_api_key(key_data: dict, current_user: dict = Depends(get_current_admin)):
    """Create API key (admin only)"""
    db = await get_database()
    
    # Generate API key
    api_key = secrets.token_urlsafe(32)
    
    # Get permissions from request or default to read
    permissions = key_data.get("permissions", ["read"])
    if isinstance(permissions, str):
        permissions = [p.strip() for p in permissions.split(",")]
    if not isinstance(permissions, list):
        permissions = ["read"]
    
    key_doc = {
        "name": key_data.get("name", "API Key"),
        "key": api_key,
        "is_active": True,
        "permissions": permissions,
        "rate_limit": key_data.get("rateLimit", 1000),
        "usage_count": 0,
        "created_at": datetime.utcnow(),
        "last_used": None
    }
    
    # Handle expiration date
    if key_data.get("expiresAt"):
        try:
            key_doc["expires_at"] = datetime.fromisoformat(key_data["expiresAt"].replace("Z", "+00:00"))
        except:
            pass
    
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
        "permissions": permissions,
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
    
    try:
        result = await db.api_keys.delete_one({"_id": ObjectId(key_id)})
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid API key ID: {str(e)}"
        )
    
    return {"message": "API key deleted successfully"}


@router.post("/{key_id}/revoke")
async def revoke_api_key(key_id: str, current_user: dict = Depends(get_current_admin)):
    """Revoke API key (admin only)"""
    db = await get_database()
    
    try:
        result = await db.api_keys.update_one(
            {"_id": ObjectId(key_id)},
            {"$set": {"is_active": False}}
        )
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid API key ID: {str(e)}"
        )
    
    return {"message": "API key revoked successfully"}


@router.post("/{key_id}/activate")
async def activate_api_key(key_id: str, current_user: dict = Depends(get_current_admin)):
    """Activate API key (admin only)"""
    db = await get_database()
    
    try:
        result = await db.api_keys.update_one(
            {"_id": ObjectId(key_id)},
            {"$set": {"is_active": True}}
        )
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid API key ID: {str(e)}"
        )
    
    return {"message": "API key activated successfully"}
