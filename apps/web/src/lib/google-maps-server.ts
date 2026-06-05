/**
 * Server-side Google Maps helpers.
 * The API key NEVER reaches the client: all calls go through API routes.
 * Requires GOOGLE_MAPS_API_KEY env var (server-only, no NEXT_PUBLIC_ prefix).
 */

const BASE = 'https://maps.googleapis.com/maps/api';

export function getMapsKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new MapsKeyMissingError();
  return key;
}

export class MapsKeyMissingError extends Error {
  constructor() {
    super('GOOGLE_MAPS_API_KEY is not set');
    this.name = 'MapsKeyMissingError';
  }
}

async function gFetch(path: string, params: Record<string, string>) {
  const key = getMapsKey();
  const qs = new URLSearchParams({ ...params, key });
  const res = await fetch(`${BASE}${path}?${qs.toString()}`, {
    // Avoid Next.js fetch caching of dynamic geo data
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`Google Maps API HTTP ${res.status}`);
  }
  return res.json();
}

export async function geocodeAddress(address: string, region = 'mx') {
  const data = await gFetch('/geocode/json', { address, region, language: 'es' });
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Geocoding failed: ${data.status} ${data.error_message ?? ''}`);
  }
  return (data.results ?? []).map((r: any) => ({
    formattedAddress: r.formatted_address,
    placeId: r.place_id,
    location: r.geometry?.location, // { lat, lng }
    types: r.types,
  }));
}

export async function reverseGeocode(lat: number, lng: number) {
  const data = await gFetch('/geocode/json', { latlng: `${lat},${lng}`, language: 'es' });
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Reverse geocoding failed: ${data.status} ${data.error_message ?? ''}`);
  }
  return (data.results ?? []).slice(0, 5).map((r: any) => ({
    formattedAddress: r.formatted_address,
    placeId: r.place_id,
    location: r.geometry?.location,
    types: r.types,
  }));
}

export async function getDirections(
  origin: string,
  destination: string,
  mode: string = 'driving'
) {
  const data = await gFetch('/directions/json', {
    origin,
    destination,
    mode,
    language: 'es',
    region: 'mx',
  });
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Directions failed: ${data.status} ${data.error_message ?? ''}`);
  }
  const route = data.routes?.[0];
  const leg = route?.legs?.[0];
  if (!route || !leg) return null;
  return {
    summary: route.summary,
    distanceMeters: leg.distance?.value ?? null,
    distanceText: leg.distance?.text ?? null,
    durationSeconds: leg.duration?.value ?? null,
    durationText: leg.duration?.text ?? null,
    startAddress: leg.start_address,
    endAddress: leg.end_address,
    polyline: route.overview_polyline?.points ?? null,
    bounds: route.bounds ?? null,
  };
}

export async function getDistanceMatrix(
  origins: string,
  destinations: string,
  mode: string = 'driving'
) {
  const data = await gFetch('/distancematrix/json', {
    origins,
    destinations,
    mode,
    language: 'es',
    region: 'mx',
  });
  if (data.status !== 'OK') {
    throw new Error(`Distance matrix failed: ${data.status} ${data.error_message ?? ''}`);
  }
  return {
    origins: data.origin_addresses,
    destinations: data.destination_addresses,
    rows: (data.rows ?? []).map((row: any) => ({
      elements: (row.elements ?? []).map((el: any) => ({
        status: el.status,
        distanceMeters: el.distance?.value ?? null,
        distanceText: el.distance?.text ?? null,
        durationSeconds: el.duration?.value ?? null,
        durationText: el.duration?.text ?? null,
      })),
    })),
  };
}

export function mapsErrorResponse(err: unknown): { body: any; status: number } {
  if (err instanceof MapsKeyMissingError) {
    return {
      body: {
        error: 'Falta la variable de entorno GOOGLE_MAPS_API_KEY en Vercel (server-side).',
        missingEnv: 'GOOGLE_MAPS_API_KEY',
      },
      status: 503,
    };
  }
  return {
    body: { error: err instanceof Error ? err.message : 'Error interno' },
    status: 500,
  };
}
