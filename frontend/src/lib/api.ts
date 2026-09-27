import type { Place, Trip, UserProfile } from "./types";

function apiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiUrl()}${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${path}`);
  }
  return response.json() as Promise<T>;
}

export function getPlaces(): Promise<Place[]> {
  return getJson<Place[]>("/api/discover");
}

export function getTrips(): Promise<Trip[]> {
  return getJson<Trip[]>("/api/trips");
}

export function getProfile(): Promise<UserProfile> {
  return getJson<UserProfile>("/api/users/me");
}
