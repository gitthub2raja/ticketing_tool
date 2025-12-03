"""
Script to verify all MongoDB collections exist and are accessible
This ensures all features reflect in MongoDB Compass
"""
import asyncio
from app.db.database import init_db, get_database

async def verify_collections():
    """Verify all collections exist"""
    await init_db()
    db = await get_database()
    
    # All collections that should exist
    expected_collections = [
        "users",
        "tickets", 
        "organizations",
        "categories",
        "departments",
        "roles",
        "sla_policies",
        "email_templates",
        "email_automations",
        "faqs",
        "api_keys",
        "chat_sessions",
        "teams_configs",
        "sso_configs",
        "email_settings",
        "logos",
        "ticket_settings",
        "reports"
    ]
    
    print("🔍 Verifying MongoDB collections...")
    print("=" * 60)
    
    existing_collections = await db.list_collection_names()
    
    for collection_name in expected_collections:
        exists = collection_name in existing_collections
        count = 0
        if exists:
            count = await db[collection_name].count_documents({})
        
        status = "✅" if exists else "❌"
        print(f"{status} {collection_name:25} - {count:4} documents")
        
        # Create empty collection if it doesn't exist (by inserting and deleting a dummy doc)
        if not exists:
            try:
                result = await db[collection_name].insert_one({"__init__": True})
                await db[collection_name].delete_one({"_id": result.inserted_id})
                print(f"   ✨ Created empty collection: {collection_name}")
            except Exception as e:
                print(f"   ⚠️  Failed to create {collection_name}: {e}")
    
    print("=" * 60)
    print(f"✅ Verification complete! Total collections: {len(await db.list_collection_names())}")

if __name__ == "__main__":
    asyncio.run(verify_collections())

