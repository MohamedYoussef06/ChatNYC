export type Place = {
  id: string;
  name: string;
  neighborhood: string;
  summary: string;
};

export type TravelMode = "walking" | "driving" | "transit";

export type TravelOption = {
  mode: TravelMode;
  duration_minutes: number;
  distance_meters: number;
  cost_usd: number;
  transfers: number;
  wait_minutes: number;
  ease_score: number;
  summary: string;
  source: string;
};

export type ModeRecommendation = {
  recommended_mode: TravelMode;
  reason: string;
  source: string;
};

export type Trip = {
  id: string;
  title: string;
  origin: string;
  destination: string;
  summary: string;
  options: TravelOption[];
  recommendation: ModeRecommendation | null;
};

export type UserProfile = {
  id: string;
  name: string;
  neighborhood: string;
};
