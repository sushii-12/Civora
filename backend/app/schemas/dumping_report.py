from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


ReportType = Literal[
    "improper_dumping",
    "waste_not_collected"
]

ReportStatus = Literal[
    "pending",
    "under_review",
    "assigned",
    "resolved",
    "rejected"
]


class DumpingReportCreate(BaseModel):
    report_type: ReportType
    collection_point_id: int | None = Field(default=None, gt=0)
    collection_request_id: int | None = Field(default=None, gt=0)
    description: str = Field(min_length=10, max_length=2000)
    image_path: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_report(self):
        if (
            self.report_type == "waste_not_collected"
            and self.collection_point_id is None
        ):
            raise ValueError(
                "Collection point ID is required for waste not collected reports."
            )

        return self


class DumpingReportUpdate(BaseModel):
    status: ReportStatus
    collection_request_id: int | None = Field(default=None, gt=0)


class DumpingReportResponse(BaseModel):
    id: int
    reported_by: int
    report_type: ReportType
    collection_point_id: int | None
    collection_request_id: int | None
    description: str
    image_path: str | None
    status: ReportStatus
    reported_at: datetime
    resolved_at: datetime | None

    model_config = ConfigDict(from_attributes=True)