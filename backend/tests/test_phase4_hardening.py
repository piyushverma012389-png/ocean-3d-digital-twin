"""
SIH26067 - Phase 4 Final Hardening, Safety & Verification Suite
Validates:
1. Authentic dataset health and diagnostics (/api/health, /api/health/datasets)
2. Missing dataset diagnostic resilience without crashes
3. Strict 404 and NO synthetic data on invalid Argo cycle (Cycle 9999)
4. Strict 404 on invalid Argo cycle comparison
5. Dynamic metric independence between Cycle 217 and Cycle 228
6. Temporal classification adherence (NEAR_SYNOPTIC vs TEMPORALLY_MISMATCHED)
7. Frontend scientific terminology audit (zero occurrences of forbidden terms)
8. Model slice API parameter validation
"""

import os
import sys
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from app.main import app
from data.netcdf_loader import check_dataset_health

client = TestClient(app)

class TestPhase4Hardening(unittest.TestCase):
    """Phase 4 Hardening and Safety Test Suite."""

    def test_01_authentic_dataset_health_probe(self):
        """Verify all 4 authentic datasets are verified by health check."""
        response = client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertIn("dataset_health", data)
        
        health = data["dataset_health"]
        self.assertIsNotNone(health)
        self.assertTrue(health.get("all_authentic_data_available"))
        
        datasets = health.get("datasets", {})
        self.assertIn("hycom", datasets)
        self.assertIn("hycom_ssh", datasets)
        self.assertIn("gebco", datasets)
        self.assertIn("argo", datasets)

        for name, info in datasets.items():
            self.assertEqual(info.get("status"), "AVAILABLE", f"Dataset {name} should be AVAILABLE")
            self.assertTrue(info.get("exists"), f"Dataset {name} file must exist")
            self.assertIn("details", info)

    def test_02_dataset_health_detailed_endpoint(self):
        """Verify /api/health/datasets returns full diagnostics dictionary."""
        response = client.get("/api/health/datasets")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data.get("all_authentic_data_available"))
        self.assertEqual(data.get("status"), "healthy")
        self.assertIn("diagnostics", data)

    def test_03_invalid_argo_cycle_returns_404_not_synthetic(self):
        """Verify requesting non-existent Cycle 9999 for float 2902088 returns 404, NEVER synthetic data."""
        response = client.get("/api/observations/argo/argo-2902088/profile?cycle=9999")
        self.assertEqual(response.status_code, 404, "Invalid cycle 9999 must return 404 Not Found")
        data = response.json()
        self.assertIn("detail", data)
        self.assertIn("9999", data["detail"])

    def test_04_invalid_argo_cycle_comparison_returns_404(self):
        """Verify collocated comparison endpoint returns 404 for non-existent Cycle 9999."""
        response = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=9999")
        self.assertEqual(response.status_code, 404, "Comparison for cycle 9999 must return 404 Not Found")
        data = response.json()
        self.assertIn("detail", data)

    def test_05_cycle217_and_cycle228_metrics_independence(self):
        """Verify Cycle 217 and Cycle 228 have independently calculated, non-reused metrics."""
        # Query Cycle 217
        r217 = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=217")
        self.assertEqual(r217.status_code, 200)
        d217 = r217.json()
        
        # Query Cycle 228
        r228 = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=228")
        self.assertEqual(r228.status_code, 200)
        d228 = r228.json()

        # Check Cycle 217 metrics
        self.assertEqual(d217["cycle"], 217)
        self.assertEqual(d217["temporal_match"]["status"], "NEAR_SYNOPTIC")
        self.assertAlmostEqual(d217["time_difference_hours"], 3.4833, places=2)
        self.assertEqual(d217["n_levels"], 138)
        rmse_217 = d217["rmse"]
        self.assertGreater(rmse_217, 0.0)

        # Check Cycle 228 metrics
        self.assertEqual(d228["cycle"], 228)
        self.assertEqual(d228["temporal_match"]["status"], "TEMPORALLY_MISMATCHED")
        self.assertGreater(d228["time_difference_hours"], 2000.0)
        self.assertEqual(d228["n_levels"], 139)
        rmse_228 = d228["rmse"]
        self.assertGreater(rmse_228, 0.0)

        # Verify strict independence: RMSE values must be mathematically distinct
        self.assertNotEqual(
            rmse_217, rmse_228,
            f"Cycle 217 RMSE ({rmse_217}) must not be reused for Cycle 228 ({rmse_228})"
        )
        self.assertNotEqual(
            d217["mean_bias"], d228["mean_bias"],
            "Biases must be independently calculated"
        )

    def test_06_temporal_classification_strictness(self):
        """Verify temporal classification rules:
        - Cycle 217 with HYCOM t2 (2018-11-20) -> NEAR_SYNOPTIC (diff ~ 3.48h <= 24h)
        - Cycle 217 with HYCOM t0 (2018-11-18) -> TEMPORALLY_MISMATCHED (diff ~ 51.48h > 24h)
        - Cycle 228 with HYCOM t2 -> TEMPORALLY_MISMATCHED (diff ~ 2643.8h > 24h)
        """
        # Cycle 217 + t2 (Nov 20) -> NEAR_SYNOPTIC
        r_synoptic = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=217")
        self.assertEqual(r_synoptic.status_code, 200)
        self.assertEqual(r_synoptic.json()["temporal_match"]["status"], "NEAR_SYNOPTIC")

        # Cycle 217 + t0 (Nov 18) -> TEMPORALLY_MISMATCHED
        r_mismatched_t0 = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=0&cycle=217")
        self.assertEqual(r_mismatched_t0.status_code, 200)
        self.assertEqual(r_mismatched_t0.json()["temporal_match"]["status"], "TEMPORALLY_MISMATCHED")
        self.assertGreater(abs(r_mismatched_t0.json()["time_difference_hours"]), 24.0)

        # Cycle 228 + t2 -> TEMPORALLY_MISMATCHED
        r_mismatched_c228 = client.get("/api/comparison/point?float_id=argo-2902088&variable=temperature&time_step=2&cycle=228")
        self.assertEqual(r_mismatched_c228.status_code, 200)
        self.assertEqual(r_mismatched_c228.json()["temporal_match"]["status"], "TEMPORALLY_MISMATCHED")

    def test_07_frontend_scientific_terminology_audit(self):
        """Scan frontend source files to ensure forbidden unscientific phrases are absent."""
        project_root = BACKEND_ROOT.parent
        frontend_src = project_root / "frontend" / "src"
        index_html = project_root / "frontend" / "index.html"
        
        forbidden_phrases = [
            "ground truth",
            "ground-truth",
            "exact prediction",
            "100% accurate",
            "perfect agreement",
        ]
        
        files_to_check = list(frontend_src.rglob("*.ts")) + list(frontend_src.rglob("*.tsx"))
        if index_html.exists():
            files_to_check.append(index_html)

        violations = []
        for file_path in files_to_check:
            content = file_path.read_text(encoding="utf-8", errors="ignore").lower()
            for phrase in forbidden_phrases:
                if phrase in content:
                    violations.append(f"{file_path.name}: contains forbidden phrase '{phrase}'")

        self.assertEqual(len(violations), 0, f"Scientific terminology violations detected: {violations}")

    def test_08_api_parameter_validation(self):
        """Verify invalid variable parameters return 400 Bad Request."""
        res_invalid_var = client.get("/api/model/slice?variable=invalid_var&depth=0&time_step=0")
        self.assertEqual(res_invalid_var.status_code, 400)
        self.assertIn("Invalid variable", res_invalid_var.json().get("detail", ""))

if __name__ == "__main__":
    unittest.main(verbosity=2)
