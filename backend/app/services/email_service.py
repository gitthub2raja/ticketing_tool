"""
Email service for sending emails using configured SMTP settings
"""
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from app.db.database import get_database
from app.services.email_oauth2 import EmailOAuth2Service


async def send_email(
    to: str,
    subject: str,
    html: Optional[str] = None,
    text: Optional[str] = None
) -> bool:
    """
    Send email using configured SMTP settings
    
    Args:
        to: Recipient email address
        subject: Email subject
        html: HTML email body (optional)
        text: Plain text email body (optional, required if html not provided)
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    db = await get_database()
    
    # Get email settings
    email_settings = await db.email_settings.find_one({})
    if not email_settings:
        print("WARNING: Email settings not configured. Cannot send email.")
        return False
    
    smtp_config = email_settings.get("smtp", {})
    if not smtp_config or not smtp_config.get("enabled", False):
        print("WARNING: SMTP is not enabled. Cannot send email.")
        return False
    
    auth_method = smtp_config.get("authMethod", "password")
    host = smtp_config.get("host")
    port = smtp_config.get("port", 587)
    encryption = smtp_config.get("encryption", "TLS")
    from_email = smtp_config.get("fromEmail") or smtp_config.get("auth", {}).get("user")
    from_name = smtp_config.get("fromName", "Ticketing Tool")
    
    if not host or not from_email:
        print("WARNING: SMTP host or from email not configured.")
        return False
    
    try:
        # Create message
        if html:
            msg = MIMEMultipart("alternative")
            msg.attach(MIMEText(text or "", "plain"))
            msg.attach(MIMEText(html, "html"))
        else:
            msg = MIMEText(text or "", "plain")
        
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to
        msg["Subject"] = subject
        
        # Connect to SMTP server
        if auth_method == "oauth2":
            # OAuth2 authentication
            oauth2_config = smtp_config.get("auth", {}).get("oauth2", {})
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
            smtp_config["auth"]["oauth2"]["accessToken"] = token_data["access_token"]
            smtp_config["auth"]["oauth2"]["refreshToken"] = token_data.get("refresh_token") or oauth2_config.get("refreshToken")
            smtp_config["auth"]["oauth2"]["tokenExpiry"] = token_data["token_expiry"]
            
            await db.email_settings.update_one(
                {},
                {"$set": {"smtp": smtp_config}}
            )
            
            # For OAuth2, we would need to use XOAUTH2 authentication
            # This is more complex and requires additional libraries
            # For now, fall back to password auth if OAuth2 tokens are not available
            print("WARNING: OAuth2 email sending not fully implemented. Using password auth if available.")
            auth_method = "password"
        
        if auth_method == "password":
            # Password authentication
            username = smtp_config.get("auth", {}).get("user")
            password = smtp_config.get("auth", {}).get("pass")
            
            if not username or not password:
                print("WARNING: SMTP username or password not configured.")
                return False
            
            # Connect and send
            if encryption == "SSL":
                server = smtplib.SMTP_SSL(host, port)
            else:
                server = smtplib.SMTP(host, port)
                if encryption == "TLS":
                    server.starttls()
            
            server.login(username, password)
            server.send_message(msg)
            server.quit()
            
            print(f"INFO: Email sent successfully to {to}")
            return True
            
    except Exception as e:
        print(f"ERROR: Failed to send email to {to}: {str(e)}")
        return False


async def send_welcome_email(
    user_email: str,
    user_name: str,
    password: Optional[str] = None,
    login_url: Optional[str] = None
) -> bool:
    """
    Send welcome email to newly created user
    
    Args:
        user_email: User's email address
        user_name: User's name
        password: Temporary password (if provided)
        login_url: Login page URL
    
    Returns:
        bool: True if email sent successfully
    """
    if not login_url:
        login_url = "http://localhost/login"
    
    subject = "Welcome to Ticketing Tool - Your Account Has Been Created"
    
    # HTML email template
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
            }}
            .header {{
                background-color: #4F46E5;
                color: white;
                padding: 20px;
                text-align: center;
                border-radius: 5px 5px 0 0;
            }}
            .content {{
                background-color: #f9fafb;
                padding: 30px;
                border: 1px solid #e5e7eb;
            }}
            .button {{
                display: inline-block;
                background-color: #4F46E5;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
            }}
            .credentials {{
                background-color: #fff;
                border: 1px solid #e5e7eb;
                border-radius: 5px;
                padding: 15px;
                margin: 20px 0;
            }}
            .footer {{
                text-align: center;
                color: #6b7280;
                font-size: 12px;
                margin-top: 20px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Welcome to Ticketing Tool!</h1>
        </div>
        <div class="content">
            <p>Hello {user_name},</p>
            
            <p>Your account has been successfully created in the Ticketing Tool system.</p>
            
            {f'''
            <div class="credentials">
                <p><strong>Your Login Credentials:</strong></p>
                <p><strong>Email:</strong> {user_email}</p>
                {f'<p><strong>Temporary Password:</strong> {password}</p>' if password else '<p><strong>Password:</strong> Use the password you set during registration</p>'}
            </div>
            
            <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
            ''' if password else ''}
            
            <p>You can now access the Ticketing Tool by clicking the button below:</p>
            
            <div style="text-align: center;">
                <a href="{login_url}" class="button">Login to Ticketing Tool</a>
            </div>
            
            <p>If you have any questions or need assistance, please contact your system administrator.</p>
            
            <p>Best regards,<br>The Ticketing Tool Team</p>
        </div>
        <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
        </div>
    </body>
    </html>
    """
    
    # Plain text version
    text_body = f"""
Welcome to Ticketing Tool!

Hello {user_name},

Your account has been successfully created in the Ticketing Tool system.

{f'''
Your Login Credentials:
Email: {user_email}
Temporary Password: {password}

Important: Please change your password after your first login for security purposes.
''' if password else ''}

You can now access the Ticketing Tool at: {login_url}

If you have any questions or need assistance, please contact your system administrator.

Best regards,
The Ticketing Tool Team

---
This is an automated email. Please do not reply to this message.
    """
    
    return await send_email(
        to=user_email,
        subject=subject,
        html=html_body,
        text=text_body
    )
