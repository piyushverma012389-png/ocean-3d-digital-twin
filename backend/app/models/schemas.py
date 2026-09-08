"""
Pydantic schemas for the SIH26067 Ocean Visualization Platform.
Ensures strong typing, input validation, and clear contracts for
model outputs, in-situ observations, bathymetric grids, and statistical comparisons.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class GridMeta(BaseModel):
    lon_min: float
    lon_max: float
    lat_min: float
    lat_max: float
    nx: int
    ny: int
    depth_levels: List[int]
    time_steps: List[Dict[str, Any]]
    variables: Dict[str, Any]

class VectorSample(BaseModel):
    lon: float
    lat: float
    u: float
    v: float
    magnitude: float

class ModelSliceResponse(BaseModel):
    variable: str
    depth: int
    time_step: int
    timestamp: str
    units: str
    min_val: float
    max_val: float
    lons: List[float]
    lats: List[float]
    values: List[List[Optional[float]]]  # 2D array [ny][nx], None over land
    vectors: Optional[List[VectorSample]] = None  # Decimated vectors for flow arrows

class ProfileRecord(BaseModel):
    depth: float
    temperature: float
    salinity: float
    qc: int = 1  # 1 = good quality

class ArgoFloatSummary(BaseModel):
    id: str
    wmo: str
    platform_type: str
    lon: float
    lat: float
    status: str
    cycle: int
    last_update: str
    max_depth: float

class ArgoProfileResponse(BaseModel):
    id: str
    wmo: str
    lon: float
    lat: float
    cycle: int
    timestamp: str
    records: List[ProfileRecord]

class GliderWaypoint(BaseModel):
    lon: float
    lat: float
    depth: float
    timestamp: str

class GliderMission(BaseModel):
    id: str
    name: str
    model: str
    status: str
    waypoints: List[GliderWaypoint]

class BathymetryGridResponse(BaseModel):
    lon_min: float
    lon_max: float
    lat_min: float
    lat_max: float
    nx: int
    ny: int
    lons: List[float]
    lats: List[float]
    elevations: List[List[float]]  # Negative for ocean depth, positive for land elevation
    min_elevation: float
    max_elevation: float

class ComparisonProfilePoint(BaseModel):
    depth: float
    model_value: float
    obs_value: float
    bias: float
    error: Optional[float] = None  # Explicit signed error: model_value - obs_value
    model_depth: Optional[float] = None  # Collocated nearest HYCOM native depth level

class TemporalMatchInfo(BaseModel):
    argo_time: str
    model_time: str
    difference_hours: float
    status: str

class ComparisonResponse(BaseModel):
    float_id: str
    wmo: str
    cycle: Optional[int] = None
    lon: float
    lat: float
    variable: str
    units: str
    timestamp: str
    model_timestamp: Optional[str] = None
    time_difference_hours: Optional[float] = None
    temporal_match: Optional[TemporalMatchInfo] = None
    rmse: float
    mae: float
    mean_bias: float
    points: List[ComparisonProfilePoint]
    model_name: Optional[str] = "HYCOM GLBu0.08 / expt 91.2"
    observation_name: Optional[str] = "Argo Float 2902088"
    model_lon: Optional[float] = None
    model_lat: Optional[float] = None
    horizontal_separation_km: Optional[float] = None
    vertical_collocation_method: Optional[str] = "Nearest HYCOM depth level"
    qc_flags_accepted: Optional[str] = "1 (Good) and 2 (Probably Good)"
    valid_depth_range: Optional[str] = "5.6m – 1966.6m"
    n_levels: Optional[int] = None
