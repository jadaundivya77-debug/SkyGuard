export interface RegionPreset {
  id: string;
  name: string;
  description: string;
  bbox: [number, number, number, number]; // [min_lat, min_lon, max_lat, max_lon]
  center: [number, number];
  zoom: number;
}

export const REGION_PRESETS: RegionPreset[] = [
  {
    id: "california",
    name: "California & US West",
    description: "High wildfire activity zone, complex mountain/chaparral terrain",
    bbox: [32.5, -124.5, 42.0, -114.0],
    center: [37.2, -119.5],
    zoom: 6,
  },
  {
    id: "mediterranean",
    name: "Mediterranean / Greece",
    description: "Southern Europe fire corridor, heatwave prone",
    bbox: [35.0, 19.0, 42.0, 28.0],
    center: [38.5, 23.5],
    zoom: 6,
  },
  {
    id: "amazon",
    name: "Amazon Basin / Brazil",
    description: "Tropical deforestation and agricultural burn frontline",
    bbox: [-15.0, -60.0, -5.0, -48.0],
    center: [-10.0, -54.0],
    zoom: 6,
  },
  {
    id: "australia",
    name: "Southeast Australia",
    description: "Eucalyptus bushfire corridor, NSW & Victoria",
    bbox: [-38.5, 142.0, -32.0, 151.0],
    center: [-35.5, 146.5],
    zoom: 6,
  },
  {
    id: "global_demo",
    name: "Global Sample Hotspots",
    description: "Bundled multi-region verified sample detections",
    bbox: [-40.0, -125.0, 45.0, 155.0],
    center: [20.0, 0.0],
    zoom: 2,
  },
];

export const SENSOR_OPTIONS = [
  { code: "VIIRS_NOAA20_NRT", label: "VIIRS (NOAA-20 NRT — 375m)", resolution: "375m" },
  { code: "VIIRS_SNPP_NRT", label: "VIIRS (Suomi-NPP NRT — 375m)", resolution: "375m" },
  { code: "VIIRS_NOAA21_NRT", label: "VIIRS (NOAA-21 NRT — 375m)", resolution: "375m" },
  { code: "MODIS_NRT", label: "MODIS (Terra & Aqua NRT — 1km)", resolution: "1km" },
];

export const MAP_BASEMAPS = [
 
{
  id: "dark",
  name: "OpenStreetMap",
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
},

  {
    id: "satellite",
    name: "Esri Satellite Imagery",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  },
  {
    id: "osm",
    name: "OpenStreetMap Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
];
