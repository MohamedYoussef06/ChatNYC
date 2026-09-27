export type NextStopMode = "transit" | "drive" | "walk";
export type NextStopTrip = {
  origin: string;
  destination: string;
  dateTime: string;
  timeType: "arrive_by" | "depart_at";
  mode: NextStopMode;
};

export function nextStopRoute(trip: NextStopTrip): { pathname: "/(tabs)/nextstop"; params: Record<string, string> } {
  return {
    pathname: "/(tabs)/nextstop",
    params: {
      origin: trip.origin,
      destination: trip.destination,
      arrive: trip.dateTime,
      mode: trip.mode,
      timeType: trip.timeType,
    },
  };
}

export function readNextStopAction(value: unknown): { label: string; trip: NextStopTrip } | null {
  if (!value || typeof value !== "object") return null;
  const actions = (value as { actions?: unknown }).actions;
  if (!Array.isArray(actions)) return null;
  for (const item of actions) {
    if (!item || typeof item !== "object") continue;
    const action = item as { type?: unknown; label?: unknown; trip?: unknown };
    if (action.type !== "open_nextstop" || !action.trip || typeof action.trip !== "object") continue;
    const trip = action.trip as Record<string, unknown>;
    if (typeof trip.origin !== "string" || typeof trip.destination !== "string" || typeof trip.date_time !== "string") continue;
    return {
      label: typeof action.label === "string" && action.label.trim() ? action.label : "Open in NextStop",
      trip: {
        origin: trip.origin,
        destination: trip.destination,
        dateTime: trip.date_time,
        timeType: trip.time_type === "depart_at" ? "depart_at" : "arrive_by",
        mode: trip.mode === "drive" || trip.mode === "walk" ? trip.mode : "transit",
      },
    };
  }
  return null;
}
