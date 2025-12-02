"""
Backup and restore endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from typing import List
from app.middleware.auth import get_current_admin
from app.db.database import get_database
from bson import ObjectId
from datetime import datetime
import json
import os
from pathlib import Path

router = APIRouter()

BACKUP_DIR = Path("backups")
BACKUP_DIR.mkdir(exist_ok=True)


@router.post("/create")
async def create_backup(current_user: dict = Depends(get_current_admin)):
    """Create backup (admin only)"""
    db = await get_database()
    
    backup_data = {
        "timestamp": datetime.utcnow().isoformat(),
        "collections": {}
    }
    
    # Backup all collections
    collections = ["users", "tickets", "organizations", "categories", "departments", 
                   "roles", "sla_policies", "email_templates", "email_automations",
                   "faqs", "api_keys", "chat_sessions", "teams_configs", "sso_configs",
                   "email_settings", "logos"]
    
    for collection_name in collections:
        collection = getattr(db, collection_name)
        documents = await collection.find({}).to_list(length=10000)
        # Convert ObjectId to string for JSON serialization
        for doc in documents:
            doc["_id"] = str(doc["_id"])
            for key, value in doc.items():
                if isinstance(value, ObjectId):
                    doc[key] = str(value)
        backup_data["collections"][collection_name] = documents
    
    # Save backup to file
    backup_filename = f"backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    backup_path = BACKUP_DIR / backup_filename
    
    with open(backup_path, "w") as f:
        json.dump(backup_data, f, indent=2, default=str)
    
    return {
        "message": "Backup created successfully",
        "backup_name": backup_filename
    }


@router.get("/list")
async def list_backups(current_user: dict = Depends(get_current_admin)):
    """List all backups (admin only)"""
    backups = []
    
    for file in BACKUP_DIR.glob("backup_*.json"):
        stat = file.stat()
        backups.append({
            "name": file.name,
            "size": stat.st_size,
            "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
        })
    
    return sorted(backups, key=lambda x: x["created_at"], reverse=True)


@router.get("/download/{backup_name}")
async def download_backup(backup_name: str, current_user: dict = Depends(get_current_admin)):
    """Download backup (admin only)"""
    backup_path = BACKUP_DIR / backup_name
    
    if not backup_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup not found"
        )
    
    return FileResponse(
        backup_path,
        media_type="application/json",
        filename=backup_name
    )


@router.delete("/{backup_name}")
async def delete_backup(backup_name: str, current_user: dict = Depends(get_current_admin)):
    """Delete backup (admin only)"""
    backup_path = BACKUP_DIR / backup_name
    
    if not backup_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup not found"
        )
    
    backup_path.unlink()
    
    return {"message": "Backup deleted successfully"}


@router.post("/restore")
async def restore_backup(
    backup_name: str,
    clear_existing: bool = False,
    current_user: dict = Depends(get_current_admin)
):
    """Restore backup (admin only)"""
    db = await get_database()
    backup_path = BACKUP_DIR / backup_name
    
    if not backup_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Backup not found"
        )
    
    with open(backup_path, "r") as f:
        backup_data = json.load(f)
    
    # Clear existing data if requested
    if clear_existing:
        collections = ["users", "tickets", "organizations", "categories", "departments"]
        for collection_name in collections:
            collection = getattr(db, collection_name)
            await collection.delete_many({})
    
    # Restore collections
    for collection_name, documents in backup_data.get("collections", {}).items():
        if hasattr(db, collection_name):
            collection = getattr(db, collection_name)
            # Convert string IDs back to ObjectId
            for doc in documents:
                if "_id" in doc:
                    doc["_id"] = ObjectId(doc["_id"])
                for key, value in doc.items():
                    if isinstance(value, str) and len(value) == 24:
                        try:
                            doc[key] = ObjectId(value)
                        except:
                            pass
            
            if documents:
                await collection.insert_many(documents)
    
    return {"message": "Backup restored successfully"}


@router.post("/upload")
async def upload_backup(
    backup_file: UploadFile = File(...),
    clear_existing: bool = False,
    current_user: dict = Depends(get_current_admin)
):
    """Upload and restore backup (admin only)"""
    db = await get_database()
    
    # Save uploaded file
    backup_filename = f"uploaded_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    backup_path = BACKUP_DIR / backup_filename
    
    content = await backup_file.read()
    with open(backup_path, "wb") as f:
        f.write(content)
    
    # Restore from uploaded file
    with open(backup_path, "r") as f:
        backup_data = json.load(f)
    
    # Clear existing data if requested
    if clear_existing:
        collections = ["users", "tickets", "organizations", "categories", "departments"]
        for collection_name in collections:
            collection = getattr(db, collection_name)
            await collection.delete_many({})
    
    # Restore collections
    for collection_name, documents in backup_data.get("collections", {}).items():
        if hasattr(db, collection_name):
            collection = getattr(db, collection_name)
            # Convert string IDs back to ObjectId
            for doc in documents:
                if "_id" in doc:
                    doc["_id"] = ObjectId(doc["_id"])
                for key, value in doc.items():
                    if isinstance(value, str) and len(value) == 24:
                        try:
                            doc[key] = ObjectId(value)
                        except:
                            pass
            
            if documents:
                await collection.insert_many(documents)
    
    return {"message": "Backup uploaded and restored successfully"}
