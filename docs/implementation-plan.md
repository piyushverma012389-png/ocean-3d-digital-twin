# Engineering Implementation Plan — SIH26067
## Multi-Phase Roadmap for Interactive 3D Ocean Digital Twin

### Phase 1: MVP & Core Architecture (Current Phase)
- [x] Project architecture design and separation into `frontend/`, `backend/`, `data/`, and `docs/`.
- [x] Comprehensive documentation (`architecture.md`, `data-flow.md`, `dataset-plan.md`, `implementation-plan.md`, `README.md`).
- [x] Backend foundation with FastAPI, Pydantic schemas, and modular routers.
- [x] Indian Ocean 3D bathymetric seabed model with realistic topographic features (Arabian Sea, Bay of Bengal, Central Indian Ridge, Ninety East Ridge, Java Trench).
- [x] 4D physical oceanographic field provider (Temperature, Salinity, Velocity, SSH) across 10 depth levels (0m to 4000m) and temporal snapshots.
- [x] In-situ observation framework:
  - 15+ simulated active Argo profiling floats in Arabian Sea, Bay of Bengal, and Equatorial Indian Ocean.
  - 3D vertical profiling lines down to 2000m depth with sensor sample rings.
  - Underwater glider mission tracks with 3D sawtooth dives.
- [x] Interactive Model vs In-situ Observation Comparison Panel (vertical CTD profile plots with RMSE and bias calculation).
- [x] Frontend 3D interactive dashboard built with React 18, Vite, Three.js, React Three Fiber, Drei, and Lucide icons.
- [x] Camera controls: smooth rotate, zoom, pan, and 6 instant presets (Indian Ocean Basin, Arabian Sea, Bay of Bengal, Equatorial Trench, 3D Isometric, Top-Down Ortho).
- [x] Scientific colormaps (Turbo, Viridis, Thermal, Haline) with min/max calibration.
- [x] Floating scientific HUD with real-time cursor coordinate tracking (lat, lon, depth) and layer visibility toggles.
- [x] Verification and testing of both frontend and backend.

---

### Phase 2: Real NetCDF & Live Data Sync
- Ingestion of live/historical INCOIS NetCDF model files via OPeNDAP or local storage.
- Real Argo profile ingestion via Coriolis / INCOIS GDAC FTP and automated parsing.
- Implementation of spatial indexing (R-Tree / KD-Tree) for rapid nearest-neighbor Argo float search.
- Dynamic color scale auto-ranging based on selected region of interest.

---

### Phase 3: Volumetric 3D Rendering & Particle Flow
- WebGL 3D volumetric raymarching for continuous ocean isosurfaces (e.g. 20°C thermocline surface).
- GPU particle advection showing dynamic ocean current streamlines across the Somali Current and equatorial jet.
- High-resolution bathymetry streaming with quadtree-based terrain chunking.
- Time interpolation (cubic hermite spline) between temporal forecast frames for continuous 60-FPS animation.

---

### Phase 4: Advanced Statistical Validation & Operational Tools
- Automated statistical validation dashboards (Taylor diagrams, target diagrams, correlation coefficients).
- Virtual ocean transect tool: draw a cross-section line across the Arabian Sea or Bay of Bengal to render a 2D vertical depth slice ($0-2000\text{ m}$).
- Export tools: high-resolution scientific figure export (PNG, SVG) and GeoTIFF / NetCDF sub-region extraction.
- Notification / alert system for extreme oceanic events (marine heatwaves, cyclonic cold wakes, low-oxygen zones).
