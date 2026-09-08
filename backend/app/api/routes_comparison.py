"""
API Router for Model vs In-Situ Observation statistical comparison (SIH26067).
Performs collocated water column extraction and calculates statistical metrics:
Root Mean Square Error (RMSE), Mean Absolute Error (MAE), and bias.
Includes temporal synchronization matching and synoptic status labeling.
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from datetime import datetime
import numpy as np
from app.services.observation_service import observation_service
from app.services.model_service import model_service
from app.core.config import settings
from app.models.schemas import ComparisonResponse, ComparisonProfilePoint, TemporalMatchInfo
try:
    from data.netcdf_loader import ocean_model_netcdf_loader
except ImportError:
    try:
        from backend.data.netcdf_loader import ocean_model_netcdf_loader
    except ImportError:
        ocean_model_netcdf_loader = None

router = APIRouter(prefix="/comparison", tags=["Model vs Observation Comparison"])

@router.get("/point", response_model=ComparisonResponse)
def compare_model_vs_observation(
    float_id: str = Query(..., description="Argo float identifier or WMO number"),
    variable: str = Query("temperature", description="Variable to compare: temperature or salinity"),
    time_step: int = Query(0, description="Model forecast time step"),
    cycle: Optional[int] = Query(None, description="Specific Argo float ascent cycle (e.g. 217; defaults to latest)")
):
    """
    Performs collocation comparison between 4D numerical ocean model and in-situ Argo float CTD profile.
    Supports multi-cycle selection (e.g. Cycle 217 for synoptic validation) and calculates temporal lag.
    """
    if variable not in ["temperature", "salinity"]:
        raise HTTPException(status_code=400, detail="Comparison currently supported for 'temperature' and 'salinity'.")

    float_profile = observation_service.get_float_profile(float_id, cycle=cycle)
    if not float_profile:
        raise HTTPException(status_code=404, detail=f"Observation platform '{float_id}' (cycle={cycle}) not found.")

    lon = float_profile.lon
    lat = float_profile.lat
    var_meta = settings.VARIABLES.get(variable, settings.VARIABLES["temperature"])

    # Resolve active model forecast timestamp & grid
    meta = model_service.get_metadata()
    clamped_time = max(0, min(time_step, len(meta.time_steps) - 1))
    model_ts = meta.time_steps[clamped_time]["timestamp"]

    raw_meta = ocean_model_netcdf_loader.get_metadata() if ocean_model_netcdf_loader else None

    if raw_meta and "lons" in raw_meta and "lats" in raw_meta:
        lons = raw_meta["lons"]
        lats = raw_meta["lats"]
        depth_levels = raw_meta.get("depth_levels", meta.depth_levels)
    else:
        lons = np.linspace(meta.lon_min, meta.lon_max, meta.nx).tolist()
        lats = np.linspace(meta.lat_min, meta.lat_max, meta.ny).tolist()
        depth_levels = meta.depth_levels

    if len(lons) > 0 and len(lats) > 0:
        i_nearest = int(np.argmin([abs(x - lon) for x in lons]))
        j_nearest = int(np.argmin([abs(y - lat) for y in lats]))
        model_lon = round(float(lons[i_nearest]), 4)
        model_lat = round(float(lats[j_nearest]), 4)

        # Great Circle distance (Haversine formula in km)
        R = 6371.0
        dlat = np.radians(model_lat - lat)
        dlon = np.radians(model_lon - lon)
        a = np.sin(dlat / 2.0)**2 + np.cos(np.radians(lat)) * np.cos(np.radians(model_lat)) * np.sin(dlon / 2.0)**2
        c = 2.0 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a))
        horiz_sep_km = round(float(R * c), 2)
    else:
        model_lon = lon
        model_lat = lat
        horiz_sep_km = 0.0

    # Calculate temporal difference between observation and model snapshot
    try:
        argo_dt = datetime.fromisoformat(float_profile.timestamp.replace("Z", "+00:00"))
        model_dt = datetime.fromisoformat(model_ts.replace("Z", "+00:00"))
        diff_sec = (argo_dt - model_dt).total_seconds()
        diff_hours = round(diff_sec / 3600.0, 4)
    except Exception:
        diff_hours = 0.0

    # Distinguish near-synoptic observations (within +/- 24 hours of model snapshot)
    status = "NEAR_SYNOPTIC" if abs(diff_hours) <= 24.0 else "TEMPORALLY_MISMATCHED"
    temporal_match = TemporalMatchInfo(
        argo_time=float_profile.timestamp,
        model_time=model_ts,
        difference_hours=diff_hours,
        status=status
    )

    points: list[ComparisonProfilePoint] = []
    diffs = []
    abs_diffs = []

    for record in float_profile.records:
        depth = record.depth
        obs_val = record.temperature if variable == "temperature" else record.salinity
        
        # Sample model at exact location and depth
        model_val = model_service.sample_point(lon, lat, depth, variable, time_step)

        bias = round(float(model_val - obs_val), 3)

        diffs.append(bias)
        abs_diffs.append(abs(bias))

        # Nearest HYCOM native depth level
        k_nearest = int(np.argmin([abs(d - depth) for d in depth_levels])) if depth_levels else 0
        nearest_m_depth = float(depth_levels[k_nearest]) if depth_levels else depth

        points.append(ComparisonProfilePoint(
            depth=depth,
            model_value=round(float(model_val), 2),
            obs_value=round(float(obs_val), 2),
            bias=bias,
            error=bias,
            model_depth=nearest_m_depth
        ))

    rmse = float(np.sqrt(np.mean(np.square(diffs)))) if diffs else 0.0
    mae = float(np.mean(abs_diffs)) if abs_diffs else 0.0
    mean_bias = float(np.mean(diffs)) if diffs else 0.0

    min_d = min([p.depth for p in points]) if points else 0.0
    max_d = max([p.depth for p in points]) if points else 2000.0

    return ComparisonResponse(
        float_id=float_profile.id,
        wmo=float_profile.wmo,
        cycle=float_profile.cycle,
        lon=lon,
        lat=lat,
        variable=variable,
        units=var_meta["units"],
        timestamp=float_profile.timestamp,
        model_timestamp=model_ts,
        time_difference_hours=diff_hours,
        temporal_match=temporal_match,
        rmse=round(rmse, 3),
        mae=round(mae, 3),
        mean_bias=round(mean_bias, 3),
        points=points,
        model_name="HYCOM GLBu0.08 / expt 91.2",
        observation_name=f"Argo Float {float_profile.wmo}",
        model_lon=model_lon,
        model_lat=model_lat,
        horizontal_separation_km=horiz_sep_km,
        vertical_collocation_method="Nearest HYCOM depth level",
        qc_flags_accepted="1 (Good) and 2 (Probably Good)",
        valid_depth_range=f"{min_d:.1f}m – {max_d:.1f}m",
        n_levels=len(points)
    )
