import assert from "node:assert/strict";
import test from "node:test";
import { getRouteWeather, parseRouteWeather, weatherSummary } from "../src/lib/weather.ts";

const departure = {
  forecastTime: "2026-09-27T11:00:00-04:00",
  condition: { type: "RAIN", description: "Light rain" },
  temperature: { value: 58.2, unit: "F" },
  precipitation: { probability: 70, type: "rain" },
};

test("parseRouteWeather keeps supplied departure and arrival facts", () => {
  const weather = parseRouteWeather({
    departure,
    arrival: {
      forecastTime: "2026-09-27T12:00:00-04:00",
      condition: { description: "Cloudy" },
      temperature: { value: 57, unit: "F" },
      precipitation: { probability: 20, type: "rain" },
    },
    midpoint: null,
  });
  assert.equal(weather.departure.condition.description, "Light rain");
  assert.equal(weather.departure.temperature.value, 58.2);
  assert.equal(weather.arrival.precipitation.probability, 20);
  assert.equal(weather.midpoint, undefined);
  assert.equal(weatherSummary(weather), "Light rain · 58°F");
});

test("parseRouteWeather drops incomplete points instead of filling them in", () => {
  const weather = parseRouteWeather({
    departure: { condition: { description: "Cloudy" } },
    arrival: { forecastTime: "2026-09-27T12:00:00-04:00", condition: { description: "Clear" } },
    providerPayload: { temperature: { degrees: 12 } },
  });
  assert.equal(weather.departure, undefined);
  assert.equal(weather.arrival.temperature, undefined);
  assert.equal("providerPayload" in weather, false);
});

test("getRouteWeather sends route timing to backend and parses normalized weather", async () => {
  const originalFetch = globalThis.fetch;
  let sent;
  globalThis.fetch = async (url, init) => {
    sent = { url, body: JSON.parse(init.body) };
    return { ok: true, json: async () => ({ departure, arrival: null, midpoint: null }) };
  };
  try {
    const weather = await getRouteWeather({
    origin: { latitude: 40.758, longitude: -73.9855, label: "Times Square" },
    destination: { latitude: 40.8075, longitude: -73.9626, label: "Columbia University" },
    departureTime: "2026-09-27T11:00:00-04:00",
    arrivalTime: "2026-09-27T12:00:00-04:00",
  });
    assert.equal(sent.url, "http://localhost:8000/api/weather/route");
    assert.equal(sent.body.departure_time, "2026-09-27T11:00:00-04:00");
    assert.equal(sent.body.origin.latitude, 40.758);
    assert.equal(weather.departure.condition.description, "Light rain");
    assert.equal(weather.arrival, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
