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

// Estilo DOPAMINA — Bib-Bib naranja/vino, calles brillantes
const BIB_BIB_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a0800' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a0800' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#f4a100' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d1000' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#3d1500' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#6b2200' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#e85d04' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#3d1500' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d0500' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#e85d04' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#6b1a1a' }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#f4a100' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#f4a100' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#1a0800' }] },
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
  center = { lat: 21.1619, lng: -86.8515 }, // Cancun por defecto
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
        styles: BIB_BIB_MAP_STYLE,
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
        polylineOptions: { strokeColor: '#e85d04', strokeWeight: 5, strokeOpacity: 0.95 },
      });
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (mapInstance.current) mapInstance.current.setCenter(center);
  }, [center.lat, center.lng]);

  // Marcador usuario — punto naranja brillante
  useEffect(() => {
    if (!loaded || !mapInstance.current) return;
    const pos = userLocation || center;
    if (!userMarker.current) {
      userMarker.current = new google.maps.Marker({
        position: pos,
        map: mapInstance.current,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: '#e85d04',
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

  // Marcador repartidor activo — flecha naranja
  useEffect(() => {
    if (!loaded || !mapInstance.current || !driverLocation) return;
    if (!driverTrackMarker.current) {
      driverTrackMarker.current = new google.maps.Marker({
        position: driverLocation,
        map: mapInstance.current,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 7,
          fillColor: '#f4a100',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          rotation: 0,
        },
        zIndex: 200,
      });
    } else {
      driverTrackMarker.current.setPosition(driverLocation);
    }
    mapInstance.current.panTo(driverLocation);
  }, [loaded, driverLocation?.lat, driverLocation?.lng]);

  // Repartidores cercanos — flechas pequeñas naranja
  useEffect(() => {
    if (!loaded || !mapInstance.current) return;
    const currentIds = new Set(drivers.map(d => d.id));
    driverMarkers.current.forEach((marker, id) => {
      if (!currentIds.has(id)) { marker.setMap(null); driverMarkers.current.delete(id); }
    });
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
            fillColor: '#e85d04',
            fillOpacity: 0.95,
            strokeColor: '#f4a100',
            strokeWeight: 1.5,
            rotation: d.heading ?? 0,
          },
        });
        driverMarkers.current.set(d.id, marker);
      }
    });
  }, [loaded, drivers]);

  // Ruta entre origen y destino
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
        <div className="w-full h-full bg-[#1a0800] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-[rgba(232,93,4,0.3)] border-t-[#e85d04] rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
