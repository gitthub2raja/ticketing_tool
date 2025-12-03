"""
Authentication schemas
"""
from pydantic import BaseModel, EmailStr
from typing import Optional


class LoginRequest(BaseModel):
    """Login request schema"""
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    """Login response schema"""
    token: str
    user: dict
    mfaRequired: bool = False
    tempToken: Optional[str] = None


class RegisterRequest(BaseModel):
    """Registration request schema"""
    email: EmailStr
    password: str
    name: str
    organization: Optional[str] = None


class TokenResponse(BaseModel):
    """Token response schema"""
    token: str
    user: dict


class MFAVerifyRequest(BaseModel):
    """MFA verification request"""
    tempToken: Optional[str] = None
    code: str


class MFASetupResponse(BaseModel):
    """MFA setup response"""
    secret: str
    qr_code: str




