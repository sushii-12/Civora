
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DumpingReport(Base):
    __tablename__ = "dumping_reports"

    __table_args__ = (
        CheckConstraint(
            "report_type IN ('improper_dumping', 'waste_not_collected')",
            name="check_dumping_report_type",
        ),
        CheckConstraint(
            "status IN ('pending', 'under_review', 'assigned', 'resolved', 'rejected')",
            name="check_dumping_report_status",
        ),
        CheckConstraint(
            "report_type != 'waste_not_collected' "
            "OR collection_point_id IS NOT NULL",
            name="check_dumping_report_collection_point",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    reported_by: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    report_type: Mapped[str] = mapped_column(
        String(30), nullable=False
    )

    collection_point_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("collection_points.id"),
        nullable=True,
    )

    collection_request_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("collection_requests.id"),
        nullable=True,
    )

    description: Mapped[str] = mapped_column(
        Text, nullable=False
    )

    image_path: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending"
    )

    reported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
