"""
Department endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.api.v1.schemas.department import (
    DepartmentCreate, DepartmentUpdate, DepartmentResponse
)
from app.middleware.auth import get_current_user, get_current_admin
from app.db.database import get_database
from bson import ObjectId
from datetime import datetime

router = APIRouter()


@router.get("/", response_model=List[DepartmentResponse])
async def get_departments(
    organization: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Get all departments"""
    db = await get_database()
    query = {"is_active": True}
    
    if organization:
        query["organization"] = ObjectId(organization)
    elif current_user.get("organization"):
        query["organization"] = ObjectId(current_user["organization"])
    
    cursor = db.departments.find(query)
    departments = await cursor.to_list(length=100)
    
    result = []
    for dept in departments:
        dept["id"] = str(dept["_id"])
        if dept.get("organization"):
            dept["organization"] = str(dept["organization"])
        if dept.get("head"):
            dept["head"] = str(dept["head"])
        del dept["_id"]
        result.append(dept)
    
    return result


@router.get("/{dept_id}", response_model=DepartmentResponse)
async def get_department(dept_id: str, current_user: dict = Depends(get_current_user)):
    """Get department by ID"""
    db = await get_database()
    
    try:
        dept = await db.departments.find_one({"_id": ObjectId(dept_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    if not dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    dept["id"] = str(dept["_id"])
    if dept.get("organization"):
        dept["organization"] = str(dept["organization"])
    if dept.get("head"):
        dept["head"] = str(dept["head"])
    del dept["_id"]
    
    return dept


@router.post("/", response_model=DepartmentResponse)
async def create_department(
    dept_data: DepartmentCreate,
    current_user: dict = Depends(get_current_admin)
):
    """Create new department (admin only)"""
    db = await get_database()
    
    dept_doc = {
        "name": dept_data.name,
        "description": dept_data.description,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    
    if dept_data.organization:
        dept_doc["organization"] = ObjectId(dept_data.organization)
    elif current_user.get("organization"):
        dept_doc["organization"] = ObjectId(current_user["organization"])
    
    if dept_data.head:
        dept_doc["head"] = ObjectId(dept_data.head)
    
    result = await db.departments.insert_one(dept_doc)
    dept_doc["id"] = str(result.inserted_id)
    if dept_doc.get("organization"):
        dept_doc["organization"] = str(dept_doc["organization"])
    if dept_doc.get("head"):
        dept_doc["head"] = str(dept_doc["head"])
    del dept_doc["_id"]
    
    return dept_doc


@router.put("/{dept_id}", response_model=DepartmentResponse)
async def update_department(
    dept_id: str,
    dept_data: DepartmentUpdate,
    current_user: dict = Depends(get_current_admin)
):
    """Update department (admin only)"""
    db = await get_database()
    
    update_doc = {}
    if dept_data.name:
        update_doc["name"] = dept_data.name
    if dept_data.description is not None:
        update_doc["description"] = dept_data.description
    if dept_data.head:
        update_doc["head"] = ObjectId(dept_data.head)
    if dept_data.is_active is not None:
        update_doc["is_active"] = dept_data.is_active
    
    await db.departments.update_one(
        {"_id": ObjectId(dept_id)},
        {"$set": update_doc}
    )
    
    dept = await db.departments.find_one({"_id": ObjectId(dept_id)})
    dept["id"] = str(dept["_id"])
    if dept.get("organization"):
        dept["organization"] = str(dept["organization"])
    if dept.get("head"):
        dept["head"] = str(dept["head"])
    del dept["_id"]
    
    return dept


@router.delete("/{dept_id}")
async def delete_department(dept_id: str, current_user: dict = Depends(get_current_admin)):
    """Delete department (admin only)"""
    db = await get_database()
    
    await db.departments.update_one(
        {"_id": ObjectId(dept_id)},
        {"$set": {"is_active": False}}
    )
    
    return {"message": "Department deleted successfully"}
