export type TemperatureUnit = "F" | "C";

export type WeatherPlace = {
  latitude: number;
  longitude: number;
  label?: string;
};

export type WeatherMeasure = {
  value: number;
  unit: TemperatureUnit;
};

export type WeatherContext = {
  location?: WeatherPlace;
  forecastTime: string;
  condition: {
    type?: string;
    description: string;
  };
  temperature?: WeatherMeasure;
  feelsLike?: WeatherMeasure;
  precipitation?: {
    probability?: number;
    type?: string;
  };
  wind?: {
    speed?: number;
    unit?: string;
  };
  visibility?: {
    value?: number;
    unit?: string;
  };
  thunderstormProbability?: number;
  sourceUpdatedAt?: string;
};

export type RouteWeather = {
  departure?: WeatherContext;
  arrival?: WeatherContext;
  midpoint?: WeatherContext;
};

export type RouteWeatherQuery = {
  origin?: WeatherPlace;
  destination?: WeatherPlace;
  departureTime?: string;
  arrivalTime?: string;
};

export type WeatherPointLabel = "Leaving" | "Arriving" | "Midpoint";

export type WeatherPointView = {
  label: WeatherPointLabel;
  primary: string;
  details: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function temperatureUnit(value: unknown): TemperatureUnit | undefined {
  return value === "F" || value === "C" ? value : undefined;
}

function parseMeasure(value: unknown): WeatherMeasure | undefined {
  if (!isRecord(value)) return undefined;
  const amount = finiteNumber(value.value);
  const unit = temperatureUnit(value.unit);
  if (amount == null || !unit) return undefined;
  return { value: amount, unit };
}

function parsePlace(value: unknown): WeatherPlace | undefined {
  if (!isRecord(value)) return undefined;
  const latitude = finiteNumber(value.latitude);
  const longitude = finiteNumber(value.longitude);
  if (latitude == null || longitude == null) return undefined;
  const label = text(value.label);
  return label ? { latitude, longitude, label } : { latitude, longitude };
}

export function parseWeatherContext(value: unknown): WeatherContext | undefined {
  if (!isRecord(value)) return undefined;
  const forecastTime = text(value.forecastTime);
  if (!forecastTime || !isRecord(value.condition)) return undefined;
  const description = text(value.condition.description);
  if (!description) return undefined;
  const conditionType = text(value.condition.type);
  const context: WeatherContext = {
    forecastTime,
    condition: conditionType ? { type: conditionType, description } : { description },
  };
  const location = parsePlace(value.location);
  if (location) context.location = location;
  const temperature = parseMeasure(value.temperature);
  if (temperature) context.temperature = temperature;
  const feelsLike = parseMeasure(value.feelsLike);
  if (feelsLike) context.feelsLike = feelsLike;
  if (isRecord(value.precipitation)) {
    const probability = finiteNumber(value.precipitation.probability);
    const precipitationType = text(value.precipitation.type);
    if (probability != null || precipitationType) {
      context.precipitation = {
        ...(probability != null ? { probability } : {}),
        ...(precipitationType ? { type: precipitationType } : {}),
      };
    }
  }
  if (isRecord(value.wind)) {
    const speed = finiteNumber(value.wind.speed);
    const unit = text(value.wind.unit);
    if (speed != null || unit) context.wind = { ...(speed != null ? { speed } : {}), ...(unit ? { unit } : {}) };
  }
  if (isRecord(value.visibility)) {
    const amount = finiteNumber(value.visibility.value);
    const unit = text(value.visibility.unit);
    if (amount != null || unit) context.visibility = { ...(amount != null ? { value: amount } : {}), ...(unit ? { unit } : {}) };
  }
  const thunderstormProbability = finiteNumber(value.thunderstormProbability);
  if (thunderstormProbability != null) context.thunderstormProbability = thunderstormProbability;
  const sourceUpdatedAt = text(value.sourceUpdatedAt);
  if (sourceUpdatedAt) context.sourceUpdatedAt = sourceUpdatedAt;
  return context;
}

export function parseRouteWeather(value: unknown): RouteWeather | null {
  if (!isRecord(value)) return null;
  const departure = value.departure == null ? undefined : parseWeatherContext(value.departure);
  const arrival = value.arrival == null ? undefined : parseWeatherContext(value.arrival);
  const midpoint = value.midpoint == null ? undefined : parseWeatherContext(value.midpoint);
  if (!departure && !arrival && !midpoint) return null;
  return {
    ...(departure ? { departure } : {}),
    ...(arrival ? { arrival } : {}),
    ...(midpoint ? { midpoint } : {}),
  };
}

export function formatTemperature(measure: WeatherMeasure): string {
  return `${Math.round(measure.value)}°${measure.unit}`;
}

function precipitationLine(precipitation: WeatherContext["precipitation"]): string | null {
  if (!precipitation) return null;
  const kind = precipitation.type;
  if (precipitation.probability == null) return kind ? `Chance of ${kind}` : null;
  const chance = `${Math.round(precipitation.probability)}% chance of ${kind ?? "precipitation"}`;
  return chance;
}

function measureLine(label: string, value: number | undefined, unit: string | undefined): string | null {
  if (value == null) return null;
  return unit ? `${label} ${value} ${unit}` : `${label} ${value}`;
}

export function weatherPointView(label: WeatherPointLabel, context: WeatherContext | undefined): WeatherPointView | null {
  if (!context) return null;
  const description = context.condition.description;
  const temperature = context.temperature ? formatTemperature(context.temperature) : null;
  const primary = [description, temperature].filter(Boolean).join(" · ");
  if (!primary) return null;
  const details = [
    precipitationLine(context.precipitation),
    context.feelsLike ? `Feels like ${formatTemperature(context.feelsLike)}` : null,
    measureLine("Wind", context.wind?.speed, context.wind?.unit),
    measureLine("Visibility", context.visibility?.value, context.visibility?.unit),
    context.thunderstormProbability == null ? null : `${Math.round(context.thunderstormProbability)}% chance of thunderstorms`,
  ].filter((line): line is string => Boolean(line));
  return { label, primary, details };
}

export function weatherSummary(weather: RouteWeather | undefined): string | null {
  const point = weatherPointView("Leaving", weather?.departure) ?? weatherPointView("Arriving", weather?.arrival);
  return point?.primary ?? null;
}

export async function getRouteWeather(query: RouteWeatherQuery, signal?: AbortSignal): Promise<RouteWeather | null> {
  if (signal?.aborted) return null;
  if (query.origin == null || query.destination == null || !query.departureTime || !query.arrivalTime) return null;
  // The backend weather route is not finalized. Keep the request here, and parse
  // its JSON with parseRouteWeather, once Mohamed publishes the endpoint.
  return null;
}
