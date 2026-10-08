/**
 * PREKIDAČI — sve što je u dokumentima označeno [ODLUKA KRISTIANA], [TREBA POTVRDU] ili [PRETPOSTAVKA].
 * Zadana vrijednost mijenja se u jednom retku ovdje; za probu bez promjene koda služi ?parametar u URL-u.
 * Popis i obrazloženja: ODLUKE.md i REVIEW.md.
 */

export type LogoAccent = "podebljano" | "tonski" | "sjena" | "podebljano-tonski";
export type Waist = "A" | "B";
export type Quality = "auto" | "high" | "medium" | "low";
export type CursorMobile = "oboje" | "prst" | "samo";
export type SourcePref = "auto" | "realtime" | "frames";
export type CostumeCut = "frak" | "smoking";

export const DEFAULTS = {
  /** 05-logo runda 3b: naglasak ART/ME. Zadano 'podebljano' (jedina jednobojna). [ODLUKA KRISTIANA] · ?logo= */
  logo: "podebljano" as LogoAccent,
  /** 10-lik §1: struk A (čelični kuglasti zglob) ili B (stup s tri prstena). [ODLUKA KRISTIANA] · ?struk= */
  waist: "A" as Waist,
  /** 07 napomena uz uvod: mrak → svijetli ostatak stranice. [ODLUKA KRISTIANA], zadano: da · ?svjetlo=0|1 */
  lightsUp: true,
  /** 07 (6. 10.): kamera se uz spuštanje lagano okreće oko lutke. [PRETPOSTAVKA/TREBA POTVRDU] · ?kruzenje=0|1 */
  balletOrbit: true,
  /** 07 Otvaranje: kadrovi 1–3 se odvijaju sami. [PRETPOSTAVKA] · ?autouvod=0|1 */
  introAutoplay: true,
  /** 11 F6: mobitel — krug prati prst i/ili se sam kreće. [ODLUKA KRISTIANA], zadano: oboje · ?krug=oboje|prst|samo */
  cursorMobile: "oboje" as CursorMobile,
  /** 11 F6: tanki precizni prsten na rubu maske (ako izgleda jeftino, samo mek rub). · ?prsten=0|1 */
  maskRing: true,
  /** 11 §3: razina kvalitete. auto = po uređaju i izmjerenom FPS-u · ?q=high|medium|low */
  quality: "auto" as Quality,
  /** 11 §3: izvor scena uvoda i baleta. auto = realtime na jakim desktopima, frames na mobitelu i slabim · ?izvor= */
  source: "auto" as SourcePref,
  /** 10-lik [SMOKING] kaže "tuxedo", 11 F3 traži "skut": frak (skuti straga, rez u struku — klasika dirigenta) ili
   * smoking (sako do bokova). [PRETPOSTAVKA], zadano frak · ?kroj=frak|smoking */
  cut: "frak" as CostumeCut,
} as const;

/** 10-lik §1: palica — tanka bijela. [PRIJEDLOG] (boja je u src/three/materials) */
export const BATON_COLOR = "#F4F1EA";

/** 11 F8: endpoint forme (Formspree, Web3Forms…). [ODLUKA KRISTIANA]. Bez njega forma iskreno kaže da nije spojena. */
export const FORM_ENDPOINT = process.env.NEXT_PUBLIC_FORM_ENDPOINT ?? "";

type Switches = {
  logo: LogoAccent;
  waist: Waist;
  lightsUp: boolean;
  balletOrbit: boolean;
  introAutoplay: boolean;
  cursorMobile: CursorMobile;
  maskRing: boolean;
  quality: Quality;
  source: SourcePref;
  cut: CostumeCut;
};

const pick = <T extends string>(v: string | null, allowed: readonly T[], fallback: T): T =>
  v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
const bool = (v: string | null, fallback: boolean) => (v === "1" || v === "true" ? true : v === "0" || v === "false" ? false : fallback);

let cached: Switches | null = null;

/** Čita prekidače (zadano + ?parametri). Na poslužitelju vraća zadane vrijednosti. */
export function readSwitches(): Switches {
  if (cached) return cached;
  const q = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const out: Switches = {
    logo: pick(q.get("logo"), ["podebljano", "tonski", "sjena", "podebljano-tonski"] as const, DEFAULTS.logo),
    waist: pick(q.get("struk"), ["A", "B"] as const, DEFAULTS.waist),
    lightsUp: bool(q.get("svjetlo"), DEFAULTS.lightsUp),
    balletOrbit: bool(q.get("kruzenje"), DEFAULTS.balletOrbit),
    introAutoplay: bool(q.get("autouvod"), DEFAULTS.introAutoplay),
    cursorMobile: pick(q.get("krug"), ["oboje", "prst", "samo"] as const, DEFAULTS.cursorMobile),
    maskRing: bool(q.get("prsten"), DEFAULTS.maskRing),
    quality: pick(q.get("q"), ["auto", "high", "medium", "low"] as const, DEFAULTS.quality),
    source: pick(q.get("izvor"), ["auto", "realtime", "frames"] as const, DEFAULTS.source),
    cut: pick(q.get("kroj"), ["frak", "smoking"] as const, DEFAULTS.cut),
  };
  if (typeof window !== "undefined") cached = out;
  return out;
}
