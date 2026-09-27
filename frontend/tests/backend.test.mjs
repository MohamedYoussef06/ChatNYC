import assert from "node:assert/strict";
import test from "node:test";
import { parseSavedTripCard, parseSubwayItinerary, parseTransitAlertReport, subwayLineLabels } from "../src/lib/backend.ts";

test("subway alerts keep real headers and drop a stale or malformed feed", () => {
  const report = parseTransitAlertReport({
    fresh: true,
    updated_at: "2026-09-27T06:00:00Z",
    alerts: [{ header: "N delays", routes: ["N"] }, { header: "", routes: ["A"] }, { note: "ignored" }],
    providerPayload: { raw: true },
  });
  assert.deepEqual(report, { fresh: true, updatedAt: "2026-09-27T06:00:00Z", alerts: [{ header: "N delays", routes: ["N"] }] });
  assert.equal(parseTransitAlertReport({ fresh: false, updated_at: null, alerts: [] })?.fresh, false);
  assert.equal(parseTransitAlertReport({ alerts: [] }), null);
});

test("only confirmed subway lines are sent for alerts", () => {
  assert.deepEqual(subwayLineLabels([
    { transitDetails: { transitLine: { shortName: "N", vehicle: { vehicleType: "SUBWAY" } } } },
    { transitDetails: { transitLine: { shortName: "M4", vehicle: { vehicleType: "BUS" } } } },
    { transitDetails: { transitLine: { shortName: "N", vehicle: { vehicleType: "SUBWAY" } } } },
  ]), ["N"]);
});

test("saved trip and subway plan parsers keep supplied facts", () => {
  const card = parseSavedTripCard({
    id: "abc", title: null, origin: "Alpha Sq", destination: "Beta Sq", summary: "Take the N",
    leave_at: "2026-09-27T08:00:00-04:00", arrive_at: "2026-09-27T08:20:00-04:00",
    duration_seconds: 1200, live: false, created_at: "2026-09-27T07:00:00Z",
  });
  assert.equal(card.origin, "Alpha Sq");
  assert.equal(card.live, false);
  const plan = parseSubwayItinerary({
    id: "abc",
    origin: { label: "Alpha Sq", lat: 40.7, lon: -73.9 },
    destination: { label: "Beta Sq", lat: 40.73, lon: -73.99 },
    duration_seconds: 1200,
    live: true,
    routes: ["N"],
    alerts: [{ header: "N delays", routes: ["N"] }],
    legs: [{ type: "subway", route: "N", from: { label: "Alpha Sq" }, to: { label: "Beta Sq" }, departure: "2026-09-27T08:02:00-04:00", arrival: "2026-09-27T08:18:00-04:00", live: true }],
  });
  assert.equal(plan.originLabel, "Alpha Sq");
  assert.equal(plan.legs[0].route, "N");
  assert.equal(plan.alerts[0].header, "N delays");
  assert.equal("lat" in plan, false);
});
