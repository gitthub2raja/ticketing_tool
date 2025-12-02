"""
Authentication endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.api.v1.schemas.auth import (
    LoginRequest, LoginResponse, RegisterRequest, 
    TokenResponse, MFAVerifyRequest, MFASetupResponse
)
from app.core.security import verify_password, create_access_token, get_password_hash
from app.db.database import get_database
from app.middleware.auth import get_current_user
from datetime import timedelta
from bson import ObjectId
import pyotp
import qrcode
import io
import base64

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """User login endpoint"""
    db = await get_database()
    
    # Find user by email
    user = await db.users.find_one({"email": form_data.username})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(form_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user is active
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    # Check if MFA is enabled
    if user.get("mfa_enabled") and user.get("mfa_secret"):
        # Generate temporary token for MFA verification
        from app.core.config import settings
        temp_token = create_access_token(
            data={"sub": str(user["_id"]), "mfa_required": True},
            expires_delta=timedelta(minutes=10)
        )
        return LoginResponse(
            token="",
            user={},
            mfaRequired=True,
            tempToken=temp_token
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(user["_id"])},
        expires_delta=timedelta(hours=24)
    )
    
    # Prepare user data
    user_data = {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", "user"),
        "organization": str(user["organization"]) if user.get("organization") else None,
        "department": str(user["department"]) if user.get("department") else None,
    }
    
    return LoginResponse(
        token=access_token,
        user=user_data,
        mfaRequired=False
    )


@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest):
    """User registration endpoint"""
    db = await get_database()
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": request.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    hashed_password = get_password_hash(request.password)
    
    # Create user
    user_data = {
        "email": request.email,
        "name": request.name,
        "password": hashed_password,
        "role": "user",
        "is_active": True,
        "mfa_enabled": False,
    }
    
    if request.organization:
        user_data["organization"] = ObjectId(request.organization)
    
    result = await db.users.insert_one(user_data)
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(result.inserted_id)},
        expires_delta=timedelta(hours=24)
    )
    
    user_data["id"] = str(result.inserted_id)
    del user_data["password"]
    del user_data["_id"]
    
    return TokenResponse(token=access_token, user=user_data)


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user information"""
    return current_user


@router.post("/mfa/verify-login", response_model=TokenResponse)
async def verify_mfa_login(request: MFAVerifyRequest):
    """Verify MFA code during login"""
    from app.core.security import decode_access_token
    from datetime import timedelta
    
    # Decode temp token
    payload = decode_access_token(request.tempToken)
    if not payload or not payload.get("mfa_required"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid temporary token"
        )
    
    user_id = payload.get("sub")
    db = await get_database()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify MFA code
    totp = pyotp.TOTP(user["mfa_secret"])
    if not totp.verify(request.code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA code"
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(user["_id"])},
        expires_delta=timedelta(hours=24)
    )
    
    user_data = {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", "user"),
        "organization": str(user["organization"]) if user.get("organization") else None,
        "department": str(user["department"]) if user.get("department") else None,
    }
    
    return TokenResponse(token=access_token, user=user_data)
