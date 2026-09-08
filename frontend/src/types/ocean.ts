export type OceanVariable = 'temperature' | 'salinity' | 'velocity' | 'ssh';

export type ColormapType = 'turbo' | 'viridis' | 'thermal' | 'haline' | 'coolwarm';

export interface GridMeta {
  lon_min: number;
  lon_max: number;
  lat_min: number;
  lat_max: number;
  nx: number;
  ny: number;
  depth_levels: number[];
  time_steps: Array<{ index: number; timestamp: string; label: string }>;
  variables: Record<string, {
    name: string;
    short_name: string;
    units: string;
    min: number;
    max: number;
    default_colormap: ColormapType;
    description: string;
  }>;
}

export interface VectorSample {
  lon: number;
  lat: number;
  u: number;
  v: number;
  magnitude: number;
}

export interface ModelSliceData {
  variable: OceanVariable;
  depth: number;
  time_step: number;
  timestamp: string;
  units: string;
  min_val: number;
  max_val: number;
  lons: number[];
  lats: number[];
  values: (number | null)[][];
  vectors?: VectorSample[];
}

export interface ProfileRecord {
  depth: number;
  temperature: number;
  salinity: number;
  qc: number;
}

export interface ArgoFloat {
  id: string;
  wmo: string;
  platform_type: string;
  lon: number;
  lat: number;
  status: 'profiling' | 'surface' | 'descending';
  cycle: number;
  last_update: string;
  max_depth: number;
}

export interface ArgoProfile {
  id: string;
  wmo: string;
  lon: number;
  lat: number;
  cycle: number;
  timestamp: string;
  records: ProfileRecord[];
}

export interface GliderWaypoint {
  lon: number;
  lat: number;
  depth: number;
  timestamp: string;
}

export interface GliderMission {
  id: string;
  name: string;
  model: string;
  status: string;
  waypoints: GliderWaypoint[];
}

export interface BathymetryGrid {
  lon_min: number;
  lon_max: number;
  lat_min: number;
  lat_max: number;
  nx: number;
  ny: number;
  lons: number[];
  lats: number[];
  elevations: number[][];
  min_elevation: number;
  max_elevation: number;
}

export interface ComparisonProfilePoint {
  depth: number;
  model_value: number;
  obs_value: number;
  bias: number;
  error?: number;
  model_depth?: number;
}

export interface TemporalMatchInfo {
  argo_time: string;
  model_time: string;
  difference_hours: number;
  status: 'NEAR_SYNOPTIC' | 'TEMPORALLY_MISMATCHED';
}

export interface ComparisonData {
  float_id: string;
  wmo: string;
  cycle?: number;
  lon: number;
  lat: number;
  variable: string;
  units: string;
  timestamp: string;
  model_timestamp?: string;
  time_difference_hours?: number;
  temporal_match?: TemporalMatchInfo;
  rmse: number;
  mae: number;
  mean_bias: number;
  points: ComparisonProfilePoint[];
  model_name?: string;
  observation_name?: string;
  model_lon?: number;
  model_lat?: number;
  horizontal_separation_km?: number;
  vertical_collocation_method?: string;
  qc_flags_accepted?: string;
  valid_depth_range?: string;
  n_levels?: number;
}

export interface LayerVisibilityState {
  bathymetry: boolean;
  modelSlice: boolean;
  currentVectors: boolean;
  argoFloats: boolean;
  gliders: boolean;
  wireframe: boolean;
}

export interface CursorCoordinate {
  lon: number;
  lat: number;
  depth: number;
  val?: number | null;
}

export interface DataProvenance {
  hycom: {
    is_authentic: boolean;
    name: string;
    product: string;
    source: string;
    spatial_coverage: string;
    depth_coverage: string;
    temporal_coverage: string;
    variables: string[];
  };
  gebco: {
    is_authentic: boolean;
    name: string;
    product: string;
    source: string;
    spatial_coverage: string;
    vertical_range: string;
    qc: string;
  };
  argo: {
    is_authentic: boolean;
    name: string;
    platform_wmo: string;
    source: string;
    cycles_available: number;
    target_cycle: number;
    observation_time: string;
    location: string;
    depth_range: string;
    qc_levels: number;
    qc_flags: string;
  };
}
