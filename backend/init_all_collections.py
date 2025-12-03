#!/usr/bin/env python3
"""
Initialize all MongoDB collections to ensure they're visible in Compass.
This script creates empty collections for all features that should be visible in MongoDB Compass.
"""

import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime

# MongoDB connection
MONGO_URI = "mongodb://mongoadmin:mongopassword@mongodb:27017/ticketing_tool?authSource=admin"
DB_NAME = "ticketing_tool"

async def init_collections():
    """Initialize all collections with empty documents if they don't exist"""
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[DB_NAME]
    
    print("🚀 Initializing all MongoDB collections...")
    print("=" * 60)
    
    # List of all collections that should exist
    collections = [
        "sla_policies",
        "email_settings",
        "email_templates",
        "email_automations",
        "faqs",
        "chat_sessions",
        "chat_messages",
        "teams_configs",
        "sso_configs",
        "logos",
        "ticket_settings",
        "reports",
        "apikeys",
        "categories",
        "departments",
        "organizations",
        "tickets",
        "users",
        "roles",
        "comments",
        "attachments",
        "notifications",
        "audit_logs"
    ]
    
    initialized = []
    existing = []
    
    for collection_name in collections:
        collection = db[collection_name]
        
        # Check if collection exists and has documents
        count = await collection.count_documents({})
        
        if count == 0:
            # Create an empty document to ensure collection exists
            # This makes it visible in MongoDB Compass
            try:
                # Insert a placeholder document that will be removed or ignored
                # We'll use a special marker to identify initialization documents
                result = await collection.insert_one({
                    "_init": True,
                    "_created_at": datetime.utcnow(),
                    "_note": "Collection initialization marker - safe to delete"
                })
                initialized.append(collection_name)
                print(f"  ✅ Initialized: {collection_name}")
            except Exception as e:
                print(f"  ⚠️  Warning: {collection_name} - {str(e)}")
        else:
            existing.append(collection_name)
            print(f"  ✓ Already exists: {collection_name} ({count} documents)")
    
    print("=" * 60)
    print(f"✅ Initialized {len(initialized)} new collections")
    print(f"✓ Found {len(existing)} existing collections with data")
    print("")
    print("📊 Collection Summary:")
    print("-" * 60)
    
    # Show all collections with counts
    all_collections = await db.list_collection_names()
    all_collections.sort()
    
    for coll_name in all_collections:
        count = await db[coll_name].count_documents({})
        init_count = await db[coll_name].count_documents({"_init": True})
        data_count = count - init_count
        status = "📄" if data_count > 0 else "📋"
        print(f"  {status} {coll_name}: {data_count} data documents" + (f" (+ {init_count} init)" if init_count > 0 else ""))
    
    print("")
    print("🎉 All collections are now visible in MongoDB Compass!")
    print("")
    print("💡 Note: Initialization markers (_init: true) can be safely deleted")
    print("   They only ensure collections are visible in Compass when empty.")
    
    client.close()

if __name__ == "__main__":
    try:
        asyncio.run(init_collections())
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)


