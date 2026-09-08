"""
Application configuration for the Ocean 3D Visualization Platform (SIH26067).
Defines spatial domains, standard vertical depth levels, physical variable specifications,
and dataset configurations for the Indian Ocean basin.
"""
from typing import List, Dict, Any

class Settings:
    PROJECT_NAME: str = "SIH26067 — Ocean 3D Visualization Platform"
    API_V1_PREFIX: str = "/api"
    VERSION: str = "1.0.0"
    
    # Geographic domain bounds for the Indian Ocean
    # Bounded between 30°E and 115°E, -25°S and 30°N
    LON_MIN: float = 30.0
    LON_MAX: float = 115.0
    LAT_MIN: float = -25.0
    LAT_MAX: float = 30.0
    
    # Grid resolution for spatial slices (Phase 1 resolution)
    GRID_NX: int = 86   # 1 degree longitudinal resolution
    GRID_NY: int = 56   # 1 degree latitudinal resolution
    
    # Standard Oceanographic Depth Levels (meters, positive downwards)
    # Reflects standard WOD/Argo/ROMS depth discretization
    DEPTH_LEVELS: List[int] = [0, 10, 20, 50, 100, 200, 500, 1000, 1500, 2000, 3000, 4000]
    
    # Temporal simulation steps (hours / day snapshots) matching authentic HYCOM daily fields
    TIME_STEPS: List[Dict[str, Any]] = [
        {"index": 0, "timestamp": "2018-11-18T00:00:00Z", "label": "18 Nov 2018"},
        {"index": 1, "timestamp": "2018-11-19T00:00:00Z", "label": "19 Nov 2018"},
        {"index": 2, "timestamp": "2018-11-20T00:00:00Z", "label": "20 Nov 2018"},
    ]
    
    # Physical variables dictionary
    VARIABLES: Dict[str, Dict[str, Any]] = {
        "temperature": {
            "name": "Temperature",
            "short_name": "Temp",
            "units": "°C",
            "min": 1.5,
            "max": 32.0,
            "default_colormap": "turbo",
            "description": "Seawater temperature across the vertical water column"
        },
        "salinity": {
            "name": "Practical Salinity",
            "short_name": "Sal",
            "units": "PSU",
            "min": 31.0,
            "max": 37.5,
            "default_colormap": "haline",
            "description": "Practical salinity reflecting freshwater discharge and evaporation"
        },
        "velocity": {
            "name": "Current Velocity Magnitude",
            "short_name": "Velocity",
            "units": "m/s",
            "min": 0.0,
            "max": 2.2,
            "default_colormap": "viridis",
            "description": "Magnitude of horizontal ocean current vector sqrt(u^2 + v^2)"
        },
        "ssh": {
            "name": "Sea Surface Height Anomaly",
            "short_name": "SSH",
            "units": "m",
            "min": -0.8,
            "max": 0.8,
            "default_colormap": "coolwarm",
            "description": "Deviation of sea surface height from the mean sea level"
        }
    }

settings = Settings()
