# Real Argo Profiling Float NetCDF Storage

Place authentic Indian Ocean Argo profile NetCDF files (`.nc`) in this directory.

### Supported Formats:
- Multi-profile NetCDF files: `<WMO>_prof.nc` (e.g. `2903741_prof.nc`, `2902088_prof.nc`)
- Single cycle NetCDF files: `D<WMO>_<CYCLE>.nc` or `R<WMO>_<CYCLE>.nc`

### Target Sources for Indian Ocean Floats:
- **INCOIS Argo DAC**: `https://incois.gov.in/OOS/argo.jsp`
- **Coriolis GDAC**: `https://data-argo.ifremer.fr/dac/incois/`
- **US-AOML GDAC**: `https://www.usgodae.org/pub/outgoing/argo/dac/`

### Expected NetCDF Variables:
- Platform / Cycle: `PLATFORM_NUMBER`, `CYCLE_NUMBER`, `PLATFORM_TYPE` (or `WMO_INST_TYPE`)
- Geolocation / Time: `LATITUDE`, `LONGITUDE`, `JULD` (epoch: 1950-01-01 00:00:00 UTC)
- Measurements: `PRES` (dbar), `TEMP` (°C), `PSAL` (PSU) (or `_ADJUSTED` equivalents)
- Quality Control: `PRES_QC`, `TEMP_QC`, `PSAL_QC` (per-measurement flags; only flags `'1'` and `'2'` accepted)

When valid files are placed here, the platform automatically detects and ingests them at startup.
If this directory is empty, the platform seamlessly defaults to the Phase 1 verified synthetic Indian Ocean float fleet.
