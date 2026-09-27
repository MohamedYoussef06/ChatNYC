"use client";

import type { ReactNode } from "react";
import { setGoogleMapsKey } from "@/lib/google-maps";

export function GoogleMapsProvider({ apiKey, children }: { apiKey?: string; children: ReactNode }) {
  setGoogleMapsKey(apiKey);
  return children;
}
