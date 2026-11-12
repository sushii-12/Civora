
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


WasteType = Literal["wet", "dry", "mixed"]


class CollectionPointCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    address: str = Field(min_length=5, max_length=500)
    waste_type: WasteType
    capacity: float = Field(gt=0)
    current_fill_level: float = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validate_fill_level(self):
        if self.current_fill_level > self.capacity:
            raise ValueError(
                "Current fill level cannot exceed capacity."
            )
        return self



class CollectionPointUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    address: str | None = Field(default=None, min_length=5, max_length=500)
    waste_type: WasteType | None = None
    capacity: float | None = Field(default=None, gt=0)
    current_fill_level: float | None = Field(default=None, ge=0)
    is_active: bool | None = None

    @model_validator(mode="after")
    def validate_fill_level(self):
        if (
            self.capacity is not None
            and self.current_fill_level is not None
            and self.current_fill_level > self.capacity
        ):
            raise ValueError(
                "Current fill level cannot exceed capacity."
            )

        return self



class CollectionPointResponse(BaseModel):
    id: int
    name: str
    address: str
    waste_type: WasteType
    capacity: float
    current_fill_level: float
    is_active: bool
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
