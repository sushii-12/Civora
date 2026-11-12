
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_role
from app.models.collection_point import CollectionPoint
from app.models.collection_request import CollectionRequest
from app.models.user import User
from app.schemas.collection_request import (
    CollectionRequestCreate,
    CollectionRequestUpdate,
    CollectionRequestResponse,
)


router = APIRouter(
    prefix="/collection-requests",
    tags=["Collection Requests"]
)


# CREATE COLLECTION REQUEST (ADMIN ONLY)
@router.post(
    "/",
    response_model=CollectionRequestResponse,
    status_code=status.HTTP_201_CREATED
)
def create_collection_request(
    request_data: CollectionRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    collection_point = (
        db.query(CollectionPoint)
        .filter(
            CollectionPoint.id == request_data.collection_point_id,
            CollectionPoint.is_active.is_(True)
        )
        .first()
    )

    if collection_point is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active collection point not found."
        )

    new_request = CollectionRequest(
        collection_point_id=collection_point.id,
        requested_by=current_user.id,
        status="pending",
        notes=request_data.notes
    )

    try:
        db.add(new_request)
        db.commit()
        db.refresh(new_request)

        return new_request

    except Exception:
        db.rollback()
        raise


# GET ALL COLLECTION REQUESTS (ADMIN ONLY)
@router.get(
    "/",
    response_model=list[CollectionRequestResponse],
    status_code=status.HTTP_200_OK
)
def get_all_collection_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    requests = (
        db.query(CollectionRequest)
        .order_by(CollectionRequest.requested_at.desc())
        .all()
    )

    return requests


# GET COLLECTION REQUEST BY ID (ADMIN ONLY)
@router.get(
    "/{request_id}",
    response_model=CollectionRequestResponse,
    status_code=status.HTTP_200_OK
)
def get_collection_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    collection_request = (
        db.query(CollectionRequest)
        .filter(CollectionRequest.id == request_id)
        .first()
    )

    if collection_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection request not found."
        )

    return collection_request


# UPDATE COLLECTION REQUEST NOTES (ADMIN ONLY)
@router.patch(
    "/{request_id}",
    response_model=CollectionRequestResponse,
    status_code=status.HTTP_200_OK
)
def update_collection_request(
    request_id: int,
    request_data: CollectionRequestUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    collection_request = (
        db.query(CollectionRequest)
        .filter(CollectionRequest.id == request_id)
        .with_for_update()
        .first()
    )

    if collection_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection request not found."
        )

    # Reject empty update requests.
    if not request_data.model_fields_set:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided for update."
        )

    # Update notes only when supplied.
    if "notes" in request_data.model_fields_set:
        collection_request.notes = request_data.notes

    try:
        db.commit()
        db.refresh(collection_request)

        return collection_request

    except Exception:
        db.rollback()
        raise
