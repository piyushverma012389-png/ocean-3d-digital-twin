"""
Unified Test Runner for SIH26067 Ocean-3D Platform.
Executes all regression, loader, service, and scientific analysis test suites:
- test_api.py (8 tests)
- test_argo_loader.py (6 tests)
- test_bathymetry_loader.py (5 tests)
- test_ocean_model_loader.py (6 tests)
- test_ssh_loader.py (8 tests)
- test_multi_cycle_comparison.py (10 tests)
- test_phase3c_comparison.py (10 tests)
- test_phase3d_storytelling.py (8 tests)
- test_phase4_hardening.py (8 tests)
Total: 69 tests.
"""
import sys
import os
import subprocess
import time

TEST_FILES = [
    "test_api.py",
    "test_argo_loader.py",
    "test_bathymetry_loader.py",
    "test_ocean_model_loader.py",
    "test_ssh_loader.py",
    "test_multi_cycle_comparison.py",
    "test_phase3c_comparison.py",
    "test_phase3d_storytelling.py",
    "test_phase4_hardening.py"
]

def main():
    print("=" * 80)
    print("SIH26067 OCEAN-3D PLATFORM — FULL SCIENTIFIC SUITE VERIFICATION")
    print("=" * 80)
    
    tests_dir = os.path.dirname(os.path.abspath(__file__))
    total_suites = len(TEST_FILES)
    passed_suites = 0
    start_all = time.time()
    
    for idx, test_file in enumerate(TEST_FILES, 1):
        test_path = os.path.join(tests_dir, test_file)
        print(f"\n[{idx}/{total_suites}] Executing {test_file}...", flush=True)
        t0 = time.time()
        try:
            res = subprocess.run([sys.executable, test_path], capture_output=True, text=True, timeout=60)
            dt = time.time() - t0
            
            if res.returncode == 0:
                passed_suites += 1
                print(f"[SUCCESS] {test_file} passed in {dt:.2f}s", flush=True)
                for line in res.stdout.strip().split("\n"):
                    if "[PASS]" in line or "ALL" in line or "OK" in line:
                        print("  " + line, flush=True)
            else:
                print(f"[FAILED] {test_file} exited with code {res.returncode}", flush=True)
                print(res.stdout, flush=True)
                print(res.stderr, flush=True)
                sys.exit(1)
        except subprocess.TimeoutExpired:
            print(f"[TIMEOUT] {test_file} timed out after 60s", flush=True)
            sys.exit(1)
            
    total_time = time.time() - start_all
    print("\n" + "=" * 80, flush=True)
    print(f"ALL {passed_suites}/{total_suites} TEST SUITES PASSED IN {total_time:.2f}s", flush=True)
    print("SCIENTIFIC INTEGRITY & REGRESSION CHECKS: 100% CLEAN", flush=True)
    print("=" * 80, flush=True)

if __name__ == "__main__":
    main()
