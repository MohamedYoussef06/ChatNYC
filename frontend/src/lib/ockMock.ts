import type { SubwayLine } from "@/components/ui/TransitBadge";
import { recommendations, searchRecommendations, type Recommendation } from "@/lib/recommendations";

export type OckResultType = "places" | "itinerary" | "activity" | "route-handoff" | "empty";

export type OckPlace = {
  id: string;
  name: string;
  category: string;
  neighborhood: string;
  borough: string;
  address?: string;
  price?: string;
  subwayLines?: SubwayLine[];
  travelTime?: string;
  reason: string;
  imagePath: string;
  /** Future provider response can supply an image URL; local files remain the MVP source. */
  photoUrl?: string;
  station?: string;
};

export type ItineraryStop = {
  id: string;
  time: string;
  category: string;
  name: string;
  neighborhood: string;
  destination: string;
  price: string;
  imagePath?: string;
  note?: string;
};

export type OckResultData =
  | { type: "empty" }
  | { type: "places"; title: string; subtitle: string; places: OckPlace[] }
  | { type: "activity"; title: string; subtitle: string; places: OckPlace[] }
  | { type: "itinerary"; title: string; area: string; timeLabel: string; stops: ItineraryStop[]; total: string; budget: string }
  | { type: "route-handoff"; destination: string; message: string };

export type OckMockResponse = {
  message: string;
  resultType: OckResultType;
  data: OckResultData;
};

const columbiaPizza: OckPlace[] = [
  {
    id: "mamas-too",
    name: "Mama’s TOO!",
    category: "PIZZA",
    neighborhood: "Upper West Side",
    borough: "Manhattan",
    address: "2750 Broadway, New York, NY 10025",
    price: "$",
    subwayLines: ["1"],
    travelTime: "12 min away",
    reason: "A neighborhood favorite for creative slices, close to Columbia.",
    imagePath: "/images/nyc/pizza.jpg",
    station: "103 St",
  },
  {
    id: "sal-and-carmine",
    name: "Sal & Carmine Pizza",
    category: "PIZZA",
    neighborhood: "Upper West Side",
    borough: "Manhattan",
    address: "2671 Broadway, New York, NY 10025",
    price: "$",
    subwayLines: ["1"],
    travelTime: "8 min away",
    reason: "A classic counter-service slice stop a short walk south.",
    imagePath: "/images/nyc/lindustrie-pizzeria.jpeg",
    station: "96 St",
  },
  {
    id: "koronet-pizza",
    name: "Koronet Pizza",
    category: "PIZZA",
    neighborhood: "Morningside Heights",
    borough: "Manhattan",
    address: "2848 Broadway, New York, NY 10025",
    price: "$",
    subwayLines: ["1"],
    travelTime: "6 min away",
    reason: "Big, no-fuss slices right in the neighborhood.",
    imagePath: "/images/nyc/pizza.jpg",
    station: "110 St",
  },
];

const ramenPlace: OckPlace = {
  id: "ivan-ramen",
  name: "Ivan Ramen",
  category: "RAMEN",
  neighborhood: "Lower East Side",
  borough: "Manhattan",
  address: "25 Clinton St, New York, NY 10002",
  price: "$$",
  subwayLines: ["F"],
  travelTime: "14 min away",
  reason: "A distinctive neighborhood ramen counter with a focused menu.",
  imagePath: "/images/places/ivan-ramen.webp",
  station: "Delancey St",
};

const initialDateNight = (): Extract<OckResultData, { type: "itinerary" }> => ({
  type: "itinerary",
  title: "Your night",
  area: "Manhattan",
  timeLabel: "Tonight · illustrative plan",
  stops: [
    { id: "dinner", time: "7:00 PM", category: "DINNER", name: "Ivan Ramen", neighborhood: "Lower East Side", destination: "Ivan Ramen", price: "~$35", imagePath: "/images/places/ivan-ramen.webp", note: "A warm, casual start to the evening." },
    { id: "music", time: "8:30 PM", category: "LIVE MUSIC", name: "Bowery Electric", neighborhood: "East Village", destination: "Bowery Electric, 327 Bowery", price: "~$25", note: "Catch a set in an intimate downtown room." },
    { id: "walk", time: "10:30 PM", category: "WALK / VIEW", name: "East River Park", neighborhood: "Lower East Side", destination: "East River Park", price: "Free", note: "Wind down with a waterfront walk." },
  ],
  total: "~$60",
  budget: "$80",
});

