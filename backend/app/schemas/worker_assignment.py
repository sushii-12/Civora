from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class WorkerAssignmentCreate(BaseModel):
    collection_request_id: int = Field(gt=0)
    worker_id: int = Field(gt=0)


class WorkerAssignmentResponse(BaseModel):
    id: int
    collection_request_id: int
    worker_id: int
    assigned_by: int
    assigned_at: datetime

    model_config = ConfigDict(from_attributes=True)