"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { UserLocation } from "@/hooks/useUserLocation";
import { loadGoogleMapsLibrary } from "@/lib/google-maps";
import { NYC_BOUNDS } from "@/lib/location-suggestions";

const NYC_CENTER = { lat: 40.7831, lng: -73.9712 };
const INITIAL_ZOOM = 12;
const USER_ZOOM = 15;
const MIN_ACCURACY_METERS = 20;
const MAX_ACCURACY_METERS = 250;
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();

function isInsideNyc(location: UserLocation) {
  return location.latitude <= NYC_BOUNDS.north && location.latitude >= NYC_BOUNDS.south
    && location.longitude <= NYC_BOUNDS.east && location.longitude >= NYC_BOUNDS.west;
}

export function CityPilotMap({ route, userLocation }: { route?: google.maps.routes.Route; userLocation?: UserLocation | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(apiKey ? "loading" : "error");

  useEffect(() => {
    const container = containerRef.current;
    if (!apiKey || !container) return;

    let cancelled = false;
    let authenticationFailed = false;
    const mapsWindow = window as Window & { gm_authFailure?: () => void };
    const previousAuthFailure = mapsWindow.gm_authFailure;
    const handleAuthFailure = () => {
      authenticationFailed = true;
      if (!cancelled) setStatus("error");
      previousAuthFailure?.();
    };
    mapsWindow.gm_authFailure = handleAuthFailure;

    async function initializeMap() {
      try {
        const { Map } = await loadGoogleMapsLibrary("maps");
        if (cancelled || authenticationFailed) return;

        mapRef.current = new Map(container!, {
          center: NYC_CENTER,
          zoom: INITIAL_ZOOM,
          restriction: { latLngBounds: NYC_BOUNDS, strictBounds: true },
          gestureHandling: "cooperative",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          scaleControl: true,
          keyboardShortcuts: true,
        });
        if (!authenticationFailed) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }

    void initializeMap();

    return () => {
      cancelled = true;
      if (mapsWindow.gm_authFailure === handleAuthFailure) {
        mapsWindow.gm_authFailure = previousAuthFailure;
      }
      if (mapRef.current) {
        google.maps.event.clearInstanceListeners(mapRef.current);
        mapRef.current.unbindAll();
        mapRef.current = null;
      }
      container.replaceChildren();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !route) return;
    const polylines = route.createPolylines();
    polylines.forEach((line) => line.setMap(map));
    if (route.viewport) map.fitBounds(route.viewport, 50);
    const endpoints = [route.path?.[0], route.path?.at(-1)];
    const markers = endpoints.flatMap((point, index) => point ? [new google.maps.Circle({
      map, center: { lat: point.lat, lng: point.lng }, radius: 35,
      fillColor: index === 0 ? "#008044" : "#d52e29", fillOpacity: 1,
      strokeColor: "#fff", strokeWeight: 2,
    })] : []);
    return () => { polylines.forEach((line) => line.setMap(null)); markers.forEach((marker) => marker.setMap(null)); };
  }, [route, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !userLocation || !isInsideNyc(userLocation)) return;

    const center = { lat: userLocation.latitude, lng: userLocation.longitude };
    const accuracy = new google.maps.Circle({
      map,
      center,
      radius: Math.min(Math.max(userLocation.accuracy ?? MIN_ACCURACY_METERS, MIN_ACCURACY_METERS), MAX_ACCURACY_METERS),
      fillColor: "#0039a6",
      fillOpacity: 0.12,
      strokeColor: "#0039a6",
      strokeOpacity: 0.35,
      strokeWeight: 1,
      clickable: false,
    });
    const dot = new google.maps.Marker({
      map,
      position: center,
      title: "Your location",
      zIndex: 3,
      clickable: false,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#0039a6",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
    });

    if (!route) {
      map.panTo(center);
      map.setZoom(USER_ZOOM);
    }

    return () => {
      accuracy.setMap(null);
      dot.setMap(null);
    };
  }, [userLocation, route, status]);

  function resetView() {
    mapRef.current?.setCenter(NYC_CENTER);
    mapRef.current?.setZoom(INITIAL_ZOOM);
  }

  return (
    <section aria-labelledby="citypilot-map-title" aria-busy={status === "loading"} className="nextstop-map-shell relative h-[420px] overflow-hidden rounded-2xl border border-[#dfe2e4] bg-[#f1f3f4] lg:sticky lg:top-28 lg:h-[600px]">
      <h2 id="citypilot-map-title" className="sr-only">NextStop interactive map of New York City</h2>
      <div ref={containerRef} data-map-status={status} className="nextstop-map-canvas h-full w-full" />

      {status !== "ready" && (
        <div role={status === "error" ? "alert" : "status"} className="nextstop-map-status absolute inset-0 flex flex-col items-center justify-center bg-[#f1f3f4] px-6 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl border border-[#d8e0ec] bg-white text-[#0039a6] shadow-sm"><Icon name="pin" size={27} /></span>
          <p className="mt-5 text-xl font-semibold tracking-[-0.025em] text-[#252a2e]">{status === "error" ? "Map unavailable" : "Loading your map…"}</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-[#646c72]">{status === "error" ? "We couldn’t load Google Maps. Please try refreshing the page." : "Getting New York City ready to explore."}</p>
        </div>
      )}

      <div className="nextstop-map-controls pointer-events-none absolute left-4 top-4 flex flex-col items-start gap-2">
        <span className="rounded-full border border-[#e0e3e5] bg-white/95 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#6b7278] shadow-sm">NextStop map</span>
        {status === "ready" && userLocation && isInsideNyc(userLocation) && (
          <span role="status" className="rounded-full border border-[#c5d4ee] bg-white/95 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#0039a6] shadow-sm">You are here</span>
        )}
        {status === "ready" && userLocation && !isInsideNyc(userLocation) && (
          <span className="max-w-44 rounded-full border border-[#e0e3e5] bg-white/95 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#6b7278] shadow-sm">Outside the map</span>
        )}
        {status === "ready" && (
          <button type="button" onClick={resetView} className="nextstop-reset-button pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#e0e3e5] bg-white px-3 text-xs font-semibold text-[#0039a6] shadow-sm">
            <Icon name="pin" size={16} /> Reset view
          </button>
        )}
      </div>
    </section>
  );
}
