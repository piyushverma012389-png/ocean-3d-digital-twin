# Authentic Bathymetry Dataset — GEBCO 2020 Grid

## 1. Dataset Identification
- **Dataset Name**: GEBCO 2020 Grid (General Bathymetric Chart of the Oceans)
- **Source**: GEBCO Compilation Group / NOAA CoastWatch ERDDAP Server
- **Exact Download URL**: `https://coastwatch.pfeg.noaa.gov/erddap/griddap/GEBCO_2020.nc?elevation[(-25.0):120:(30.0)][(30.0):120:(115.0)]`
- **Acquisition Date**: 2026-09-07
- **License & Terms of Use**: GEBCO Open Data License, British Oceanographic Data Centre (BODC). Freely available for non-commercial and commercial use with attribution.
- **Official Citation**: GEBCO Compilation Group (2020) GEBCO 2020 Grid (doi:10.5285/a29c2114-8502-2342-e053-6c86abc040b9)

## 2. File Properties & Verification
- **Local File Path**: `data/raw/bathymetry/gebco_2020_indian_ocean.nc`
- **File Format**: NetCDF-3 Classic (CF-1.6, COARDS, ACDD-1.3 compliant)
- **File Size**: 44,980 bytes (43.93 KB)
- **Status**: Verified authentic regional NetCDF gridded continuous terrain dataset

## 3. Spatial Domain & Resolutions
- **Geographic Bounds**:
  - Latitude: `-25.0°S` to `+30.0°N`
  - Longitude: `+30.0°E` to `+115.0°E`
- **Native Resolution**: 15 arc-seconds (~450 meters at equator)
- **Sampled Resolution**: 0.5° (30 arc-minutes) via ERDDAP stride factor `120` (120 * 15 arc-seconds = 1800 arc-seconds = 30 arc-minutes = 0.5°)
- **Grid Dimensions**:
  - `nx` (longitude): 171 points (stride 0.5° from 30.0°E to 115.0°E)
  - `ny` (latitude): 111 points (stride 0.5° from -25.0°S to +30.0°N)
  - Total grid cells: 18,981 cells

## 4. Oceanographic Elevation & Topography Statistics
- **Minimum Elevation (Deepest Ocean Trench)**: `-6,808.0 meters` (Java / Sunda Trench subduction zone)
- **Maximum Elevation (Continental Peak)**: `+5,869.0 meters` (Himalayan orogeny on northern Indian boundary)
- **Ocean Cells (elevation < 0m)**: 12,186 cells (64.2% of domain)
- **Land Cells (elevation >= 0m)**: 6,795 cells (35.8% of domain)
- **Missing / Fill Value Cells**: 0 cells (0.0% missing; 100.0% valid authentic data)
- **Coordinate Convention**:
  - Longitudes: `30.0°E` to `115.0°E` (degrees_east, ascending)
  - Latitudes: `-25.0°S` to `+30.0°N` (degrees_north, ascending)
  - Elevations: meters relative to sea level (negative indicates ocean depth, positive indicates land elevation)
