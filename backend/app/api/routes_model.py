"""
API Router for numerical ocean model outputs (SIH26067).
Handles grid metadata queries, 4D horizontal variable slicing, and vertical profile extraction.
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any
from app.core.config import settings
from app.services.model_service import model_service
from app.services.bathymetry_service import bathymetry_service
from app.models.schemas import GridMeta, ModelSliceResponse
try:
    from data.netcdf_loader import argo_netcdf_loader
except ImportError:
    try:
        from backend.data.netcdf_loader import argo_netcdf_loader
    except ImportError:
        argo_netcdf_loader = None

router = APIRouter(prefix="/model", tags=["Numerical Ocean Model"])

@router.get("/meta", response_model=GridMeta)
def get_model_metadata():
    """
    Returns domain bounds, resolution, depth levels, time snapshots, and variable specifications.
    Dynamically prioritizes authentic HYCOM metadata when available.
    """
    return model_service.get_metadata()

@router.get("/slice", response_model=ModelSliceResponse)
def get_model_slice(
    variable: str = Query("temperature", description="Variable: temperature, salinity, velocity, ssh"),
    depth: int = Query(0, description="Depth level in meters (0 to 4000)"),
    time_step: int = Query(0, description="Time step index (0 to 4)")
):
    """
    Returns 2D horizontal slice of the ocean model field at specified depth and time step.
    Includes decimated velocity vectors for current flow visualization.
    """
    if variable not in settings.VARIABLES:
        raise HTTPException(status_code=400, detail=f"Invalid variable '{variable}'. Supported: {list(settings.VARIABLES.keys())}")
    
    # For sea surface height anomaly (SSH), constrain strictly to surface level (depth = 0m)
    if variable == "ssh":
        closest_depth = 0
    else:
        available_depths = model_service.get_available_depths()
        closest_depth = min(available_depths, key=lambda d: abs(d - depth))
    
    meta = model_service.get_metadata()
    clamped_time = max(0, min(time_step, len(meta.time_steps) - 1))

    return model_service.get_slice(variable=variable, depth=closest_depth, time_step=clamped_time)


@router.get("/profile")
def get_model_profile(
    lon: float = Query(..., description="Longitude in degrees East"),
    lat: float = Query(..., description="Latitude in degrees North"),
    variable: str = Query("temperature", description="Variable name"),
    time_step: int = Query(0, description="Time step index")
):
    """
    Extracts vertical 1D water column profile (0 to 2000m) at specified geographic coordinates.
    """
    if not (settings.LON_MIN <= lon <= settings.LON_MAX and settings.LAT_MIN <= lat <= settings.LAT_MAX):
        raise HTTPException(status_code=400, detail=f"Coordinates ({lon}, {lat}) out of domain bounds.")
    
    return {
        "lon": lon,
        "lat": lat,
        "variable": variable,
        "time_step": time_step,
        "profile": model_service.get_profile(lon, lat, variable, time_step)
    }

@router.get("/provenance")
def get_data_provenance():
    """
    Returns authentic scientific data provenance, coverage bounds, and validation telemetry.
    Dynamically indicates whether authentic datasets or synthetic fallbacks are active.
    """
    hycom_auth = model_service.is_using_real_data()
    ssh_auth = model_service.is_using_real_ssh()
    gebco_auth = bathymetry_service.is_using_real_data()
    argo_auth = bool(argo_netcdf_loader and argo_netcdf_loader.has_argo_data())

    return {
        "hycom": {
            "is_authentic": hycom_auth and ssh_auth,
            "is_authentic_3d": hycom_auth,
            "is_authentic_ssh": ssh_auth,
            "name": "NOAA/NRL HYCOM+NCODA",
            "product": "GLBu0.08 / expt 91.2",
            "source": "NOAA CoastWatch ERDDAP (nrlHycomGLBu008e912D_LonPM180 & nrlHycomGLBu008e912S_LonPM180)",
            "spatial_coverage": "30.0°E – 115.0°E, 25.0°S – 30.0°N (sampled ~0.08°)",
            "depth_coverage": "0m to 5000m (39 depth levels)",
            "temporal_coverage": "2018-11-18 to 2018-11-20 (daily mean fields)",
            "variables": ["water_temp (Temperature)", "salinity (Salinity)", "water_u / water_v (Currents)", "surf_el (SSH)"]
        },
        "hycom_ssh": {
            "is_authentic": ssh_auth,
            "name": "NOAA/NRL HYCOM Sea Surface Height",
            "product": "GLBu0.08 / expt 91.2 (surf_el)",
            "source": "NOAA CoastWatch ERDDAP (nrlHycomGLBu008e912S_LonPM180)",
            "spatial_coverage": "30.0°E – 115.0°E, 25.0°S – 30.0°N (sampled ~0.08°)",
            "temporal_coverage": "2018-11-18 to 2018-11-20",
            "variables": ["surf_el (SSH)"]
        },
        "gebco": {
            "is_authentic": gebco_auth,
            "name": "GEBCO 2020 Grid",
            "product": "GEBCO 2020 Global Bathymetric Elevation",
            "source": "British Oceanographic Data Centre (BODC) / GEBCO (gebco_2020_indian_ocean.nc)",
            "spatial_coverage": "30.0°E – 115.0°E, 25.0°S – 30.0°N (sampled 0.5°)",
            "vertical_range": "-6808m (Java Trench) to +5869m (Himalayan relief)",
            "qc": "Sub-sampled with stride=120 from native 15 arc-second grid"
        },
        "argo": {
            "is_authentic": argo_auth,
            "name": "Argo Profiling Float",
            "platform_wmo": "2902088",
            "source": "Ifremer / Coriolis Global Data Assembly Centre (GDAC) (2902088_prof.nc)",
            "cycles_available": 228,
            "target_cycle": 217,
            "observation_time": "2018-11-20T03:29:00Z",
            "location": "4.15°S, 86.00°E",
            "depth_range": "5.6m to 1966.6m",
            "qc_levels": 138,
            "qc_flags": "Flags 1 (Good) and 2 (Probably Good) strictly accepted"
        }
    }

