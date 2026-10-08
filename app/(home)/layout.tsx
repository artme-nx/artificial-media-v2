import type { Metadata, Viewport } from "next";
import { RootShell, baseMetadata, baseViewport } from "@/components/root-shell";
import "../globals.css";

export const metadata: Metadata = baseMetadata;
export const viewport: Viewport = { ...baseViewport, themeColor: "#0B0B0C" };

export default function HomeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RootShell stage="dark">{children}</RootShell>;
}
