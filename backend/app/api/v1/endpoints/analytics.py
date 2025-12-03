"""
Analytics endpoints
"""
from fastapi import APIRouter, Depends, Query
from app.middleware.auth import get_current_admin
from app.db.database import get_database
from bson import ObjectId
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter()


@router.get("/overview")
async def get_analytics_overview(
    organization: Optional[str] = Query(None),
    startDate: Optional[str] = Query(None),
    endDate: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin)
):
    """Get analytics overview (admin only)"""
    db = await get_database()
    
    # Default to last 30 days
    if not endDate:
        endDate = datetime.utcnow()
    else:
        endDate = datetime.fromisoformat(endDate.replace('Z', '+00:00'))
    
    if not startDate:
        startDate = endDate - timedelta(days=30)
    else:
        startDate = datetime.fromisoformat(startDate.replace('Z', '+00:00'))
    
    query = {
        "created_at": {
            "$gte": startDate,
            "$lte": endDate
        }
    }
    
    if organization:
        query["organization"] = ObjectId(organization)
    
    # Get ticket statistics
    total_tickets = await db.tickets.count_documents(query)
    
    # Status breakdown
    status_pipeline = [
        {"$match": query},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_stats = await db.tickets.aggregate(status_pipeline).to_list(length=100)
    status_breakdown = {stat["_id"]: stat["count"] for stat in status_stats}
    
    # Priority breakdown
    priority_pipeline = [
        {"$match": query},
        {"$group": {"_id": "$priority", "count": {"$sum": 1}}}
    ]
    priority_stats = await db.tickets.aggregate(priority_pipeline).to_list(length=100)
    priority_breakdown = {stat["_id"]: stat["count"] for stat in priority_stats}
    
    # Category breakdown
    category_pipeline = [
        {"$match": query},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]
    category_stats = await db.tickets.aggregate(category_pipeline).to_list(length=100)
    category_breakdown = {}
    for stat in category_stats:
        cat_id = str(stat["_id"]) if stat["_id"] else "uncategorized"
        category_breakdown[cat_id] = stat["count"]
    
    # Department breakdown
    dept_pipeline = [
        {"$match": query},
        {"$group": {"_id": "$department", "count": {"$sum": 1}}}
    ]
    dept_stats = await db.tickets.aggregate(dept_pipeline).to_list(length=100)
    department_breakdown = {}
    for stat in dept_stats:
        dept_id = str(stat["_id"]) if stat["_id"] else "unassigned"
        department_breakdown[dept_id] = stat["count"]
    
    # Average resolution time
    resolved_tickets = await db.tickets.find({
        **query,
        "status": {"$in": ["resolved", "closed"]}
    }).to_list(length=1000)
    
    resolution_times = []
    for ticket in resolved_tickets:
        if ticket.get("created_at") and ticket.get("updated_at"):
            diff = ticket["updated_at"] - ticket["created_at"]
            resolution_times.append(diff.total_seconds() / 3600)  # hours
    
    avg_resolution_time = sum(resolution_times) / len(resolution_times) if resolution_times else 0
    
    # Ticket trends (daily)
    trends_pipeline = [
        {"$match": query},
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
                },
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    trends = await db.tickets.aggregate(trends_pipeline).to_list(length=100)
    
    return {
        "period": {
            "startDate": startDate.isoformat(),
            "endDate": endDate.isoformat()
        },
        "overview": {
            "totalTickets": total_tickets,
            "avgResolutionTime": round(avg_resolution_time, 2),
            "resolvedTickets": len(resolved_tickets)
        },
        "breakdown": {
            "status": status_breakdown,
            "priority": priority_breakdown,
            "category": category_breakdown,
            "department": department_breakdown
        },
        "trends": [
            {"date": trend["_id"], "count": trend["count"]}
            for trend in trends
        ]
    }


@router.get("/performance")
async def get_performance_analytics(
    organization: Optional[str] = Query(None),
    startDate: Optional[str] = Query(None),
    endDate: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin)
):
    """Get performance analytics (admin only)"""
    db = await get_database()
    
    # Default to last 30 days
    if not endDate:
        endDate = datetime.utcnow()
    else:
        endDate = datetime.fromisoformat(endDate.replace('Z', '+00:00'))
    
    if not startDate:
        startDate = endDate - timedelta(days=30)
    else:
        startDate = datetime.fromisoformat(startDate.replace('Z', '+00:00'))
    
    query = {
        "created_at": {
            "$gte": startDate,
            "$lte": endDate
        }
    }
    
    if organization:
        query["organization"] = ObjectId(organization)
    
    # Agent performance
    agent_pipeline = [
        {"$match": {**query, "assignee": {"$exists": True, "$ne": None}}},
        {
            "$group": {
                "_id": "$assignee",
                "totalAssigned": {"$sum": 1},
                "resolved": {
                    "$sum": {
                        "$cond": [{"$in": ["$status", ["resolved", "closed"]]}, 1, 0]
                    }
                }
            }
        }
    ]
    agent_stats = await db.tickets.aggregate(agent_pipeline).to_list(length=100)
    
    # Get agent names
    agent_performance = []
    for stat in agent_stats:
        agent_id = str(stat["_id"])
        agent = await db.users.find_one({"_id": ObjectId(agent_id)})
        agent_performance.append({
            "agentId": agent_id,
            "agentName": agent.get("name", "Unknown") if agent else "Unknown",
            "totalAssigned": stat["totalAssigned"],
            "resolved": stat["resolved"],
            "resolutionRate": round((stat["resolved"] / stat["totalAssigned"]) * 100, 2) if stat["totalAssigned"] > 0 else 0
        })
    
    # SLA compliance
    sla_policies = await db.sla_policies.find({}).to_list(length=100)
    sla_compliance = []
    
    for policy in sla_policies:
        policy_query = {**query}
        if policy.get("category"):
            policy_query["category"] = policy.get("category")
        if policy.get("priority"):
            policy_query["priority"] = policy.get("priority")
        
        total_tickets = await db.tickets.count_documents(policy_query)
        
        # Check tickets within SLA
        sla_hours = policy.get("responseTime", 24)  # default 24 hours
        sla_deadline = datetime.utcnow() - timedelta(hours=sla_hours)
        
        within_sla = await db.tickets.count_documents({
            **policy_query,
            "updated_at": {"$lte": sla_deadline}
        })
        
        sla_compliance.append({
            "policyId": str(policy["_id"]),
            "policyName": policy.get("name", "Unnamed Policy"),
            "totalTickets": total_tickets,
            "withinSLA": within_sla,
            "complianceRate": round((within_sla / total_tickets) * 100, 2) if total_tickets > 0 else 0
        })
    
    return {
        "agentPerformance": agent_performance,
        "slaCompliance": sla_compliance
    }


