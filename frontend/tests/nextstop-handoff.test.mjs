import assert from "node:assert/strict";
import test from "node:test";
import { nextStopHref, readNextStopAction } from "../src/lib/nextstop-handoff.ts";
import { nextStopRoute, readNextStopAction as readMobileAction } from "../../mobile/lib/nextstop-handoff.ts";

const trip = {
  origin: "Columbia University",
  destination: "Grand Central",
  date_time: "2026-09-28T17:00:00-04:00",
  time_type: "arrive_by",
  mode: "drive",
};

test("web Open in NextStop builds the existing navigate query", () => {
  const action = readNextStopAction({ actions: [{ type: "open_nextstop", label: "Open in NextStop", trip }] });
  assert.equal(action.label, "Open in NextStop");
  const href = nextStopHref(action.trip);
  const params = new URL(href, "http://chatnyc.local").searchParams;
  assert.equal(href.startsWith("/navigate?"), true);
  assert.equal(params.get("origin"), "Columbia University");
  assert.equal(params.get("destination"), "Grand Central");
  assert.equal(params.get("arrive"), "2026-09-28T17:00:00-04:00");
  assert.equal(params.get("mode"), "drive");
  assert.equal(readNextStopAction({ reply: "Hello." }), null);
});

test("mobile Open in NextStop targets the existing NextStop tab", () => {
  const action = readMobileAction({ actions: [{ type: "open_nextstop", trip }] });
  assert.deepEqual(nextStopRoute(action.trip), {
    pathname: "/(tabs)/nextstop",
    params: {
      origin: "Columbia University",
      destination: "Grand Central",
      arrive: "2026-09-28T17:00:00-04:00",
      mode: "drive",
      timeType: "arrive_by",
    },
  });
});
