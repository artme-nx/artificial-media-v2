import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Jost } from "next/font/google";
import { site } from "@/content/site";
import "./globals.css";

// Bodoni Moda (OFL) za izjave, Jost (OFL) za tekst i sučelje. next/font samostalno poslužuje fontove
// i radi fallback sa size-adjust, pa nema skoka pri učitavanju (11 §2, F1).
const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-bodoni",
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});
const jost = Jost({ subsets: ["latin"], variable: "--font-jost", display: "swap" });

export const metadata: Metadata = {
  title: site.meta.title.text,
  description: site.meta.description.text,
  // Probna stranica se ne indeksira (11 §3).
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export const viewport: Viewport = {
  themeColor: "#0B0B0C",
  colorScheme: "dark light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-stage="dark" className={`${bodoni.variable} ${jost.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
