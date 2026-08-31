export interface MarkerItem {
  id: string;
  text: string;
  x_percent: number;
  y_percent: number;
  lat?: number;
  lng?: number;
  type: 'stall' | 'landmark' | 'bridge' | 'street';
  zone?: string;
  category?: string;
  description?: string;
  icon?: string;
  typicalProducts?: string[];
}

export interface AnchorItem {
  id: string;
  name: string;
  lat: number;
  lng: number;
  color: string;
  border: string;
  icon?: string;
}

export interface MarketDataset {
  image_file: string;
  width: number;
  height: number;
  anchors?: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
  }>;
  markers: Array<{
    text: string;
    x_percent: number;
    y_percent: number;
    lat?: number;
    lng?: number;
  }>;
}

export type ViewFilter = 'all' | 'stalls' | 'landmarks' | 'bridges';

export type MarkerOverlayStyle = 'ring' | 'solid' | 'glow' | 'minimal';

export type MapTileProvider = 'osm' | 'esri_street' | 'pdok_aerial' | 'pdok_brt' | 'esri_satellite' | 'osm_hot' | 'sketch';

export interface MapTransform {
  scale: number;
  x: number;
  y: number;
}
