"""
User endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from app.middleware.auth import get_current_user, get_current_admin
from app.db.database import get_database
from app.core.security import get_password_hash
from app.services.email_service import send_welcome_email
from app.core.config import settings
from bson import ObjectId

router = APIRouter()


@router.get("/")
async def get_users(
    organization: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin)
):
    """Get all users (admin only)"""
    try:
        db = await get_database()
        query = {}
        
        if organization:
            try:
                query["organization"] = ObjectId(organization)
            except:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid organization ID"
                )
        
        cursor = db.users.find(query)
        users = await cursor.to_list(length=100)
        
        result = []
        for user in users:
            user["id"] = str(user["_id"])
            if user.get("organization"):
                user["organization"] = str(user["organization"])
            if user.get("department"):
                user["department"] = str(user["department"])
            del user["_id"]
            # Safely remove password if it exists
            user.pop("password", None)
            result.append(user)
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR: Failed to get users: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve users"
        )


@router.get("/mentions")
async def get_user_mentions(current_user: dict = Depends(get_current_user)):
    """Get users for mentions"""
    db = await get_database()
    query = {"is_active": True}
    
    # Filter by organization if user has one
    if current_user.get("organization"):
        query["organization"] = ObjectId(current_user["organization"])
    
    cursor = db.users.find(query)
    users = await cursor.to_list(length=100)
    
    return [
        {
            "id": str(u["_id"]),
            "name": u["name"],
            "email": u["email"]
        }
        for u in users
    ]


@router.get("/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get user by ID"""
    db = await get_database()
    
    try:
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    except:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check permissions
    if current_user.get("role") != "admin" and str(user["_id"]) != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    user["id"] = str(user["_id"])
    if user.get("organization"):
        user["organization"] = str(user["organization"])
    if user.get("department"):
        user["department"] = str(user["department"])
    del user["_id"]
    del user["password"]
    
    return user


@router.post("/")
async def create_user(
    user_data: dict,
    current_user: dict = Depends(get_current_admin)
):
    """Create new user (admin only)"""
    db = await get_database()
    
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.get("email")})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already exists"
        )
    
    # Hash password
    hashed_password = get_password_hash(user_data.get("password", "password123"))
    
    # Create user
    new_user = {
        "email": user_data["email"],
        "name": user_data["name"],
        "password": hashed_password,
        "role": user_data.get("role", "user"),
        "is_active": user_data.get("is_active", True),
        "mfa_enabled": False,
    }
    
    if user_data.get("organization"):
        new_user["organization"] = ObjectId(user_data["organization"])
    if user_data.get("department"):
        new_user["department"] = ObjectId(user_data["department"])
    
    result = await db.users.insert_one(new_user)
    
    # Store password temporarily for email (before deleting it)
    temp_password = user_data.get("password", "password123")
    
    # Convert ObjectId fields to strings for JSON serialization
    new_user["id"] = str(result.inserted_id)
    if new_user.get("organization"):
        new_user["organization"] = str(new_user["organization"])
    if new_user.get("department"):
        new_user["department"] = str(new_user["department"])
    
    # Remove sensitive/internal fields
    del new_user["password"]
    if "_id" in new_user:
        del new_user["_id"]
    
    # Send welcome email notification if requested (non-blocking)
    send_welcome_email_flag = user_data.get("sendWelcomeEmail", True)  # Default to True if not specified
    if send_welcome_email_flag:
        try:
            login_url = f"{settings.FRONTEND_URL}/login"
            email_sent = await send_welcome_email(
                user_email=new_user["email"],
                user_name=new_user["name"],
                password=temp_password if user_data.get("password") else None,
                login_url=login_url
            )
            if email_sent:
                print(f"INFO: Welcome email sent successfully to {new_user['email']}")
            else:
                print(f"WARNING: Welcome email could not be sent to {new_user['email']} (email settings may not be configured)")
        except Exception as e:
            # Log error but don't fail user creation if email fails
            print(f"WARNING: Failed to send welcome email to {new_user['email']}: {str(e)}")
    else:
        print(f"INFO: Welcome email skipped for {new_user['email']} (sendWelcomeEmail=false)")
    
    return new_user


@router.put("/{user_id}")
async def update_user(
    user_id: str,
    user_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update user"""
    db = await get_database()
    
    # Check permissions
    if current_user.get("role") != "admin" and str(user_id) != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized"
        )
    
    update_doc = {}
    
    if user_data.get("name"):
        update_doc["name"] = user_data["name"]
    if user_data.get("email"):
        update_doc["email"] = user_data["email"]
    if user_data.get("role") and current_user.get("role") == "admin":
        update_doc["role"] = user_data["role"]
    if user_data.get("organization"):
        update_doc["organization"] = ObjectId(user_data["organization"])
    if user_data.get("department"):
        update_doc["department"] = ObjectId(user_data["department"])
    if "is_active" in user_data and current_user.get("role") == "admin":
        update_doc["is_active"] = user_data["is_active"]
    
    if user_data.get("password") and (current_user.get("role") == "admin" or str(user_id) == current_user["id"]):
        update_doc["password"] = get_password_hash(user_data["password"])
    
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_doc}
    )
    
    # Return updated user
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    user["id"] = str(user["_id"])
    if user.get("organization"):
        user["organization"] = str(user["organization"])
    if user.get("department"):
        user["department"] = str(user["department"])
    del user["_id"]
    del user["password"]
    
    return user


@router.delete("/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_admin)):
    """Delete user (admin only)"""
    db = await get_database()
    
    await db.users.delete_one({"_id": ObjectId(user_id)})
    
    return {"message": "User deleted successfully"}
