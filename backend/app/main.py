"""
FastAPI Application Entry Point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from app.core.config import settings
from app.db.database import init_db
from app.api.v1.endpoints import (
    auth, tickets, users, admin, organizations,
    categories, departments, reports, api_keys,
    email, email_templates, email_automation,
    chatbot, faq, teams, backup, mfa,
    import_tickets, analytics
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted Host Middleware
if settings.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS
    )

# Include routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(tickets.router, prefix=f"{settings.API_V1_STR}/tickets", tags=["tickets"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["admin"])
app.include_router(organizations.router, prefix=f"{settings.API_V1_STR}/organizations", tags=["organizations"])
app.include_router(categories.router, prefix=f"{settings.API_V1_STR}/categories", tags=["categories"])
app.include_router(departments.router, prefix=f"{settings.API_V1_STR}/departments", tags=["departments"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["reports"])
app.include_router(api_keys.router, prefix=f"{settings.API_V1_STR}/api-keys", tags=["api-keys"])
app.include_router(email.router, prefix=f"{settings.API_V1_STR}/email", tags=["email"])
app.include_router(email_templates.router, prefix=f"{settings.API_V1_STR}/email-templates", tags=["email-templates"])
app.include_router(email_automation.router, prefix=f"{settings.API_V1_STR}/email-automation", tags=["email-automation"])
app.include_router(chatbot.router, prefix=f"{settings.API_V1_STR}/chatbot", tags=["chatbot"])
app.include_router(faq.router, prefix=f"{settings.API_V1_STR}/faq", tags=["faq"])
app.include_router(teams.router, prefix=f"{settings.API_V1_STR}/teams", tags=["teams"])
app.include_router(backup.router, prefix=f"{settings.API_V1_STR}/backup", tags=["backup"])
app.include_router(mfa.router, prefix=f"{settings.API_V1_STR}/mfa", tags=["mfa"])
app.include_router(import_tickets.router, prefix=f"{settings.API_V1_STR}/import-tickets", tags=["import-tickets"])
app.include_router(analytics.router, prefix=f"{settings.API_V1_STR}/analytics", tags=["analytics"])


@app.on_event("startup")
async def startup_event():
    """Initialize database and start background workers"""
    await init_db()
    # Start background workers here if needed


@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Ticketing Tool API", "version": settings.VERSION}


@app.get(f"{settings.API_V1_STR}/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

