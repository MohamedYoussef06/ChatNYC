import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Navbar } from "@/components/Navbar";

import "./globals.css";

export const metadata: Metadata = {
  title: "ChatNYC — Make NYC yours",
  applicationName: "ChatNYC",
  description: "Discover, navigate, and experience New York with an AI companion that learns what you love.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col" suppressHydrationWarning>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <Navbar />
        <main id="main-content" className="page w-full flex-1" tabIndex={-1}>
          {children}
        </main>
      </body>
    </html>
  );
}
