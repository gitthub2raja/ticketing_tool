"""
MFA endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from app.middleware.auth import get_current_user
from app.db.database import get_database
from bson import ObjectId
import pyotp
import qrcode
import io
import base64

router = APIRouter()


@router.get("/setup")
async def get_mfa_setup(current_user: dict = Depends(get_current_user)):
    """Get MFA setup QR code"""
    db = await get_database()
    
    user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Generate secret if not exists
    if not user.get("mfa_secret"):
        secret = pyotp.random_base32()
        await db.users.update_one(
            {"_id": ObjectId(current_user["id"])},
            {"$set": {"mfa_secret": secret}}
        )
    else:
        secret = user["mfa_secret"]
    
    # Generate TOTP URI
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=user["email"],
        issuer_name="Ticketing Tool"
    )
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return {
        "secret": secret,
        "qrCode": f"data:image/png;base64,{qr_code_base64}",
        "manualEntryKey": secret,
        "qr_code": f"data:image/png;base64,{qr_code_base64}"  # Backward compatibility
    }


@router.post("/verify")
async def verify_mfa(
    request: dict = Body(...),
    current_user: dict = Depends(get_current_user)
):
    """Verify MFA code and enable MFA"""
    db = await get_database()
    
    # Get code from request (can be 'code' or 'token')
    code = request.get("code") or request.get("token", "")
    
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code is required"
        )
    
    user = await db.users.find_one({"_id": ObjectId(current_user["id"])})
    
    if not user or not user.get("mfa_secret"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA not set up"
        )
    
    # Verify code
    totp = pyotp.TOTP(user["mfa_secret"])
    if not totp.verify(code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid MFA code"
        )
    
    # Enable MFA
    await db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"mfa_enabled": True}}
    )
    
    return {"message": "MFA enabled successfully"}


@router.post("/disable")
async def disable_mfa(current_user: dict = Depends(get_current_user)):
    """Disable MFA"""
    db = await get_database()
    
    await db.users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"mfa_enabled": False, "mfa_secret": None}}
    )
    
    return {"message": "MFA disabled successfully"}
