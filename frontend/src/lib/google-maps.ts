import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

let configured = false;
let runtimeKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

export function setGoogleMapsKey(key: string | undefined) {
  const next = key?.trim() ?? "";
  if (next) runtimeKey = next;
}

export function loadGoogleMapsLibrary<T extends keyof google.maps.ImportLibraryMap>(library: T) {
  const key = runtimeKey;
  if (!key) throw new Error("Google Maps key is not configured.");
  if (!configured) {
    setOptions({ key, v: "weekly" });
    configured = true;
  }
  return importLibrary(library);
}
