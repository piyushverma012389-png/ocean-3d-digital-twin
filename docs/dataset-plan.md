# Dataset Integration Plan — SIH26067
## Numerical Ocean Models & In-Situ Observation Feeds for the Indian Ocean

### 1. Target Datasets

#### 1.1 Numerical Ocean Circulation Models
| Dataset | Source Agency | Spatial Domain | Resolution | Variables |
| :--- | :--- | :--- | :--- | :--- |
| **INCOIS ROMS** | INCOIS (Hyderabad, India) | Indian Ocean ($30^{\circ}\text{E} - 120^{\circ}\text{E}$, $30^{\circ}\text{S} - 30^{\circ}\text{N}$) | $1/12^{\circ}$ (~9 km), 40 vertical levels | Temperature, Salinity, Current ($u, v, w$), SSH, MLD |
| **INCOIS MOM / GODAS** | INCOIS / MoES | Global / Tropical Indian Ocean | $0.25^{\circ}$, 40 levels | Subsurface thermal structure, heat content |
| **Copernicus Marine (CMEMS)** | Mercator Ocean | Global Ocean Physics Analysis | $1/12^{\circ}$, 50 levels | Daily & hourly physical fields |
| **HYCOM** | Naval Research Laboratory | Global ($1/12^{\circ}$) | Hybrid isopycnal-sigma-pressure levels | Currents, baroclinic modes |

#### 1.2 In-Situ Observation Networks
| Platform | Network / Archive | Data Format | Parameters | Mission / Profile Depth |
| :--- | :--- | :--- | :--- | :--- |
| **Argo Profiling Floats** | INCOIS Argo Data Centre / Coriolis GDAC | NetCDF (`_prof.nc`, `_traj.nc`) | Temperature, Salinity, Pressure, Oxygen (BGC-Argo) | Park: 1000m, Profile: 0–2000m every 10 days |
| **Autonomous Underwater Gliders** | OceanGliders / NIO Goa | NetCDF (`og_trajectory.nc`) | High-resolution CTD, Chlorophyll, Turbidity | Sawtooth 0–1000m transects |
| **Moored Buoy Network (RAMA / OMNI)** | INCOIS / NIOT / NOAA PMEL | CSV / NetCDF | SST, surface winds, sub-surface temperature strings | Fixed mooring line down to 500m |

---

### 2. NetCDF Schema & Variable Mapping Standards
Real model outputs adhere to CF-1.8 metadata conventions. Our ingestion layer standardizes variable naming:

```python
STANDARD_VARIABLE_MAP = {
    # Temperature
    "temp": "temperature",
    "thetao": "temperature",
    "votemper": "temperature",
    "sst": "temperature",
    
    # Salinity
    "salt": "salinity",
    "so": "salinity",
    "vosaline": "salinity",
    "sss": "salinity",
    
    # Current velocity
    "u": "velocity_u",
    "uo": "velocity_u",
    "vozocrtx": "velocity_u",
    "v": "velocity_v",
    "vo": "velocity_v",
    "vomecrty": "velocity_v",
    
    # Sea Surface Height
    "ssh": "ssh",
    "zos": "ssh",
    "sossheig": "ssh",
    "zeta": "ssh"
}
```

---

### 3. File Organization & Storage Layout
```
data/
├── raw/
│   ├── models/
│   │   └── incois_roms_indian_ocean_sample.nc   # (Drop real NetCDF model files here)
│   ├── argo/
│   │   ├── WMO_2903741_prof.nc
│   │   ├── WMO_2903742_prof.nc
│   │   └── ...
│   └── gliders/
│       └── incois_glider_sg601_mission1.nc
├── processed/
│   ├── bathymetry_indian_ocean_1deg.json
│   └── active_floats_index.json
└── synthetic/
    └── synthetic_indian_ocean_fields.py
```

### 4. Transition from Phase 1 MVP to Production
- **Phase 1 (Current)**: High-fidelity synthetic fields adhering to exact physical oceanographic equations (exponential thermocline decay, Somali jet currents, equatorial countercurrent) and WMO Argo float profiles.
- **Phase 2 Ingestion**: Place any standard `.nc` file into `data/raw/models/`. The `netcdf_loader.py` will inspect the coordinates, extract dimension axes, and serve actual numerical model values through the same API endpoints.
