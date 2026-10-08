import type { Metadata, Viewport } from "next";
import { RootShell, baseMetadata, baseViewport } from "@/components/root-shell";
import "../globals.css";

export const metadata: Metadata = baseMetadata;
export const viewport: Viewport = { ...baseViewport, themeColor: "#0B0B0C" };

/**
 * Prije prvog prikaza: kino uvod (ili statična verzija uz smanjeni pokret). Slojevi uvoda su skriveni dok
 * ih GSAP ne preuzme (bez treptaja); ako JS ne krene u 4 s, vraća se statična verzija (sve vidljivo).
 */
const INTRO_BOOT = `(function(){try{var d=document.documentElement;if(matchMedia('(prefers-reduced-motion: reduce)').matches){d.dataset.intro='static';return;}d.dataset.intro='cinema';d.dataset.introLive='1';setTimeout(function(){if(!d.dataset.introOk){delete d.dataset.introLive;d.dataset.intro='static';}},4000);}catch(e){}})();`;

export default function HomeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <RootShell stage="dark" head={<script dangerouslySetInnerHTML={{ __html: INTRO_BOOT }} />}>
      {children}
    </RootShell>
  );
}
