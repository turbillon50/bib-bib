'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Coordinates } from '@/types';

interface GeolocationState {
  coords: Coordinates | null;
  accuracy: number | null;
  error: string | null;
  isLoading: boolean;
  hasPermission: boolean | null;
}

interface UseGeolocationOptions {
  watch?: boolean;
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  onUpdate?: (coords: Coordinates) => void;
}

export const useGeolocation = (options: UseGeolocationOptions = {}): GeolocationState & {
  requestPermission: () => void;
  stopWatching: () => void;
} => {
  const {
    watch = false,
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 5000,
    onUpdate,
  } = options;

  const [state, setState] = useState<GeolocationState>({
    coords: null,
    accuracy: null,
    error: null,
    isLoading: false,
    hasPermission: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const geoOptions: PositionOptions = {
    enableHighAccuracy,
    timeout,
    maximumAge,
  };

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const coords: Coordinates = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
    setState((prev) => ({
      ...prev,
      coords,
      accuracy: position.coords.accuracy,
      error: null,
      isLoading: false,
      hasPermission: true,
    }));
    onUpdateRef.current?.(coords);
  }, []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    let message = 'Location unavailable';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = 'Location permission denied';
        break;
      case error.POSITION_UNAVAILABLE:
        message = 'Location information unavailable';
        break;
      case error.TIMEOUT:
        message = 'Location request timed out';
        break;
    }
    setState((prev) => ({
      ...prev,
      error: message,
      isLoading: false,
      hasPermission: error.code === error.PERMISSION_DENIED ? false : prev.hasPermission,
    }));
  }, []);

  const requestPermission = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'Geolocation not supported',
        isLoading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    if (watch) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        geoOptions,
      );
    } else {
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, geoOptions);
    }
  }, [watch, handleSuccess, handleError, geoOptions]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Check existing permission
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          if (result.state === 'granted') {
            setState((prev) => ({ ...prev, hasPermission: true }));
            requestPermission();
          } else if (result.state === 'denied') {
            setState((prev) => ({ ...prev, hasPermission: false }));
          }
        })
        .catch(() => {
          // Permissions API not available, try directly
          requestPermission();
        });
    }

    return () => stopWatching();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { ...state, requestPermission, stopWatching };
};
