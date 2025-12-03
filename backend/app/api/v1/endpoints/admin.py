"""
Admin endpoints
"""
from fastapi import APIRouter, Depends
from app.middleware.auth import get_current_admin
from app.db.database import get_database
from bson import ObjectId

router = APIRouter()


@router.get("/sso")
async def get_sso_config(current_user: dict = Depends(get_current_admin)):
    """Get SSO configuration (admin only)"""
    db = await get_database()
    
    config = await db.sso_configs.find_one({
        "organization": ObjectId(current_user.get("organization")) if current_user.get("organization") else None
    })
    
    if not config:
        return {
            "azure": {"enabled": False},
            "google": {"enabled": False},
            "saml": {"enabled": False}
        }
    
    config["id"] = str(config["_id"])
    del config["_id"]
    return config


@router.post("/sso")
async def update_sso_config(config_data: dict, current_user: dict = Depends(get_current_admin)):
    """Update SSO configuration (admin only)"""
    db = await get_database()
    
    org_id = ObjectId(current_user.get("organization")) if current_user.get("organization") else None
    
    await db.sso_configs.update_one(
        {"organization": org_id},
        {"$set": config_data},
        upsert=True
    )
    
    return {"message": "SSO configuration updated successfully"}


@router.get("/email")
async def get_email_settings(current_user: dict = Depends(get_current_admin)):
    """Get email settings (admin only) - supports OAuth2 and password auth"""
    db = await get_database()
    
    settings = await db.email_settings.find_one({})
    
    if not settings:
        return {
            "smtp": {
                "enabled": False,
                "host": "",
                "port": 587,
                "encryption": "TLS",
                "authMethod": "password",  # "password" or "oauth2"
                "auth": {
                    "user": "",
                    "pass": "",
                    "oauth2": {
                        "clientId": "",
                        "clientSecret": "",
                        "tenantId": "",
                        "refreshToken": "",
                        "accessToken": "",
                        "tokenExpiry": None
                    }
                },
                "fromEmail": "",
                "fromName": "Ticketing Tool"
            },
            "imap": {
                "enabled": False,
                "host": "",
                "port": 993,
                "encryption": "SSL",
                "authMethod": "password",  # "password" or "oauth2"
                "auth": {
                    "user": "",
                    "pass": "",
                    "oauth2": {
                        "clientId": "",
                        "clientSecret": "",
                        "tenantId": "",
                        "refreshToken": "",
                        "accessToken": "",
                        "tokenExpiry": None
                    }
                }
            }
        }
    
    settings["id"] = str(settings["_id"])
    del settings["_id"]
    if settings.get("_id"):
        del settings["_id"]
    
    return settings


@router.put("/email")
async def update_email_settings(settings_data: dict, current_user: dict = Depends(get_current_admin)):
    """Update email settings (admin only)"""
    db = await get_database()
    
    await db.email_settings.update_one(
        {},
        {"$set": settings_data},
        upsert=True
    )
    
    return {"message": "Email settings updated successfully"}


@router.get("/logo")
async def get_logo(current_user: dict = Depends(get_current_admin)):
    """Get logo (admin only)"""
    db = await get_database()
    
    logo = await db.logos.find_one({})
    
    if not logo:
        return {"logo": None, "filename": None, "showOnLogin": False}
    
    logo["id"] = str(logo["_id"])
    del logo["_id"]
    return logo


@router.post("/logo")
async def update_logo(logo_data: dict, current_user: dict = Depends(get_current_admin)):
    """Update logo (admin only)"""
    db = await get_database()
    
    await db.logos.update_one(
        {},
        {"$set": logo_data},
        upsert=True
    )
    
    return {"message": "Logo updated successfully"}


@router.get("/roles")
async def get_roles(current_user: dict = Depends(get_current_admin)):
    """Get all roles (admin only)"""
    db = await get_database()
    cursor = db.roles.find({})
    roles = await cursor.to_list(length=100)
    
    result = []
    for role in roles:
        role["id"] = str(role["_id"])
        del role["_id"]
        result.append(role)
    
    return result


@router.post("/roles")
async def create_role(role_data: dict, current_user: dict = Depends(get_current_admin)):
    """Create role (admin only)"""
    db = await get_database()
    
    result = await db.roles.insert_one(role_data)
    role_data["id"] = str(result.inserted_id)
    del role_data["_id"]
    
    return role_data


@router.put("/roles/{role_id}")
async def update_role(role_id: str, role_data: dict, current_user: dict = Depends(get_current_admin)):
    """Update role (admin only)"""
    db = await get_database()
    
    await db.roles.update_one(
        {"_id": ObjectId(role_id)},
        {"$set": role_data}
    )
    
    role = await db.roles.find_one({"_id": ObjectId(role_id)})
    role["id"] = str(role["_id"])
    del role["_id"]
    
    return role


@router.delete("/roles/{role_id}")
async def delete_role(role_id: str, current_user: dict = Depends(get_current_admin)):
    """Delete role (admin only)"""
    db = await get_database()
    
    await db.roles.delete_one({"_id": ObjectId(role_id)})
    
    return {"message": "Role deleted successfully"}


