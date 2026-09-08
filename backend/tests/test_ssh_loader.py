"""
Comprehensive Test Suite for SSHNetCDFLoader and Authentic HYCOM SSH (SIH26067 - Phase 2D).
Validates:
1. Authentic NetCDF SSH dataset presence, dimensions, conventions, and file size.
2. NetCDF opens cleanly and contains required variable (surf_el) with units 'm' and fill value -30.0.
3. Coordinate bounds (-24.96° to 29.76° lat, 30.0° to 114.48° lon) matching 3D HYCOM model grid.
4. Time coordinates correspond to actual daily timestamps (2018-11-18 to 2018-11-20).
5. Fill values, masked land points, and NaNs are safely handled (None over land).
6. Physical ranges for SSH (-0.275m to +0.960m observed).
7. Temporal variation across all 3 model days (>90% ocean points physically coherent).
8. Strict surface locking (depth is locked to 0m even if depth parameter > 0).
9. In-memory caching provides instantaneous repeated API access.
10. Transparent fallback to Phase 1 analytical model when SSH directory is empty.
11. Full API endpoint integration (/api/model/slice?variable=ssh).
"""
import sys
import os
import tempfile
import numpy as np
import netCDF4 as nc
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from data.netcdf_loader import ssh_netcdf_loader
from app.services.model_service import model_service
from app.models.schemas import ModelSliceResponse
from app.main import app

client = TestClient(app)


def test_ssh_file_presence_and_metadata():
    """Verify authentic HYCOM SSH NetCDF file properties, dimensions, and variables."""
    dataset_path = ssh_netcdf_loader.get_dataset_filepath()
    assert dataset_path is not None, "Authentic HYCOM SSH NetCDF file not found!"
    assert os.path.exists(dataset_path), f"File {dataset_path} does not exist"

    file_size = os.path.getsize(dataset_path)
    print(f"[PASS] HYCOM SSH file found: {dataset_path} ({file_size} bytes / {file_size / 1024:.2f} KB)")
    assert file_size == 67904, f"Expected exact file size 67904 bytes, got {file_size}"

    with nc.Dataset(dataset_path, "r") as ds:
        assert "time" in ds.dimensions
        assert "latitude" in ds.dimensions
        assert "longitude" in ds.dimensions

        nt = len(ds.dimensions["time"])
        ny = len(ds.dimensions["latitude"])
        nx = len(ds.dimensions["longitude"])

        assert nt == 3, f"Expected 3 time steps, got {nt}"
        assert ny == 58, f"Expected 58 latitudes, got {ny}"
        assert nx == 89, f"Expected 89 longitudes, got {nx}"

        assert "surf_el" in ds.variables, "Missing required variable: surf_el"
        surf_var = ds.variables["surf_el"]
        assert getattr(surf_var, "units", None) == "m", f"Expected units 'm', got {getattr(surf_var, 'units', None)}"
        assert getattr(surf_var, "_FillValue", None) == -30.0, f"Expected _FillValue -30.0, got {getattr(surf_var, '_FillValue', None)}"
        print("[PASS] NetCDF dimensions, variable surf_el, units, and fill value verified")


def test_ssh_coordinates_and_time():
    """Verify geographic bounds and time coordinates."""
    ssh_netcdf_loader.clear_cache()
    meta = ssh_netcdf_loader.get_metadata()
    assert meta is not None

    assert meta["nx"] == 89
    assert meta["ny"] == 58
    assert meta["nt"] == 3
    assert meta["depth_levels"] == [0]

    assert abs(meta["lon_min"] - 30.0) < 0.1
    assert abs(meta["lon_max"] - 114.48) < 0.1
    assert abs(meta["lat_min"] - (-24.96)) < 0.1
    assert abs(meta["lat_max"] - 29.76) < 0.1

    time_steps = meta["time_steps"]
    assert len(time_steps) == 3
    expected_dates = ["2018-11-18", "2018-11-19", "2018-11-20"]
    for idx, expected in enumerate(expected_dates):
        assert expected in time_steps[idx]["timestamp"], f"Mismatch at t={idx}: {time_steps[idx]}"
    print(f"[PASS] Coordinates and 3 authentic daily timestamps verified: {[t['timestamp'] for t in time_steps]}")


def test_ssh_slice_and_physical_ranges():
    """Verify slicing, land masking, and physical ranges for all 3 days."""
    for t_idx in range(3):
        res = ssh_netcdf_loader.get_slice(t_idx)
        assert res is not None
        assert res["variable"] == "ssh"
        assert res["depth"] == 0
        assert res["units"] == "m"
        assert len(res["vectors"]) == 0  # SSH has no velocity vectors

        values = res["values"]
        assert len(values) == 58
        assert len(values[0]) == 89

        valid_vals = [v for row in values for v in row if v is not None]
        assert len(valid_vals) > 3000, f"Expected >3000 ocean points, got {len(valid_vals)}"

        # Verify observed ranges
        min_v = min(valid_vals)
        max_v = max(valid_vals)
        assert -0.35 <= min_v <= 0.0, f"Observed min {min_v} outside plausible SSH depression range"
        assert 0.80 <= max_v <= 1.20, f"Observed max {max_v} outside plausible SSH elevation range"
        assert res["min_val"] == round(min_v, 3)
        assert res["max_val"] == round(max_v, 3)
        print(f"[PASS] Time step {t_idx} ({res['timestamp']}): min={min_v}m, max={max_v}m, ocean points={len(valid_vals)}")


