
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_role
from app.models.collection_point import CollectionPoint
from app.models.user import User
from app.schemas.collection_point import (
    CollectionPointCreate,
    CollectionPointUpdate,
    CollectionPointResponse
)


router = APIRouter(
    prefix="/collection-points",
    tags=["Collection Points"]
)


# CREATE COLLECTION POINT (ADMIN ONLY)
@router.post(
    "/",
    response_model=CollectionPointResponse,
    status_code=status.HTTP_201_CREATED
)
def create_collection_point(
    point_data: CollectionPointCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    new_point = CollectionPoint(
        name=point_data.name,
        address=point_data.address,
        waste_type=point_data.waste_type,
        capacity=point_data.capacity,
        current_fill_level=point_data.current_fill_level,
        created_by=current_user.id
    )

    db.add(new_point)
    db.commit()
    db.refresh(new_point)

    return new_point


# GET ALL COLLECTION POINTS
@router.get(
    "/",
    response_model=list[CollectionPointResponse],
    status_code=status.HTTP_200_OK
)
def get_collection_points(
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("admin", "citizen", "worker")
    )
):
    query = db.query(CollectionPoint)

    # Citizens and workers can only see active points.
    if current_user.role != "admin":
        query = query.filter(CollectionPoint.is_active.is_(True))

    return query.order_by(CollectionPoint.id.asc()).all()


# GET COLLECTION POINT BY ID
@router.get(
    "/{point_id}",
    response_model=CollectionPointResponse,
    status_code=status.HTTP_200_OK
)
def get_collection_point(
    point_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role("admin", "citizen", "worker")
    )
):
    query = db.query(CollectionPoint).filter(
        CollectionPoint.id == point_id
    )

    # Non-admin users can only access active collection points.
    if current_user.role != "admin":
        query = query.filter(CollectionPoint.is_active.is_(True))

    collection_point = query.first()

    if collection_point is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection point not found."
        )

    return collection_point


# UPDATE COLLECTION POINT (ADMIN ONLY)
@router.patch(
    "/{point_id}",
    response_model=CollectionPointResponse,
    status_code=status.HTTP_200_OK
)
def update_collection_point(
    point_id: int,
    point_data: CollectionPointUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    collection_point = db.query(CollectionPoint).filter(
        CollectionPoint.id == point_id
    ).first()

    if collection_point is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Collection point not found."
        )

    # Extract only fields explicitly provided by the client.
    update_data = point_data.model_dump(
        exclude_unset=True,
        exclude_none=True
    )

    # Validate the effective capacity and fill level.
    new_capacity = update_data.get(
        "capacity",
        collection_point.capacity
    )

    new_fill_level = update_data.get(
        "current_fill_level",
        collection_point.current_fill_level
    )

    if new_fill_level > new_capacity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current fill level cannot exceed capacity."
        )

    # Apply the provided updates.
    for field, value in update_data.items():
        setattr(collection_point, field, value)

    db.commit()
    db.refresh(collection_point)

    return collection_point
