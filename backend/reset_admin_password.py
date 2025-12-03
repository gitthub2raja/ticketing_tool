#!/usr/bin/env python3
"""
Script to reset admin user password
"""
import asyncio
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import get_database, close_database
from app.core.security import get_password_hash, verify_password

async def reset_admin_password():
    """Reset admin user password to admin123"""
    try:
        db = await get_database()
        
        # Find admin user
        user = await db.users.find_one({"email": "admin@example.com"})
        
        if not user:
            print("❌ Admin user not found. Creating new admin user...")
            # Create admin user
            admin_data = {
                "email": "admin@example.com",
                "name": "Administrator",
                "password": get_password_hash("admin123"),
                "role": "admin",
                "is_active": True,
                "mfa_enabled": False
            }
            result = await db.users.insert_one(admin_data)
            print(f"✅ Admin user created with ID: {result.inserted_id}")
        else:
            print(f"✅ Admin user found: {user.get('name')}")
            # Reset password
            new_password_hash = get_password_hash("admin123")
            await db.users.update_one(
                {"email": "admin@example.com"},
                {"$set": {"password": new_password_hash}}
            )
            print("✅ Password reset to: admin123")
            
            # Verify the password
            updated_user = await db.users.find_one({"email": "admin@example.com"})
            if verify_password("admin123", updated_user["password"]):
                print("✅ Password verification successful!")
            else:
                print("❌ Password verification failed!")
        
        print("\nLogin credentials:")
        print("  Email: admin@example.com")
        print("  Password: admin123")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        await close_database()

if __name__ == "__main__":
    asyncio.run(reset_admin_password())

