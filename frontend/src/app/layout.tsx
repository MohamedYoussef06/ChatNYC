import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Navbar } from "@/components/Navbar";

import "./globals.css";

export const metadata: Metadata = {
  title: "Borough — Make NYC yours",
  description: "Discover, navigate, and experience New York with an AI companion that learns what you love.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <Navbar />
        <main id="main-content" className="page" tabIndex={-1}>{children}</main>
      </body>
    </html>
  );
}
