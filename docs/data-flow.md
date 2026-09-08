# Data Flow Specification — SIH26067
## Pipeline from Raw Ocean Datasets to Interactive 3D WebGL Visualization

### 1. Ingestion Pipeline Overview
The platform processes two types of scientific feeds: gridded 4D NetCDF files (numerical ocean models) and profile/trajectory feeds (in-situ observations like Argo floats and underwater gliders).

```
[Raw Model NetCDF / GRIB]
           │
           ▼
[Xarray / NetCDF4 Ingestion] ────► [Dataset Standardizer (CF-1.8 Compliance)]
                                                │
                                                ▼
                                    [4D In-Memory Spatiotemporal Cache]
                                                │
               ┌────────────────────────────────┴────────────────────────────────┐
               ▼                                                                 ▼
    [Horizontal Slices (lon, lat)]                                 [Vertical Profiles (z)]
      - Decimated Grid (Nx x Ny)                                     - 1D CTD Water Column
      - Colormap Normalization                                       - Collocated at Lat/Lon
               │                                                                 │
               ▼                                                                 ▼
    [FastAPI JSON / Binary API]                                    [Model-vs-Obs Comparison]
               │                                                                 │
               ▼                                                                 ▼
   [Three.js DataTexture / Canvas]                                  [SVG / Canvas CTD Curves]
```

---

### 2. Detailed Data Transformation Steps

#### 2.1 Numerical Ocean Model Slices
1. **Client Request**: Frontend triggers `GET /api/model/slice?variable=temperature&depth=100&time_step=2`.
2. **Dimension Selection**:
   - `depth`: Nearest standard oceanographic depth level $z_k \in \{0, 10, 20, 50, 100, 200, 500, 1000, 2000, 4000\}$.
   - `time_step`: Temporal index $t_i$.
   - `variable`: Selected state variable (`temperature`, `salinity`, `velocity_u`, `velocity_v`, `ssh`).
3. **Interpolation & Slicing**:
   - In live mode: `ds[var].isel(time=t).interp(depth=z)`.
   - In synthetic high-fidelity mode: Evaluates baroclinic thermal stratification with seasonal thermocline exponential decay and geostrophic wave perturbations.
4. **Vector Quantization**:
   - For velocity fields, returns scalar magnitude field plus decimation grid of 2D velocity vectors $(u, v)$ for instanced vector arrow rendering.
5. **Data Transfer**:
   - Structured JSON response containing grid boundaries, value matrix $[N_{lat} \times N_{lon}]$, min/max statistical thresholds, and units.

#### 2.2 In-Situ Observations (Argo & Gliders)
1. **Float Metadata Ingestion**:
   - WMO identification number, platform type (e.g. APEX, PROVOR, SOLO-II, Seaglider SG601).
   - Deployment date, cycle number, active coordinates $(\lambda, \phi)$, status (active, surfacing, descending).
2. **CTD Sensor Profiles**:
   - Depth levels: $[0, 5, 10, 20, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000]\text{ m}$.
   - Temperature ($^{\circ}\text{C}$) and Salinity ($\text{PSU}$).
   - Quality control (QC) flags ($1 = \text{good}$, $2 = \text{probably good}$, $3 = \text{bad}$).
3. **Client-Side Three.js Instancing**:
   - Surface buoys: Instanced spheres at $(x, 0, z)$ with pulsing glow.
   - Vertical tether: Translucent vertical line from surface down to profile depth with sensor nodes.
   - Gliders: 3D polyline showing sawtooth dive-and-climb profile with directional arrows.

#### 2.3 Model vs In-Situ Observation Collocation
1. User clicks on an Argo float marker in the 3D scene (e.g., float `WMO-2903741` at $12.5^{\circ}\text{N}, 68.2^{\circ}\text{E}$).
2. Frontend requests `/api/comparison/point?float_id=WMO-2903741&variable=temperature`.
3. Backend retrieves the in-situ CTD profile from the Argo station.
4. Backend samples the 4D ocean model at the exact geographic coordinates $(\lambda_{argo}, \phi_{argo})$ across all vertical depth levels at the closest time step.
5. Statistical comparison engine calculates:
   - Profile Bias: $\text{Bias}(z) = T_{model}(z) - T_{obs}(z)$
   - Root Mean Square Error: $\text{RMSE} = \sqrt{\frac{1}{N} \sum_{i=1}^N (T_{model}(z_i) - T_{obs}(z_i))^2}$
   - Mean Absolute Error: $\text{MAE} = \frac{1}{N} \sum_{i=1}^N |T_{model}(z_i) - T_{obs}(z_i)|$
6. Frontend displays an interactive CTD profile comparison plot and statistical diagnostic card.
