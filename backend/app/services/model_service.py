"""
Numerical Ocean Model Service for the Indian Ocean (SIH26067).
Provides 4D hydrodynamic slices and water column profiles for:
- Potential Temperature (°C)
- Practical Salinity (PSU)
- Horizontal Current Velocity (u, v in m/s, magnitude)
- Sea Surface Height Anomaly (m)
Adheres to CF-conventions and simulates realistic physical oceanographic dynamics
including the Somali Current jet, Eastern Indian Ocean Warm Pool, Bay of Bengal
freshwater plume, and vertical thermocline stratification.
"""
import numpy as np
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.services.bathymetry_service import bathymetry_service
from data.netcdf_loader import ocean_model_netcdf_loader, ssh_netcdf_loader
from app.models.schemas import GridMeta

class ModelService:
    def __init__(self):
        pass

    def is_using_real_data(self) -> bool:
        """Returns True if authentic HYCOM NetCDF data is active."""
        return ocean_model_netcdf_loader.has_model_data()

    def is_using_real_ssh(self) -> bool:
        """Returns True if authentic HYCOM SSH NetCDF data is active."""
        return ssh_netcdf_loader.has_ssh_data()

    def get_metadata(self) -> GridMeta:
        """
        Returns model domain bounds, resolution, depth levels, time steps, and variable metadata.
        Prioritizes authentic HYCOM metadata when available.
        """
        if self.is_using_real_data():
            meta = ocean_model_netcdf_loader.get_metadata()
            if meta:
                return GridMeta(
                    lon_min=meta["lon_min"],
                    lon_max=meta["lon_max"],
                    lat_min=meta["lat_min"],
                    lat_max=meta["lat_max"],
                    nx=meta["nx"],
                    ny=meta["ny"],
                    depth_levels=meta["depth_levels"],
                    time_steps=meta["time_steps"],
                    variables=settings.VARIABLES
                )
        elif self.is_using_real_ssh():
            meta = ssh_netcdf_loader.get_metadata()
            if meta:
                return GridMeta(
                    lon_min=meta["lon_min"],
                    lon_max=meta["lon_max"],
                    lat_min=meta["lat_min"],
                    lat_max=meta["lat_max"],
                    nx=meta["nx"],
                    ny=meta["ny"],
                    depth_levels=settings.DEPTH_LEVELS,
                    time_steps=meta["time_steps"],
                    variables=settings.VARIABLES
                )
        return GridMeta(
            lon_min=settings.LON_MIN,
            lon_max=settings.LON_MAX,
            lat_min=settings.LAT_MIN,
            lat_max=settings.LAT_MAX,
            nx=settings.GRID_NX,
            ny=settings.GRID_NY,
            depth_levels=settings.DEPTH_LEVELS,
            time_steps=settings.TIME_STEPS,
            variables=settings.VARIABLES
        )

    def get_available_depths(self) -> List[int]:
        """Returns available depth levels (integer meters) for the active model."""
        if self.is_using_real_data():
            meta = ocean_model_netcdf_loader.get_metadata()
            if meta and "depth_levels" in meta:
                return meta["depth_levels"]
        return settings.DEPTH_LEVELS

    def sample_point(self, lon: float, lat: float, depth: float, variable: str, time_step: int = 0) -> float:
        """
        Samples the active ocean model at a specific geographic point, depth, and time.
        Prefers authentic HYCOM values; falls back to analytical physics for out-of-bounds or missing data.
        """
        if variable == "ssh":
            if self.is_using_real_ssh():
                val = ssh_netcdf_loader.sample_point(lon, lat, time_step)
                if val is not None:
                    return val
        elif self.is_using_real_data():
            val = ocean_model_netcdf_loader.sample_point(lon, lat, depth, variable, time_step)
            if val is not None:
                return val
        
        physics = self._get_base_physics(lon, lat, depth, time_step)
        return physics.get(variable, physics["temperature"])

    def _get_base_physics(self, lon: float, lat: float, depth: float, time_step: int) -> Dict[str, float]:
        """
        Computes physical state variables at continuous (lon, lat, depth, time).
        Preserves analytical formulation as robust fallback.
        """
        t_phase = time_step * 0.4  # Temporal wave phase

        # 1. Surface Potential Temperature (°C)
        warm_pool = 2.5 * np.exp(- (((lon - 90.0) / 18.0) ** 2 + ((lat - 2.0) / 12.0) ** 2))
        lat_gradient = -0.32 * max(0.0, -lat) - 0.05 * lat
        somali_dist = np.sqrt(((lon - 51.5) / 4.5) ** 2 + ((lat - 9.0) / 4.5) ** 2)
        upwelling_cooling = -4.5 * np.exp(- (somali_dist / 1.6) ** 2) * (1.0 + 0.2 * np.sin(t_phase))
        basin_wave = 0.35 * np.sin((lon - 50.0) * 0.07 - t_phase) * np.cos(lat * 0.06)
        synoptic_flux = 0.28 * np.sin(t_phase + (lat + 10.0) * 0.05)
        
        t_surf = 28.2 + warm_pool + lat_gradient + upwelling_cooling + basin_wave + synoptic_flux
        t_abyssal = 1.9 + 0.3 * np.cos(lat * 0.1)
        decay_scale = 160.0
        t_val = t_abyssal + (t_surf - t_abyssal) * np.exp(- depth / decay_scale)

        # 2. Practical Salinity (PSU)
        bob_plume_pulse = (3.4 + 0.6 * np.sin(t_phase)) * np.exp(- (((lon - 88.0) / 7.2) ** 2 + ((lat - 19.5) / 6.2) ** 2))
        as_evap = 0.25 * np.sin(t_phase * 0.7 + lat * 0.08)
        eq_sal_wave = 0.18 * np.sin((lon - 65.0) * 0.06 - t_phase) * np.exp(- ((lat / 14.0) ** 2))

        if lon < 76.0 and lat > 0.0:
            sal_surf = 36.4 + 0.6 * np.sin(lat * 0.1) - 0.2 * (lon - 60.0) / 15.0 + as_evap
        elif lon >= 76.0 and lat > 0.0:
            sal_surf = 32.2 + 0.8 * np.cos(lat * 0.08) - bob_plume_pulse
        else:
            sal_surf = 34.8 + 0.3 * np.cos(lat * 0.05) + eq_sal_wave

        s_deep = 34.7
        s_val = s_deep + (sal_surf - s_deep) * np.exp(- depth / 300.0)

        # 3. Horizontal Current Velocity (u, v in m/s)
        somali_jet_core = np.exp(- (((lon - 52.0) / 2.8) ** 2 + ((lat - 9.5) / 4.0) ** 2))
        somali_u = 1.2 * somali_jet_core * (1.0 + 0.25 * np.sin(t_phase))
        somali_v = 1.8 * somali_jet_core * (1.0 + 0.25 * np.sin(t_phase))

        eq_jet = 0.65 * np.exp(- (lat / 2.2) ** 2) * (1.0 + 0.3 * np.sin(t_phase - 0.8))
        eq_u = eq_jet
        eq_v = 0.08 * np.sin((lon - 60.0) * 0.1)

        bob_gyre_core = np.exp(- (((lon - 87.0) / 5.0) ** 2 + ((lat - 14.0) / 5.0) ** 2))
        bob_u = -0.45 * ((lat - 14.0) / 5.0) * bob_gyre_core
        bob_v = 0.45 * ((lon - 87.0) / 5.0) * bob_gyre_core

        background_u = 0.12 * np.cos(lat * 0.1)
        background_v = 0.05 * np.sin(lon * 0.08)

        u_total = somali_u + eq_u + bob_u + background_u
        v_total = somali_v + eq_v + bob_v + background_v

        v_decay = np.exp(- depth / 250.0)
        u_val = u_total * v_decay
        v_val = v_total * v_decay
        vel_mag = float(np.sqrt(u_val ** 2 + v_val ** 2))

        # 4. Sea Surface Height Anomaly (meters)
        ssh_val = (
            0.15 * np.sin((lon - 60.0) * 0.06 - t_phase) * np.cos(lat * 0.08)
            - 0.30 * somali_jet_core
            + 0.18 * warm_pool / 2.5
            - 0.12 * np.exp(- (((lon - 88.0) / 6.0) ** 2 + ((lat - 14.0) / 6.0) ** 2))
        )

        return {
            "temperature": round(float(t_val), 2),
            "salinity": round(float(s_val), 2),
            "velocity": round(vel_mag, 3),
            "velocity_u": round(float(u_val), 3),
            "velocity_v": round(float(v_val), 3),
            "ssh": round(float(ssh_val), 3)
        }

    def _get_synthetic_slice(self, variable: str, depth: int, time_step: int) -> Dict[str, Any]:
        """Generates synthetic slice using Phase 1 analytical formulation."""
        nx = settings.GRID_NX
        ny = settings.GRID_NY
        lons = np.linspace(settings.LON_MIN, settings.LON_MAX, nx)
        lats = np.linspace(settings.LAT_MIN, settings.LAT_MAX, ny)

        values_2d: List[List[Optional[float]]] = []
        vectors: List[Dict[str, float]] = []

        var_info = settings.VARIABLES.get(variable, settings.VARIABLES["temperature"])
        min_v = 9999.0
        max_v = -9999.0

        for j in range(ny):
            lat = float(lats[j])
            row: List[Optional[float]] = []
            for i in range(nx):
                lon = float(lons[i])
                is_land, _ = bathymetry_service._is_land(lon, lat)
                if is_land:
                    row.append(None)
                    continue

                physics = self._get_base_physics(lon, lat, float(depth), time_step)
                val = physics.get(variable, physics["temperature"])
                
                if val < min_v:
                    min_v = val
                if val > max_v:
                    max_v = val
                row.append(val)

                # Decimated vector grid for velocity arrows (sample every 4th grid point)
                if (i % 4 == 0) and (j % 3 == 0) and not is_land:
                    vectors.append({
                        "lon": round(lon, 2),
                        "lat": round(lat, 2),
                        "u": physics["velocity_u"],
                        "v": physics["velocity_v"],
                        "magnitude": physics["velocity"]
                    })
            values_2d.append(row)

        ts_info = settings.TIME_STEPS[min(time_step, len(settings.TIME_STEPS) - 1)]

        return {
            "variable": variable,
            "depth": depth,
            "time_step": time_step,
            "timestamp": ts_info["timestamp"],
            "units": var_info["units"],
            "min_val": round(min_v if min_v != 9999.0 else var_info["min"], 2),
            "max_val": round(max_v if max_v != -9999.0 else var_info["max"], 2),
            "lons": [round(float(x), 2) for x in lons],
            "lats": [round(float(y), 2) for y in lats],
            "values": values_2d,
            "vectors": vectors
        }

    def get_slice(self, variable: str, depth: int, time_step: int) -> Dict[str, Any]:
        """
        Extracts 2D horizontal slice of specified variable at given depth and time step.
        Prefers authentic HYCOM data for temperature, salinity, velocity, and SSH.
        Falls back cleanly to Phase 1 synthetic generator if HYCOM is unavailable.
        """
        if variable == "ssh":
            if self.is_using_real_ssh():
                real_ssh = ssh_netcdf_loader.get_slice(time_step)
                if real_ssh is not None:
                    print("[ModelService] Serving authentic HYCOM SSH")
                    return real_ssh
            print("[ModelService] Authentic HYCOM SSH unavailable; using synthetic fallback")
            return self._get_synthetic_slice("ssh", 0, time_step)

        if self.is_using_real_data():
            real_slice = ocean_model_netcdf_loader.get_slice(variable, float(depth), time_step)
            if real_slice is not None:
                print(f"[ModelService] Serving authentic HYCOM model data "
                      f"(variable={variable}, depth={real_slice['depth']}m, time_step={real_slice['time_step']})")
                return real_slice

        print("[ModelService] Authentic HYCOM unavailable; using synthetic fallback.")
        return self._get_synthetic_slice(variable, depth, time_step)

    def _get_synthetic_profile(self, lon: float, lat: float, variable: str, time_step: int = 0) -> List[Dict[str, float]]:
        depths = [0, 10, 20, 50, 75, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000]
        results = []
        for d in depths:
            physics = self._get_base_physics(lon, lat, float(d), time_step)
            results.append({
                "depth": float(d),
                "value": physics.get(variable, physics["temperature"])
            })
        return results

    def get_profile(self, lon: float, lat: float, variable: str, time_step: int = 0) -> List[Dict[str, float]]:
        """
        Extracts vertical water column profile at given geographic coordinate.
        Prefers authentic HYCOM data.
        """
        if variable != "ssh" and self.is_using_real_data():
            prof = ocean_model_netcdf_loader.get_profile(lon, lat, variable, time_step)
            if prof is not None and len(prof) > 0:
                return prof
        return self._get_synthetic_profile(lon, lat, variable, time_step)

model_service = ModelService()
