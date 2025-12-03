"""
Email endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.middleware.auth import get_current_admin
from app.db.database import get_database
from app.services.email_service import send_email
from app.services.email_oauth2 import EmailOAuth2Service
from datetime import datetime
import smtplib
import imaplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

router = APIRouter()


@router.post("/test-smtp")
async def test_smtp(test_data: dict, current_user: dict = Depends(get_current_admin)):
    """Test SMTP connection (admin only) - supports OAuth2 and password auth"""
    db = await get_database()
    
    # Get email settings
    settings = await db.email_settings.find_one({})
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email settings not configured"
        )
    
    smtp_config = settings.get("smtp", {})
    auth_method = smtp_config.get("authMethod", "password")
    
    try:
        if auth_method == "oauth2":
            # OAuth2 authentication
            oauth2_config = smtp_config.get("auth", {}).get("oauth2", {})
            provider = oauth2_config.get("provider", "microsoft")  # "microsoft" or "google"
            
            # Get/refresh access token
            if provider == "microsoft":
                token_data = await EmailOAuth2Service.get_microsoft_token(
                    client_id=oauth2_config.get("clientId"),
                    client_secret=oauth2_config.get("clientSecret"),
                    tenant_id=oauth2_config.get("tenantId"),
                    refresh_token=oauth2_config.get("refreshToken")
                )
            else:  # google
                token_data = await EmailOAuth2Service.get_google_token(
                    client_id=oauth2_config.get("clientId"),
                    client_secret=oauth2_config.get("clientSecret"),
                    refresh_token=oauth2_config.get("refreshToken")
                )
            
            # Update token in settings
            smtp_config["auth"]["oauth2"]["accessToken"] = token_data["access_token"]
            smtp_config["auth"]["oauth2"]["refreshToken"] = token_data.get("refresh_token") or oauth2_config.get("refreshToken")
            smtp_config["auth"]["oauth2"]["tokenExpiry"] = token_data["token_expiry"]
            
            await db.email_settings.update_one(
                {},
                {"$set": {"smtp": smtp_config}}
            )
            
            return {
                "message": "SMTP OAuth2 connection successful",
                "tokenExpiry": token_data["token_expiry"]
            }
        else:
            # Password authentication
            host = smtp_config.get("host")
            port = smtp_config.get("port", 587)
            username = smtp_config.get("auth", {}).get("user")
            password = smtp_config.get("auth", {}).get("pass")
            encryption = smtp_config.get("encryption", "TLS")
            
            if not host or not username or not password:
                raise ValueError("SMTP host, username, and password are required")
            
            # Test connection
            if encryption == "SSL":
                server = smtplib.SMTP_SSL(host, port)
            else:
                server = smtplib.SMTP(host, port)
                if encryption == "TLS":
                    server.starttls()
            
            server.login(username, password)
            
            # Send test email if 'to' is provided
            test_to = test_data.get("to")
            if test_to:
                from_email = smtp_config.get("fromEmail") or username
                from_name = smtp_config.get("fromName", "Ticketing Tool")
                
                msg = MIMEMultipart()
                msg["From"] = f"{from_name} <{from_email}>"
                msg["To"] = test_to
                msg["Subject"] = "Test Email from Ticketing Tool"
                
                # Get current time - use server's local time for better readability
                # The email Date header will be set automatically by the email client
                current_time = datetime.now()
                # Format in a more readable way
                time_str = current_time.strftime('%B %d, %Y at %I:%M:%S %p')
                
                body = f"""
This is a test email from your Ticketing Tool.

If you received this email, your SMTP configuration is working correctly!

Configuration Details:
- Host: {host}
- Port: {port}
- Encryption: {encryption}
- From: {from_email}

