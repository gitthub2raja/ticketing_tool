"""
Script to create demo data for the ticketing tool
Run this script to populate the database with sample data
"""
import asyncio
from datetime import datetime, timedelta
from bson import ObjectId
from app.db.database import init_db, get_database
import bcrypt


async def create_demo_data():
    """Create demo data for testing"""
    print("🚀 Starting demo data creation...")
    
    # Initialize database
    await init_db()
    db = await get_database()
    
    # Clear existing collections (optional - comment out if you want to keep existing data)
    print("📦 Clearing existing collections...")
    await db.users.delete_many({})
    await db.organizations.delete_many({})
    await db.categories.delete_many({})
    await db.departments.delete_many({})
    await db.tickets.delete_many({})
    
    # 1. Create Organizations
    print("🏢 Creating organizations...")
    org1 = await db.organizations.insert_one({
        "name": "Acme Corporation",
        "description": "Leading technology solutions provider",
        "is_active": True,
        "created_at": datetime.utcnow()
    })
    org1_id = org1.inserted_id
    
    org2 = await db.organizations.insert_one({
        "name": "TechStart Inc",
        "description": "Innovative startup company",
        "is_active": True,
        "created_at": datetime.utcnow()
    })
    org2_id = org2.inserted_id
    
    print(f"✅ Created 2 organizations")
    
    # 2. Create Departments
    print("🏬 Creating departments...")
    dept1 = await db.departments.insert_one({
        "name": "IT Support",
        "description": "Information Technology Support Department",
        "organization": org1_id,
        "is_active": True,
        "created_at": datetime.utcnow()
    })
    dept1_id = dept1.inserted_id
    
    dept2 = await db.departments.insert_one({
        "name": "HR",
        "description": "Human Resources Department",
        "organization": org1_id,
        "is_active": True,
        "created_at": datetime.utcnow()
    })
    dept2_id = dept2.inserted_id
    
    dept3 = await db.departments.insert_one({
        "name": "Finance",
        "description": "Finance and Accounting Department",
        "organization": org1_id,
        "is_active": True,
        "created_at": datetime.utcnow()
    })
    dept3_id = dept3.inserted_id
    
    print(f"✅ Created 3 departments")
    
    # 3. Create Categories
    print("📁 Creating categories...")
    cat1 = await db.categories.insert_one({
        "name": "Hardware Issue",
        "description": "Issues related to computer hardware",
        "organization": org1_id,
        "is_active": True,
        "created_at": datetime.utcnow()
    })
    cat1_id = cat1.inserted_id
    
    cat2 = await db.categories.insert_one({
        "name": "Software Issue",
        "description": "Issues related to software applications",
        "organization": org1_id,
        "is_active": True,
        "created_at": datetime.utcnow()
    })
    cat2_id = cat2.inserted_id
    
    cat3 = await db.categories.insert_one({
        "name": "Network Issue",
        "description": "Issues related to network connectivity",
        "organization": org1_id,
        "is_active": True,
        "created_at": datetime.utcnow()
    })
    cat3_id = cat3.inserted_id
    
    cat4 = await db.categories.insert_one({
        "name": "Account Access",
        "description": "User account and access issues",
        "organization": org1_id,
        "is_active": True,
        "created_at": datetime.utcnow()
    })
    cat4_id = cat4.inserted_id
    
    print(f"✅ Created 4 categories")
    
    # 4. Create Users
    print("👥 Creating users...")
    
    # Helper function to hash password
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Admin user
    admin_user = await db.users.insert_one({
        "email": "admin@example.com",
        "name": "Admin User",
        "password": hash_password("Admin123!"),
        "role": "admin",
        "is_active": True,
        "mfa_enabled": False,
        "organization": org1_id,
        "department": dept1_id,
        "created_at": datetime.utcnow()
    })
    admin_id = admin_user.inserted_id
    
    # Agent users
    agent1 = await db.users.insert_one({
        "email": "agent1@example.com",
        "name": "John Agent",
        "password": hash_password("Agent123!"),
        "role": "agent",
        "is_active": True,
        "mfa_enabled": False,
        "organization": org1_id,
        "department": dept1_id,
        "created_at": datetime.utcnow()
    })
    agent1_id = agent1.inserted_id
    
    agent2 = await db.users.insert_one({
        "email": "agent2@example.com",
        "name": "Sarah Agent",
        "password": hash_password("Agent123!"),
        "role": "agent",
        "is_active": True,
        "mfa_enabled": False,
        "organization": org1_id,
        "department": dept1_id,
        "created_at": datetime.utcnow()
    })
    agent2_id = agent2.inserted_id
    
    # Regular users
    user1 = await db.users.insert_one({
        "email": "user1@example.com",
        "name": "Alice User",
        "password": hash_password("User123!"),
        "role": "user",
        "is_active": True,
        "mfa_enabled": False,
        "organization": org1_id,
        "department": dept2_id,
        "created_at": datetime.utcnow()
    })
    user1_id = user1.inserted_id
    
    user2 = await db.users.insert_one({
        "email": "user2@example.com",
        "name": "Bob User",
        "password": hash_password("User123!"),
        "role": "user",
        "is_active": True,
        "mfa_enabled": False,
        "organization": org1_id,
        "department": dept3_id,
        "created_at": datetime.utcnow()
    })
    user2_id = user2.inserted_id
    
    user3 = await db.users.insert_one({
        "email": "user3@example.com",
        "name": "Charlie User",
        "password": hash_password("User123!"),
        "role": "user",
        "is_active": True,
        "mfa_enabled": False,
        "organization": org2_id,
        "created_at": datetime.utcnow()
    })
    user3_id = user3.inserted_id
    
    print(f"✅ Created 6 users (1 admin, 2 agents, 3 users)")
    
    # 5. Create Tickets
    print("🎫 Creating tickets...")
    
    tickets_data = [
        {
            "ticket_id": "TKT-001",
            "title": "Laptop not starting",
            "description": "My laptop won't turn on. The power button doesn't respond at all.",
            "status": "open",
            "priority": "high",
            "category": cat1_id,
            "department": dept1_id,
            "organization": org1_id,
            "creator": user1_id,
            "assignee": None,
            "comments": [],
            "attachments": [],
            "created_at": datetime.utcnow() - timedelta(days=5),
            "updated_at": datetime.utcnow() - timedelta(days=5)
        },
        {
            "ticket_id": "TKT-002",
            "title": "Email client not syncing",
            "description": "My Outlook is not syncing emails. Last sync was 2 days ago.",
            "status": "in-progress",
            "priority": "medium",
            "category": cat2_id,
            "department": dept1_id,
            "organization": org1_id,
            "creator": user2_id,
            "assignee": agent1_id,
            "comments": [
                {
                    "user": str(agent1_id),
                    "user_name": "John Agent",
                    "comment": "Checking email server configuration.",
                    "created_at": datetime.utcnow() - timedelta(days=2)
                }
            ],
            "attachments": [],
            "created_at": datetime.utcnow() - timedelta(days=3),
            "updated_at": datetime.utcnow() - timedelta(days=1)
        },
        {
            "ticket_id": "TKT-003",
            "title": "WiFi connection issues",
            "description": "Unable to connect to office WiFi. Connection keeps dropping.",
            "status": "open",
            "priority": "high",
            "category": cat3_id,
            "department": dept1_id,
            "organization": org1_id,
            "creator": user1_id,
            "assignee": None,
            "comments": [],
            "attachments": [],
            "created_at": datetime.utcnow() - timedelta(days=1),
            "updated_at": datetime.utcnow() - timedelta(days=1)
        },
        {
            "ticket_id": "TKT-004",
            "title": "Password reset request",
            "description": "I forgot my password and need to reset it.",
            "status": "resolved",
            "priority": "low",
            "category": cat4_id,
            "department": dept1_id,
            "organization": org1_id,
            "creator": user2_id,
            "assignee": agent2_id,
            "comments": [
                {
                    "user": str(agent2_id),
                    "user_name": "Sarah Agent",
                    "comment": "Password reset link sent to your email.",
                    "created_at": datetime.utcnow() - timedelta(hours=12)
                },
                {
                    "user": str(user2_id),
                    "user_name": "Bob User",
                    "comment": "Thank you! Password reset successfully.",
                    "created_at": datetime.utcnow() - timedelta(hours=10)
                }
            ],
            "attachments": [],
            "created_at": datetime.utcnow() - timedelta(days=2),
            "updated_at": datetime.utcnow() - timedelta(hours=10)
        },
        {
            "ticket_id": "TKT-005",
            "title": "Printer not working",
            "description": "The office printer is showing error code E-05. Cannot print documents.",
            "status": "in-progress",
            "priority": "medium",
            "category": cat1_id,
            "department": dept1_id,
            "organization": org1_id,
            "creator": user3_id,
            "assignee": agent1_id,
            "comments": [
                {
                    "user": str(agent1_id),
                    "user_name": "John Agent",
                    "comment": "Investigating printer error. Will check hardware.",
                    "created_at": datetime.utcnow() - timedelta(hours=6)
                }
            ],
            "attachments": [],
            "created_at": datetime.utcnow() - timedelta(hours=8),
            "updated_at": datetime.utcnow() - timedelta(hours=6)
        },
        {
            "ticket_id": "TKT-006",
            "title": "Software license renewal",
            "description": "Need to renew Microsoft Office license for 10 users.",
            "status": "pending",
            "priority": "low",
            "category": cat2_id,
            "department": dept1_id,
            "organization": org1_id,
            "creator": user1_id,
            "assignee": None,
            "comments": [],
            "attachments": [],
            "created_at": datetime.utcnow() - timedelta(hours=2),
            "updated_at": datetime.utcnow() - timedelta(hours=2)
        },
        {
            "ticket_id": "TKT-007",
            "title": "VPN access request",
            "description": "I need VPN access to work from home. Please provide credentials.",
            "status": "open",
            "priority": "medium",
            "category": cat4_id,
            "department": dept1_id,
            "organization": org1_id,
            "creator": user2_id,
            "assignee": None,
            "comments": [],
            "attachments": [],
            "created_at": datetime.utcnow() - timedelta(hours=4),
            "updated_at": datetime.utcnow() - timedelta(hours=4)
        },
        {
            "ticket_id": "TKT-008",
            "title": "Monitor display issue",
            "description": "My monitor screen is flickering. It started yesterday.",
            "status": "closed",
            "priority": "medium",
            "category": cat1_id,
            "department": dept1_id,
            "organization": org1_id,
            "creator": user1_id,
            "assignee": agent2_id,
            "comments": [
                {
                    "user": str(agent2_id),
                    "user_name": "Sarah Agent",
                    "comment": "Replaced monitor cable. Issue resolved.",
                    "created_at": datetime.utcnow() - timedelta(days=1)
                }
            ],
            "attachments": [],
            "created_at": datetime.utcnow() - timedelta(days=3),
            "updated_at": datetime.utcnow() - timedelta(days=1)
        }
    ]
    
    await db.tickets.insert_many(tickets_data)
    print(f"✅ Created {len(tickets_data)} tickets")
    
    # Summary
    print("\n" + "="*50)
    print("✅ Demo data creation completed!")
    print("="*50)
    print("\n📊 Summary:")
    print(f"  • Organizations: 2")
    print(f"  • Departments: 3")
    print(f"  • Categories: 4")
    print(f"  • Users: 6")
    print(f"    - Admin: admin@example.com (password: Admin123!)")
    print(f"    - Agents: agent1@example.com, agent2@example.com (password: Agent123!)")
    print(f"    - Users: user1@example.com, user2@example.com, user3@example.com (password: User123!)")
    print(f"  • Tickets: {len(tickets_data)}")
    print("\n🔑 Login Credentials:")
    print("  Admin: admin@example.com / Admin123!")
    print("  Agent: agent1@example.com / Agent123!")
    print("  User: user1@example.com / User123!")
    print("\n" + "="*50)


if __name__ == "__main__":
    asyncio.run(create_demo_data())

