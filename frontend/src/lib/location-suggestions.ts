export type Coordinates = { lat: number; lng: number };
export const COLUMBIA_LOCATION: Coordinates = { lat: 40.8075, lng: -73.9626 };
export const NYC_CENTER: Coordinates = { lat: 40.7549, lng: -73.984 };
export const NYC_BOUNDS = { north: 40.9176, south: 40.4774, east: -73.7004, west: -74.2591 };
export const MAX_SUGGESTIONS = 5;

export type LocationSuggestion = {
  id: string;
  name: string;
  address: string;
  label: string;
  distanceMeters?: number;
  isInCity: boolean;
  prediction?: google.maps.places.PlacePrediction;
  place?: google.maps.places.Place;
};

export type SelectedLocation = { label: string; location: Coordinates };

export function locationSearchErrorMessage(error: unknown): string {
  const message = error && typeof error === "object" && "message" in error ? String(error.message) : "";
  if (/places.*(?:disabled|not been used)|SERVICE_DISABLED/i.test(message)) {
    return "Google Places search isn’t enabled for this app yet.";
  }
  if (/billing/i.test(message)) return "Google location search is unavailable because the app’s billing needs attention.";
  if (/referer|referrer|API_KEY_SERVICE_BLOCKED|REQUEST_DENIED|PERMISSION_DENIED|not authorized/i.test(message)
    || (error && typeof error === "object" && "code" in error && error.code === 7)) {
    return "Google denied this app access to location search.";
  }
  if (/quota|RESOURCE_EXHAUSTED/i.test(message)) return "Google location search has reached its usage limit. Try again later.";
  if (/key is not configured/i.test(message)) return "Google location search hasn’t been configured for this app yet.";
  return "Google location search is unavailable right now. Try again shortly.";
}

export function googleMapsSearchUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${normalizeLocationQuery(query)}, New York City`)}`;
}

// Google understands standard street names better than shorthand like "W7".
export function normalizeLocationQuery(value: string) {
  return value.trim().replace(/\b([NSEW])\s*\.?\s*(?=\d)/gi, (_, direction: string) =>
    `${({ n: "North", s: "South", e: "East", w: "West" } as Record<string, string>)[direction.toLowerCase()]} `,
  ).replace(/\s+/g, " ");
}

function addressPrefix(value: string) {
  return normalizeLocationQuery(value).toLowerCase()
    .replace(/(\d+)(st|nd|rd|th)\b/g, "$1")
    .replace(/\b(north|south|east|west)\b/g, (direction) => direction[0])
    .replace(/\bstreet\b/g, "st").replace(/\bavenue\b/g, "ave")
    .replace(/[.,]/g, "").replace(/\s+/g, " ");
}

export function isCityAddress(address: string) {
  return /\b(?:New York|Manhattan|Brooklyn|Queens|Bronx|Staten Island)\b.*\b(?:NY|New York)\b/i.test(address);
}

