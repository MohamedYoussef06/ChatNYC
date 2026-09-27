import assert from "node:assert/strict";
import test from "node:test";
import { googleMapsSearchUrl, locationSearchErrorMessage, normalizeLocationQuery, rankSuggestions, searchLocations, resolveLocation, distanceBetween, COLUMBIA_LOCATION, NYC_BOUNDS } from "../src/lib/location-suggestions.ts";

const candidate = (id, distanceMeters, isInCity = true) => ({ id, name: "Shake Shack", address: "New York, NY", label: "Shake Shack, New York, NY", distanceMeters, isInCity });
const prediction = (id, name, address, distanceMeters = 100) => ({
  placeId: id, mainText: name, secondaryText: address, text: `${name}, ${address}`, distanceMeters,
});

function fakePlaces({ predictions = [], places = [], failAutocomplete = false, failSearch = false } = {}) {
  const calls = { autocomplete: [], searches: [], previews: [] };
  class Place {
    constructor({ id }) { this.id = id; }
    async fetchFields(request) {
      calls.previews.push({ id: this.id, ...request });
      this.formattedAddress = "1745 W 7th St, Brooklyn, NY 11223, USA";
    }
    static async searchByText(request) {
      calls.searches.push(request);
      if (failSearch) throw new Error("Search denied");
      return { places };
    }
  }
  return { calls, library: {
    Place, SearchByTextRankPreference: { DISTANCE: "DISTANCE" },
    AutocompleteSuggestion: { async fetchAutocompleteSuggestions(request) {
      calls.autocomplete.push(request);
      if (failAutocomplete) throw new Error("Autocomplete denied");
      return { suggestions: predictions.map((placePrediction) => ({ placePrediction })) };
    } },
  } };
}

test("expands compact directional addresses, leaving business names intact", () => {
  assert.equal(normalizeLocationQuery(" 1745 W7 "), "1745 West 7");
  assert.equal(normalizeLocationQuery("1745 W. 7th St"), "1745 West 7th St");
  assert.equal(normalizeLocationQuery("Broadway Bagel"), "Broadway Bagel");
});

test("NYC first, nearest to furthest, maximum five", () => {
  const results = rankSuggestions([
    candidate("outside", 5, false), candidate("far", 900), candidate("nearest", 0),
    candidate("middle", 400), candidate("second", 100), candidate("third", 200), candidate("sixth", 1000),
  ], "Shake Shack");
  assert.deepEqual(results.map(({ id }) => id), ["nearest", "second", "third", "middle", "far"]);
});

test("unknown distances sort last and duplicates preserve prediction selection", () => {
  const original = prediction("same", "Broadway Bagel", "New York, NY");
  const results = rankSuggestions([
    { ...candidate("same", 200), prediction: original }, candidate("unknown", undefined),
    { ...candidate("same", 100), address: "2658 Broadway, New York, NY 10025", place: {} },
  ], "broadway ba");
  assert.equal(results.length, 2);
  assert.equal(results[0].prediction, original);
  assert.equal(results[0].address, "2658 Broadway, New York, NY 10025");
  assert.equal(results[1].id, "unknown");
});

test("address prefixes accept West/W and ordinal numbers without other house numbers", () => {
  const addresses = ["1745 West 7th Street", "1745 W 7th St", "1746 W 7th St", "1745 East 7th St"];
  const results = rankSuggestions(addresses.map((label, index) => ({ ...candidate(String(index), index), label })), "1745 W7");
  assert.deepEqual(results.map(({ id }) => id), ["0", "1"]);
});

