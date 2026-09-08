"""
API Router for Indian Ocean bathymetry and seabed topography (SIH26067).
"""
from fastapi import APIRouter
from app.services.bathymetry_service import bathymetry_service
from app.models.schemas import BathymetryGridResponse

router = APIRouter(prefix="/bathymetry", tags=["Bathymetry & Topography"])

@router.get("/grid", response_model=BathymetryGridResponse)
def get_bathymetry_grid():
    """
    Returns 2D bathymetric elevation grid and geographic axes for the Indian Ocean.
    Negative values indicate ocean depth (meters), positive indicate continental land.
    """
    return bathymetry_service.get_bathymetry_grid()
