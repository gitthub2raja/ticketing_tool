"""
Database connection and initialization
"""
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client: AsyncIOMotorClient = None
database = None


async def init_db():
    """Initialize database connection"""
    global client, database
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    database = client[settings.DATABASE_NAME]
    return database


async def get_database():
    """Get database instance"""
    return database


async def close_db():
    """Close database connection"""
    global client
    if client:
        client.close()




