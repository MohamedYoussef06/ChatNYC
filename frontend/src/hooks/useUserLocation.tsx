"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type UserLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: number;
};

export type UserLocationStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable" | "error";

export type UserLocationError = {
  code: "permission-denied" | "position-unavailable" | "timeout" | "unsupported" | "unknown";
  message: string;
};

function geolocationError(error: GeolocationPositionError): { status: UserLocationStatus; error: UserLocationError } {
  if (error.code === error.PERMISSION_DENIED) {
    return {
      status: "denied",
      error: { code: "permission-denied", message: "Location access was denied. You can still enter a starting point." },
    };
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return {
      status: "unavailable",
      error: { code: "position-unavailable", message: "Your location is unavailable right now. Enter a starting point instead." },
    };
  }
  if (error.code === error.TIMEOUT) {
    return {
      status: "error",
      error: { code: "timeout", message: "Finding your location took too long. Try again or enter a starting point." },
    };
  }
  return {
    status: "error",
    error: { code: "unknown", message: "We couldn’t get your location. Try again or enter a starting point." },
  };
}

type UserLocationContextValue = {
  location: UserLocation | null;
  status: UserLocationStatus;
  error: UserLocationError | null;
  requestLocation: () => Promise<UserLocation | null>;
  resetLocation: () => void;
};

const UserLocationContext = createContext<UserLocationContextValue | null>(null);

export function UserLocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<UserLocationStatus>("idle");
  const [error, setError] = useState<UserLocationError | null>(null);
  const mountedRef = useRef(true);
  const requestRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
    };
  }, []);

  const resetLocation = useCallback(() => {
    requestRef.current += 1;
    setLocation(null);
    setStatus("idle");
    setError(null);
  }, []);

  const requestLocation = useCallback((): Promise<UserLocation | null> => {
    const request = ++requestRef.current;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      const nextError: UserLocationError = {
        code: "unsupported",
        message: "This browser doesn’t support location access. Enter a starting point instead.",
      };
      if (mountedRef.current) {
        setStatus("unavailable");
        setError(nextError);
      }
      return Promise.resolve(null);
    }

    setStatus("requesting");
    setError(null);

    return new Promise((resolve) => {
      try {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const nextLocation: UserLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : null,
              capturedAt: position.timestamp || Date.now(),
            };
            const isCurrent = mountedRef.current && request === requestRef.current;
            if (isCurrent) {
              setLocation(nextLocation);
              setStatus("granted");
              setError(null);
            }
            resolve(isCurrent ? nextLocation : null);
          },
          (positionError) => {
            const failure = geolocationError(positionError);
            if (mountedRef.current && request === requestRef.current) {
              setStatus(failure.status);
              setError(failure.error);
            }
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
        );
      } catch {
        if (mountedRef.current && request === requestRef.current) {
          setStatus("error");
          setError({ code: "unknown", message: "Location access requires a secure browser context. Enter a starting point instead." });
        }
        resolve(null);
      }
    });
  }, []);

  const value = useMemo(() => ({ location, status, error, requestLocation, resetLocation }), [location, status, error, requestLocation, resetLocation]);
  return <UserLocationContext.Provider value={value}>{children}</UserLocationContext.Provider>;
}

export function useUserLocation() {
  const context = useContext(UserLocationContext);
  if (!context) throw new Error("useUserLocation must be used within UserLocationProvider");
  return context;
}