@router.get("/sla")
async def get_sla_policies(
    organization: str = None,
    current_user: dict = Depends(get_current_admin)
):
    """Get SLA policies (admin only)"""
    db = await get_database()
    query = {}
    
    if organization:
        query["organization"] = ObjectId(organization)
    
    cursor = db.sla_policies.find(query)
    policies = await cursor.to_list(length=100)
    
    result = []
    for policy in policies:
        policy["id"] = str(policy["_id"])
        # Handle organization - convert ObjectId to object with name if possible
        if policy.get("organization"):
            if isinstance(policy["organization"], ObjectId):
                # Try to get organization name
                org = await db.organizations.find_one({"_id": policy["organization"]})
                if org:
                    policy["organization"] = {"_id": str(policy["organization"]), "id": str(policy["organization"]), "name": org.get("name", "Unknown")}
                else:
                    policy["organization"] = {"_id": str(policy["organization"]), "id": str(policy["organization"]), "name": "Unknown"}
            elif isinstance(policy["organization"], str):
                # Already a string, try to get org details
                try:
                    org = await db.organizations.find_one({"_id": ObjectId(policy["organization"])})
                    if org:
                        policy["organization"] = {"_id": policy["organization"], "id": policy["organization"], "name": org.get("name", "Unknown")}
                except:
                    pass
        
        # Map snake_case to camelCase for frontend
        if "is_active" in policy:
            policy["isActive"] = policy["is_active"]
        elif "isActive" not in policy:
            policy["isActive"] = policy.get("is_active", True)
        
        del policy["_id"]
        result.append(policy)
    
    return result


@router.post("/sla")
async def create_sla_policy(policy_data: dict, current_user: dict = Depends(get_current_admin)):
    """Create SLA policy (admin only)"""
    db = await get_database()
    
    # Handle organization field
    if policy_data.get("organization"):
        if policy_data["organization"]:  # Not empty string
            policy_data["organization"] = ObjectId(policy_data["organization"])
        else:
            # Empty string means global policy
            policy_data["organization"] = None
    else:
        # No organization field means global policy
        policy_data["organization"] = None
    
    # Handle isActive field (map camelCase to snake_case)
    if "isActive" in policy_data:
        policy_data["is_active"] = policy_data["isActive"]
        del policy_data["isActive"]
    
    result = await db.sla_policies.insert_one(policy_data)
    policy_data["id"] = str(result.inserted_id)
    
    # Handle organization in response - convert to object with name
    if policy_data.get("organization"):
        if isinstance(policy_data["organization"], ObjectId):
            org = await db.organizations.find_one({"_id": policy_data["organization"]})
            if org:
                policy_data["organization"] = {"_id": str(policy_data["organization"]), "id": str(policy_data["organization"]), "name": org.get("name", "Unknown")}
    
    # Map snake_case to camelCase for frontend
    if "is_active" in policy_data:
        policy_data["isActive"] = policy_data["is_active"]
    
    del policy_data["_id"]
    
    return policy_data


@router.put("/sla/{policy_id}")
async def update_sla_policy(policy_id: str, policy_data: dict, current_user: dict = Depends(get_current_admin)):
    """Update SLA policy (admin only)"""
    db = await get_database()
    
    try:
        # Handle organization field
        if policy_data.get("organization"):
            if policy_data["organization"]:  # Not empty string
                policy_data["organization"] = ObjectId(policy_data["organization"])
            else:
                # Empty string means global policy, remove organization field
                policy_data["organization"] = None
        elif "organization" in policy_data and policy_data["organization"] == "":
            policy_data["organization"] = None
        
        # Handle isActive field (map camelCase to snake_case)
        if "isActive" in policy_data:
            policy_data["is_active"] = policy_data["isActive"]
            del policy_data["isActive"]
        
        # Remove fields that shouldn't be updated directly
        policy_data.pop("id", None)
        policy_data.pop("_id", None)
        
        result = await db.sla_policies.update_one(
            {"_id": ObjectId(policy_id)},
            {"$set": policy_data}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SLA policy not found"
            )
        
        # Fetch and return updated policy
        policy = await db.sla_policies.find_one({"_id": ObjectId(policy_id)})
        if not policy:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SLA policy not found"
            )
        
        policy["id"] = str(policy["_id"])
        
        # Handle organization - convert to object with name
        if policy.get("organization"):
            if isinstance(policy["organization"], ObjectId):
                org = await db.organizations.find_one({"_id": policy["organization"]})
                if org:
                    policy["organization"] = {"_id": str(policy["organization"]), "id": str(policy["organization"]), "name": org.get("name", "Unknown")}
                else:
                    policy["organization"] = {"_id": str(policy["organization"]), "id": str(policy["organization"]), "name": "Unknown"}
        
        # Map snake_case to camelCase
        if "is_active" in policy:
            policy["isActive"] = policy["is_active"]
        
        del policy["_id"]
        
        return policy
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update SLA policy: {str(e)}"
        )


@router.delete("/sla/{policy_id}")
async def delete_sla_policy(policy_id: str, current_user: dict = Depends(get_current_admin)):
    """Delete SLA policy (admin only)"""
    db = await get_database()
    
    try:
        result = await db.sla_policies.delete_one({"_id": ObjectId(policy_id)})
        if result.deleted_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="SLA policy not found"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete SLA policy: {str(e)}"
        )
    
    return {"message": "SLA policy deleted successfully"}
