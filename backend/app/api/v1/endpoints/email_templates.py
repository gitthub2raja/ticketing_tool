"""
Email template endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.middleware.auth import get_current_admin
from app.db.database import get_database
from bson import ObjectId
from datetime import datetime

router = APIRouter()


@router.get("/")
async def get_email_templates(
    organization: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin)
):
    """Get all email templates (admin only)"""
    db = await get_database()
    query = {}
    
    if organization:
        query["organization"] = ObjectId(organization)
    if type:
        query["type"] = type
    
    cursor = db.email_templates.find(query)
    templates = await cursor.to_list(length=100)
    
    result = []
    for template in templates:
        template["id"] = str(template["_id"])
        if template.get("organization"):
            template["organization"] = str(template["organization"])
        del template["_id"]
        result.append(template)
    
    return result


@router.get("/{template_id}")
async def get_email_template(template_id: str, current_user: dict = Depends(get_current_admin)):
    """Get email template by ID (admin only)"""
    db = await get_database()
    
    try:
        template = await db.email_templates.find_one({"_id": ObjectId(template_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    template["id"] = str(template["_id"])
    if template.get("organization"):
        template["organization"] = str(template["organization"])
    del template["_id"]
    
    return template


@router.post("/")
async def create_email_template(template_data: dict, current_user: dict = Depends(get_current_admin)):
    """Create email template (admin only)"""
    db = await get_database()
    
    if template_data.get("organization"):
        template_data["organization"] = ObjectId(template_data["organization"])
    
    template_data["created_at"] = datetime.utcnow()
    
    result = await db.email_templates.insert_one(template_data)
    template_data["id"] = str(result.inserted_id)
    if template_data.get("organization"):
        template_data["organization"] = str(template_data["organization"])
    del template_data["_id"]
    
    return template_data


@router.put("/{template_id}")
async def update_email_template(
    template_id: str,
    template_data: dict,
    current_user: dict = Depends(get_current_admin)
):
    """Update email template (admin only)"""
    db = await get_database()
    
    if template_data.get("organization"):
        template_data["organization"] = ObjectId(template_data["organization"])
    
    await db.email_templates.update_one(
        {"_id": ObjectId(template_id)},
        {"$set": template_data}
    )
    
    template = await db.email_templates.find_one({"_id": ObjectId(template_id)})
    template["id"] = str(template["_id"])
    if template.get("organization"):
        template["organization"] = str(template["organization"])
    del template["_id"]
    
    return template


@router.delete("/{template_id}")
async def delete_email_template(template_id: str, current_user: dict = Depends(get_current_admin)):
    """Delete email template (admin only)"""
    db = await get_database()
    
    await db.email_templates.delete_one({"_id": ObjectId(template_id)})
    
    return {"message": "Email template deleted successfully"}


@router.post("/{template_id}/preview")
async def preview_email_template(template_id: str, current_user: dict = Depends(get_current_admin)):
    """Preview email template (admin only)"""
    db = await get_database()
    
    template = await db.email_templates.find_one({"_id": ObjectId(template_id)})
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # TODO: Render template with sample data
    return {
        "html": template.get("htmlBody", ""),
        "subject": template.get("subject", "")
    }
