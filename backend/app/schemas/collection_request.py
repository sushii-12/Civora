from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


CollectionStatus = Literal[
    "pending",
    "assigned",
    "in_progress",
    "completed"
]


class CollectionRequestCreate(BaseModel):
    collection_point_id: int = Field(gt=0)
    notes: str | None = Field(default=None, max_length=1000)


class CollectionRequestUpdate(BaseModel):
    notes: str | None = Field(default=None, max_length=1000)


class CollectionRequestResponse(BaseModel):
    id: int
    collection_point_id: int
    requested_by: int
    status: CollectionStatus
    notes: str | None
    requested_at: datetime
    completed_at: datetime | None

    model_config = ConfigDict(from_attributes=True)