
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_role
from app.models.collection_point import CollectionPoint
from app.models.user import User
from app.models.waste_deposit import WasteDeposit
from app.schemas.waste_deposit import (
    WasteDepositCreate,
    WasteDepositResponse
)


router = APIRouter(
    prefix="/waste-deposits",
    tags=["Waste Deposits"]
)


# CREATE WASTE DEPOSIT (CITIZEN ONLY)
@router.post(
    "/",
    response_model=WasteDepositResponse,
    status_code=status.HTTP_201_CREATED
)
def create_waste_deposit(
    deposit_data: WasteDepositCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("citizen"))
):
    try:
        # Lock the collection point row to prevent concurrent
        # deposits from exceeding its available capacity.
        collection_point = (
            db.query(CollectionPoint)
            .filter(
                CollectionPoint.id == deposit_data.collection_point_id,
                CollectionPoint.is_active.is_(True)
            )
            .with_for_update()
            .first()
        )

        if collection_point is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Active collection point not found."
            )

        # Validate waste type compatibility.
        if (
            collection_point.waste_type != "mixed"
            and collection_point.waste_type != deposit_data.waste_type
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This collection point does not accept the selected waste type."
            )

        # Calculate the estimated load after this deposit.
        new_fill_level = (
            collection_point.current_fill_level
            + deposit_data.quantity
        )

        # Prevent deposits from exceeding capacity.
        if new_fill_level > collection_point.capacity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Deposit exceeds the remaining collection point capacity."
            )

        # Create the deposit.
        new_deposit = WasteDeposit(
            user_id=current_user.id,
            collection_point_id=collection_point.id,
            waste_type=deposit_data.waste_type,
            quantity=deposit_data.quantity
        )

        # Update the estimated fill level.
        collection_point.current_fill_level = new_fill_level

        # Save both changes in one transaction.
        db.add(new_deposit)
        db.commit()
        db.refresh(new_deposit)

        return new_deposit

    except Exception:
        db.rollback()
        raise


# GET MY WASTE DEPOSITS (CITIZEN ONLY)
@router.get(
    "/my",
    response_model=list[WasteDepositResponse],
    status_code=status.HTTP_200_OK
)
def get_my_waste_deposits(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("citizen"))
):
    deposits = (
        db.query(WasteDeposit)
        .filter(WasteDeposit.user_id == current_user.id)
        .order_by(WasteDeposit.deposited_at.desc())
        .all()
    )

    return deposits


# GET ALL WASTE DEPOSITS (ADMIN ONLY)
@router.get(
    "/",
    response_model=list[WasteDepositResponse],
    status_code=status.HTTP_200_OK
)
def get_all_waste_deposits(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    deposits = (
        db.query(WasteDeposit)
        .order_by(WasteDeposit.deposited_at.desc())
        .all()
    )

    return deposits