Sent: {time_str}
"""
                msg.attach(MIMEText(body, "plain"))
                
                # Send the email
                try:
                    server.send_message(msg)
                    print(f"INFO: Test email sent successfully from {from_email} to {test_to}")
                except Exception as send_error:
                    server.quit()
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Failed to send test email: {str(send_error)}. Please check your email settings and ensure you're using an App Password for Gmail."
                    )
            
            server.quit()
            
            if test_to:
                return {
                    "message": f"Test email sent successfully to {test_to}! Please check your inbox (and spam folder).",
                    "sent": True
                }
            else:
                return {"message": "SMTP connection successful"}
            
    except HTTPException:
        raise
    except smtplib.SMTPAuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"SMTP authentication failed: {str(e)}. For Gmail, make sure you're using an App Password instead of your regular password. Enable 2-Step Verification and generate an App Password from your Google Account settings."
        )
    except smtplib.SMTPException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SMTP error: {str(e)}"
        )
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"ERROR: SMTP test failed: {str(e)}\n{error_trace}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SMTP test failed: {str(e)}"
        )


@router.post("/test-imap")
async def test_imap(test_data: dict, current_user: dict = Depends(get_current_admin)):
    """Test IMAP connection (admin only) - supports OAuth2 and password auth"""
    db = await get_database()
    
    # Get email settings
    settings = await db.email_settings.find_one({})
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email settings not configured"
        )
    
    imap_config = settings.get("imap", {})
    auth_method = imap_config.get("authMethod", "password")
    
    try:
        if auth_method == "oauth2":
            # OAuth2 authentication
            oauth2_config = imap_config.get("auth", {}).get("oauth2", {})
            provider = oauth2_config.get("provider", "microsoft")
            
            # Get/refresh access token
            if provider == "microsoft":
                token_data = await EmailOAuth2Service.get_microsoft_token(
                    client_id=oauth2_config.get("clientId"),
                    client_secret=oauth2_config.get("clientSecret"),
                    tenant_id=oauth2_config.get("tenantId"),
                    refresh_token=oauth2_config.get("refreshToken")
                )
            else:  # google
                token_data = await EmailOAuth2Service.get_google_token(
                    client_id=oauth2_config.get("clientId"),
                    client_secret=oauth2_config.get("clientSecret"),
                    refresh_token=oauth2_config.get("refreshToken")
                )
            
            # Update token in settings
            imap_config["auth"]["oauth2"]["accessToken"] = token_data["access_token"]
            imap_config["auth"]["oauth2"]["refreshToken"] = token_data.get("refresh_token") or oauth2_config.get("refreshToken")
            imap_config["auth"]["oauth2"]["tokenExpiry"] = token_data["token_expiry"]
            
            await db.email_settings.update_one(
                {},
                {"$set": {"imap": imap_config}}
            )
            
            return {
                "message": "IMAP OAuth2 connection successful",
                "tokenExpiry": token_data["token_expiry"]
            }
        else:
            # Password authentication
            host = imap_config.get("host")
            port = imap_config.get("port", 993)
            username = imap_config.get("auth", {}).get("user")
            password = imap_config.get("auth", {}).get("pass")
            encryption = imap_config.get("encryption", "SSL")
            
            if not host or not username or not password:
                raise ValueError("IMAP host, username, and password are required")
            
            # Test connection
            if encryption == "SSL":
                server = imaplib.IMAP4_SSL(host, port)
            else:
                server = imaplib.IMAP4(host, port)
                if encryption == "TLS":
                    server.starttls()
            
            server.login(username, password)
            server.logout()
            
            return {"message": "IMAP connection successful"}
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"IMAP test failed: {str(e)}"
        )


@router.get("/oauth2/auth-url")
async def get_oauth2_auth_url(
    provider: str = Query(..., regex="^(microsoft|google)$"),
    type: str = Query(..., regex="^(smtp|imap)$"),
    redirect_uri: str = Query(...),
    current_user: dict = Depends(get_current_admin)
):
    """Get OAuth2 authorization URL (admin only)"""
    db = await get_database()
    settings = await db.email_settings.find_one({})
    
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email settings not configured"
        )
    
    config = settings.get(type, {})
    oauth2_config = config.get("auth", {}).get("oauth2", {})
    
    if provider == "microsoft":
        client_id = oauth2_config.get("clientId")
        tenant_id = oauth2_config.get("tenantId")
        if not client_id or not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Microsoft OAuth2 client ID and tenant ID are required"
            )
        auth_url = EmailOAuth2Service.get_microsoft_auth_url(client_id, tenant_id, redirect_uri)
    else:  # google
        client_id = oauth2_config.get("clientId")
        if not client_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Google OAuth2 client ID is required"
            )
        auth_url = EmailOAuth2Service.get_google_auth_url(client_id, redirect_uri)
    
    return {"authUrl": auth_url}


@router.post("/oauth2/callback")
async def oauth2_callback(
    callback_data: dict,
    current_user: dict = Depends(get_current_admin)
):
    """Handle OAuth2 callback and store tokens (admin only)"""
    db = await get_database()
    
    provider = callback_data.get("provider")
    type = callback_data.get("type")  # "smtp" or "imap"
    code = callback_data.get("code")
    redirect_uri = callback_data.get("redirectUri")
    
    if not all([provider, type, code, redirect_uri]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required parameters"
        )
    
    settings = await db.email_settings.find_one({})
    if not settings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email settings not configured"
        )
    
    config = settings.get(type, {})
    oauth2_config = config.get("auth", {}).get("oauth2", {})
    
    try:
        if provider == "microsoft":
            client_id = oauth2_config.get("clientId")
            client_secret = oauth2_config.get("clientSecret")
            tenant_id = oauth2_config.get("tenantId")
            
            if not all([client_id, client_secret, tenant_id]):
                raise ValueError("Microsoft OAuth2 credentials not configured")
            
            token_data = await EmailOAuth2Service.exchange_microsoft_code(
                client_id, client_secret, tenant_id, code, redirect_uri
            )
        else:  # google
            client_id = oauth2_config.get("clientId")
            client_secret = oauth2_config.get("clientSecret")
            
            if not all([client_id, client_secret]):
                raise ValueError("Google OAuth2 credentials not configured")
            
            token_data = await EmailOAuth2Service.exchange_google_code(
                client_id, client_secret, code, redirect_uri
            )
        
        # Update settings with tokens
        config["auth"]["oauth2"]["accessToken"] = token_data["access_token"]
        config["auth"]["oauth2"]["refreshToken"] = token_data.get("refresh_token")
        config["auth"]["oauth2"]["tokenExpiry"] = token_data["token_expiry"]
        config["authMethod"] = "oauth2"
        
        await db.email_settings.update_one(
            {},
            {"$set": {type: config}}
        )
        
        return {
            "message": "OAuth2 authentication successful",
            "tokenExpiry": token_data["token_expiry"]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth2 callback failed: {str(e)}"
        )


@router.post("/send")
async def send_test_email(email_data: dict, current_user: dict = Depends(get_current_admin)):
    """Send test email (admin only)"""
    try:
        await send_email(
            to=email_data.get("to"),
            subject=email_data.get("subject", "Test Email"),
            html=email_data.get("html", "<p>Test email</p>")
        )
        return {"message": "Test email sent successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email: {str(e)}"
        )
