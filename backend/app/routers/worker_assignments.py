
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_role
from app.models.user import User
from app.models.collection_point import CollectionPoint
from app.models.collection_request import CollectionRequest
from app.models.worker_assignment import WorkerAssignment

from app.schemas.worker_assignment import (
    WorkerAssignmentCreate,
    WorkerAssignmentResponse,
)

router = APIRouter(
    prefix="/worker-assignments",
    tags=["Worker Assignments"]
)


# 1. Admin assigns a worker to a collection request
@router.post(
    "/",
    response_model=WorkerAssignmentResponse,
    status_code=status.HTTP_201_CREATED
)
def assign_worker(
    assignment_data: WorkerAssignmentCreate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin"))
):
    # Lock the collection request to prevent concurrent assignments.
    collection_request = (
        db.query(CollectionRequest)
        .filter(
            CollectionRequest.id == assignment_data.collection_request_id
        )
        .with_for_update()
        .first()
    )

    if collection_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection request not found."
        )

    if collection_request.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending collection requests can be assigned."
        )

    # Verify that the selected user exists and has the worker role.
    worker = (
        db.query(User)
        .filter(User.id == assignment_data.worker_id)
        .first()
    )

    if worker is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker not found."
        )

    if worker.role != "worker":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected user is not a worker."
        )

    if not worker.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign an inactive worker."
        )

    # Prevent duplicate assignments.
    existing_assignment = (
        db.query(WorkerAssignment)
        .filter(
            WorkerAssignment.collection_request_id
            == assignment_data.collection_request_id
        )
        .first()
    )

    if existing_assignment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This collection request already has an assignment."
        )

    # Create assignment and update request in one transaction.
    new_assignment = WorkerAssignment(
        collection_request_id=assignment_data.collection_request_id,
        worker_id=worker.id,
        assigned_by=current_admin.id
    )

    collection_request.status = "assigned"

    try:
        db.add(new_assignment)
        db.commit()
        db.refresh(new_assignment)

        return new_assignment

    except Exception:
        db.rollback()
        raise


# 2. Worker retrieves their own assignments
@router.get(
    "/my",
    response_model=list[WorkerAssignmentResponse]
)
def get_my_assignments(
    db: Session = Depends(get_db),
    current_worker: User = Depends(require_role("worker"))
):
    assignments = (
        db.query(WorkerAssignment)
        .filter(
            WorkerAssignment.worker_id == current_worker.id
        )
        .order_by(WorkerAssignment.assigned_at.desc())
        .all()
    )

    return assignments


# 3. Admin retrieves all worker assignments
@router.get(
    "/",
    response_model=list[WorkerAssignmentResponse]
)
def get_all_assignments(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin"))
):
    assignments = (
        db.query(WorkerAssignment)
        .order_by(WorkerAssignment.assigned_at.desc())
        .all()
    )

    return assignments

# 4. Worker starts their assigned collection task
@router.patch(
    "/{assignment_id}/start",
    response_model=WorkerAssignmentResponse
)
def start_collection_task(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_worker: User = Depends(require_role("worker"))
):
    # Find the assignment belonging to the logged-in worker.
    assignment = (
        db.query(WorkerAssignment)
        .filter(
            WorkerAssignment.id == assignment_id,
            WorkerAssignment.worker_id == current_worker.id
        )
        .first()
    )

    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found."
        )

    # Lock the associated collection request.
    collection_request = (
        db.query(CollectionRequest)
        .filter(
            CollectionRequest.id == assignment.collection_request_id
        )
        .with_for_update()
        .first()
    )

    if collection_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection request not found."
        )

    if collection_request.status != "assigned":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only assigned tasks can be started."
        )

    try:
        collection_request.status = "in_progress"

        db.commit()
        db.refresh(assignment)

        return assignment

    except Exception:
        db.rollback()
        raise

# 5. Worker completes their assigned collection task
@router.patch(
    "/{assignment_id}/complete",
    response_model=WorkerAssignmentResponse
)
def complete_collection_task(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_worker: User = Depends(require_role("worker"))
):
    # Find the assignment belonging to the logged-in worker.
    assignment = (
        db.query(WorkerAssignment)
        .filter(
            WorkerAssignment.id == assignment_id,
            WorkerAssignment.worker_id == current_worker.id
        )
        .first()
    )

    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found."
        )

    # Lock the collection request.
    collection_request = (
        db.query(CollectionRequest)
        .filter(
            CollectionRequest.id == assignment.collection_request_id
        )
        .with_for_update()
        .first()
    )

    if collection_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection request not found."
        )

    if collection_request.status != "in_progress":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only in-progress tasks can be completed."
        )

    # Lock the associated collection point.
    collection_point = (
        db.query(CollectionPoint)
        .filter(
            CollectionPoint.id == collection_request.collection_point_id
        )
        .with_for_update()
        .first()
    )

    if collection_point is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection point not found."
        )

    try:
        # Update collection request.
        collection_request.status = "completed"
        collection_request.completed_at = datetime.now(timezone.utc)

        # Reset estimated waste load.
        collection_point.current_fill_level = 0

        # Commit both changes together.
        db.commit()
        db.refresh(assignment)

        return assignment

    except Exception:
        db.rollback()
        raise
