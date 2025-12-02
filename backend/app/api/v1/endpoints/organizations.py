"""
Organization endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.api.v1.schemas.organization import (
    OrganizationCreate, OrganizationUpdate, OrganizationResponse
)
from app.middleware.auth import get_current_admin
from app.db.database import get_database
from bson import ObjectId
from datetime import datetime

router = APIRouter()


@router.get("/", response_model=List[OrganizationResponse])
async def get_organizations(current_user: dict = Depends(get_current_admin)):
    """Get all organizations (admin only)"""
    db = await get_database()
    cursor = db.organizations.find({"is_active": True})
    organizations = await cursor.to_list(length=100)
    
    result = []
    for org in organizations:
        org["id"] = str(org["_id"])
        del org["_id"]
        result.append(org)
    
    return result


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(org_id: str, current_user: dict = Depends(get_current_admin)):
    """Get organization by ID (admin only)"""
    db = await get_database()
    
    try:
        org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    
    org["id"] = str(org["_id"])
    del org["_id"]
    return org


@router.post("/", response_model=OrganizationResponse)
async def create_organization(
    org_data: OrganizationCreate,
    current_user: dict = Depends(get_current_admin)
):
    """Create new organization (admin only)"""
    db = await get_database()
    
    # Check if organization already exists
    existing = await db.organizations.find_one({"name": org_data.name})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization with this name already exists"
        )
    
    org_doc = {
        "name": org_data.name,
        "description": org_data.description,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    
    result = await db.organizations.insert_one(org_doc)
    org_doc["id"] = str(result.inserted_id)
    del org_doc["_id"]
    
    return org_doc


@router.put("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: str,
    org_data: OrganizationUpdate,
    current_user: dict = Depends(get_current_admin)
):
    """Update organization (admin only)"""
    db = await get_database()
    
    update_doc = {}
    if org_data.name:
        update_doc["name"] = org_data.name
    if org_data.description is not None:
        update_doc["description"] = org_data.description
    if org_data.is_active is not None:
        update_doc["is_active"] = org_data.is_active
    
    await db.organizations.update_one(
        {"_id": ObjectId(org_id)},
        {"$set": update_doc}
    )
    
    org = await db.organizations.find_one({"_id": ObjectId(org_id)})
    org["id"] = str(org["_id"])
    del org["_id"]
    
    return org


@router.delete("/{org_id}")
async def delete_organization(org_id: str, current_user: dict = Depends(get_current_admin)):
    """Delete organization (admin only)"""
    db = await get_database()
    
    await db.organizations.update_one(
        {"_id": ObjectId(org_id)},
        {"$set": {"is_active": False}}
    )
    
    return {"message": "Organization deleted successfully"}
