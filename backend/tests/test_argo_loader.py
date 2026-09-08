"""
Comprehensive Test Suite for ArgoNetCDFLoader (SIH26067 - Phase 2A).
Validates:
1. Authentic NetCDF schema parsing (WMO, Lat, Lon, JULD, Cycle, Platform Type)
2. Strict per-point QC filtering (only flags 1 and 2 accepted; 3, 4, 9 rejected)
3. Missing-value and fill-value (99999.0, NaN) handling
4. Saunders & Fofonoff UNESCO pressure-to-depth conversion consistency
5. Strict vertical depth monotonicity (shallow to deep)
6. Plausible oceanographic physical ranges (temperature, salinity)
7. Frontend and Pydantic schema contract compatibility
8. Live API endpoint integration (/api/observations/argo and /api/observations/argo/{id}/profile)
9. Collocated Model-vs-Observation statistical comparison (/api/comparison/point)
10. Seamless fallback to Phase 1 synthetic fleet when argo directory is empty

NOTE: This test suite generates an isolated test fixture labelled explicitly as:
'TEST_FIXTURE_ONLY_SYNTHETIC_ARGO' to validate parser mechanics without fabricating
unverified data in the production data/raw/argo/ storage.
"""
import sys
import os
import shutil
import tempfile
import numpy as np
import netCDF4 as nc

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from data.netcdf_loader import ArgoNetCDFLoader, pressure_to_depth, is_good_qc, argo_juld_to_iso
from app.services.observation_service import observation_service
from app.models.schemas import ArgoFloatSummary, ArgoProfileResponse, ComparisonResponse
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def create_labelled_test_fixture(filepath: str, wmo: str = "2903749"):
    """
    Creates an authentic Argo Profile NetCDF-3 classic file for testing.
    Includes intentional QC flags (1, 2, 3, 4, 9) and fill values to rigorously test filters.
    """
    with nc.Dataset(filepath, mode="w", format="NETCDF3_CLASSIC") as ds:
        ds.title = "TEST FIXTURE ONLY - SYNTHETIC ARGO PROFILE FOR UNIT TESTING"
        ds.institution = "SIH26067 Test Harness"
        ds.source = "Argo float synthetic test profile"

        # Standard Argo dimensions
        n_prof = 2
        n_levels = 12
        ds.createDimension("N_PROF", n_prof)
        ds.createDimension("N_LEVELS", n_levels)
        ds.createDimension("STRING8", 8)
        ds.createDimension("STRING32", 32)

        # Platform number (char array N_PROF, 8)
        v_plat = ds.createVariable("PLATFORM_NUMBER", "c", ("N_PROF", "STRING8"))
        for p_idx in range(n_prof):
            padded = wmo.ljust(8)
            for c_idx, char in enumerate(padded):
                v_plat[p_idx, c_idx] = char

        # Platform type
        v_type = ds.createVariable("PLATFORM_TYPE", "c", ("N_PROF", "STRING32"))
        for p_idx in range(n_prof):
            padded = "APEX-Deep".ljust(32)
            for c_idx, char in enumerate(padded):
                v_type[p_idx, c_idx] = char

        # Cycle number
        v_cycle = ds.createVariable("CYCLE_NUMBER", "i4", ("N_PROF",))
        v_cycle[:] = [141, 142]

        # Coordinates & Time
        v_lat = ds.createVariable("LATITUDE", "f4", ("N_PROF",))
        v_lat[:] = [14.50, 14.80]

        v_lon = ds.createVariable("LONGITUDE", "f4", ("N_PROF",))
        v_lon[:] = [64.00, 64.20]

        v_juld = ds.createVariable("JULD", "f8", ("N_PROF",))
        # 27500 days since 1950-01-01 is ~2025-04-18
        v_juld[:] = [27500.25, 27510.50]

        v_dir = ds.createVariable("DIRECTION", "c", ("N_PROF",))
        v_dir[:] = ["A", "A"]

        # Profile measurement arrays
        v_pres = ds.createVariable("PRES", "f4", ("N_PROF", "N_LEVELS"))
        v_temp = ds.createVariable("TEMP", "f4", ("N_PROF", "N_LEVELS"))
        v_psal = ds.createVariable("PSAL", "f4", ("N_PROF", "N_LEVELS"))

        v_pres_qc = ds.createVariable("PRES_QC", "c", ("N_PROF", "N_LEVELS"))
        v_temp_qc = ds.createVariable("TEMP_QC", "c", ("N_PROF", "N_LEVELS"))
        v_psal_qc = ds.createVariable("PSAL_QC", "c", ("N_PROF", "N_LEVELS"))

        # Cycle 2 (Latest): 12 levels with deliberate good and bad measurements
        # Levels 0-7: Good data (QC '1' or '2')
        # Level 8: Bad Temp QC ('4') -> Must be filtered out
        # Level 9: Probably Bad Salinity QC ('3') -> Must be filtered out
        # Level 10: Missing Pressure (Fill value 99999.0, QC '9') -> Must be filtered out
        # Level 11: Out of range temperature (55.0 C, QC '1') -> Must be filtered out
        pressures = [5.0, 10.0, 25.0, 50.0, 100.0, 200.0, 500.0, 1000.0, 1200.0, 1400.0, 99999.0, 1800.0]
        temperatures = [28.5, 28.3, 27.8, 26.2, 22.4, 16.1, 9.8, 5.9, 4.8, 4.1, 99999.0, 55.0]
        salinities = [36.4, 36.4, 36.5, 36.6, 36.2, 35.5, 34.9, 34.7, 34.7, 34.7, 99999.0, 34.7]

        pres_qcs = ["1", "1", "1", "1", "1", "1", "1", "2", "1", "1", "9", "1"]
        temp_qcs = ["1", "1", "1", "1", "1", "1", "1", "2", "4", "1", "9", "1"]  # Index 8 is '4' (Bad)
        psal_qcs = ["1", "1", "1", "1", "1", "1", "1", "2", "1", "3", "9", "1"]  # Index 9 is '3' (Bad)

        for p_idx in range(n_prof):
            for lev in range(n_levels):
                v_pres[p_idx, lev] = pressures[lev]
                v_temp[p_idx, lev] = temperatures[lev]
                v_psal[p_idx, lev] = salinities[lev]
                v_pres_qc[p_idx, lev] = pres_qcs[lev]
                v_temp_qc[p_idx, lev] = temp_qcs[lev]
                v_psal_qc[p_idx, lev] = psal_qcs[lev]


