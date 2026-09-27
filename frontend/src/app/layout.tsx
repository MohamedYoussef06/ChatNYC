import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { GoogleMapsProvider } from "@/components/GoogleMapsProvider";
import { Navbar } from "@/components/Navbar";
import { UserLocationProvider } from "@/hooks/useUserLocation";

import "./globals.css";

export const metadata: Metadata = {
  title: "ChatNYC — Make NYC yours",
  applicationName: "ChatNYC",
  icons: {
    icon: { url: "/icon.svg", type: "image/svg+xml" },
  },
  description: "Discover, navigate, and experience New York with an AI companion that learns what you love.",
};

const scrollRevealBootstrap = `
  try {
    if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.dataset.scrollRevealReady = "";
    }
  } catch {}
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() || process.env.GOOGLE_MAPS_API_KEY?.trim() || "";
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scrollRevealBootstrap }} />
      </head>
      <body className="flex min-h-screen flex-col" suppressHydrationWarning>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <GoogleMapsProvider apiKey={mapsKey}>
        <AuthProvider>
          <UserLocationProvider>
            <Navbar />
            <main id="main-content" className="page w-full flex-1" tabIndex={-1}>
              {children}
            </main>
          </UserLocationProvider>
        </AuthProvider>
        </GoogleMapsProvider>
      </body>
    </html>
  );
}
