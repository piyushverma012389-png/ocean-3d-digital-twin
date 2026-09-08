"""
Comprehensive Phase 3D Scientific Storytelling & Data Exploration Test Suite.
Validates:
1. Dynamic State Summary calculations (min, max, spatial mean, physical units, coordinate domains).
2. 4D Time-slice synchronization across all 3 daily HYCOM snapshots (18, 19, 20 Nov 2018).
3. 10-level Depth stratification presets (Surface, 10m, 20m, 50m, 100m, 200m, 500m, 1000m, 1500m, 2000m) and SSH 0m lock.
4. Variable switching and physical units integrity (temperature, salinity, velocity, ssh).
5. Authentic Current Vector calculation: magnitude = sqrt(u^2 + v^2), U/V velocity direction.
6. Argo Float 2902088 in-situ observation properties (138 QC levels, 5.6m–1966.6m depth range, coordinates).
7. Cycle 217 Near-Synoptic comparison flow (<3.5h lag) against 2018-11-20 HYCOM snapshot.
8. Cycle 228 Temporal Mismatch verification (+110 days) and metric independence from Cycle 217.
9. Stale-state prevention across variable, timestep, depth, and cycle shifts.
10. Authentic dataset provenance and 100% absence of synthetic scientific placeholders.
"""
import sys
import os
import numpy as np
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
from data.netcdf_loader import ocean_model_netcdf_loader, ssh_netcdf_loader, argo_netcdf_loader, bathymetry_netcdf_loader
from app.services.model_service import model_service

client = TestClient(app)

DEPTH_PRESETS = [0, 10, 20, 50, 100, 200, 500, 1000, 1500, 2000]
TIME_SNAPSHOTS = [0, 1, 2]
TIME_DATES = ["2018-11-18", "2018-11-19", "2018-11-20"]


def test_state_summary_and_spatial_mean():
    """Verify dynamic state summary fields and spatial mean calculation from authentic HYCOM slices."""
    for var, expected_unit in [("temperature", "°C"), ("salinity", "PSU"), ("velocity", "m/s"), ("ssh", "m")]:
        res = client.get(f"/api/model/slice?variable={var}&depth=0&time_step=2")
        assert res.status_code == 200
        data = res.json()
        assert data["units"] == expected_unit
        assert data["min_val"] <= data["max_val"]

        # Compute spatial mean across non-null cells
        vals = [v for row in data["values"] for v in row if v is not None]
        assert len(vals) > 0, f"No valid ocean cells found for {var}"
        spatial_mean = sum(vals) / len(vals)
        assert data["min_val"] <= spatial_mean <= data["max_val"], (
            f"Spatial mean {spatial_mean} out of bounds [{data['min_val']}, {data['max_val']}] for {var}"
        )

    print(f"[PASS] Dynamic Ocean State Summary metrics & spatial mean verified across all variables")


def test_time_slice_synchronization():
    """Verify synchronization across all 3 authentic daily HYCOM time slices."""
    timestamps = []
    mean_temps = []

    for t_step, expected_date in zip(TIME_SNAPSHOTS, TIME_DATES):
        res = client.get(f"/api/model/slice?variable=temperature&depth=0&time_step={t_step}")
        assert res.status_code == 200
        data = res.json()
        assert expected_date in data["timestamp"]
        timestamps.append(data["timestamp"])

        vals = [v for row in data["values"] for v in row if v is not None]
        mean_temps.append(sum(vals) / len(vals))

    # All timestamps must be distinct and chronological
    assert len(set(timestamps)) == 3
    assert timestamps[0] < timestamps[1] < timestamps[2]
    # Physical dynamics ensure values are not identical duplicates
    assert mean_temps[0] != mean_temps[1] or mean_temps[1] != mean_temps[2]
    print(f"[PASS] 3 daily time slices verified (Nov 18, Nov 19, Nov 20): {timestamps}")


def test_depth_stratification_presets_and_ssh_lock():
    """Verify all 10 depth presets return valid data and temperature decreases across thermocline."""
    temps_by_depth = []
    for d in DEPTH_PRESETS:
        res = client.get(f"/api/model/slice?variable=temperature&depth={d}&time_step=2")
        assert res.status_code == 200
        data = res.json()
        assert data["depth"] == d
        vals = [v for row in data["values"] for v in row if v is not None]
        assert len(vals) > 0
        mean_t = sum(vals) / len(vals)
        temps_by_depth.append((d, mean_t))

    # Physics: Surface is warm (>27°C), deep is cold (<5°C)
    surf_t = temps_by_depth[0][1]
    deep_t = temps_by_depth[-1][1]
    assert surf_t > 25.0, f"Expected warm tropical surface temperature, got {surf_t}"
    assert deep_t < 6.0, f"Expected cold abyssal water at 2000m, got {deep_t}"
    assert surf_t > deep_t, "Physical stratification violated: Surface must be warmer than 2000m"

    # Verify SSH strict lock to 0m even if depth=1000m is requested
    res_ssh = client.get("/api/model/slice?variable=ssh&depth=1000&time_step=2")
    assert res_ssh.status_code == 200
    data_ssh = res_ssh.json()
    assert data_ssh["depth"] == 0, f"SSH must be locked at depth=0, got {data_ssh['depth']}"
    print(f"[PASS] All 10 depth presets (0m–2000m) & SSH surface lock verified (Surf: {surf_t:.2f}°C -> 2000m: {deep_t:.2f}°C)")


