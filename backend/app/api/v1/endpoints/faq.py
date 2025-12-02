"""
FAQ endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.middleware.auth import get_current_user, get_current_admin
from app.db.database import get_database
from bson import ObjectId
from datetime import datetime

router = APIRouter()


@router.get("/")
async def get_faqs(
    organization: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get all FAQs"""
    db = await get_database()
    query = {"is_active": True}
    
    if organization:
        query["organization"] = ObjectId(organization)
    elif current_user.get("organization"):
        query["organization"] = ObjectId(current_user["organization"])
    
    if category:
        query["category"] = category
    
    if search:
        query["$or"] = [
            {"question": {"$regex": search, "$options": "i"}},
            {"answer": {"$regex": search, "$options": "i"}}
        ]
    
    cursor = db.faqs.find(query)
    faqs = await cursor.to_list(length=100)
    
    result = []
    for faq in faqs:
        faq["id"] = str(faq["_id"])
        if faq.get("organization"):
            faq["organization"] = str(faq["organization"])
        del faq["_id"]
        result.append(faq)
    
    return result


@router.get("/{faq_id}")
async def get_faq(faq_id: str, current_user: dict = Depends(get_current_user)):
    """Get FAQ by ID"""
    db = await get_database()
    
    try:
        faq = await db.faqs.find_one({"_id": ObjectId(faq_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="FAQ not found"
        )
    
    if not faq:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="FAQ not found"
        )
    
    faq["id"] = str(faq["_id"])
    if faq.get("organization"):
        faq["organization"] = str(faq["organization"])
    del faq["_id"]
    
    return faq


@router.post("/")
async def create_faq(faq_data: dict, current_user: dict = Depends(get_current_admin)):
    """Create FAQ (admin only)"""
    db = await get_database()
    
    if faq_data.get("organization"):
        faq_data["organization"] = ObjectId(faq_data["organization"])
    elif current_user.get("organization"):
        faq_data["organization"] = ObjectId(current_user["organization"])
    
    faq_data["is_active"] = True
    faq_data["helpful_count"] = 0
    faq_data["created_at"] = datetime.utcnow()
    
    result = await db.faqs.insert_one(faq_data)
    faq_data["id"] = str(result.inserted_id)
    if faq_data.get("organization"):
        faq_data["organization"] = str(faq_data["organization"])
    del faq_data["_id"]
    
    return faq_data


@router.put("/{faq_id}")
async def update_faq(faq_id: str, faq_data: dict, current_user: dict = Depends(get_current_admin)):
    """Update FAQ (admin only)"""
    db = await get_database()
    
    if faq_data.get("organization"):
        faq_data["organization"] = ObjectId(faq_data["organization"])
    
    await db.faqs.update_one(
        {"_id": ObjectId(faq_id)},
        {"$set": faq_data}
    )
    
    faq = await db.faqs.find_one({"_id": ObjectId(faq_id)})
    faq["id"] = str(faq["_id"])
    if faq.get("organization"):
        faq["organization"] = str(faq["organization"])
    del faq["_id"]
    
    return faq


@router.delete("/{faq_id}")
async def delete_faq(faq_id: str, current_user: dict = Depends(get_current_admin)):
    """Delete FAQ (admin only)"""
    db = await get_database()
    
    await db.faqs.update_one(
        {"_id": ObjectId(faq_id)},
        {"$set": {"is_active": False}}
    )
    
    return {"message": "FAQ deleted successfully"}


@router.post("/{faq_id}/helpful")
async def mark_helpful(faq_id: str, current_user: dict = Depends(get_current_user)):
    """Mark FAQ as helpful"""
    db = await get_database()
    
    await db.faqs.update_one(
        {"_id": ObjectId(faq_id)},
        {"$inc": {"helpful_count": 1}}
    )
    
    return {"message": "Marked as helpful"}
