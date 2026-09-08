"""
Test suite for Phase 3C: Model vs Observation Scientific Analysis
Verifies:
1. Comparison response schema (collocation coordinates, separation distance, QC provenance)
2. Cycle 217 near-synoptic comparison
3. Cycle 228 temporal mismatch
4. Metric correctness (mathematical validation of RMSE, MAE, Bias)
5. Error profile verification (signed error = model - obs, model_depth)
6. Collocated level count N (138 valid QC levels)
7. Missing / clamped model timestamp handling
8. Invalid cycle error handling (HTTP 404)
9. Variable switching (Temperature °C vs Salinity PSU)
10. Stale data prevention (Cycle 217 and 228 return distinct independent data)
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from fastapi.testclient import TestClient
import numpy as np
from app.main import app

client = TestClient(app)

def approx_equal(a, b, tol=0.03):
    return abs(a - b) <= tol

def test_1_comparison_response_schema():
    """Test 1: Comparison response schema includes all collocation, metadata, and error fields."""
    res = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=217")
    assert res.status_code == 200
    d = res.json()
    assert "model_name" in d and "HYCOM" in d["model_name"]
    assert "observation_name" in d and "2902088" in d["observation_name"]
    assert "model_lon" in d and d["model_lon"] is not None
    assert "model_lat" in d and d["model_lat"] is not None
    assert "horizontal_separation_km" in d and d["horizontal_separation_km"] is not None
    assert "vertical_collocation_method" in d and "Nearest HYCOM" in d["vertical_collocation_method"]
    assert "qc_flags_accepted" in d
    assert "valid_depth_range" in d
    assert "n_levels" in d and d["n_levels"] == 138
    assert "points" in d and len(d["points"]) == 138

    # Validate point fields
    pt = d["points"][0]
    assert "depth" in pt
    assert "model_value" in pt
    assert "obs_value" in pt
    assert "bias" in pt
    assert "error" in pt
    assert "model_depth" in pt
    print("[PASS] Test 1: Comparison response schema fully verified")

def test_2_cycle_217_near_synoptic_metrics():
    """Test 2: Cycle 217 against HYCOM step 2 reproduces near-synoptic metrics."""
    res = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=217")
    assert res.status_code == 200
    d = res.json()
    assert d["cycle"] == 217
    assert d["temporal_match"]["status"] == "NEAR_SYNOPTIC"
    assert approx_equal(d["time_difference_hours"], 3.4833, 0.05)
    assert approx_equal(d["rmse"], 1.001, 0.02)
    assert approx_equal(d["mae"], 0.554, 0.02)
    assert approx_equal(d["mean_bias"], 0.394, 0.02)
    assert d["n_levels"] == 138
    print("[PASS] Test 2: Cycle 217 near-synoptic metrics reproduced accurately")

def test_3_cycle_228_mismatch_behavior():
    """Test 3: Cycle 228 is marked TEMPORALLY_MISMATCHED with independent metrics."""
    res = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=228")
    assert res.status_code == 200
    d = res.json()
    assert d["cycle"] == 228
    assert d["temporal_match"]["status"] == "TEMPORALLY_MISMATCHED"
    assert d["time_difference_hours"] > 2000.0  # ~110 days separation
    assert d["timestamp"] == "2019-03-10T03:49:00Z"
    print("[PASS] Test 3: Cycle 228 temporal mismatch verified")

def test_4_metric_mathematical_correctness():
    """Test 4: RMSE, MAE, and Bias mathematically match points array calculations."""
    res = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=217")
    assert res.status_code == 200
    d = res.json()
    pts = d["points"]

    errors = [p["model_value"] - p["obs_value"] for p in pts]
    expected_rmse = np.sqrt(np.mean(np.square(errors)))
    expected_mae = np.mean(np.abs(errors))
    expected_bias = np.mean(errors)

    assert approx_equal(d["rmse"], expected_rmse, 0.05)
    assert approx_equal(d["mae"], expected_mae, 0.05)
    assert approx_equal(d["mean_bias"], expected_bias, 0.05)
    print(f"[PASS] Test 4: Mathematical metric correctness verified (RMSE: {d['rmse']}, calc: {expected_rmse:.3f})")

def test_5_error_profile_structure():
    """Test 5: Error profile provides signed Model - Observation error across depth."""
    res = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=217")
    assert res.status_code == 200
    d = res.json()
    for p in d["points"]:
        expected_err = round(p["model_value"] - p["obs_value"], 2)
        assert abs(p["error"] - expected_err) <= 0.02
        assert p["model_depth"] >= 0.0
    print("[PASS] Test 5: Signed error profile structure verified across all levels")

def test_6_collocated_n_levels():
    """Test 6: Exactly 138 collocated levels spanning 5.6m to 1966.6m."""
    res = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=217")
    assert res.status_code == 200
    d = res.json()
    assert len(d["points"]) == 138
    assert d["points"][0]["depth"] == 5.6
    assert d["points"][-1]["depth"] == 1966.6
    print("[PASS] Test 6: Collocated N=138 levels validated")

def test_7_clamped_model_timestamp():
    """Test 7: Out-of-bounds time_step is safely clamped to available range."""
    res = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=99&cycle=217")
    assert res.status_code == 200
    d = res.json()
    assert d["model_timestamp"] == "2018-11-20T00:00:00Z"
    print("[PASS] Test 7: Out-of-bounds time_step successfully clamped")

def test_8_invalid_cycle_error_handling():
    """Test 8: Invalid cycle returns HTTP 404 with descriptive detail."""
    res = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=9999")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()
    print("[PASS] Test 8: Invalid cycle returns HTTP 404 error correctly")

def test_9_variable_switching():
    """Test 9: Variable switching between temperature and salinity produces valid units and ranges."""
    res_t = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=217")
    assert res_t.status_code == 200
    dt = res_t.json()
    assert dt["variable"] == "temperature"
    assert dt["units"] == "°C"
    assert approx_equal(dt["rmse"], 1.001, 0.05)

    res_s = client.get("/api/comparison/point?float_id=argo-2902088&variable=salinity&time_step=2&cycle=217")
    assert res_s.status_code == 200
    ds = res_s.json()
    assert ds["variable"] == "salinity"
    assert ds["units"] == "PSU"
    assert approx_equal(ds["rmse"], 0.224, 0.05)
    print("[PASS] Test 9: Variable switching produces distinct valid physical units and metrics")

def test_10_stale_data_prevention():
    """Test 10: Calls with different parameters return fresh, non-stale payloads."""
    r1 = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=217").json()
    r2 = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=228").json()
    assert r1["timestamp"] != r2["timestamp"]
    assert r1["temporal_match"]["status"] != r2["temporal_match"]["status"]
    assert r1["rmse"] != r2["rmse"]
    print("[PASS] Test 10: Stale data prevention verified (independent payloads per cycle)")

if __name__ == "__main__":
    print("===========================================================================")
    print("RUNNING PHASE 3C MODEL VS OBSERVATION TEST SUITE")
    print("===========================================================================")
    test_1_comparison_response_schema()
    test_2_cycle_217_near_synoptic_metrics()
    test_3_cycle_228_mismatch_behavior()
    test_4_metric_mathematical_correctness()
    test_5_error_profile_structure()
    test_6_collocated_n_levels()
    test_7_clamped_model_timestamp()
    test_8_invalid_cycle_error_handling()
    test_9_variable_switching()
    test_10_stale_data_prevention()
    print("===========================================================================")
    print("ALL 10 PHASE 3C TESTS PASSED PERFECTLY!")
    print("===========================================================================")
