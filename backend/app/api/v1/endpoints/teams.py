"""
Microsoft Teams integration endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional
from app.middleware.auth import get_current_admin
from app.db.database import get_database
from bson import ObjectId
import httpx

router = APIRouter()


@router.get("/config")
async def get_teams_config(
    organization: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin)
):
    """Get Teams configuration (admin only)"""
    db = await get_database()
    query = {}
    
    if organization:
        query["organization"] = ObjectId(organization)
    elif current_user.get("organization"):
        query["organization"] = ObjectId(current_user["organization"])
    
    config = await db.teams_configs.find_one(query)
    
    if not config:
        return {
            "enabled": False,
            "webhook_url": "",
            "organization": organization
        }
    
    config["id"] = str(config["_id"])
    if config.get("organization"):
        config["organization"] = str(config["organization"])
    del config["_id"]
    
    return config


@router.post("/config")
async def save_teams_config(
    config_data: dict,
    organization: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin)
):
    """Save Teams configuration (admin only)"""
    db = await get_database()
    
    org_id = ObjectId(organization) if organization else ObjectId(current_user.get("organization")) if current_user.get("organization") else None
    
    config_doc = {
        "enabled": config_data.get("enabled", False),
        "webhook_url": config_data.get("webhook_url", ""),
        "organization": org_id
    }
    
    await db.teams_configs.update_one(
        {"organization": org_id},
        {"$set": config_doc},
        upsert=True
    )
    
    return {"message": "Teams configuration saved successfully"}


@router.put("/config/{config_id}")
async def update_teams_config(
    config_id: str,
    config_data: dict,
    current_user: dict = Depends(get_current_admin)
):
    """Update Teams configuration (admin only)"""
    db = await get_database()
    
    await db.teams_configs.update_one(
        {"_id": ObjectId(config_id)},
        {"$set": config_data}
    )
    
    config = await db.teams_configs.find_one({"_id": ObjectId(config_id)})
    config["id"] = str(config["_id"])
    if config.get("organization"):
        config["organization"] = str(config["organization"])
    del config["_id"]
    
    return config


@router.delete("/config/{config_id}")
async def delete_teams_config(config_id: str, current_user: dict = Depends(get_current_admin)):
    """Delete Teams configuration (admin only)"""
    db = await get_database()
    
    await db.teams_configs.delete_one({"_id": ObjectId(config_id)})
    
    return {"message": "Teams configuration deleted successfully"}


@router.post("/test")
async def test_teams_webhook(
    webhook_data: dict,
    organization: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin)
):
    """Test Teams webhook (admin only)"""
    webhook_url = webhook_data.get("webhookUrl")
    
    if not webhook_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Webhook URL is required"
        )
    
    test_message = {
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        "summary": "Test notification from Ticketing Tool",
        "themeColor": "0078D4",
        "title": "Test Notification",
        "text": "This is a test message from Ticketing Tool"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(webhook_url, json=test_message, timeout=10.0)
            response.raise_for_status()
            return {"message": "Webhook test successful", "status": response.status_code}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Webhook test failed: {str(e)}"
        )
