"""
Report endpoints
"""
from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.middleware.auth import get_current_admin
from app.db.database import get_database
from bson import ObjectId
from datetime import datetime, timedelta

router = APIRouter()


def get_date_range(period: str):
    """Get date range based on period"""
    now = datetime.utcnow()
    if period == "week":
        return now - timedelta(days=7)
    elif period == "month":
        return now - timedelta(days=30)
    elif period == "quarter":
        return now - timedelta(days=90)
    elif period == "year":
        return now - timedelta(days=365)
    else:
        return now - timedelta(days=30)  # Default to month


@router.get("/dashboard")
async def get_dashboard_report(
    period: str = Query("month"),
    organization: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin)
):
    """Get dashboard report (admin only)"""
    db = await get_database()
    query = {"created_at": {"$gte": get_date_range(period)}}
    
    if organization:
        query["organization"] = ObjectId(organization)
    
    total = await db.tickets.count_documents(query)
    open_count = await db.tickets.count_documents({**query, "status": "open"})
    closed_count = await db.tickets.count_documents({**query, "status": "closed"})
    in_progress = await db.tickets.count_documents({**query, "status": "in-progress"})
    
    return {
        "total": total,
        "open": open_count,
        "closed": closed_count,
        "inProgress": in_progress
    }


@router.get("/status-wise")
async def get_status_wise_report(
    period: str = Query("month"),
    organization: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin)
):
    """Get status-wise report (admin only)"""
    db = await get_database()
    query = {"created_at": {"$gte": get_date_range(period)}}
    
    if organization:
        query["organization"] = ObjectId(organization)
    
    pipeline = [
        {"$match": query},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    
    results = await db.tickets.aggregate(pipeline).to_list(length=100)
    
    return [{"status": r["_id"], "count": r["count"]} for r in results]


@router.get("/department-wise")
async def get_department_wise_report(
    period: str = Query("month"),
    organization: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin)
):
    """Get department-wise report (admin only)"""
    db = await get_database()
    query = {"created_at": {"$gte": get_date_range(period)}}
    
    if organization:
        query["organization"] = ObjectId(organization)
    
    pipeline = [
        {"$match": query},
        {"$group": {"_id": "$department", "count": {"$sum": 1}}}
    ]
    
    results = await db.tickets.aggregate(pipeline).to_list(length=100)
    
    return [{"department": str(r["_id"]) if r["_id"] else None, "count": r["count"]} for r in results]


@router.get("/technician-performance")
async def get_technician_performance(
    period: str = Query("month"),
    organization: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin)
):
    """Get technician performance report (admin only)"""
    db = await get_database()
    query = {"created_at": {"$gte": get_date_range(period)}, "assignee": {"$ne": None}}
    
    if organization:
        query["organization"] = ObjectId(organization)
    
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$assignee",
            "total": {"$sum": 1},
            "resolved": {"$sum": {"$cond": [{"$eq": ["$status", "resolved"]}, 1, 0]}},
            "closed": {"$sum": {"$cond": [{"$eq": ["$status", "closed"]}, 1, 0]}}
        }}
    ]
    
    results = await db.tickets.aggregate(pipeline).to_list(length=100)
    
    return [
        {
            "technician": str(r["_id"]),
            "total": r["total"],
            "resolved": r["resolved"],
            "closed": r["closed"]
        }
        for r in results
    ]


@router.get("/sla-compliance")
async def get_sla_compliance(
    period: str = Query("month"),
    organization: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin)
):
    """Get SLA compliance report (admin only)"""
    db = await get_database()
    query = {"created_at": {"$gte": get_date_range(period)}}
    
    if organization:
        query["organization"] = ObjectId(organization)
    
    total = await db.tickets.count_documents(query)
    overdue = await db.tickets.count_documents({
        **query,
        "due_date": {"$lt": datetime.utcnow()},
        "status": {"$nin": ["closed", "resolved"]}
    })
    
    return {
        "total": total,
        "overdue": overdue,
        "compliance_rate": ((total - overdue) / total * 100) if total > 0 else 0
    }


@router.get("/trends")
async def get_trends(
    period: str = Query("month"),
    organization: Optional[str] = Query(None),
    groupBy: str = Query("day"),
    current_user: dict = Depends(get_current_admin)
):
    """Get trends report (admin only)"""
    db = await get_database()
    query = {"created_at": {"$gte": get_date_range(period)}}
    
    if organization:
        query["organization"] = ObjectId(organization)
    
    # Group by day, week, or month
    if groupBy == "day":
        format_str = "%Y-%m-%d"
    elif groupBy == "week":
        format_str = "%Y-W%U"
    else:
        format_str = "%Y-%m"
    
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": {"$dateToString": {"format": format_str, "date": "$created_at"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    results = await db.tickets.aggregate(pipeline).to_list(length=100)
    
    return [{"date": r["_id"], "count": r["count"]} for r in results]
