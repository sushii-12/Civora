
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.collection_points import router as collection_points_router
from app.routers.auth import router as auth_router
from app.routers.waste_deposits import router as waste_deposits_router
from app.routers.collection_requests import router as collection_requests_router
from app.routers.worker_assignments import router as worker_assignments_router
from app.routers import dumping_reports

app = FastAPI(
    title="Civora API",
    description="Digital Waste Management & Accountability Platform",
    version="1.0.0"
)

# CORS configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(collection_points_router)
app.include_router(waste_deposits_router)
app.include_router(collection_requests_router)
app.include_router(worker_assignments_router)
app.include_router(dumping_reports.router)


@app.get("/")
def root():
    return {
        "message": "Welcome to Civora API",
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "application": "Civora"
    }
