import { Bodoni_Moda, Jost } from "next/font/google";

// Bodoni Moda (OFL) za izjave, Jost (OFL) za tekst i sučelje. next/font samostalno poslužuje fontove
// i radi fallback sa size-adjust, pa nema skoka pri učitavanju (11 §2, F1).
export const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-bodoni",
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});
export const jost = Jost({ subsets: ["latin"], variable: "--font-jost", display: "swap" });