test("address queries use autocomplete and enrich only visible addresses", async () => {
  const mock = fakePlaces({ predictions: Array.from({ length: 7 }, (_, i) => prediction(String(i), "1745 West 7th Street", "Brooklyn, NY", i)) });
  const token = {};
  const results = await searchLocations(mock.library, "1745 W7", COLUMBIA_LOCATION, token);
  assert.equal(mock.calls.autocomplete[0].input, "1745 West 7");
  assert.equal(mock.calls.autocomplete[0].sessionToken, token);
  assert.deepEqual(mock.calls.autocomplete[0].locationRestriction, NYC_BOUNDS);
  assert.equal(mock.calls.autocomplete[0].locationBias, undefined);
  assert.equal(mock.calls.searches.length, 0);
  assert.equal(results.length, 5);
  assert.equal(mock.calls.previews.length, 5);
  assert.equal(results[0].address, "1745 W 7th St, Brooklyn, NY 11223, USA");
});

test("business searches request nearby chains/categories and recognize Queens neighborhoods", async () => {
  const place = { id: "bagel", displayName: "Neighborhood Bagels", formattedAddress: "123 Main St, Flushing, NY 11354", location: { toJSON: () => ({ lat: 40.76, lng: -73.83 }) }, addressComponents: [{ types: ["administrative_area_level_2"], longText: "Queens County" }] };
  const mock = fakePlaces({ places: [place] });
  const results = await searchLocations(mock.library, "bagel", COLUMBIA_LOCATION, {});
  assert.equal(mock.calls.searches[0].rankPreference, "DISTANCE");
  assert.deepEqual(mock.calls.searches[0].locationRestriction, NYC_BOUNDS);
  assert.equal(mock.calls.searches[0].locationBias, undefined);
  assert.equal(results[0].isInCity, true);
  assert.equal(results[0].address, place.formattedAddress);
  assert.equal(mock.calls.previews.length, 0);
});

test("a failed Places API reports an error; an available source still works", async () => {
  const denied = fakePlaces({ failAutocomplete: true, failSearch: true });
  await assert.rejects(searchLocations(denied.library, "bagel", COLUMBIA_LOCATION, {}), /Autocomplete denied/);
  const fallback = fakePlaces({ failSearch: true, predictions: [prediction("one", "Broadway Bagel", "2658 Broadway, New York, NY")] });
  assert.equal((await searchLocations(fallback.library, "broadway ba", COLUMBIA_LOCATION, {})).length, 1);
});

test("disabled Places API errors give a specific explanation without leaking Google's raw error", () => {
  const message = locationSearchErrorMessage({ code: 7, message: "Places API (New) has not been used in project 123 before or it is disabled. Enable it at https://example.com/?key=secret" });
  assert.equal(message, "Google Places search isn’t enabled for this app yet.");
  assert.equal(message.includes("secret"), false);
  assert.equal(locationSearchErrorMessage({ code: 7, message: "permission denied" }), "Google denied this app access to location search.");
});

test("direct Maps search safely encodes user text and focuses on NYC", () => {
  const url = new URL(googleMapsSearchUrl("Shake Shack & burgers"));
  assert.equal(url.origin, "https://www.google.com");
  assert.equal(url.pathname, "/maps/search/");
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(url.searchParams.get("query"), "Shake Shack & burgers, New York City");
});

test("stale queries do not issue extra address-detail requests", async () => {
  const mock = fakePlaces({ predictions: [prediction("one", "1745 W 7th St", "Brooklyn, NY")] });
  assert.deepEqual(await searchLocations(mock.library, "1745 W7", COLUMBIA_LOCATION, {}, () => false), []);
  assert.equal(mock.calls.previews.length, 0);
});

test("selection resolves the prediction's session and retains the exact branch address", async () => {
  let fetched = false;
  const selected = await resolveLocation({ ...candidate("one", 50), prediction: { toPlace: () => ({
    displayName: "Shake Shack", formattedAddress: "215 Murray St, New York, NY 10282",
    location: { toJSON: () => ({ lat: 40.715, lng: -74.014 }) },
    async fetchFields() { fetched = true; },
  }) } });
  assert.equal(fetched, true);
  assert.equal(selected.label, "Shake Shack, 215 Murray St, New York, NY 10282");
  assert.deepEqual(selected.location, { lat: 40.715, lng: -74.014 });
  assert.equal(distanceBetween(COLUMBIA_LOCATION, COLUMBIA_LOCATION), 0);
});
