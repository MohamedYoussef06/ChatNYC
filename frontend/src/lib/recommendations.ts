import type { SubwayLine } from "@/components/ui/TransitBadge";

export const categories = ["Food & drink", "Live music", "Outdoors", "Culture", "Neighborhoods", "Events"] as const;

export type Recommendation = {
  id: string;
  title: string;
  neighborhood: string;
  borough: string;
  category: (typeof categories)[number];
  description: string;
  image: string;
  imageAlt: string;
  price?: string;
  lines?: SubwayLine[];
  away: string;
  walk: string;
  station: string;
  tags: string[];
  accessible?: boolean;
};

// Illustrative recommendations, prices, and travel estimates; no live provider data.
export const recommendations: Recommendation[] = [
  {
    id: "a-proper-new-york-slice",
    title: "A proper New York slice",
    neighborhood: "Williamsburg",
    borough: "Brooklyn",
    category: "Food & drink",
    description: "Crisp crust, a little sidewalk sunshine, and absolutely no need for a fork. Find your new go-to slice.",
    image: "/images/nyc/pizza.jpg",
    imageAlt: "Freshly baked pizza topped with basil and tomatoes",
    price: "$",
    lines: ["L"],
    away: "12 min away",
    walk: "5 min walk from the station",
    station: "Bedford Av",
    tags: ["pizza", "slice", "food", "lunch", "dinner", "cheap", "casual", "eat", "restaurant"],
  },
  {
    id: "washington-square-afternoon",
    title: "Take the scenic route",
    neighborhood: "Greenwich Village",
    borough: "Manhattan",
    category: "Outdoors",
    description: "A slow afternoon of leafy paths, people-watching, and whatever’s playing around Washington Square.",
    image: "/images/nyc/park.jpg",
    imageAlt: "A sunlit green park with trees and paths",
    price: "Free",
    lines: ["A", "C", "E"],
    away: "18 min away",
    walk: "6 min walk from the station",
    station: "W 4 St–Washington Sq",
    tags: ["parks", "park", "outdoors", "outdoor", "nature", "walk", "walking", "free", "relax", "quiet", "sunshine"],
    accessible: true,
  },
  {
    id: "village-jazz-night",
    title: "Find your kind of late night",
    neighborhood: "West Village",
    borough: "Manhattan",
    category: "Live music",
    description: "A tucked-away jazz room, a small stage, and a set that makes you forget to check the time.",
    image: "/images/nyc/jazz.jpg",
    imageAlt: "A musician playing a trumpet under warm stage lighting",
    price: "$$",
    lines: ["1"],
    away: "22 min away",
    walk: "4 min walk from the station",
    station: "Christopher St–Sheridan Sq",
    tags: ["live", "music", "jazz", "night", "nightlife", "tonight", "date", "show", "concert"],
  },
  {
    id: "museum-mile",
    title: "An afternoon on Museum Mile",
    neighborhood: "Upper East Side",
    borough: "Manhattan",
    category: "Culture",
    description: "Get wonderfully lost in art, then head outside for a stroll along the edge of Central Park.",
    image: "/images/nyc/museum.jpg",
    imageAlt: "An abstract painting with swirling yellow, black, and pale blue pigment",
    price: "$$",
    lines: ["4", "5", "6"],
    away: "28 min away",
    walk: "12 min walk from the station",
    station: "86 St",
    tags: ["art", "museum", "museums", "culture", "gallery", "indoors", "rain", "rainy", "history"],
  },
  {
    id: "brooklyn-waterfront",
    title: "A different view of the city",
    neighborhood: "Williamsburg",
    borough: "Brooklyn",
    category: "Neighborhoods",
    description: "Cobblestone corners, a waterfront wander, and that skyline. Meet the Brooklyn you’ll keep coming back to.",
    image: "/images/nyc/waterfront.jpg",
    imageAlt: "The Williamsburg Bridge and Manhattan skyline reflected in the East River at dusk",
    price: "Free",
    lines: ["L"],
    away: "25 min away",
    walk: "10 min walk from the station",
    station: "Bedford Av",
    tags: ["neighborhood", "neighborhoods", "brooklyn", "waterfront", "bridge", "skyline", "walk", "walking", "free", "photo"],
  },
  {
    id: "greenmarket-morning",
    title: "Your new weekend ritual",
    neighborhood: "Union Square",
    borough: "Manhattan",
    category: "Events",
    description: "Follow the flower stands and the smell of fresh bread. A market morning is always a good idea.",
    image: "/images/nyc/market.jpg",
    imageAlt: "Colorful fresh produce arranged at a market",
    price: "Free entry",
    lines: ["N", "Q", "R", "L"],
    away: "15 min away",
    walk: "2 min walk from the station",
    station: "14 St–Union Sq",
    tags: ["event", "events", "market", "weekend", "morning", "food", "flowers", "shopping", "free"],
  },
];

const fillerWords = new Set(["a", "an", "and", "the", "to", "in", "of", "for", "i", "me", "my", "we", "want", "do", "go", "get", "find", "show", "some", "something", "great", "good", "best", "near", "nearby", "new", "york", "nyc", "please", "what", "where", "can", "is", "with"]);

export function searchRecommendations(query: string): Recommendation[] {
  const terms = query.toLowerCase().split(/[^a-z0-9]+/).filter((term) => term && !fillerWords.has(term));
  if (!terms.length) return recommendations;
  return recommendations.filter((pick) => {
    const searchable = [pick.title, pick.neighborhood, pick.borough, pick.category, ...pick.tags].join(" ").toLowerCase();
    return terms.some((term) => searchable.includes(term));
  });
}
