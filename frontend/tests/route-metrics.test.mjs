import assert from "node:assert/strict";
import test from "node:test";
import { summarizeRoute, routeErrorMessage } from "../src/lib/route-metrics.ts";

const date = (time) => new Date(`2026-09-27T${time}:00Z`);
const walk = (minutes) => ({ travelMode: "WALKING", staticDurationMillis: minutes * 60000 });
const ride = (departure, arrival, headway = null) => ({
  travelMode: "TRANSIT", staticDurationMillis: date(arrival) - date(departure),
  transitDetails: { departureTime: date(departure), arrivalTime: date(arrival), headwayMillis: headway },
});
const route = (steps, duration = 35) => ({ durationMillis: duration * 60000, distanceMeters: 5000, legs: [{ steps }] });

test("transit extracts walking, transfers and waiting without mistaking headway for wait", () => {
  const input = route([walk(5), ride("10:05", "10:15", 600000), walk(2), ride("10:22", "10:32"), walk(3)]);
  input.travelAdvisory = { transitFare: { units: 3, nanos: 500000000, currencyCode: "USD" } };
  const result = summarizeRoute(input, "Transit", date("10:40"), date("09:50"), null);
  assert.equal(result.metrics.walkingMinutes, 10);
  assert.equal(result.metrics.transfers, 1);
  assert.equal(result.metrics.transferWaitMinutes, 5);
  assert.equal(result.metrics.serviceHeadwayMinutes, 10);
  assert.equal(result.metrics.cost, 3.5);
  assert.equal(result.departure.toISOString(), date("10:00").toISOString());
  assert.equal(result.arrival.toISOString(), date("10:35").toISOString());
  assert.equal(result.metrics.canArriveOnTime, true);
});

test("missing schedule or fare data remains unknown", () => {
  const input = route([walk(5), ride("10:05", "10:15"), ride("10:20", "10:30")]);
  input.legs[0].steps[1].transitDetails.arrivalTime = null;
  const result = summarizeRoute(input, "Transit", date("10:40"), date("09:50"), null);
  assert.equal(result.metrics.cost, null);
  assert.equal(result.metrics.transferWaitMinutes, null);
  assert.equal(result.metrics.serviceHeadwayMinutes, null);
});

test("driving uses only user supplied costs and recognizes missed departure", () => {
  const input = route([{ travelMode: "DRIVING", staticDurationMillis: 1800000 }], 30);
  const missing = summarizeRoute(input, "Drive", date("10:00"), date("09:45"), null);
  assert.equal(missing.metrics.cost, null);
  assert.equal(missing.metrics.walkingMinutes, null);
  assert.equal(missing.metrics.canArriveOnTime, false);
  assert.equal(summarizeRoute(input, "Drive", date("10:00"), date("09:00"), 15).metrics.cost, 15);
});

test("walking is free and rejects incomplete provider duration", () => {
  const result = summarizeRoute(route([walk(20)], 20), "Walk", date("10:00"), date("09:00"), null);
  assert.equal(result.metrics.cost, 0);
  assert.equal(result.metrics.walkingMinutes, 20);
  assert.throws(() => summarizeRoute({ distanceMeters: 4 }, "Walk", date("10:00"), date("09:00"), null));
  assert.match(routeErrorMessage(new Error("Routes API is disabled")), /Enable Routes API/);
});
