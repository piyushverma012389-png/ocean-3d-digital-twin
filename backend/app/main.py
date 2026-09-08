"""
FastAPI Main Application Entry Point — SIH26067
Web-based Interactive 3D Visualization Platform Integrating Numerical Ocean Model Outputs and In-Situ Observations.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes_model import router as model_router
from app.api.routes_observations import router as observation_router
from app.api.routes_bathymetry import router as bathymetry_router
from app.api.routes_comparison import router as comparison_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Operational 3D digital twin platform integrating numerical ocean general circulation models and in-situ observations (Argo floats & gliders).",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

import os

# Configure production-ready CORS origins
allowed_origins = [
    "https://piyushverma012389-png.github.io",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
]

# Support additional custom production origins via environment variable
extra_origins = os.environ.get("CORS_ORIGINS", "")
if extra_origins:
    for o in extra_origins.split(","):
        cleaned = o.strip()
        if cleaned and cleaned not in allowed_origins:
            allowed_origins.append(cleaned)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(model_router, prefix=settings.API_V1_PREFIX)
app.include_router(observation_router, prefix=settings.API_V1_PREFIX)
app.include_router(bathymetry_router, prefix=settings.API_V1_PREFIX)
app.include_router(comparison_router, prefix=settings.API_V1_PREFIX)

try:
    from data.netcdf_loader import check_dataset_health
except ImportError:
    try:
        from backend.data.netcdf_loader import check_dataset_health
    except ImportError:
        check_dataset_health = None

@app.get("/api/health")
def health_check():
    """System health check probe with dataset status summary."""
    dataset_summary = None
    if check_dataset_health:
        try:
            dataset_summary = check_dataset_health()
        except Exception as e:
            dataset_summary = {
                "status": "unhealthy",
                "all_authentic_data_available": False,
                "diagnostics": [f"Error checking dataset health: {str(e)}"]
            }

    status = "healthy"
    if dataset_summary and not dataset_summary.get("all_authentic_data_available", True):
        status = "degraded"

    return {
        "status": status,
        "platform": "SIH26067 3D Ocean Digital Twin",
        "version": settings.VERSION,
        "active_domain": "Indian Ocean Basin (30°E - 115°E, 25°S - 30°N)",
        "dataset_health": dataset_summary
    }

@app.get("/api/health/datasets")
def dataset_health_check():
    """Detailed authentic dataset availability and diagnostic report."""
    if check_dataset_health:
        try:
            return check_dataset_health()
        except Exception as e:
            return {
                "status": "unhealthy",
                "all_authentic_data_available": False,
                "diagnostics": [f"Error running dataset health check: {str(e)}"]
            }
    return {
        "status": "unhealthy",
        "all_authentic_data_available": False,
        "diagnostics": ["check_dataset_health loader module not available"]
    }

