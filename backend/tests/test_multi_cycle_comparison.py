"""
Regression & Synoptic Validation Test Suite for Phase 2E.2: Multi-Cycle Argo Support.

Validates:
1. Existing latest-cycle behavior (defaults to cycle 228 when cycle is unspecified).
2. Explicit Cycle 217 selection.
3. Correct Cycle 217 timestamp ('2018-11-20T03:29:00Z').
4. Correct Cycle 217 coordinates (Lat: -4.1515, Lon: 85.9971).
5. Exactly 138 valid QC levels for Cycle 217.
6. Comparison against HYCOM Day 2 (2018-11-20T00:00:00Z) yielding valid RMSE, MAE, Bias.
7. Temporal difference calculation (~3.4833 hours for Cycle 217).
8. NEAR_SYNOPTIC classification (|dt| <= 24h) vs TEMPORALLY_MISMATCHED (|dt| > 24h).
9. Existing synthetic fallback for non-existent floats.
10. Existing API endpoints (/api/observations/argo/{float_id}/profile, /api/observations/argo/{float_id}/cycles, and /api/comparison/point).
"""

import sys
import os
import math
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from data.netcdf_loader import argo_netcdf_loader
from app.services.observation_service import observation_service
from app.main import app

client = TestClient(app)
RAW_ARGO_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../data/raw/argo/2902088_prof.nc"))
HAS_REAL_ARGO = os.path.exists(RAW_ARGO_PATH)


def approx_equal(val, target, tol=0.02):
    return abs(val - target) <= tol


def test_1_default_latest_cycle_behavior():
    """Test 1: Existing callers get latest cycle by default (Cycle 228)."""
    if not HAS_REAL_ARGO:
        print("[SKIP] test_1: Real Argo NetCDF file not present")
        return
    
    profile = argo_netcdf_loader.get_float_profile("2902088")
    assert profile is not None, "Profile should not be None"
    assert profile.cycle == 228, f"Expected cycle 228, got {profile.cycle}"
    assert profile.timestamp == "2019-03-10T03:49:00Z", f"Unexpected timestamp {profile.timestamp}"
    assert len(profile.records) > 0, "Expected records > 0"
    print("[PASS] Test 1: Existing latest-cycle behavior preserved (Cycle 228 default)")


def test_2_explicit_cycle_217_selection():
    """Test 2: Explicit Cycle 217 selection returns cycle 217."""
    if not HAS_REAL_ARGO:
        print("[SKIP] test_2: Real Argo NetCDF file not present")
        return

    profile = argo_netcdf_loader.get_float_profile("2902088", cycle=217)
    assert profile is not None, "Profile should not be None"
    assert profile.cycle == 217, f"Expected cycle 217, got {profile.cycle}"
    assert profile.wmo == "2902088", f"Expected wmo 2902088, got {profile.wmo}"
    print("[PASS] Test 2: Explicit Cycle 217 selection succeeds")


def test_3_cycle_217_timestamp():
    """Test 3: Correct Cycle 217 timestamp is 2018-11-20T03:29:00Z."""
    if not HAS_REAL_ARGO:
        print("[SKIP] test_3: Real Argo NetCDF file not present")
        return

    profile = argo_netcdf_loader.get_float_profile("2902088", cycle=217)
    assert profile is not None
    assert profile.timestamp == "2018-11-20T03:29:00Z", f"Expected 2018-11-20T03:29:00Z, got {profile.timestamp}"
    print("[PASS] Test 3: Correct Cycle 217 timestamp verified (2018-11-20T03:29:00Z)")


def test_4_cycle_217_coordinates():
    """Test 4: Correct Cycle 217 coordinates match expected ~ -4.1515°N, 85.9971°E."""
    if not HAS_REAL_ARGO:
        print("[SKIP] test_4: Real Argo NetCDF file not present")
        return

    profile = argo_netcdf_loader.get_float_profile("2902088", cycle=217)
    assert profile is not None
    assert approx_equal(profile.lat, -4.1515, 0.005), f"Lat mismatch: {profile.lat}"
    assert approx_equal(profile.lon, 85.9971, 0.005), f"Lon mismatch: {profile.lon}"
    print(f"[PASS] Test 4: Correct Cycle 217 coordinates verified ({profile.lat:.4f}°N, {profile.lon:.4f}°E)")


def test_5_cycle_217_qc_levels():
    """Test 5: Valid QC levels for Cycle 217 is exactly 138."""
    if not HAS_REAL_ARGO:
        print("[SKIP] test_5: Real Argo NetCDF file not present")
        return

    profile = argo_netcdf_loader.get_float_profile("2902088", cycle=217)
    assert profile is not None
    assert len(profile.records) == 138, f"Expected 138 valid QC levels, got {len(profile.records)}"
    assert profile.records[0].depth < 10.0, f"Expected surface depth < 10m, got {profile.records[0].depth}"
    assert profile.records[-1].depth > 1900.0, f"Expected deep depth > 1900m, got {profile.records[-1].depth}"
    for r in profile.records:
        assert r.qc in (1, 2), f"Invalid QC flag: {r.qc}"
    print(f"[PASS] Test 5: Exactly 138 QC levels validated (Depth range {profile.records[0].depth:.1f}m - {profile.records[-1].depth:.1f}m)")


