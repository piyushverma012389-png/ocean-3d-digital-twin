"""
Comprehensive Test Suite for BathymetryNetCDFLoader and BathymetryService (SIH26067 - Phase 2B).
Validates:
1. Authentic NetCDF dataset presence, dimensions, conventions, and file size.
2. Loader parsing, coordinate orientations, missing-value handling, and elevation bounds.
3. Observational min/max elevation reporting and data sanity checks (no NaNs, no coordinate inversion).
4. Full compatibility with the BathymetryGridResponse Pydantic schema and frontend contracts.
5. In-memory caching for zero-overhead repeated API calls.
6. Graceful, transparent fallback to the Phase 1 synthetic generator when the real dataset is absent.
7. Live FastAPI endpoint integration (/api/bathymetry/grid).
"""
import sys
import os
import tempfile
import numpy as np
import netCDF4 as nc
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from data.netcdf_loader import bathymetry_netcdf_loader
from app.services.bathymetry_service import bathymetry_service
from app.models.schemas import BathymetryGridResponse
from app.main import app

client = TestClient(app)


def test_gebco_file_presence_and_metadata():
    """Verify authentic GEBCO 2020 NetCDF file properties and metadata."""
    dataset_path = bathymetry_netcdf_loader.get_dataset_filepath()
    assert dataset_path is not None, "Authentic bathymetry NetCDF file not found!"
    assert os.path.exists(dataset_path), f"File {dataset_path} does not exist"

    file_size = os.path.getsize(dataset_path)
    print(f"[PASS] File found: {dataset_path} ({file_size} bytes / {file_size / 1024:.2f} KB)")
    assert file_size == 44980, f"Expected exact file size 44980 bytes, got {file_size}"

    with nc.Dataset(dataset_path, "r") as ds:
        assert "latitude" in ds.variables
        assert "longitude" in ds.variables
        assert "elevation" in ds.variables

        lat_len = len(ds.dimensions["latitude"])
        lon_len = len(ds.dimensions["longitude"])
        assert lat_len == 111, f"Expected 111 latitudes, got {lat_len}"
        assert lon_len == 171, f"Expected 171 longitudes, got {lon_len}"

        # Native resolution is 15 arc-seconds; sampled stride=120 gives 0.5 degrees (30 arc-minutes)
        print(f"[PASS] GEBCO 2020 dimensions: {lon_len}x{lat_len} (native 15 arc-sec, sampled 0.5 deg / 30 arc-min)")


def test_bathymetry_loader_parsing():
    """Verify BathymetryNetCDFLoader parsing, coordinate conventions, and sanity checks."""
    bathymetry_netcdf_loader.clear_cache()
    grid = bathymetry_netcdf_loader.load_bathymetry_grid()
    assert grid is not None, "Failed to load bathymetry grid"

    assert grid["nx"] == 171
    assert grid["ny"] == 111
    assert grid["lat_min"] == -25.0
    assert grid["lat_max"] == 30.0
    assert grid["lon_min"] == 30.0
    assert grid["lon_max"] == 115.0

    # Coordinates must be strictly ascending
    for j in range(len(grid["lats"]) - 1):
        assert grid["lats"][j] < grid["lats"][j + 1], f"Latitudes not ascending at {j}"
    for i in range(len(grid["lons"]) - 1):
        assert grid["lons"][i] < grid["lons"][i + 1], f"Longitudes not ascending at {i}"

    # Verify observed min and max elevations (Java Trench and Himalayas)
    observed_min = grid["min_elevation"]
    observed_max = grid["max_elevation"]
    print(f"[INFO] Observed min elevation (deepest trench): {observed_min}m")
    print(f"[INFO] Observed max elevation (highest relief): +{observed_max}m")

    # Sanity checks: depths must be negative and plausibly oceanographic; land must be positive
    assert observed_min < -5000.0, f"Expected deep trench < -5000m, observed {observed_min}m"
    assert observed_max > +3000.0, f"Expected continental relief > +3000m, observed {observed_max}m"

    # Verify grid values: no NaNs, no nulls, shape matches nx x ny
    elevations = grid["elevations"]
    assert len(elevations) == grid["ny"]
    total_valid = 0
    total_ocean = 0
    total_land = 0
    for row in elevations:
        assert len(row) == grid["nx"]
        for val in row:
            assert isinstance(val, (int, float))
            assert not np.isnan(val)
            assert not np.isinf(val)
            total_valid += 1
            if val < 0:
                total_ocean += 1
            else:
                total_land += 1

    assert total_valid == 171 * 111
    pct_ocean = total_ocean / total_valid * 100
    pct_land = total_land / total_valid * 100
    print(f"[PASS] Valid cells: {total_valid} / {total_valid} (100%). Ocean: {total_ocean} ({pct_ocean:.1f}%), Land: {total_land} ({pct_land:.1f}%)")

    # Validate against Pydantic schema
    schema_obj = BathymetryGridResponse(**grid)
    assert schema_obj.nx == 171
    print("[PASS] Schema validation with BathymetryGridResponse successful")


