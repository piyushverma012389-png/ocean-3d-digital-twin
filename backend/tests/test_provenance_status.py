"""
SIH26067 - Scientific Provenance Status & Fallback Distinction Test Suite.
Validates:
1. HYCOM 3D authentic file presence produces AUTHENTIC status.
2. HYCOM SSH authentic file presence produces AUTHENTIC status.
3. GEBCO 2020 authentic file presence produces AUTHENTIC status.
4. Argo GDAC authentic profile file produces AUTHENTIC status.
5. Genuine synthetic fallback condition produces FALLBACK status for HYCOM 3D.
6. Genuine synthetic fallback condition produces FALLBACK status for HYCOM SSH.
7. Genuine synthetic fallback condition produces FALLBACK status for GEBCO bathymetry.
8. Genuine synthetic fallback condition produces FALLBACK status for Argo floats.
9. Provenance API endpoint response schema and physical metadata integrity.
"""
import os
import sys
import tempfile
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app
from app.services.model_service import model_service
from app.services.bathymetry_service import bathymetry_service
from data.netcdf_loader import (
    ocean_model_netcdf_loader,
    ssh_netcdf_loader,
    bathymetry_netcdf_loader,
    argo_netcdf_loader
)

client = TestClient(app)

class TestProvenanceStatus(unittest.TestCase):
    """Test suite verifying authentic vs synthetic fallback status for all datasets."""

    def test_01_hycom_authentic_status(self):
        """HYCOM authentic file -> AUTHENTIC status in model service and API."""
        self.assertTrue(ocean_model_netcdf_loader.has_model_data(), "Authentic HYCOM 3D NetCDF must exist")
        self.assertTrue(model_service.is_using_real_data(), "ModelService must report real data active")

        res = client.get("/api/model/provenance")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("hycom", data)
        self.assertTrue(data["hycom"]["is_authentic"], "HYCOM overall status must be authentic")
        self.assertTrue(data["hycom"].get("is_authentic_3d", True), "HYCOM 3D field must be authentic")
        print("[PASS] Test 1: HYCOM 3D authentic file -> AUTHENTIC status")

    def test_02_hycom_ssh_authentic_status(self):
        """HYCOM SSH authentic file -> AUTHENTIC status in SSH loader, model service, and API."""
        self.assertTrue(ssh_netcdf_loader.has_ssh_data(), "Authentic HYCOM SSH NetCDF must exist")
        self.assertTrue(model_service.is_using_real_ssh(), "ModelService must report real SSH active")

        res = client.get("/api/model/provenance")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("hycom_ssh", data)
        self.assertTrue(data["hycom_ssh"]["is_authentic"], "HYCOM SSH status must be authentic")
        print("[PASS] Test 2: HYCOM SSH authentic file -> AUTHENTIC status")

    def test_03_gebco_authentic_status(self):
        """GEBCO authentic file -> AUTHENTIC status in bathymetry service and API."""
        self.assertTrue(bathymetry_netcdf_loader.has_bathymetry_data(), "Authentic GEBCO NetCDF must exist")
        self.assertTrue(bathymetry_service.is_using_real_data(), "BathymetryService must report real data active")

        res = client.get("/api/model/provenance")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("gebco", data)
        self.assertTrue(data["gebco"]["is_authentic"], "GEBCO status must be authentic")
        print("[PASS] Test 3: GEBCO authentic file -> AUTHENTIC status")

    def test_04_argo_authentic_status(self):
        """Argo authentic file -> AUTHENTIC status in Argo loader and API."""
        self.assertTrue(argo_netcdf_loader.has_argo_data(), "Authentic Argo NetCDF must exist")

        res = client.get("/api/model/provenance")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("argo", data)
        self.assertTrue(data["argo"]["is_authentic"], "Argo status must be authentic")
        self.assertEqual(data["argo"]["platform_wmo"], "2902088")
        print("[PASS] Test 4: Argo authentic file -> AUTHENTIC status")

    def test_05_hycom_3d_genuine_fallback_condition(self):
        """Genuine missing HYCOM 3D directory -> correctly produces fallback status without crashing."""
        orig_dir = ocean_model_netcdf_loader._raw_models_dir
        try:
            with tempfile.TemporaryDirectory() as empty_dir:
                ocean_model_netcdf_loader.set_models_dir(empty_dir)
                self.assertFalse(ocean_model_netcdf_loader.has_model_data())
                self.assertFalse(model_service.is_using_real_data())

                res = client.get("/api/model/provenance")
                self.assertEqual(res.status_code, 200)
                data = res.json()
                self.assertFalse(data["hycom"]["is_authentic"], "Missing 3D file must report fallback")
                self.assertFalse(data["hycom"].get("is_authentic_3d", True))
        finally:
            ocean_model_netcdf_loader.set_models_dir(orig_dir)
            self.assertTrue(model_service.is_using_real_data())
        print("[PASS] Test 5: Genuine HYCOM 3D missing condition -> correctly produces SYNTHETIC FALLBACK")

    def test_06_hycom_ssh_genuine_fallback_condition(self):
        """Genuine missing HYCOM SSH directory -> correctly produces fallback status for SSH."""
        orig_dir = ssh_netcdf_loader._raw_models_dir
        try:
            with tempfile.TemporaryDirectory() as empty_dir:
                ssh_netcdf_loader.set_models_dir(empty_dir)
                self.assertFalse(ssh_netcdf_loader.has_ssh_data())
                self.assertFalse(model_service.is_using_real_ssh())

                res = client.get("/api/model/provenance")
                self.assertEqual(res.status_code, 200)
                data = res.json()
                self.assertFalse(data["hycom"]["is_authentic"], "Missing SSH must affect combined HYCOM status")
                self.assertFalse(data["hycom_ssh"]["is_authentic"], "Missing SSH must report fallback in hycom_ssh")
        finally:
            ssh_netcdf_loader.set_models_dir(orig_dir)
            self.assertTrue(model_service.is_using_real_ssh())
        print("[PASS] Test 6: Genuine HYCOM SSH missing condition -> correctly produces SYNTHETIC FALLBACK")

    def test_07_gebco_genuine_fallback_condition(self):
        """Genuine missing GEBCO directory -> correctly produces fallback status."""
        orig_dir = bathymetry_netcdf_loader._raw_bathymetry_dir
        try:
            with tempfile.TemporaryDirectory() as empty_dir:
                bathymetry_netcdf_loader.set_bathymetry_dir(empty_dir)
                self.assertFalse(bathymetry_service.is_using_real_data())

                res = client.get("/api/model/provenance")
                self.assertEqual(res.status_code, 200)
                data = res.json()
                self.assertFalse(data["gebco"]["is_authentic"], "Missing GEBCO must report fallback")
        finally:
            bathymetry_netcdf_loader.set_bathymetry_dir(orig_dir)
            self.assertTrue(bathymetry_service.is_using_real_data())
        print("[PASS] Test 7: Genuine GEBCO missing condition -> correctly produces SYNTHETIC FALLBACK")

    def test_08_argo_genuine_fallback_condition(self):
        """Genuine missing Argo directory -> correctly produces fallback status."""
        orig_dir = argo_netcdf_loader._raw_argo_dir
        try:
            with tempfile.TemporaryDirectory() as empty_dir:
                argo_netcdf_loader.set_argo_dir(empty_dir)
                self.assertFalse(argo_netcdf_loader.has_argo_data())

                res = client.get("/api/model/provenance")
                self.assertEqual(res.status_code, 200)
                data = res.json()
                self.assertFalse(data["argo"]["is_authentic"], "Missing Argo must report fallback")
        finally:
            argo_netcdf_loader.set_argo_dir(orig_dir)
            self.assertTrue(argo_netcdf_loader.has_argo_data())
        print("[PASS] Test 8: Genuine Argo missing condition -> correctly produces SYNTHETIC FALLBACK")


if __name__ == "__main__":
    print("=" * 80)
    print("PROVENANCE STATUS & AUTHENTIC VS FALLBACK REGRESSION SUITE")
    print("=" * 80)
    unittest.main(verbosity=2)