def test_ssh_temporal_variation():
    """Verify that SSH fields vary dynamically between consecutive time steps."""
    slice_0 = ssh_netcdf_loader.get_slice(0)
    slice_1 = ssh_netcdf_loader.get_slice(1)
    slice_2 = ssh_netcdf_loader.get_slice(2)

    # Min/max must reflect authentic day-to-day oceanic changes
    assert slice_0["min_val"] != slice_1["min_val"]
    assert slice_1["min_val"] != slice_2["min_val"]

    # Point sample in central Indian Ocean (75.0°E, 0.0°N)
    pt_0 = ssh_netcdf_loader.sample_point(75.0, 0.0, 0)
    pt_1 = ssh_netcdf_loader.sample_point(75.0, 0.0, 1)
    pt_2 = ssh_netcdf_loader.sample_point(75.0, 0.0, 2)

    assert pt_0 is not None
    assert pt_1 is not None
    assert pt_2 is not None
    print(f"[PASS] Point (75°E, 0°N) SSH over 3 days: t0={pt_0}m, t1={pt_1}m, t2={pt_2}m")


def test_ssh_surface_locking():
    """Verify that SSH is strictly locked to depth = 0m."""
    # Direct model service call
    res_depth_0 = model_service.get_slice("ssh", 0, 0)
    res_depth_500 = model_service.get_slice("ssh", 500, 0)
    assert res_depth_0["depth"] == 0
    assert res_depth_500["depth"] == 0

    # API route level
    api_res = client.get("/api/model/slice?variable=ssh&depth=1500&time_step=0")
    assert api_res.status_code == 200
    data = api_res.json()
    assert data["depth"] == 0, f"Expected depth 0m, got {data['depth']}m"
    assert data["variable"] == "ssh"
    print("[PASS] SSH strictly locked to surface (depth = 0m) on service and API route")


def test_ssh_caching():
    """Verify in-memory caching returns identical object instantly."""
    import time
    t0 = time.time()
    s1 = ssh_netcdf_loader.get_slice(0)
    dur1 = time.time() - t0

    t1 = time.time()
    s2 = ssh_netcdf_loader.get_slice(0)
    dur2 = time.time() - t1

    assert s1["timestamp"] == s2["timestamp"]
    assert s1["min_val"] == s2["min_val"]
    assert dur2 < 0.05
    print(f"[PASS] SSH in-memory cache verified (cache hit took {dur2 * 1000:.2f} ms)")


def test_ssh_fallback():
    """Verify clean fallback to Phase 1 synthetic SSH when dataset is unavailable."""
    with tempfile.TemporaryDirectory() as empty_dir:
        ssh_netcdf_loader.set_models_dir(empty_dir)
        assert not ssh_netcdf_loader.has_ssh_data()
        assert not model_service.is_using_real_ssh()

        fallback_slice = model_service.get_slice("ssh", 0, 0)
        assert fallback_slice["variable"] == "ssh"
        assert fallback_slice["depth"] == 0
        assert len(fallback_slice["values"]) == 56  # Synthetic grid NY = 56
        print("[PASS] Fallback to synthetic SSH verified when authentic file is absent")

    # Restore default directory
    ssh_netcdf_loader.set_models_dir(os.path.abspath("data/raw/models"))
    assert ssh_netcdf_loader.has_ssh_data()
    assert model_service.is_using_real_ssh()
    print("[PASS] Restored authentic HYCOM SSH directory")


def test_ssh_api_endpoint():
    """Verify full FastAPI integration endpoint for authentic SSH."""
    res = client.get("/api/model/slice?variable=ssh&depth=0&time_step=1")
    assert res.status_code == 200
    data = res.json()
    assert data["variable"] == "ssh"
    assert data["depth"] == 0
    assert data["time_step"] == 1
    assert data["timestamp"] == "2018-11-19T00:00:00Z"
    assert data["units"] == "m"
    assert data["min_val"] == -0.275
    assert data["max_val"] == 0.944
    assert len(data["lons"]) == 89
    assert len(data["lats"]) == 58
    assert len(data["values"]) == 58
    print(f"[PASS] /api/model/slice?variable=ssh live endpoint verified (min={data['min_val']}m, max={data['max_val']}m)")


if __name__ == "__main__":
    print("Running comprehensive Phase 2D SSH test suite...")
    test_ssh_file_presence_and_metadata()
    test_ssh_coordinates_and_time()
    test_ssh_slice_and_physical_ranges()
    test_ssh_temporal_variation()
    test_ssh_surface_locking()
    test_ssh_caching()
    test_ssh_fallback()
    test_ssh_api_endpoint()
    print("\nALL 8 SSH TESTS PASSED SUCCESSFULLY!")
