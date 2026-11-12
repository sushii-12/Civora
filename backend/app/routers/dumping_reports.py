
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.dependencies import get_db, require_role
from app.models.user import User
from app.models.collection_point import CollectionPoint
from app.models.collection_request import CollectionRequest
from app.models.dumping_report import DumpingReport

from app.schemas.dumping_report import (
    DumpingReportCreate,
    DumpingReportUpdate,
    DumpingReportResponse,
)


router = APIRouter(
    prefix="/dumping-reports",
    tags=["Dumping Reports"]
)

# 1. Citizen submits a dumping report
@router.post(
    "/",
    response_model=DumpingReportResponse,
    status_code=status.HTTP_201_CREATED
)
def create_dumping_report(
    report_data: DumpingReportCreate,
    db: Session = Depends(get_db),
    current_citizen: User = Depends(require_role("citizen"))
):
    # Validate collection point if provided.
    if report_data.collection_point_id is not None:
        collection_point = (
            db.query(CollectionPoint)
            .filter(
                CollectionPoint.id == report_data.collection_point_id,
                CollectionPoint.is_active == True
            )
            .first()
        )

        if collection_point is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Active collection point not found."
            )

    # Validate linked collection request if provided.
    if report_data.collection_request_id is not None:
        collection_request = (
            db.query(CollectionRequest)
            .filter(
                CollectionRequest.id == report_data.collection_request_id
            )
            .first()
        )

        if collection_request is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Collection request not found."
            )

        # Ensure the linked request belongs to the same collection point.
        if (
            report_data.collection_point_id is not None
            and collection_request.collection_point_id
            != report_data.collection_point_id
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Collection request does not belong to the specified collection point."
            )

    # Create report using the authenticated citizen's ID.
    new_report = DumpingReport(
        reported_by=current_citizen.id,
        report_type=report_data.report_type,
        collection_point_id=report_data.collection_point_id,
        collection_request_id=report_data.collection_request_id,
        description=report_data.description,
        image_path=report_data.image_path
    )

    try:
        db.add(new_report)
        db.commit()
        db.refresh(new_report)

        return new_report

    except Exception:
        db.rollback()
        raise

# 2. Citizen retrieves their own dumping reports
@router.get(
    "/my",
    response_model=list[DumpingReportResponse]
)
def get_my_reports(
    db: Session = Depends(get_db),
    current_citizen: User = Depends(require_role("citizen"))
):
    reports = (
        db.query(DumpingReport)
        .filter(
            DumpingReport.reported_by == current_citizen.id
        )
        .order_by(DumpingReport.reported_at.desc())
        .all()
    )

    return reports

# 3. Admin retrieves all dumping reports
@router.get(
    "/",
    response_model=list[DumpingReportResponse]
)
def get_all_reports(
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin"))
):
    reports = (
        db.query(DumpingReport)
        .order_by(DumpingReport.reported_at.desc())
        .all()
    )

    return reports

# 4. Admin retrieves a specific dumping report
@router.get(
    "/{report_id}",
    response_model=DumpingReportResponse
)
def get_report_by_id(
    report_id: int,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin"))
):
    report = (
        db.query(DumpingReport)
        .filter(DumpingReport.id == report_id)
        .first()
    )

    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dumping report not found."
        )

    return report

# 5. Admin updates a dumping report's status
@router.patch(
    "/{report_id}",
    response_model=DumpingReportResponse
)
def update_report(
    report_id: int,
    report_data: DumpingReportUpdate,
    db: Session = Depends(get_db),
    current_admin: User = Depends(require_role("admin"))
):
    report = (
        db.query(DumpingReport)
        .filter(DumpingReport.id == report_id)
        .with_for_update()
        .first()
    )

    if report is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dumping report not found."
        )

    # Define permitted status transitions.
    allowed_transitions = {
        "pending": ["under_review", "rejected"],
        "under_review": ["assigned", "resolved", "rejected"],
        "assigned": ["under_review", "resolved", "rejected"],
        "resolved": [],
        "rejected": []
    }

    new_status = report_data.status

    if new_status != report.status:
        if new_status not in allowed_transitions[report.status]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid report status transition."
            )

    # Validate an optional linked collection request.
    if "collection_request_id" in report_data.model_fields_set:
        if report_data.collection_request_id is not None:
            collection_request = (
                db.query(CollectionRequest)
                .filter(
                    CollectionRequest.id
                    == report_data.collection_request_id
                )
                .first()
            )

            if collection_request is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Collection request not found."
                )

            if (
                report.collection_point_id is not None
                and collection_request.collection_point_id
                != report.collection_point_id
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Collection request does not belong to this report's collection point."
                )

        report.collection_request_id = (
            report_data.collection_request_id
        )

    try:
        report.status = new_status

        if new_status == "resolved":
            report.resolved_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(report)

        return report

    except Exception:
        db.rollback()
        raise
