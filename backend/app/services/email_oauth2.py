"""
OAuth2 Email Authentication Service
Supports Microsoft 365 and Google Workspace OAuth2 for shared mailboxes
"""
import httpx
from datetime import datetime, timedelta
from typing import Optional, Dict


class EmailOAuth2Service:
    """OAuth2 service for email authentication"""
    
    @staticmethod
    async def get_microsoft_token(
        client_id: str,
        client_secret: str,
        tenant_id: str,
        refresh_token: Optional[str] = None
    ) -> Dict:
        """
        Get Microsoft 365 OAuth2 access token
        """
        token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
        
        if refresh_token:
            # Use refresh token to get new access token
            data = {
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
                "scope": "https://outlook.office365.com/.default offline_access"
            }
        else:
            # Initial authorization (requires user consent first)
            raise ValueError("Initial OAuth2 authorization requires user consent. Please use the authorization URL first.")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data=data)
            response.raise_for_status()
            token_data = response.json()
            
            return {
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token", refresh_token),
                "expires_in": token_data.get("expires_in", 3600),
                "token_expiry": (datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 3600))).isoformat()
            }
    
    @staticmethod
    async def get_google_token(
        client_id: str,
        client_secret: str,
        refresh_token: Optional[str] = None
    ) -> Dict:
        """
        Get Google Workspace OAuth2 access token
        """
        token_url = "https://oauth2.googleapis.com/token"
        
        if refresh_token:
            data = {
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token"
            }
        else:
            raise ValueError("Initial OAuth2 authorization requires user consent. Please use the authorization URL first.")
        
        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data=data)
            response.raise_for_status()
            token_data = response.json()
            
            return {
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token", refresh_token),
                "expires_in": token_data.get("expires_in", 3600),
                "token_expiry": (datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 3600))).isoformat()
            }
    
    @staticmethod
    def get_microsoft_auth_url(
        client_id: str,
        tenant_id: str,
        redirect_uri: str
    ) -> str:
        """
        Get Microsoft 365 OAuth2 authorization URL
        """
        scope = "https://outlook.office365.com/.default offline_access"
        auth_url = (
            f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize"
            f"?client_id={client_id}"
            f"&response_type=code"
            f"&redirect_uri={redirect_uri}"
            f"&response_mode=query"
            f"&scope={scope}"
        )
        return auth_url
    
    @staticmethod
    def get_google_auth_url(
        client_id: str,
        redirect_uri: str
    ) -> str:
        """
        Get Google Workspace OAuth2 authorization URL
        """
        scope = "https://mail.google.com/ https://www.googleapis.com/auth/gmail.modify"
        auth_url = (
            f"https://accounts.google.com/o/oauth2/v2/auth"
            f"?client_id={client_id}"
            f"&response_type=code"
            f"&redirect_uri={redirect_uri}"
            f"&scope={scope}"
            f"&access_type=offline"
            f"&prompt=consent"
        )
        return auth_url
    
    @staticmethod
    async def exchange_microsoft_code(
        client_id: str,
        client_secret: str,
        tenant_id: str,
        code: str,
        redirect_uri: str
    ) -> Dict:
        """
        Exchange Microsoft authorization code for tokens
        """
        token_url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
        
        data = {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
            "scope": "https://outlook.office365.com/.default offline_access"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data=data)
            response.raise_for_status()
            token_data = response.json()
            
            return {
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token"),
                "expires_in": token_data.get("expires_in", 3600),
                "token_expiry": (datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 3600))).isoformat()
            }
    
    @staticmethod
    async def exchange_google_code(
        client_id: str,
        client_secret: str,
        code: str,
        redirect_uri: str
    ) -> Dict:
        """
        Exchange Google authorization code for tokens
        """
        token_url = "https://oauth2.googleapis.com/token"
        
        data = {
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, data=data)
            response.raise_for_status()
            token_data = response.json()
            
            return {
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token"),
                "expires_in": token_data.get("expires_in", 3600),
                "token_expiry": (datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 3600))).isoformat()
            }




