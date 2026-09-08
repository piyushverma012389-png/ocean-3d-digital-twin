# SIH26067 — Indian Ocean 3D Digital Twin Platform

An interactive 3D oceanographic visualization and model-observation comparison platform for the Indian Ocean basin ($30^\circ\text{E}$ to $115^\circ\text{E}$, $25^\circ\text{S}$ to $30^\circ\text{N}$).

The application integrates numerical ocean model outputs with in-situ ocean observations (Argo profiling floats and underwater gliders) to provide 4D spatial visualization and collocated statistical validation.

---

## System Overview

1. **3D Seafloor Bathymetry**:
   - 3D displaced terrain rendered from GEBCO 2020 gridded bathymetry data.
   - Captures seafloor features including the Central Indian Ridge, Ninety East Ridge, Carlsberg Ridge, and Java Trench.

2. **4D Ocean Model Slicing**:
   - Interactive horizontal slicing across 4 physical variables: Potential Temperature (°C), Practical Salinity (PSU), Current Velocity Magnitude (m/s), and Sea Surface Height Anomaly (m).
   - Vertical depth exploration across 10 depth presets ($0\text{m}$ to $2000\text{m}$).
   - Strict surface locking ($z=0\text{m}$) for Sea Surface Height Anomaly.
   - Time scrubbing across 3 daily snapshots (18, 19, 20 November 2018).

3. **Current Velocity Vectors**:
   - 3D flow arrows derived from zonal ($u$) and meridional ($v$) velocity components ($\text{magnitude} = \sqrt{u^2 + v^2}$).

4. **In-Situ Observation Network**:
   - Surface float markers and vertical profiles from Coriolis GDAC Argo floats.
   - Autonomous underwater glider missions with 3D sawtooth trajectories.

5. **Model vs In-Situ Collocation & Comparison**:
   - Collocation between numerical model fields and Argo CTD observations.
   - Statistical evaluation metrics: Root Mean Square Error (RMSE), Mean Absolute Error (MAE), and Mean Bias (${\text{Model}} - {\text{Observation}}$).
   - Multi-cycle selection supporting synoptic validation (Cycle 217) and temporal mismatch demonstration (Cycle 228).

6. **Presentation Mode**:
   - Clean fullscreen view toggled from the navbar, hiding side panels for projection and demonstration.

---

## Authentic Datasets & Sources

The platform uses authentic NetCDF datasets located in `data/raw/`:

| Dataset | Source / Institution | File Path | Specifications |
|---------|----------------------|-----------|----------------|
| **HYCOM 3D** | NOAA / NRL HYCOM+NCODA (GLBu0.08, expt 91.2) | `data/raw/models/hycom_indian_ocean.nc` | $89 \times 58$ grid, 39 vertical levels, 3 daily steps (18–20 Nov 2018). Variables: `water_temp`, `salinity`, `water_u`, `water_v`. |
| **HYCOM SSH** | NOAA / NRL HYCOM+NCODA | `data/raw/models/hycom_ssh_indian_ocean.nc` | $89 \times 58$ grid, surface level ($0\text{m}$), 3 daily steps. Variable: `surf_el` (meters). |
| **GEBCO 2020** | British Oceanographic Data Centre (BODC) / GEBCO | `data/raw/bathymetry/gebco_2020_indian_ocean.nc` | $171 \times 111$ grid, 0.5° resolution. Elevation range: $-6808\text{m}$ to $+5869\text{m}$. |
| **Argo GDAC** | Ifremer / Coriolis Global Data Assembly Centre | `data/raw/argo/2902088_prof.nc` | WMO 2902088, 228 ascent cycles. In-situ temperature and salinity profiles with UNESCO pressure-to-depth conversion and strict QC filtering (flags 1 and 2 accepted). |

---

## Model vs Observation Collocation Methodology

1. **Horizontal Collocation**:
   - Locates the nearest HYCOM grid cell $(lon_m, lat_m)$ to the Argo float location $(lon_{obs}, lat_{obs})$.
   - Calculates great-circle separation using the Haversine formula (km).

2. **Vertical Matching**:
   - Matches each Argo observation depth level to the nearest native HYCOM depth level.
   - Extracts model values at the matched coordinates.

3. **Statistical Metrics**:
   - **Signed Error**: $\text{Error}_i = \text{Model}_i - \text{Obs}_i$
   - **Mean Bias**: $\frac{1}{N} \sum_{i=1}^N (\text{Model}_i - \text{Obs}_i)$
   - **MAE**: $\frac{1}{N} \sum_{i=1}^N |\text{Model}_i - \text{Obs}_i|$
   - **RMSE**: $\sqrt{\frac{1}{N} \sum_{i=1}^N (\text{Model}_i - \text{Obs}_i)^2}$

