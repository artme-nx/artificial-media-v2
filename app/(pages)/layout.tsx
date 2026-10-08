import type { Metadata, Viewport } from "next";
import { RootShell, baseMetadata, baseViewport } from "@/components/root-shell";
import "../globals.css";

export const metadata: Metadata = baseMetadata;
export const viewport: Viewport = { ...baseViewport, themeColor: "#F3EFE7" };

export default function PagesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <RootShell stage="light">{children}</RootShell>;
}