@router.get("/trends")
async def get_trends_analytics(
    organization: Optional[str] = Query(None),
    period: str = Query("month", regex="^(day|week|month|year)$"),
    current_user: dict = Depends(get_current_admin)
):
    """Get trends analytics (admin only)"""
    db = await get_database()
    
    # Calculate date range based on period
    end_date = datetime.utcnow()
    if period == "day":
        start_date = end_date - timedelta(days=7)
        format_str = "%Y-%m-%d"
    elif period == "week":
        start_date = end_date - timedelta(weeks=12)
        format_str = "%Y-W%V"
    elif period == "month":
        start_date = end_date - timedelta(days=365)
        format_str = "%Y-%m"
    else:  # year
        start_date = end_date - timedelta(days=365 * 5)
        format_str = "%Y"
    
    query = {
        "created_at": {
            "$gte": start_date,
            "$lte": end_date
        }
    }
    
    if organization:
        query["organization"] = ObjectId(organization)
    
    # Ticket creation trends
    creation_pipeline = [
        {"$match": query},
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": format_str, "date": "$created_at"}
                },
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    creation_trends = await db.tickets.aggregate(creation_pipeline).to_list(length=100)
    
    # Resolution trends
    resolution_pipeline = [
        {
            "$match": {
                **query,
                "status": {"$in": ["resolved", "closed"]}
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {"format": format_str, "date": "$updated_at"}
                },
                "count": {"$sum": 1}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    resolution_trends = await db.tickets.aggregate(resolution_pipeline).to_list(length=100)
    
    return {
        "period": period,
        "creationTrends": [
            {"period": trend["_id"], "count": trend["count"]}
            for trend in creation_trends
        ],
        "resolutionTrends": [
            {"period": trend["_id"], "count": trend["count"]}
            for trend in resolution_trends
        ]
    }