def test_unesco_depth_conversion():
    """Verify Saunders & Fofonoff UNESCO pressure to depth formulation."""
    # At surface (0 dbar), depth must be 0m
    d0 = pressure_to_depth(0.0, 15.0)
    assert d0 == 0.0, f"Expected 0.0m at surface, got {d0}"

    # At 1000 dbar at 15°N:
    # depth ~ 991.6m (slightly less than 1000 due to gravity and compressibility)
    d1000 = pressure_to_depth(1000.0, 15.0)
    assert 985.0 <= d1000 <= 995.0, f"Unexpected depth {d1000} at 1000 dbar"

    # Depth must increase monotonically with pressure
    d2000 = pressure_to_depth(2000.0, 15.0)
    assert d2000 > d1000, f"Depth not monotonic: {d2000} <= {d1000}"
    print("[PASS] test_unesco_depth_conversion")


def test_qc_filtering_flags():
    """Verify is_good_qc accepts only 1 and 2, and rejects 3, 4, 8, 9."""
    assert is_good_qc("1") is True
    assert is_good_qc("2") is True
    assert is_good_qc(b"1") is True
    assert is_good_qc(b"2") is True
    assert is_good_qc(1) is True
    assert is_good_qc(2) is True

    assert is_good_qc("3") is False
    assert is_good_qc("4") is False
    assert is_good_qc("8") is False
    assert is_good_qc("9") is False
    assert is_good_qc(b"4") is False
    assert is_good_qc(None) is False
    print("[PASS] test_qc_filtering_flags")


def test_juld_to_iso():
    """Verify Argo Julian Day to ISO 8601 UTC timestamp conversion."""
    # JULD = 0 is 1950-01-01T00:00:00Z
    iso0 = argo_juld_to_iso(0.0)
    assert iso0 == "1950-01-01T00:00:00Z", f"Expected 1950-01-01, got {iso0}"

    # Day 27500 is 2025-04-16T00:00:00Z
    iso_recent = argo_juld_to_iso(27500.0)
    assert "2025" in iso_recent, f"Expected 2025 in recent JULD, got {iso_recent}"
    print("[PASS] test_juld_to_iso")


def test_argo_netcdf_loader_full_pipeline():
    """
    Tests complete parsing, QC filtering, missing-value rejection,
    depth monotonicity, and physical ranges using a temporary labelled fixture.
    """
    temp_dir = tempfile.mkdtemp(prefix="argo_test_fixture_")
    fixture_path = os.path.join(temp_dir, "2903749_prof.nc")

    try:
        create_labelled_test_fixture(fixture_path, wmo="2903749")
        assert os.path.exists(fixture_path)

        loader = ArgoNetCDFLoader(raw_argo_dir=temp_dir)
        assert loader.has_argo_data() is True

        floats = loader.get_all_floats()
        assert len(floats) == 1, f"Expected 1 float, got {len(floats)}"

        f_summary = floats[0]
        assert f_summary.id == "argo-2903749"
        assert f_summary.wmo == "2903749"
        assert f_summary.cycle == 142  # Latest cycle
        assert f_summary.lat == 14.8
        assert f_summary.lon == 64.2
        assert f_summary.platform_type == "APEX-Deep"
        assert f_summary.status in ("profiling", "descending")

        # Get profile
        profile = loader.get_float_profile("argo-2903749")
        assert profile is not None
        assert profile.wmo == "2903749"
        assert profile.cycle == 142
        assert len(profile.records) > 0

        # Verify QC filtering:
        # Original 12 levels: levels 0-7 are good (8 valid levels).
        # Level 8 (QC 4), Level 9 (QC 3), Level 10 (fill 99999), Level 11 (temp 55.0C) must be discarded!
        assert len(profile.records) == 8, f"Expected exactly 8 valid records after QC filtering, got {len(profile.records)}"

        # Verify vertical depth monotonicity
        for i in range(len(profile.records) - 1):
            assert profile.records[i].depth < profile.records[i + 1].depth, \
                f"Depth not strictly monotonic at index {i}: {profile.records[i].depth} >= {profile.records[i+1].depth}"

        # Verify plausible oceanographic ranges
        for r in profile.records:
            assert 1.0 <= r.temperature <= 35.0, f"Unphysical temperature: {r.temperature}"
            assert 32.0 <= r.salinity <= 38.0, f"Unphysical salinity: {r.salinity}"
            assert r.depth >= 0.0, f"Negative depth: {r.depth}"
            assert r.qc == 1

        print("[PASS] test_argo_netcdf_loader_full_pipeline (QC filtering & physical ranges verified)")

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


