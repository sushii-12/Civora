
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WasteDeposit(Base):
    __tablename__ = "waste_deposits"

    __table_args__ = (
        CheckConstraint(
            "waste_type IN ('wet', 'dry')",
            name="check_waste_deposit_type",
        ),
        CheckConstraint(
            "quantity > 0",
            name="check_waste_deposit_quantity",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    collection_point_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("collection_points.id"),
        nullable=False,
    )

    waste_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )

    quantity: Mapped[float] = mapped_column(
        Float, nullable=False
    )

    deposited_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