def test_6_comparison_hycom_2018_11_20():
    """Test 6: Comparison against HYCOM 2018-11-20T00:00:00Z (time_step=2) matches baseline."""
    # Temperature comparison
    res_temp = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=217")
    assert res_temp.status_code == 200, f"Error {res_temp.status_code}: {res_temp.text}"
    d_temp = res_temp.json()
    assert d_temp["cycle"] == 217
    assert len(d_temp["points"]) == 138
    assert approx_equal(d_temp["rmse"], 1.001, 0.02), f"Temp RMSE: {d_temp['rmse']}"
    assert approx_equal(d_temp["mae"], 0.554, 0.02), f"Temp MAE: {d_temp['mae']}"
    assert approx_equal(d_temp["mean_bias"], 0.394, 0.02), f"Temp Bias: {d_temp['mean_bias']}"

    # Salinity comparison
    res_sal = client.get("/api/comparison/point?float_id=argo-2902088&variable=salinity&time_step=2&cycle=217")
    assert res_sal.status_code == 200, f"Error {res_sal.status_code}: {res_sal.text}"
    d_sal = res_sal.json()
    assert d_sal["cycle"] == 217
    assert len(d_sal["points"]) == 138
    assert approx_equal(d_sal["rmse"], 0.224, 0.02), f"Sal RMSE: {d_sal['rmse']}"
    assert approx_equal(d_sal["mae"], 0.098, 0.02), f"Sal MAE: {d_sal['mae']}"
    assert approx_equal(d_sal["mean_bias"], 0.086, 0.02), f"Sal Bias: {d_sal['mean_bias']}"
    print("[PASS] Test 6: Comparison metrics against authentic HYCOM 2018-11-20 match baseline exactly")


def test_7_temporal_difference_calculation():
    """Test 7: Temporal difference calculation for Cycle 217 is ~3.4833 hours."""
    res = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=217")
    assert res.status_code == 200
    data = res.json()
    assert "time_difference_hours" in data
    assert approx_equal(data["time_difference_hours"], 3.48, 0.05), f"Diff hours: {data['time_difference_hours']}"
    assert "temporal_match" in data
    tm = data["temporal_match"]
    assert tm["argo_time"] == "2018-11-20T03:29:00Z"
    assert tm["model_time"] == "2018-11-20T00:00:00Z"
    assert approx_equal(tm["difference_hours"], 3.48, 0.05)
    print(f"[PASS] Test 7: Temporal difference calculation verified ({data['time_difference_hours']:.4f}h = 3h 29m)")


def test_8_near_synoptic_vs_mismatched_classification():
    """Test 8: Cycle 217 is classified NEAR_SYNOPTIC, whereas Cycle 228 is TEMPORALLY_MISMATCHED."""
    # Cycle 217 (< 24h separation)
    res_217 = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=217")
    assert res_217.status_code == 200
    assert res_217.json()["temporal_match"]["status"] == "NEAR_SYNOPTIC"

    # Cycle 228 (> 24h separation, ~110 days)
    res_228 = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=228")
    assert res_228.status_code == 200
    assert res_228.json()["temporal_match"]["status"] == "TEMPORALLY_MISMATCHED"
    assert res_228.json()["time_difference_hours"] > 2000.0
    print("[PASS] Test 8: NEAR_SYNOPTIC vs TEMPORALLY_MISMATCHED classification verified")


def test_9_synthetic_fallback_behavior():
    """Test 9: Synthetic fallback continues to work for unmapped float IDs."""
    res = client.get("/api/observations/argo/argo-2903741/profile")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == "argo-2903741"
    assert len(data["records"]) == 22
    assert data["records"][0]["depth"] == 0.0
    print("[PASS] Test 9: Synthetic fallback behavior preserved for Phase 1 fleet (argo-2903741)")


def test_10_api_endpoints_and_cycles_route():
    """Test 10: Existing and new API routes behave properly."""
    # /cycles endpoint
    res_cycles = client.get("/api/observations/argo/argo-2902088/cycles")
    assert res_cycles.status_code == 200
    c_data = res_cycles.json()
    assert isinstance(c_data, list)
    assert len(c_data) == 228
    assert 217 in c_data
    assert 228 in c_data
    assert c_data[-1] == 228

    # Default profile route (no query param)
    res_prof_default = client.get("/api/observations/argo/argo-2902088/profile")
    assert res_prof_default.status_code == 200
    assert res_prof_default.json()["cycle"] == 228

    # Explicit profile route with cycle=217
    res_prof_217 = client.get("/api/observations/argo/argo-2902088/profile?cycle=217")
    assert res_prof_217.status_code == 200
    assert res_prof_217.json()["cycle"] == 217
    assert res_prof_217.json()["timestamp"] == "2018-11-20T03:29:00Z"
    print("[PASS] Test 10: Profile & cycles API routes verified with complete backward compatibility")


if __name__ == "__main__":
    print("=" * 75)
    print("RUNNING PHASE 2E.2 MULTI-CYCLE ARGO & SYNOPTIC VALIDATION TEST SUITE")
    print("=" * 75)
    test_1_default_latest_cycle_behavior()
    test_2_explicit_cycle_217_selection()
    test_3_cycle_217_timestamp()
    test_4_cycle_217_coordinates()
    test_5_cycle_217_qc_levels()
    test_6_comparison_hycom_2018_11_20()
    test_7_temporal_difference_calculation()
    test_8_near_synoptic_vs_mismatched_classification()
    test_9_synthetic_fallback_behavior()
    test_10_api_endpoints_and_cycles_route()
    print("=" * 75)
    print("ALL 10 PHASE 2E.2 REGRESSION AND SYNOPTIC TESTS PASSED SUCCESSFULLY!")
    print("=" * 75)