export function distanceBetween(a: Coordinates, b: Coordinates) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitude = radians(b.lat - a.lat);
  const longitude = radians(b.lng - a.lng);
  const h = Math.sin(latitude / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(longitude / 2) ** 2;
  return 6_371_000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function rankSuggestions(candidates: LocationSuggestion[], query: string) {
  const unique = new Map<string, LocationSuggestion>();
  for (const candidate of candidates) {
    const existing = unique.get(candidate.id);
    // Keep the autocomplete prediction's session while adding full search details.
    unique.set(candidate.id, existing ? { ...existing, ...candidate, prediction: existing.prediction ?? candidate.prediction } : candidate);
  }
  return [...unique.values()]
    .filter((candidate) => !/^\d/.test(query.trim()) || addressPrefix(candidate.label).startsWith(addressPrefix(query)))
    .sort((a, b) => Number(b.isInCity) - Number(a.isInCity)
      || (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity))
    .slice(0, MAX_SUGGESTIONS);
}

export async function searchLocations(
  library: google.maps.PlacesLibrary,
  query: string,
  origin: Coordinates,
  sessionToken: google.maps.places.AutocompleteSessionToken,
  isCurrent: () => boolean = () => true,
): Promise<LocationSuggestion[]> {
  const input = normalizeLocationQuery(query);
  const autocomplete = library.AutocompleteSuggestion.fetchAutocompleteSuggestions({
    input, origin, sessionToken, locationBias: NYC_BOUNDS,
    includedRegionCodes: ["us"], language: "en-US", region: "us",
  });
  // Text Search expands category and chain queries beyond autocomplete's few predictions.
  const businesses = /^\d/.test(input) ? Promise.resolve({ places: [] }) : library.Place.searchByText({
    textQuery: input,
    fields: ["id", "displayName", "formattedAddress", "location", "addressComponents"],
    locationBias: { center: origin, radius: 30_000 },
    rankPreference: library.SearchByTextRankPreference.DISTANCE,
    maxResultCount: 20, language: "en-US", region: "us",
  });
  const [predictions, matches] = await Promise.allSettled([autocomplete, businesses]);
  if (!isCurrent()) return [];
  if (predictions.status === "rejected" && (matches.status === "rejected" || matches.value.places.length === 0)) {
    // Preserve Google's RPC error so disabled APIs, key restrictions, and quota
    // failures can be distinguished without rendering raw credentials or URLs.
    throw predictions.reason;
  }
  const candidates: LocationSuggestion[] = [];
  if (predictions.status === "fulfilled") {
    for (const suggestion of predictions.value.suggestions) {
      const prediction = suggestion.placePrediction;
      if (!prediction) continue;
      const label = prediction.text.toString();
      const name = prediction.mainText?.toString() ?? label;
      const secondary = prediction.secondaryText?.toString() ?? "";
      candidates.push({
        id: prediction.placeId, name, label,
        address: /^\d/.test(name) ? label : secondary,
        distanceMeters: prediction.distanceMeters ?? undefined,
        isInCity: isCityAddress(label), prediction,
      });
    }
  }
  if (matches.status === "fulfilled") {
    for (const place of matches.value.places) {
      if (!place.location || !place.formattedAddress) continue;
      const name = place.displayName ?? place.formattedAddress;
      // Queens neighborhoods may be formatted as "Flushing, NY"; the county identifies NYC.
      const isInCity = isCityAddress(place.formattedAddress) || Boolean(place.addressComponents?.some((component) =>
        component.types.includes("administrative_area_level_2") && /^(New York|Kings|Queens|Bronx|Richmond)( County)?$/.test(component.longText ?? ""),
      ));
      candidates.push({
        id: place.id, name, address: place.formattedAddress,
        label: `${name}, ${place.formattedAddress}`, place, isInCity,
        distanceMeters: distanceBetween(origin, place.location.toJSON()),
      });
    }
  }
  const ranked = rankSuggestions(candidates, input);
  // Autocomplete's secondary text can omit the ZIP or street. Only enrich the
  // five visible candidates; text-search results already contain full addresses.
  return Promise.all(ranked.map(async (candidate) => {
    if (candidate.place) return candidate;
    try {
      // Keep these preview details separate from the selection's billing session.
      const preview = new library.Place({ id: candidate.id });
      await preview.fetchFields({ fields: ["formattedAddress"] });
      return { ...candidate, address: preview.formattedAddress ?? candidate.address };
    } catch {
      return candidate;
    }
  }));
}

export async function resolveLocation(suggestion: LocationSuggestion): Promise<SelectedLocation> {
  const place = suggestion.prediction?.toPlace() ?? suggestion.place;
  if (!place) throw new Error("Location details are unavailable.");
  if (suggestion.prediction || !place.location) {
    await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });
  }
  if (!place.location) throw new Error("Location coordinates are unavailable.");
  const address = place.formattedAddress ?? suggestion.address;
  const name = place.displayName ?? suggestion.name;
  return {
    label: address.startsWith(name) ? address : `${name}, ${address}`,
    location: place.location.toJSON(),
  };
}
