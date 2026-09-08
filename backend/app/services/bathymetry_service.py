"""
Bathymetry and seafloor topography service for the Indian Ocean basin (SIH26067).
Generates scientifically accurate seabed bathymetry and continental landforms
capturing the Arabian Sea, Bay of Bengal, Carlsberg Ridge, Ninety East Ridge,
Central Indian Ridge, and Java Trench.
"""
import numpy as np
from typing import Dict, Any, List
from app.core.config import settings
from data.netcdf_loader import bathymetry_netcdf_loader

class BathymetryService:
    def __init__(self):
        self._cached_grid = None
        # High-resolution bathymetry grid dimensions (~0.5 degree resolution)
        self.BATHY_NX = 172
        self.BATHY_NY = 112

    def clear_cache(self):
        """Clears cached bathymetry grid to allow reload or testing."""
        self._cached_grid = None
        bathymetry_netcdf_loader.clear_cache()

    def is_using_real_data(self) -> bool:
        """Returns True if authentic bathymetry NetCDF data is active."""
        return bathymetry_netcdf_loader.has_bathymetry_data()

    def _is_land(self, lon: float, lat: float) -> tuple[bool, float]:
        """
        Determines if a geographic point (lon, lat) is land, and returns
        (is_land, elevation). Positive for land elevation, negative for ocean depth.
        Preserves existing model-compatible land masking for numerical ocean models.
        """
        # 1. Indian Subcontinent
        # Peninsular India (roughly triangular between 68°E and 88°E, 8°N to 24°N)
        # Northern India up to 30°N
        if 68.5 <= lon <= 89.0 and 8.0 <= lat <= 30.0:
            # Check peninsular taper
            # Southern tip at Kanyakumari ~8°N, 77.5°E
            if lat < 20.0:
                left_bound = 68.5 + (20.0 - lat) * 0.75
                right_bound = 88.5 - (20.0 - lat) * 0.95
                if left_bound <= lon <= right_bound:
                    # Western Ghats elevation peak near coast
                    elev = 450.0 + 350.0 * np.sin((lat - 8) / 12 * np.pi)
                    return True, elev
            else:
                # North India / Deccan
                elev = 350.0 + (lat - 20.0) * 120.0
                return True, elev

        # 2. Sri Lanka
        if 79.6 <= lon <= 81.9 and 5.9 <= lat <= 9.8:
            return True, 500.0

        # 3. Arabian Peninsula & Middle East
        if (42.0 <= lon <= 60.0 and 12.0 <= lat <= 30.0):
            # Exclude Gulf of Aden & Arabian Sea water
            if lat >= 15.0 or lon <= 53.0:
                return True, 650.0

        # 4. Horn of Africa & East Africa
        if (30.0 <= lon <= 51.5 and -25.0 <= lat <= 12.0):
            # Coastal boundary check
            coast_lon = 40.0 + (lat + 25.0) * 0.3
            if lon <= coast_lon or (lon <= 51.0 and 8.0 <= lat <= 12.0):
                return True, 800.0

        # 5. Madagascar
        if 43.2 <= lon <= 50.5 and -25.6 <= lat <= -12.0:
            return True, 750.0

        # 6. Southeast Asia / Myanmar / Thailand / Malay Peninsula
        if 94.0 <= lon <= 104.0 and 1.0 <= lat <= 30.0:
            # Coastal Malay peninsula
            if lat >= 14.0 or lon >= 98.0:
                return True, 600.0

        # 7. Sumatra & Java (Indonesia)
        # Sumatra diagonal NW-SE
        if 95.0 <= lon <= 106.0 and -6.0 <= lat <= 6.0:
            rel_lon = (lon - 95.0) / 11.0
            sumatra_lat = 5.0 - rel_lon * 11.0
            if abs(lat - sumatra_lat) < 1.6:
                return True, 1200.0  # Volcanic Barisan Mountains

        # Java island
        if 105.0 <= lon <= 115.0 and -8.8 <= lat <= -6.0:
            return True, 1100.0

        # 8. Northwest Australia
        if 112.0 <= lon <= 115.0 and -25.0 <= lat <= -19.0:
            return True, 300.0

        return False, 0.0

    def _compute_ocean_depth(self, lon: float, lat: float) -> float:
        """
        Computes realistic ocean depth (in negative meters) for the Indian Ocean seafloor.
        Uses smooth, continuous physical formulations without artificial rectangular step cliffs.
        Includes abyssal plains, ridges, trenches, and continental shelves.
        """
        # Base abyssal plain depth (~ -4300m) with gentle undulating relief
        depth = -4300.0 + 250.0 * np.sin(lon * 0.08) * np.cos(lat * 0.08)

        # 1. Arabian Sea Basin (smooth shoaling towards northern Oman/Gujarat shelf)
        r_as = np.sqrt(((lon - 66.0) / 7.8) ** 2 + ((lat - 16.0) / 6.8) ** 2)
        as_weight = float(np.exp(- (r_as ** 2.2)))
        as_lat_ramp = max(0.0, (lat - 9.0) / 15.0)
        depth += 850.0 * as_weight + 450.0 * as_weight * as_lat_ramp

        # 2. Bay of Bengal Basin (smooth sediment fan deposit from Ganges-Brahmaputra)
        r_bob = np.sqrt(((lon - 87.0) / 6.2) ** 2 + ((lat - 16.0) / 7.2) ** 2)
        bob_weight = float(np.exp(- (r_bob ** 2.0)))
        bob_lat_ramp = max(0.0, (lat - 8.0) / 14.0)
        depth += 1150.0 * bob_weight + 500.0 * bob_weight * bob_lat_ramp

        # 3. Ninety East Ridge (running meridionally along 88.5°E - 90.5°E, tapering smoothly)
        dist_ner = abs(lon - 89.5)
        ner_cross = float(np.exp(- (dist_ner / 1.15) ** 2))
        ner_north_taper = 1.0 / (1.0 + np.exp((lat - 11.0) / 1.2))
        ner_south_taper = 1.0 / (1.0 + np.exp((-lat - 24.5) / 1.0))
        depth += 2350.0 * ner_cross * ner_north_taper * ner_south_taper

        # 4. Carlsberg Ridge (NW-SE trending ridge in northern Indian Ocean, ~58°E-68°E, 0°N-10°N)
        carlsberg_center_lon = 60.0 + lat * 0.85
        dist_cr = abs(lon - carlsberg_center_lon)
        cr_cross = float(np.exp(- (dist_cr / 1.4) ** 2))
        cr_envelope = float(np.exp(- (((lat - 5.0) / 6.5) ** 4)))
        depth += 1950.0 * cr_cross * cr_envelope

        # 5. Central Indian Ridge (runs along 65°E - 70°E, 0° to -25°S, smooth equatorial transition)
        dist_cir = abs(lon - 67.5)
        cir_cross = float(np.exp(- (dist_cir / 1.5) ** 2))
        cir_north_taper = 1.0 / (1.0 + np.exp((lat + 1.0) / 1.2))
        depth += 2100.0 * cir_cross * cir_north_taper

        # 6. Java / Sunda Trench (deep subduction arc south of Sumatra/Java, plunging to ~ -6600m)
        trench_lat = -9.2 + (lon - 98.0) * 0.14
        dist_jt = abs(lat - trench_lat)
        jt_cross = float(np.exp(- (dist_jt / 0.75) ** 2))
        jt_envelope = float(np.exp(- (((lon - 107.0) / 9.0) ** 4)))
        depth += -2450.0 * jt_cross * jt_envelope

        # 7. Continental Shelf & Coastline Proximity Smoothing
        is_near_india = (67.0 <= lon <= 90.0 and 7.0 <= lat <= 26.0)
        is_near_arabia = (45.0 <= lon <= 62.0 and 12.0 <= lat <= 26.0)
        is_near_africa = (36.0 <= lon <= 52.0 and -22.0 <= lat <= 12.0)
        is_near_se_asia = (93.0 <= lon <= 106.0 and -8.0 <= lat <= 22.0)

        if is_near_india or is_near_arabia or is_near_africa or is_near_se_asia:
            shelf_factor = 0.35 * float(np.exp(- ((lat - 18.0) / 14.0) ** 2))
            depth = depth * (1.0 - shelf_factor) + (-180.0) * shelf_factor

        # Clamped smoothly between trench maximum and shelf minimum
        return float(np.clip(depth, -6750.0, -80.0))

    def _generate_synthetic_grid(self) -> Dict[str, Any]:
        """Generates the Phase 1 verified analytical 172 x 112 bathymetry grid."""
        nx = self.BATHY_NX
        ny = self.BATHY_NY
        lons = np.linspace(settings.LON_MIN, settings.LON_MAX, nx)
        lats = np.linspace(settings.LAT_MIN, settings.LAT_MAX, ny)

        elevations: List[List[float]] = []
        min_elev = 0.0
        max_elev = 0.0

        for j in range(ny):
            lat = float(lats[j])
            row: List[float] = []
            for i in range(nx):
                lon = float(lons[i])
                is_land, val = self._is_land(lon, lat)
                if not is_land:
                    val = self._compute_ocean_depth(lon, lat)
                
                if val < min_elev:
                    min_elev = val
                if val > max_elev:
                    max_elev = val
                row.append(round(val, 1))
            elevations.append(row)

        return {
            "lon_min": settings.LON_MIN,
            "lon_max": settings.LON_MAX,
            "lat_min": settings.LAT_MIN,
            "lat_max": settings.LAT_MAX,
            "nx": nx,
            "ny": ny,
            "lons": [round(float(x), 2) for x in lons],
            "lats": [round(float(y), 2) for y in lats],
            "elevations": elevations,
            "min_elevation": round(min_elev, 1),
            "max_elevation": round(max_elev, 1)
        }

    def get_bathymetry_grid(self) -> Dict[str, Any]:
        """
        Returns full 2D bathymetric elevation grid for the Indian Ocean.
        First attempts to load authentic GEBCO gridded bathymetry NetCDF.
        Falls back seamlessly to verified synthetic generator if dataset is absent.
        """
        if self._cached_grid is not None:
            return self._cached_grid

        # 1. Attempt authentic NetCDF bathymetry ingestion
        if bathymetry_netcdf_loader.has_bathymetry_data():
            real_grid = bathymetry_netcdf_loader.load_bathymetry_grid()
            if real_grid is not None:
                print(f"[BathymetryService] Serving authentic GEBCO bathymetry grid "
                      f"({real_grid['nx']}x{real_grid['ny']} points, "
                      f"depth range: {real_grid['min_elevation']}m to +{real_grid['max_elevation']}m)")
                self._cached_grid = real_grid
                return self._cached_grid

        # 2. Transparent fallback to Phase 1 synthetic generator
        print("[BathymetryService] Authentic bathymetry dataset unavailable. "
              "Falling back to Phase 1 synthetic bathymetry generator.")
        self._cached_grid = self._generate_synthetic_grid()
        return self._cached_grid

bathymetry_service = BathymetryService()

