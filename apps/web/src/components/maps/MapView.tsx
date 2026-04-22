'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface Driver {
  id: string;
  latitude: number;
  longitude: number;
  heading?: number;
}

interface MapViewProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  drivers?: Driver[];
  userLocation?: { lat: number; lng: number };
  driverLocation?: { lat: number; lng: number };
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
}

const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0A0A0F' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0A0F' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4A4A5A' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1A1A24' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#111118' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#24243A' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#06060D' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

let loader: Loader | null = null;
function getLoader() {
  if (!loader) {
    loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? '',
      version: 'weekly',
      libraries: ['places', 'geometry'],
    });
  }
  return loader;
}

export function MapView({
  center = { lat: 19.4326, lng: -99.1332 },
  zoom = 14,
  drivers = [],
  userLocation,
  driverLocation,
  origin,
  destination,
  onMapClick,
  className = 'w-full h-full',
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const driverMarkers = useRef<Map<string, google.maps.Marker>>(new Map());
  const userMarker = useRef<google.maps.Marker | null>(null);
  const driverTrackMarker = useRef<google.maps.Marker | null>(null);
  const routeRenderer = useRef<google.maps.DirectionsRenderer | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getLoader().load().then(() => {
      if (!mapRef.current || mapInstance.current) return;
      mapInstance.current = new google.maps.Map(mapRef.current, {
        center, zoom,
        styles: DARK_MAP_STYLE,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
        gestureHandling: 'greedy',
      });
      if (onMapClick) {
        mapInstance.current.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) onMapClick(e.latLng.lat(), e.latLng.lng());
        });
      }
      routeRenderer.current = new google.maps.DirectionsRenderer({
        map: mapInstance.current,
        suppressMarkers: true,
        polylineOptions: { strokeColor: '#6C63FF', strokeWeight: 4, strokeOpacity: 0.9 },
      });
      setLoaded(true);
    });
  }, []);

  // Update center
  useEffect(() => {
    if (mapInstance.current) mapInstance.current.setCenter(center);
  }, [center.lat, center.lng]);

  // User location marker
  useEffect(() => {
    if (!loaded || !mapInstance.current) return;
    const pos = userLocation || center;
    if (!userMarker.current) {
      userMarker.current = new google.maps.Marker({
        position: pos,
        map: mapInstance.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#6C63FF',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        zIndex: 100,
      });
    } else {
      userMarker.current.setPosition(pos);
    }
  }, [loaded, userLocation?.lat, userLocation?.lng]);

  // Driver tracking marker
  useEffect(() => {
    if (!loaded || !mapInstance.current || !driverLocation) return;
    if (!driverTrackMarker.current) {
      driverTrackMarker.current = new google.maps.Marker({
        position: driverLocation,
        map: mapInstance.current,
        icon: {
          path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
          fillColor: '#00D4AA',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 1.5,
          anchor: new google.maps.Point(12, 22),
        },
        zIndex: 200,
      });
    } else {
      driverTrackMarker.current.setPosition(driverLocation);
    }
    mapInstance.current.panTo(driverLocation);
  }, [loaded, driverLocation?.lat, driverLocation?.lng]);

  // Nearby driver markers
  useEffect(() => {
    if (!loaded || !mapInstance.current) return;

    const currentIds = new Set(drivers.map(d => d.id));

    // Remove stale markers
    driverMarkers.current.forEach((marker, id) => {
      if (!currentIds.has(id)) { marker.setMap(null); driverMarkers.current.delete(id); }
    });

    // Add/update markers
    drivers.forEach(d => {
      const pos = { lat: d.latitude, lng: d.longitude };
      if (driverMarkers.current.has(d.id)) {
        driverMarkers.current.get(d.id)!.setPosition(pos);
      } else {
        const marker = new google.maps.Marker({
          position: pos,
          map: mapInstance.current!,
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 5,
            fillColor: '#00D4AA',
            fillOpacity: 0.9,
            strokeColor: '#ffffff',
            strokeWeight: 1.5,
            rotation: d.heading ?? 0,
          },
        });
        driverMarkers.current.set(d.id, marker);
      }
    });
  }, [loaded, drivers]);

  // Show route
  useEffect(() => {
    if (!loaded || !routeRenderer.current || !origin || !destination) return;
    const directionsService = new google.maps.DirectionsService();
    directionsService.route({
      origin, destination,
      travelMode: google.maps.TravelMode.DRIVING,
    }, (result, status) => {
      if (status === 'OK' && result) routeRenderer.current!.setDirections(result);
    });
  }, [loaded, origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

  return (
    <div className={className} ref={mapRef}>
      {!loaded && (
        <div className="w-full h-full bg-[#0A0A0F] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[rgba(108,99,255,0.3)] border-t-[#6C63FF] rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
