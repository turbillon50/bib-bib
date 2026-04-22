import { Loader } from '@googlemaps/js-api-loader';
import { Coordinates } from '@/types';

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';

let loader: Loader | null = null;
let isLoaded = false;

export const getLoader = (): Loader => {
  if (!loader) {
    loader = new Loader({
      apiKey: GOOGLE_MAPS_KEY,
      version: 'weekly',
      libraries: ['places', 'geometry', 'routes'],
    });
  }
  return loader;
};

export const loadGoogleMaps = async (): Promise<typeof google> => {
  if (typeof window === 'undefined') throw new Error('Must run in browser');
  if (isLoaded && window.google) return window.google;

  await getLoader().load();
  isLoaded = true;
  return window.google;
};

// ─── Dark Map Style ───────────────────────────────────────────────────────────

export const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0A0A0F' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0A0F' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: 'rgba(255,255,255,0.4)' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: 'rgba(255,255,255,0.6)' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: 'rgba(255,255,255,0.3)' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#0F1A12' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#2A3D2A' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1A1A2E' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#111118' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: 'rgba(255,255,255,0.35)' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#22223A' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1A1A2E' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: 'rgba(255,255,255,0.5)' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#111118' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: 'rgba(255,255,255,0.4)' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#060612' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: 'rgba(255,255,255,0.2)' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#060612' }],
  },
];

// ─── Default Map Options ──────────────────────────────────────────────────────

export const DEFAULT_MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  clickableIcons: false,
  gestureHandling: 'greedy',
  styles: DARK_MAP_STYLE,
  zoomControl: false,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const calculateDistance = (a: Coordinates, b: Coordinates): number => {
  if (typeof window === 'undefined' || !window.google) return 0;

  const from = new google.maps.LatLng(a.lat, a.lng);
  const to = new google.maps.LatLng(b.lat, b.lng);
  return google.maps.geometry.spherical.computeDistanceBetween(from, to) / 1000; // km
};

export const geocodeAddress = async (address: string): Promise<Coordinates | null> => {
  await loadGoogleMaps();
  const geocoder = new google.maps.Geocoder();
  const result = await geocoder.geocode({ address });
  if (result.results.length === 0) return null;
  const loc = result.results[0].geometry.location;
  return { lat: loc.lat(), lng: loc.lng() };
};

export const getDirections = async (
  origin: Coordinates,
  destination: Coordinates,
): Promise<google.maps.DirectionsResult | null> => {
  await loadGoogleMaps();
  const service = new google.maps.DirectionsService();
  try {
    return await service.route({
      origin: new google.maps.LatLng(origin.lat, origin.lng),
      destination: new google.maps.LatLng(destination.lat, destination.lng),
      travelMode: google.maps.TravelMode.DRIVING,
    });
  } catch {
    return null;
  }
};

export const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};
