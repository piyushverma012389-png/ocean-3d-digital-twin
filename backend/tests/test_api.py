"""
Automated unit & integration smoke tests for backend API routes (SIH26067).
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    print("[PASS] /api/health")

def test_model_meta():
    res = client.get("/api/model/meta")
    assert res.status_code == 200
    data = res.json()
    assert "depth_levels" in data
    assert "time_steps" in data
    assert "variables" in data
    print("[PASS] /api/model/meta")

def test_model_slice():
    res = client.get("/api/model/slice?variable=temperature&depth=100&time_step=1")
    assert res.status_code == 200
    data = res.json()
    assert data["variable"] == "temperature"
    assert data["depth"] == 100
    assert len(data["lons"]) > 0
    assert len(data["lats"]) > 0
    assert len(data["values"]) == len(data["lats"])
    assert len(data["vectors"]) > 0
    print(f"[PASS] /api/model/slice (min: {data['min_val']}, max: {data['max_val']}, vectors: {len(data['vectors'])})")

def test_observations_argo():
    res = client.get("/api/observations/argo")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 10
    print(f"[PASS] /api/observations/argo ({len(data)} floats)")

    float_id = data[0]["id"]
    prof_res = client.get(f"/api/observations/argo/{float_id}/profile")
    assert prof_res.status_code == 200
    prof_data = prof_res.json()
    assert len(prof_data["records"]) > 10
    print(f"[PASS] /api/observations/argo/{float_id}/profile ({len(prof_data['records'])} CTD levels)")

def test_observations_gliders():
    res = client.get("/api/observations/gliders")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 2
    assert len(data[0]["waypoints"]) > 0
    print(f"[PASS] /api/observations/gliders ({len(data)} missions)")

def test_bathymetry_grid():
    res = client.get("/api/bathymetry/grid")
    assert res.status_code == 200
    data = res.json()
    assert len(data["elevations"]) == data["ny"]
    assert data["min_elevation"] < -3000
    assert data["max_elevation"] > 0
    print(f"[PASS] /api/bathymetry/grid (depth range: {data['min_elevation']}m to +{data['max_elevation']}m)")

def test_model_slice_ssh():
    res = client.get("/api/model/slice?variable=ssh&depth=0&time_step=0")
    assert res.status_code == 200
    data = res.json()
    assert data["variable"] == "ssh"
    assert data["depth"] == 0
    assert data["units"] == "m"
    assert -0.30 <= data["min_val"] <= 0.0
    assert 0.80 <= data["max_val"] <= 1.20
    print(f"[PASS] /api/model/slice (SSH: min {data['min_val']}m, max {data['max_val']}m, locked depth: {data['depth']}m)")

def test_comparison_point():
    res = client.get("/api/comparison/point?float_id=argo-2903741&variable=temperature")
    assert res.status_code == 200
    data = res.json()
    assert "rmse" in data
    assert "mean_bias" in data
    assert len(data["points"]) > 0
    print(f"[PASS] /api/comparison/point (RMSE: {data['rmse']} degC, bias: {data['mean_bias']} degC)")

if __name__ == "__main__":
    print("Running backend integration smoke tests...")
    test_health()
    test_model_meta()
    test_model_slice()
    test_model_slice_ssh()
    test_observations_argo()
    test_observations_gliders()
    test_bathymetry_grid()
    test_comparison_point()
    print("ALL 8 BACKEND API TEST SUITES PASSED PERFECTLY!")
