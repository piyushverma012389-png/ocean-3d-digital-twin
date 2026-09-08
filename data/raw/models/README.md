# Authentic Numerical Ocean Model Datasets — NOAA / NRL HYCOM+NCODA (GLBu0.08 / expt 91.2)

## 1. 3D Ocean Hydrodynamic Dataset (Temperature, Salinity, Currents)
- **Dataset Title**: NRL HYCOM+NCODA, GLBu0.08/expt 91.2, Global, 1/12 deg, at Depths, Lon+/-180
- **Dataset ID**: `nrlHycomGLBu008e912D_LonPM180`
- **Provider**: NOAA CoastWatch / Naval Research Laboratory (NRL) / HYCOM Consortium
- **Exact Download URL**: `https://coastwatch.pfeg.noaa.gov/erddap/griddap/nrlHycomGLBu008e912D_LonPM180.nc?water_temp[(2018-11-18T00:00:00Z):1:(2018-11-20T00:00:00Z)][(0.0):1:(4000.0)][(-25.0):12:(30.0)][(30.0):12:(115.0)],salinity[...],water_u[...],water_v[...]`
- **Local File Path**: `data/raw/models/hycom_indian_ocean.nc`
- **File Format**: NetCDF-3 Classic (CF-1.6 compliant)
- **File Size**: 9,671,896 bytes (9.22 MB)
- **Dimensions**: `time: 3, depth: 39, latitude: 58, longitude: 89`
- **Depth Range**: `0.0m` to `4000.0m` (39 native levels; contains all 12 project standard depth levels natively)
- **Variables**: `water_temp` (°C), `salinity` (PSU), `water_u` (m/s), `water_v` (m/s)

---

## 2. 2D Sea Surface Height / Elevation Dataset (SSH)
- **Dataset Title**: NRL HYCOM+NCODA, GLBu0.08/expt 91.2, Global, 1/12 deg, 2016 to 2018, at Surface, Lon+/-180
- **Dataset ID**: `nrlHycomGLBu008e912S_LonPM180`
- **Provider**: NOAA CoastWatch / Naval Research Laboratory (NRL) / HYCOM Consortium
- **Exact Download URL**: `https://coastwatch.pfeg.noaa.gov/erddap/griddap/nrlHycomGLBu008e912S_LonPM180.nc?surf_el[(2018-11-18T00:00:00Z):1:(2018-11-20T00:00:00Z)][(-25.0):12:(30.0)][(30.0):12:(115.0)]`
- **Acquisition Date**: 2026-09-07
- **Local File Path**: `data/raw/models/hycom_ssh_indian_ocean.nc`
- **File Format**: NetCDF-3 Classic (CF-1.6 compliant)
- **File Size**: 67,904 bytes (66.31 KB)
- **Dimensions**: `time: 3, latitude: 58, longitude: 89`
- **Spatial Bounds**:
  - Latitude: `-24.96°S` to `+29.76°N` (`58 points`, ~0.96° stride)
  - Longitude: `+30.00°E` to `+114.48°E` (`89 points`, ~0.96° stride)
- **Temporal Records**: 3 consecutive daily snapshots
  1. `2018-11-18T00:00:00Z` (Time Step 0): min = `-0.197m`, max = `+0.932m`
  2. `2018-11-19T00:00:00Z` (Time Step 1): min = `-0.275m`, max = `+0.944m`
  3. `2018-11-20T00:00:00Z` (Time Step 2): min = `-0.208m`, max = `+0.960m`
- **Variable**: `surf_el` (Water Surface Elevation / Sea Surface Height)
  - Units: meters (`m`)
  - Standard Name: `sea_surface_elevation`
  - Fill Value: `-30.0`
  - Total Grid Cells: `15,486` cells (3 × 58 × 89)
  - Valid Ocean Cells: `9,861` cells (`63.7%`)
  - Masked Land Cells: `5,625` cells (`36.3%`)
  - Observed Range: `-0.275 meters` to `+0.960 meters` (mean: `+0.429 meters`)