4. **Temporal Classification**:
   - **NEAR-SYNOPTIC** ($|\Delta t| \le 24\text{ hours}$): Validates model accuracy against observations taken within the same synoptic window.
     - *Example*: Argo 2902088 Cycle 217 (20 Nov 2018 03:29 UTC) vs HYCOM Step 2 (20 Nov 2018 00:00 UTC) has $\Delta t \approx +3.48\text{ hours}$ ($\text{RMSE} \approx 1.001^\circ\text{C}$).
   - **TEMPORALLY MISMATCHED** ($|\Delta t| > 24\text{ hours}$): Flags observations collected outside the model time window to prevent invalid scientific comparisons.
     - *Example*: Argo 2902088 Cycle 228 (10 Mar 2019 03:49 UTC) vs HYCOM Step 2 has $\Delta t > 2600\text{ hours}$ (+110 days separation).

---

## Project Structure

```
SIH 2/
├── backend/
│   ├── app/
│   │   ├── api/              # FastAPI route handlers
│   │   ├── core/             # Configuration, bounds, and variable specs
│   │   ├── models/           # Pydantic schemas
│   │   ├── services/         # Model, observation, and bathymetry services
│   │   └── main.py           # FastAPI application entrypoint
│   ├── data/                 # NetCDF loaders, QC filters, and health checks
│   ├── tests/                # Automated regression & integration test suites
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/       # 3D canvas, HUD, CTD comparison modal, sliders
│   │   ├── services/         # API client with request sequencing
│   │   ├── types/            # TypeScript domain interfaces
│   │   ├── App.tsx           # Application state and layout composition
│   │   └── index.css         # Styling
│   ├── package.json
│   └── vite.config.ts
├── data/
│   └── raw/                  # Authentic NetCDF datasets (HYCOM, GEBCO, Argo)
├── docs/                     # Technical architecture documentation
├── run_tests.bat             # Runs backend unified test suite
├── start_backend.bat         # Starts FastAPI backend (port 8000)
├── start_frontend.bat        # Starts Vite frontend (port 5173)
└── README.md
```

---

## Running the Application

### Prerequisites
- **Python**: 3.10+ (tested on Python 3.11)
- **Node.js**: v18+ (tested on Node v22)

### Option A: Using Windows Batch Scripts
```bash
# Terminal 1 - Backend
start_backend.bat

# Terminal 2 - Frontend
start_frontend.bat
```

### Option B: Manual Setup

#### 1. Start Backend
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
Backend API will be available at: `http://127.0.0.1:8000`
Interactive Swagger documentation: `http://127.0.0.1:8000/docs`

#### 2. Start Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend dashboard will be available at: `http://localhost:5173`

---

## Running Tests

### Backend Automated Test Suite (69 Tests across 9 Suites)
```bash
python backend/tests/run_all_tests.py
```
Or use the batch script:
```bash
run_tests.bat
```

The test runner executes:
1. `test_api.py` (8 tests) — API route smoke tests
2. `test_argo_loader.py` (6 tests) — Argo NetCDF parsing, QC filtering, and UNESCO depth conversion
3. `test_bathymetry_loader.py` (5 tests) — GEBCO NetCDF parsing, coordinate orientation, and caching
4. `test_ocean_model_loader.py` (6 tests) — HYCOM 3D model parsing and vertical profiling
5. `test_ssh_loader.py` (8 tests) — HYCOM SSH parsing, temporal variation, and surface locking
6. `test_multi_cycle_comparison.py` (10 tests) — Multi-cycle Argo handling and synoptic classification
7. `test_phase3c_comparison.py` (10 tests) — Collocation metrics (RMSE, MAE, Bias) and error profile validation
8. `test_phase3d_storytelling.py` (8 tests) — State summary calculations, time synchronization, and vector math
9. `test_phase4_hardening.py` (8 tests) — Health diagnostics, 404 safety on invalid cycles, and terminology audit

### Frontend Production Build
```bash
cd frontend
npm run build
```
Verifies TypeScript compilation and production asset bundling with 0 errors.

---

## Known Limitations

1. **Regional Spatial Extent**: The active domain is restricted to the Indian Ocean basin ($30^\circ\text{E} - 115^\circ\text{E}$, $25^\circ\text{S} - 30^\circ\text{N}$). Coordinates outside these bounds are rejected or clamped.
2. **Temporal Window**: Authentic HYCOM model outputs cover 3 daily snapshots (18–20 November 2018). Forecast data outside this window is not available in the local dataset.
3. **Bathymetry Sampling**: GEBCO bathymetry is sub-sampled from native 15 arc-second resolution to 0.5° (~55 km) grid spacing to maintain 60 FPS WebGL rendering performance in browser environments.
4. **Discrete In-Situ Sampling**: Argo CTD profiles represent Lagrangian point samples along float drift trajectories; they do not provide continuous spatial coverage across the basin.
