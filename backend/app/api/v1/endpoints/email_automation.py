"""
Email automation endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.middleware.auth import get_current_admin
from app.db.database import get_database
from bson import ObjectId
from datetime import datetime

router = APIRouter()


@router.get("/")
async def get_email_automations(
    organization: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin)
):
    """Get all email automations (admin only)"""
    db = await get_database()
    query = {}
    
    if organization:
        query["organization"] = ObjectId(organization)
    
    cursor = db.email_automations.find(query)
    automations = await cursor.to_list(length=100)
    
    result = []
    for automation in automations:
        automation["id"] = str(automation["_id"])
        if automation.get("organization"):
            automation["organization"] = str(automation["organization"])
        del automation["_id"]
        result.append(automation)
    
    return result


@router.get("/{automation_id}")
async def get_email_automation(automation_id: str, current_user: dict = Depends(get_current_admin)):
    """Get email automation by ID (admin only)"""
    db = await get_database()
    
    try:
        automation = await db.email_automations.find_one({"_id": ObjectId(automation_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automation not found"
        )
    
    if not automation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automation not found"
        )
    
    automation["id"] = str(automation["_id"])
    if automation.get("organization"):
        automation["organization"] = str(automation["organization"])
    del automation["_id"]
    
    return automation


@router.post("/")
async def create_email_automation(automation_data: dict, current_user: dict = Depends(get_current_admin)):
    """Create email automation (admin only)"""
    db = await get_database()
    
    if automation_data.get("organization"):
        automation_data["organization"] = ObjectId(automation_data["organization"])
    
    automation_data["created_at"] = datetime.utcnow()
    
    result = await db.email_automations.insert_one(automation_data)
    automation_data["id"] = str(result.inserted_id)
    if automation_data.get("organization"):
        automation_data["organization"] = str(automation_data["organization"])
    del automation_data["_id"]
    
    return automation_data


@router.put("/{automation_id}")
async def update_email_automation(
    automation_id: str,
    automation_data: dict,
    current_user: dict = Depends(get_current_admin)
):
    """Update email automation (admin only)"""
    db = await get_database()
    
    if automation_data.get("organization"):
        automation_data["organization"] = ObjectId(automation_data["organization"])
    
    await db.email_automations.update_one(
        {"_id": ObjectId(automation_id)},
        {"$set": automation_data}
    )
    
    automation = await db.email_automations.find_one({"_id": ObjectId(automation_id)})
    automation["id"] = str(automation["_id"])
    if automation.get("organization"):
        automation["organization"] = str(automation["organization"])
    del automation["_id"]
    
    return automation


@router.delete("/{automation_id}")
async def delete_email_automation(automation_id: str, current_user: dict = Depends(get_current_admin)):
    """Delete email automation (admin only)"""
    db = await get_database()
    
    await db.email_automations.delete_one({"_id": ObjectId(automation_id)})
    
    return {"message": "Email automation deleted successfully"}


@router.post("/{automation_id}/run")
async def run_email_automation(automation_id: str, current_user: dict = Depends(get_current_admin)):
    """Run email automation manually (admin only)"""
    db = await get_database()
    
    automation = await db.email_automations.find_one({"_id": ObjectId(automation_id)})
    
    if not automation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Automation not found"
        )
    
    # TODO: Implement automation execution
    return {"message": "Automation executed successfully"}
