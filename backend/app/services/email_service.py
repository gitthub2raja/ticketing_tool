"""
Email service
"""
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings


async def send_email(to: str, subject: str, html: str, text: str = None):
    """Send email"""
    # TODO: Implement email sending
    pass

