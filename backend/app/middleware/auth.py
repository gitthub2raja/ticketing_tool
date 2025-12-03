"""
Authentication middleware
"""
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import decode_access_token
from app.db.database import get_database
from bson import ObjectId
from datetime import datetime
from typing import Optional
import json

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)
http_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    authorization: Optional[str] = Header(None)
):
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Try to get token from OAuth2 scheme first, then from Authorization header
    if not token and authorization:
        # Extract token from "Bearer <token>" format
        if authorization.startswith("Bearer "):
            token = authorization[7:]
        else:
            token = authorization
    
    if not token:
        raise credentials_exception
    
    try:
        payload = decode_access_token(token)
        if payload is None:
            raise credentials_exception
        
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        
        db = await get_database()
        try:
            user = await db.users.find_one({"_id": ObjectId(user_id)})
        except:
            raise credentials_exception
        
        if user is None:
            raise credentials_exception
        
        # Check if user is active
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is disabled"
            )
        
        # Convert all BSON types to JSON-serializable types
        # Create a clean dict with only JSON-serializable values
        user_dict = {
            "id": str(user["_id"]),
            "email": user.get("email", ""),
            "name": user.get("name", ""),
            "role": user.get("role", "user"),
            "is_active": user.get("is_active", True),
            "mfa_enabled": user.get("mfa_enabled", False),
        }
        
        # Convert ObjectId fields to strings if they exist
        if user.get("organization"):
            user_dict["organization"] = str(user["organization"])
        if user.get("department"):
            user_dict["department"] = str(user["department"])
        
        # Convert datetime fields to ISO strings
        if user.get("created_at"):
            user_dict["created_at"] = user["created_at"].isoformat() if hasattr(user["created_at"], "isoformat") else str(user["created_at"])
        if user.get("updated_at"):
            user_dict["updated_at"] = user["updated_at"].isoformat() if hasattr(user["updated_at"], "isoformat") else str(user["updated_at"])
        
        return user_dict
    except HTTPException:
        raise
    except Exception as e:
        print(f"ERROR: Authentication failed: {str(e)}")
        raise credentials_exception


async def get_current_admin(current_user: dict = Depends(get_current_user)):
    """Get current user and verify admin role"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

