
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class WasteDepositCreate(BaseModel):
    collection_point_id: int = Field(gt=0)
    waste_type: Literal["wet", "dry"]
    quantity: float = Field(gt=0)


class WasteDepositResponse(BaseModel):
    id: int
    user_id: int
    collection_point_id: int
    waste_type: Literal["wet", "dry"]
    quantity: float
    deposited_at: datetime

    model_config = ConfigDict(from_attributes=True)