def test_bathymetry_service_serving_and_caching():
    """Verify BathymetryService serves real GEBCO grid and caches in memory."""
    bathymetry_service.clear_cache()
    assert bathymetry_service.is_using_real_data() is True

    grid1 = bathymetry_service.get_bathymetry_grid()
    assert grid1["nx"] == 171
    assert grid1["ny"] == 111
    assert grid1["min_elevation"] < -6000.0

    # Test cache hit (same object in memory)
    grid2 = bathymetry_service.get_bathymetry_grid()
    assert grid1 is grid2
    print("[PASS] BathymetryService in-memory caching verified")


def test_bathymetry_fallback_when_dataset_absent():
    """Verify graceful, transparent fallback to Phase 1 synthetic bathymetry when directory is empty."""
    temp_empty_dir = tempfile.mkdtemp(prefix="bathymetry_empty_")
    try:
        # Point loader to empty directory
        bathymetry_netcdf_loader.set_bathymetry_dir(temp_empty_dir)
        bathymetry_service.clear_cache()

        assert bathymetry_netcdf_loader.has_bathymetry_data() is False
        assert bathymetry_service.is_using_real_data() is False

        fallback_grid = bathymetry_service.get_bathymetry_grid()
        # Synthetic grid dimensions from Phase 1 are 172 x 112
        assert fallback_grid["nx"] == 172
        assert fallback_grid["ny"] == 112
        assert fallback_grid["min_elevation"] < -4000.0
        assert fallback_grid["max_elevation"] > 0.0

        schema_obj = BathymetryGridResponse(**fallback_grid)
        assert schema_obj.nx == 172
        print(f"[PASS] Fallback to synthetic bathymetry verified ({fallback_grid['nx']}x{fallback_grid['ny']})")

    finally:
        # Restore real bathymetry directory
        bathymetry_netcdf_loader.set_bathymetry_dir("data/raw/bathymetry")
        bathymetry_service.clear_cache()
        assert bathymetry_netcdf_loader.has_bathymetry_data() is True


def test_api_bathymetry_grid_endpoint():
    """Verify FastAPI /api/bathymetry/grid endpoint returns real GEBCO bathymetry."""
    bathymetry_service.clear_cache()
    res = client.get("/api/bathymetry/grid")
    assert res.status_code == 200
    data = res.json()

    assert data["nx"] == 171
    assert data["ny"] == 111
    assert len(data["lons"]) == 171
    assert len(data["lats"]) == 111
    assert len(data["elevations"]) == 111
    assert len(data["elevations"][0]) == 171
    assert data["min_elevation"] == -6808.0
    assert data["max_elevation"] == 5869.0
    print(f"[PASS] /api/bathymetry/grid returned authentic GEBCO grid ({data['nx']}x{data['ny']}, min: {data['min_elevation']}m, max: {data['max_elevation']}m)")


if __name__ == "__main__":
    print("=" * 70)
    print("RUNNING BATHYMETRY NETCDF LOADER & SERVICE TEST SUITE (PHASE 2B)")
    print("=" * 70)
    test_gebco_file_presence_and_metadata()
    test_bathymetry_loader_parsing()
    test_bathymetry_service_serving_and_caching()
    test_bathymetry_fallback_when_dataset_absent()
    test_api_bathymetry_grid_endpoint()
    print("=" * 70)
    print("ALL 5 BATHYMETRY TEST SUITES PASSED PERFECTLY!")
    print("=" * 70)