def test_observation_service_with_fixture():
    """
    Tests ObservationService and FastAPI routes with ArgoNetCDFLoader pointing to test fixture.
    """
    temp_dir = tempfile.mkdtemp(prefix="argo_obs_test_")
    fixture_path = os.path.join(temp_dir, "2903749_prof.nc")

    try:
        create_labelled_test_fixture(fixture_path, wmo="2903749")

        from data.netcdf_loader import argo_netcdf_loader
        argo_netcdf_loader.set_argo_dir(temp_dir)

        # 1. Test /api/observations/argo returns the ingested float
        res = client.get("/api/observations/argo")
        assert res.status_code == 200
        floats_data = res.json()
        assert any(f["wmo"] == "2903749" for f in floats_data)
        print("[PASS] /api/observations/argo with real fixture")

        # 2. Test /api/observations/argo/{float_id}/profile
        res_prof = client.get("/api/observations/argo/argo-2903749/profile")
        assert res_prof.status_code == 200
        prof_data = res_prof.json()
        assert prof_data["wmo"] == "2903749"
        assert len(prof_data["records"]) == 8
        print("[PASS] /api/observations/argo/{id}/profile with real fixture")

        # 3. Test /api/comparison/point collocated calculation with real profile
        res_comp = client.get("/api/comparison/point?float_id=argo-2903749&variable=temperature")
        assert res_comp.status_code == 200
        comp_data = res_comp.json()
        assert comp_data["wmo"] == "2903749"
        assert "rmse" in comp_data
        assert "mae" in comp_data
        assert "mean_bias" in comp_data
        assert len(comp_data["points"]) == 8
        # Ensure statistical metrics are valid numbers
        assert not np.isnan(comp_data["rmse"])
        assert not np.isnan(comp_data["mae"])
        assert not np.isnan(comp_data["mean_bias"])
        print(f"[PASS] /api/comparison/point with real profile (RMSE: {comp_data['rmse']} degC, points: {len(comp_data['points'])})")

    finally:
        # Reset loader to default workspace path
        from data.netcdf_loader import argo_netcdf_loader
        argo_netcdf_loader.set_argo_dir("data/raw/argo")
        shutil.rmtree(temp_dir, ignore_errors=True)


def test_fallback_behavior_when_directory_empty():
    """
    Verifies that when an argo directory contains no NetCDF files,
    ObservationService gracefully and transparently serves the Phase 1 verified synthetic fleet.
    """
    temp_empty_dir = tempfile.mkdtemp(prefix="argo_empty_")
    try:
        from data.netcdf_loader import argo_netcdf_loader
        argo_netcdf_loader.set_argo_dir(temp_empty_dir)
        assert argo_netcdf_loader.has_argo_data() is False

        # 1. Floats endpoint must return verified 13 Indian Ocean floats
        floats = observation_service.get_all_floats()
        assert len(floats) == 13
        assert any(f.wmo == "2903741" for f in floats)

        # 2. Profile endpoint must return 22 standard depths
        prof = observation_service.get_float_profile("argo-2903741")
        assert prof is not None
        assert len(prof.records) == 22

        # 3. Comparison endpoint must succeed
        res = client.get("/api/comparison/point?float_id=argo-2903741&variable=temperature")
        assert res.status_code == 200
        data = res.json()
        assert "rmse" in data
        print("[PASS] test_fallback_behavior_when_directory_empty (Phase 1 verified fleet operational)")
    finally:
        from data.netcdf_loader import argo_netcdf_loader
        argo_netcdf_loader.set_argo_dir("data/raw/argo")
        shutil.rmtree(temp_empty_dir, ignore_errors=True)



if __name__ == "__main__":
    print("=" * 70)
    print("RUNNING ARGO NETCDF LOADER & QC FILTERING TEST SUITE (PHASE 2A)")
    print("=" * 70)
    test_unesco_depth_conversion()
    test_qc_filtering_flags()
    test_juld_to_iso()
    test_argo_netcdf_loader_full_pipeline()
    test_observation_service_with_fixture()
    test_fallback_behavior_when_directory_empty()
    print("=" * 70)
    print("ALL 6 ARGO LOADER TEST SUITES PASSED PERFECTLY!")
    print("=" * 70)
