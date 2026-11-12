
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CollectionPoint(Base):
    __tablename__ = "collection_points"

    __table_args__ = (
        CheckConstraint(
            "waste_type IN ('wet', 'dry', 'mixed')",
            name="check_collection_point_waste_type",
        ),
        CheckConstraint(
            "capacity > 0",
            name="check_collection_point_capacity",
        ),
        CheckConstraint(
            "current_fill_level >= 0 "
            "AND current_fill_level <= capacity",
            name="check_collection_point_fill_level",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    name: Mapped[str] = mapped_column(
        String(150), nullable=False
    )

    address: Mapped[str] = mapped_column(
        Text, nullable=False
    )

    waste_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )

    capacity: Mapped[float] = mapped_column(
        Float, nullable=False
    )

    current_fill_level: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True
    )

    created_by: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
