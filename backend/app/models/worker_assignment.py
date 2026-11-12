
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Integer,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WorkerAssignment(Base):
    __tablename__ = "worker_assignments"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, index=True
    )

    collection_request_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("collection_requests.id"),
        nullable=False,
    )

    worker_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    assigned_by: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