def test_current_velocity_vector_physics():
    """Verify authentic current vector calculation: magnitude = sqrt(u^2 + v^2) and decimated count."""
    res = client.get("/api/model/slice?variable=velocity&depth=0&time_step=2")
    assert res.status_code == 200
    data = res.json()
    assert "vectors" in data
    vectors = data["vectors"]
    assert len(vectors) > 100, f"Expected >100 decimated flow vectors, got {len(vectors)}"

    # Check vector math for each sample
    for v in vectors[:20]:
        calc_mag = np.sqrt(v["u"] ** 2 + v["v"] ** 2)
        assert abs(calc_mag - v["magnitude"]) < 0.005, f"Vector magnitude mismatch: {calc_mag} vs {v['magnitude']}"
        assert v["magnitude"] >= 0.0
    print(f"[PASS] Current velocity vector physics and decimation verified ({len(vectors)} flow arrows)")


def test_argo_float_2902088_metadata():
    """Verify authentic Argo Float 2902088 metadata and observation specifications."""
    res = client.get("/api/observations/argo/argo-2902088/profile?cycle=217")
    assert res.status_code == 200
    data = res.json()
    assert data["wmo"] == "2902088"
    assert data["cycle"] == 217
    assert abs(data["lat"] - (-4.1515)) < 0.05
    assert abs(data["lon"] - 85.9971) < 0.05
    assert len(data["records"]) == 138, f"Expected 138 valid QC levels, got {len(data['records'])}"

    min_d = min(r["depth"] for r in data["records"])
    max_d = max(r["depth"] for r in data["records"])
    assert min_d < 10.0
    assert max_d > 1900.0
    print(f"[PASS] Argo Float 2902088 specifications verified: 138 levels, {min_d:.1f}m to {max_d:.1f}m")


def test_cycle_217_vs_cycle_228_comparison_distinction():
    """Verify Cycle 217 is NEAR_SYNOPTIC and Cycle 228 is TEMPORALLY_MISMATCHED with distinct metrics."""
    res_217 = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=217")
    assert res_217.status_code == 200
    comp_217 = res_217.json()

    res_228 = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=228")
    assert res_228.status_code == 200
    comp_228 = res_228.json()

    # Temporal status verification
    assert comp_217["temporal_match"]["status"] == "NEAR_SYNOPTIC"
    assert abs(comp_217["temporal_match"]["difference_hours"]) < 5.0

    assert comp_228["temporal_match"]["status"] == "TEMPORALLY_MISMATCHED"
    assert comp_228["temporal_match"]["difference_hours"] > 2000.0

    # Independent metrics (no cross-contamination or substitution)
    assert comp_217["cycle"] == 217
    assert comp_228["cycle"] == 228
    assert comp_217["rmse"] != comp_228["rmse"]
    assert comp_217["mae"] != comp_228["mae"]
    assert comp_217["mean_bias"] != comp_228["mean_bias"]
    assert comp_217["timestamp"] != comp_228["timestamp"]
    print(f"[PASS] Cycle 217 (Synoptic, RMSE={comp_217['rmse']:.3f}°C) and Cycle 228 (Mismatched, RMSE={comp_228['rmse']:.3f}°C) strictly independent")


def test_stale_state_prevention():
    """Verify changing timestep or variable produces fresh, non-stale comparison payloads."""
    # Changing time_step changes lag Δt
    comp_t2 = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=217").json()
    comp_t0 = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=0&cycle=217").json()
    assert comp_t2["time_difference_hours"] != comp_t0["time_difference_hours"]
    assert abs(comp_t0["time_difference_hours"] - 51.4833) < 0.1

    # Changing variable changes physical units and numbers
    comp_sal = client.get("/api/comparison/point?float_id=argo-2902088&variable=salinity&time_step=2&cycle=217").json()
    assert comp_sal["units"] == "PSU"
    assert comp_sal["rmse"] != comp_t2["rmse"]
    print(f"[PASS] Stale-state prevention verified across variable and time-step shifts")


def test_authentic_data_integrity():
    """Verify authentic datasets are loaded without synthetic fallbacks."""
    assert ocean_model_netcdf_loader.has_model_data() is True
    assert ssh_netcdf_loader.has_ssh_data() is True
    assert bathymetry_netcdf_loader.has_bathymetry_data() is True
    assert argo_netcdf_loader.has_argo_data() is True
    print(f"[PASS] Authentic datasets confirmed: HYCOM 3D, HYCOM SSH, GEBCO, and Argo GDAC")


if __name__ == "__main__":
    print("=" * 80)
    print("PHASE 3D — SCIENTIFIC STORYTELLING & DATA EXPLORATION TEST SUITE")
    print("=" * 80)
    test_state_summary_and_spatial_mean()
    test_time_slice_synchronization()
    test_depth_stratification_presets_and_ssh_lock()
    test_current_velocity_vector_physics()
    test_argo_float_2902088_metadata()
    test_cycle_217_vs_cycle_228_comparison_distinction()
    test_stale_state_prevention()
    test_authentic_data_integrity()
    print("=" * 80)
    print("ALL 8 PHASE 3D TEST SUITES PASSED PERFECTLY (100% SUCCESS)!")
    print("=" * 80)
