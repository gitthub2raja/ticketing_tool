"""
Category endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.api.v1.schemas.category import (
    CategoryCreate, CategoryUpdate, CategoryResponse
)
from app.middleware.auth import get_current_user, get_current_admin
from app.db.database import get_database
from bson import ObjectId
from datetime import datetime

router = APIRouter()


@router.get("/", response_model=List[CategoryResponse])
async def get_categories(
    organization: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get all categories"""
    db = await get_database()
    query = {"is_active": True}
    
    if organization:
        query["organization"] = ObjectId(organization)
    elif current_user.get("organization"):
        query["organization"] = ObjectId(current_user["organization"])
    
    cursor = db.categories.find(query)
    categories = await cursor.to_list(length=100)
    
    result = []
    for cat in categories:
        cat["id"] = str(cat["_id"])
        if cat.get("organization"):
            cat["organization"] = str(cat["organization"])
        del cat["_id"]
        result.append(cat)
    
    return result


@router.get("/all", response_model=List[CategoryResponse])
async def get_all_categories(
    organization: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin)
):
    """Get all categories including inactive (admin only)"""
    db = await get_database()
    query = {}
    
    if organization:
        query["organization"] = ObjectId(organization)
    
    cursor = db.categories.find(query)
    categories = await cursor.to_list(length=100)
    
    result = []
    for cat in categories:
        cat["id"] = str(cat["_id"])
        if cat.get("organization"):
            cat["organization"] = str(cat["organization"])
        del cat["_id"]
        result.append(cat)
    
    return result


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(category_id: str, current_user: dict = Depends(get_current_user)):
    """Get category by ID"""
    db = await get_database()
    
    try:
        category = await db.categories.find_one({"_id": ObjectId(category_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    
    category["id"] = str(category["_id"])
    if category.get("organization"):
        category["organization"] = str(category["organization"])
    del category["_id"]
    
    return category


@router.post("/", response_model=CategoryResponse)
async def create_category(
    category_data: CategoryCreate,
    current_user: dict = Depends(get_current_admin)
):
    """Create new category (admin only)"""
    db = await get_database()
    
    category_doc = {
        "name": category_data.name,
        "description": category_data.description,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    
    if category_data.organization:
        category_doc["organization"] = ObjectId(category_data.organization)
    elif current_user.get("organization"):
        category_doc["organization"] = ObjectId(current_user["organization"])
    
    result = await db.categories.insert_one(category_doc)
    category_doc["id"] = str(result.inserted_id)
    if category_doc.get("organization"):
        category_doc["organization"] = str(category_doc["organization"])
    del category_doc["_id"]
    
    return category_doc


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category_data: CategoryUpdate,
    current_user: dict = Depends(get_current_admin)
):
    """Update category (admin only)"""
    db = await get_database()
    
    update_doc = {}
    if category_data.name:
        update_doc["name"] = category_data.name
    if category_data.description is not None:
        update_doc["description"] = category_data.description
    if category_data.is_active is not None:
        update_doc["is_active"] = category_data.is_active
    
    await db.categories.update_one(
        {"_id": ObjectId(category_id)},
        {"$set": update_doc}
    )
    
    category = await db.categories.find_one({"_id": ObjectId(category_id)})
    category["id"] = str(category["_id"])
    if category.get("organization"):
        category["organization"] = str(category["organization"])
    del category["_id"]
    
    return category


@router.delete("/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(get_current_admin)):
    """Delete category (admin only)"""
    db = await get_database()
    
    await db.categories.update_one(
        {"_id": ObjectId(category_id)},
        {"$set": {"is_active": False}}
    )
    
    return {"message": "Category deleted successfully"}
