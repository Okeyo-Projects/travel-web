"use client";

import { useCallback, useEffect, useState } from "react";

export type GeoPermissionState =
  | "prompt"
  | "granted"
  | "denied"
  | "unavailable";

export interface UseGeoDistanceResult {
  permission: GeoPermissionState;
  isRequesting: boolean;
  currentLat: number | null;
  currentLng: number | null;
  error: string | null;
  requestPermission: () => void;
  getDistanceKm: (lat: number, lng: number) => number | null;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useGeoDistance(): UseGeoDistanceResult {
  const [permission, setPermission] = useState<GeoPermissionState>("prompt");
  const [isRequesting, setIsRequesting] = useState(false);
  const [position, setPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setPermission("unavailable");
      return;
    }

    if (!("permissions" in navigator)) {
      // Permissions API not supported; stay in prompt until user requests.
      return;
    }

    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        setPermission(status.state as GeoPermissionState);
        status.addEventListener("change", () => {
          setPermission(status.state as GeoPermissionState);
        });
      })
      .catch(() => {
        // Ignore; will be resolved when the user requests location.
      });
  }, []);

  const requestPermission = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setPermission("unavailable");
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setIsRequesting(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setPermission("granted");
        setIsRequesting(false);
      },
      (err) => {
        setIsRequesting(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermission("denied");
          setError("Location permission denied.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setPermission("unavailable");
          setError("Location information is unavailable.");
        } else {
          setPermission("unavailable");
          setError("Unable to retrieve your location.");
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  const getDistanceKm = useCallback(
    (lat: number, lng: number): number | null => {
      if (!position || permission !== "granted") return null;
      return haversineKm(position.lat, position.lng, lat, lng);
    },
    [position, permission],
  );

  return {
    permission,
    isRequesting,
    currentLat: position?.lat ?? null,
    currentLng: position?.lng ?? null,
    error,
    requestPermission,
    getDistanceKm,
  };
}
