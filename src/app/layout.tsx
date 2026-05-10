import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";

import { AppShell } from "@/components/shell/AppShell";

import "./globals.css";

/**
 * Typography stack from the reference: Geist for UI + JetBrains Mono for
 * labels / eyebrows. Loaded via next/font so nothing is requested from
 * third-party hosts at runtime.
 */
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rovr — AI Field Sales Intelligence",
  description:
    "Prioritize visits, optimize travel, and chat with Rovr's sales copilot.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${geist.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-background font-sans text-on-surface antialiased selection:bg-primary/30 selection:text-on-surface">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
