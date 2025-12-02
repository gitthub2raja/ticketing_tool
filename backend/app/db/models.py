"""
MongoDB Models using Motor (async)
"""
from datetime import datetime
from typing import Optional, List, Annotated
from bson import ObjectId
from pydantic import BaseModel, Field, EmailStr, GetJsonSchemaHandler
from pydantic.json_schema import JsonSchemaValue
from pydantic_core import core_schema


class PyObjectId(ObjectId):
    """Custom ObjectId for Pydantic v2"""
    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type, handler
    ) -> core_schema.CoreSchema:
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.chain_schema([
                    core_schema.str_schema(),
                    core_schema.no_info_plain_validator_function(cls.validate),
                ])
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        if isinstance(v, str):
            if ObjectId.is_valid(v):
                return ObjectId(v)
            raise ValueError("Invalid ObjectId")
        raise ValueError("Invalid ObjectId")


class UserModel(BaseModel):
    """User database model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    email: EmailStr
    name: str
    password: str
    role: str = "user"  # admin, agent, user, department-head
    organization: Optional[PyObjectId] = None
    department: Optional[PyObjectId] = None
    mfa_secret: Optional[str] = None
    mfa_enabled: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class TicketModel(BaseModel):
    """Ticket database model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    ticket_id: str  # Human-readable ticket ID
    title: str
    description: str
    status: str = "open"  # open, approval-pending, approved, rejected, in-progress, resolved, closed
    priority: str = "medium"  # low, medium, high, urgent
    category: Optional[PyObjectId] = None
    department: Optional[PyObjectId] = None
    organization: Optional[PyObjectId] = None
    creator: PyObjectId
    assignee: Optional[PyObjectId] = None
    due_date: Optional[datetime] = None
    attachments: List[str] = []
    comments: List[dict] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class CategoryModel(BaseModel):
    """Category database model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: str
    description: Optional[str] = None
    organization: Optional[PyObjectId] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class DepartmentModel(BaseModel):
    """Department database model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: str
    description: Optional[str] = None
    organization: Optional[PyObjectId] = None
    head: Optional[PyObjectId] = None  # Department head user ID
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class OrganizationModel(BaseModel):
    """Organization database model"""
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: str
    description: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