function fromRecommendation(place: Recommendation, reason: string): OckPlace {
  return {
    id: place.id,
    name: place.title,
    category: place.category.toUpperCase(),
    neighborhood: place.neighborhood,
    borough: place.borough,
    price: place.price,
    subwayLines: place.lines,
    travelTime: place.away,
    reason,
    imagePath: place.image,
    station: place.station,
  };
}

function getPlacesFor(text: string): OckPlace[] {
  if (/pizza|slice/.test(text) && /columbia|morningside|upper west/.test(text)) return columbiaPizza;
  if (/ramen/.test(text)) return [ramenPlace];

  const matches = searchRecommendations(text).slice(0, 3);
  if (matches.length) return matches.map((place) => fromRecommendation(place, place.description));

  return recommendations.slice(0, 3).map((place) => fromRecommendation(place, place.description));
}

export function resolveOckRequest(message: string, current?: OckMockResponse): OckMockResponse {
  const text = message.toLowerCase();

  if (current?.resultType === "itinerary" && /no ramen|without ramen|not ramen/.test(text)) {
    const itinerary = current.data.type === "itinerary" ? current.data : initialDateNight();
    return {
      message: "Got it. I swapped dinner and kept the rest of the night intact.",
      resultType: "itinerary",
      data: {
        ...itinerary,
        stops: itinerary.stops.map((stop) => stop.id === "dinner"
          ? { ...stop, name: "B&H Dairy", destination: "B&H Dairy, 127 2nd Ave", neighborhood: "East Village", price: "~$24", imagePath: "/images/nyc/market.jpg", note: "A laid-back diner stop, still close to the rest of your night." }
          : stop),
        total: "~$49",
      },
    };
  }

  if (current?.resultType === "itinerary" && /cheaper|lower budget|less expensive/.test(text)) {
    const itinerary = current.data.type === "itinerary" ? current.data : initialDateNight();
    return {
      message: "I tightened the budget and kept the same downtown flow.",
      resultType: "itinerary",
      data: { ...itinerary, total: "~$44", stops: itinerary.stops.map((stop) => stop.id === "dinner" ? { ...stop, price: "~$20" } : stop) },
    };
  }

  if (!message.trim()) return { message: "", resultType: "empty", data: { type: "empty" } };
  if (/plan|date|saturday|itinerary|build my day/.test(text)) {
    return { message: "I put together a downtown plan. You can change any part of it.", resultType: "itinerary", data: initialDateNight() };
  }
  if (/get me to|take me to|directions to/.test(text)) {
    const destination = message.replace(/^(get me to|take me to|directions to)\s*/i, "").trim() || "your destination";
    return { message: `I’ve handed ${destination} to NextStop.`, resultType: "route-handoff", data: { type: "route-handoff", destination, message: "NextStop can work backwards from your arrival time." } };
  }
  if (/pizza|slice|ramen|food|eat|cheap|budget|restaurant|near columbia/.test(text)) {
    const places = getPlacesFor(text);
    const title = /pizza|slice/.test(text) && /columbia|morningside|upper west/.test(text)
      ? "Pizza near Columbia"
      : /ramen/.test(text)
        ? "Ramen in the Lower East Side"
        : "Places worth a stop";
    return { message: `I found ${places.length} places that fit.`, resultType: "places", data: { type: "places", title, subtitle: "A few local picks to start with · demo results", places } };
  }

  const activityPlaces = getPlacesFor(text);
  return { message: "I pulled together a few ways to spend your time in the city.", resultType: "activity", data: { type: "activity", title: "A few ideas for your day", subtitle: "Mock suggestions based on what you asked Ock", places: activityPlaces } };
}
