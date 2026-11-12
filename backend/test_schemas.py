
from pydantic import ValidationError

from app.schemas.collection_point import CollectionPointCreate
from app.schemas.dumping_report import DumpingReportCreate
from app.schemas.waste_deposit import WasteDepositCreate


# Test 1: Valid collection point
CollectionPointCreate(
    name="Test Point",
    address="Bengaluru, Karnataka",
    waste_type="mixed",
    capacity=100,
    current_fill_level=80
)
print("Valid collection point: PASSED")


# Test 2: Invalid fill level
try:
    CollectionPointCreate(
        name="Test Point",
        address="Bengaluru, Karnataka",
        waste_type="mixed",
        capacity=100,
        current_fill_level=120
    )
    raise AssertionError("Invalid fill level was accepted")
except ValidationError:
    print("Fill level validation: PASSED")


# Test 3: Valid waste deposit
WasteDepositCreate(
    collection_point_id=1,
    waste_type="wet",
    quantity=5
)
print("Valid waste deposit: PASSED")


# Test 4: Valid improper dumping report without collection point
DumpingReportCreate(
    report_type="improper_dumping",
    description="Waste dumped near the roadside"
)
print("Improper dumping validation: PASSED")


# Test 5: Invalid waste-not-collected report
try:
    DumpingReportCreate(
        report_type="waste_not_collected",
        description="Waste was not collected",
        collection_point_id=None
    )
    raise AssertionError("Missing collection point was accepted")
except ValidationError:
    print("Collection point requirement: PASSED")


print("\nAll schema validation tests passed!")
