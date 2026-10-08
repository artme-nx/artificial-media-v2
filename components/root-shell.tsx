import type { Metadata, Viewport } from "next";
import { bodoni, jost } from "@/lib/fonts";
import { site } from "@/content/site";

export const baseMetadata: Metadata = {
  title: site.meta.title.text,
  description: site.meta.description.text,
  // Probna stranica se ne indeksira (11 §3).
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export const baseViewport: Viewport = { colorScheme: "dark light" };

/**
 * Zajednički <html>/<body>. Način pozornice (data-stage) se postavlja već na poslužitelju po ruti:
 * početna počinje u mraku (kazalište prije predstave), /start i ostalo su svijetli — bez treptaja.
 */
export function RootShell({ stage, children, head }: { stage: "dark" | "light"; children: React.ReactNode; head?: React.ReactNode }) {
  return (
    <html lang="en" data-stage={stage} className={`${bodoni.variable} ${jost.variable}`} suppressHydrationWarning>
      {head ? <head>{head}</head> : null}
      <body>{children}</body>
    </html>
  );
}
