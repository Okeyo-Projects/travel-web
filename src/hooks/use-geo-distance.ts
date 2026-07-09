"use client";

import { useCallback, useEffect, useState } from "react";
import { useOptionalChatContext } from "@/contexts/ChatContext";

export type GeoPermissionState =
  | "prompt"
  | "granted"
  | "denied"
  | "unavailable";

export type GeoLocationErrorReason =
  | "unsupported"
  | "permissionDenied"
  | "unavailable"
  | "timeout";

export interface UseGeoDistanceResult {
  permission: GeoPermissionState;
  isRequesting: boolean;
  currentLat: number | null;
  currentLng: number | null;
  error: string | null;
  errorReason: GeoLocationErrorReason | null;
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
  const chatContext = useOptionalChatContext();
  const [permission, setPermission] = useState<GeoPermissionState>("prompt");
  const [isRequesting, setIsRequesting] = useState(false);
  const [position, setPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorReason, setErrorReason] = useState<GeoLocationErrorReason | null>(
    null,
  );
  const sharedPosition = chatContext?.userLocation ?? null;
  const effectivePosition = sharedPosition ?? position;

  useEffect(() => {
    if (sharedPosition) {
      setPermission("granted");
      return;
    }

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
        setPermission(
          sharedPosition ? "granted" : (status.state as GeoPermissionState),
        );
        status.addEventListener("change", () => {
          setPermission(
            sharedPosition ? "granted" : (status.state as GeoPermissionState),
          );
        });
      })
      .catch(() => {
        // Ignore; will be resolved when the user requests location.
      });
  }, [sharedPosition]);

  const requestPermission = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setPermission("unavailable");
      setErrorReason("unsupported");
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setIsRequesting(true);
    setError(null);
    setErrorReason(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        chatContext?.setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timestamp: Date.now(),
        });
        setPermission("granted");
        setErrorReason(null);
        setError(null);
        setIsRequesting(false);
      },
      (err) => {
        setIsRequesting(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermission("denied");
          setErrorReason("permissionDenied");
          setError("Location permission denied.");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setPermission("unavailable");
          setErrorReason("unavailable");
          setError("Location information is unavailable.");
        } else if (err.code === err.TIMEOUT) {
          setPermission("unavailable");
          setErrorReason("timeout");
          setError("The location request timed out.");
        } else {
          setPermission("unavailable");
          setErrorReason("unavailable");
          setError("Unable to retrieve your location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }, [chatContext]);

  const getDistanceKm = useCallback(
    (lat: number, lng: number): number | null => {
      if (!effectivePosition || permission !== "granted") return null;
      return haversineKm(
        effectivePosition.lat,
        effectivePosition.lng,
        lat,
        lng,
      );
    },
    [effectivePosition, permission],
  );

  return {
    permission,
    isRequesting,
    currentLat: effectivePosition?.lat ?? null,
    currentLng: effectivePosition?.lng ?? null,
    error,
    errorReason,
    requestPermission,
    getDistanceKm,
  };
}
