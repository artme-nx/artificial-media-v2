/**
 * Sav copy stranice. Jedini izvor: dokumenti u ~/premium_web_stranice/brand/ (11-stranica-v2-zadatak.md §4).
 *
 * Svaki string ima:
 *   source — datoteka i odjeljak iz kojeg dolazi
 *   status — approved           odlučeno u dokumentima
 *            proposal           kandidat / prijedlog, nije konačno odlučen
 *            needs-confirmation tvrdnja ovisi o činjenici koju Kristian mora potvrditi
 *            placeholder        mjesto za sadržaj koji još ne postoji
 *
 * UI mikrocopy (oznake polja, "Skip intro", poruke grešaka) je u content/ui.ts — tamo nema tvrdnji o studiju.
 * Test tests/content.spec.ts provjerava zabranjene riječi (03 §13, §14) u svemu što se renderira.
 */

export type Status = "approved" | "proposal" | "needs-confirmation" | "placeholder";
export type Str = { text: string; source: string; status: Status; note?: string };

const s = (text: string, source: string, status: Status, note?: string): Str => ({ text, source, status, ...(note ? { note } : {}) });

export const site = {
  meta: {
    title: s("Artificial Media — AI production studio", "03-nove-tvrdnje §16 (kategorija K3 za meta title)", "approved"),
    description: s(
      "Where art meets intelligence, boundaries disappear.",
      "03-nove-tvrdnje §16, §23 B2 (H1)",
      "approved",
      "Meta opis = H1; zaseban opis nije odlučen.",
    ),
  },

  brand: {
    name: s("Artificial Media", "04-ime §0", "approved"),
    legal: s("Artificial Media LLC", "01-inventura §7 odluka 3", "approved"),
  },

  nav: {
    links: [
      { id: "work", href: "#work", label: s("Work", "11 §4 red 0; brief §5 (četiri linka, jedan CTA)", "proposal") },
      { id: "services", href: "#services", label: s("Services", "11 §4 red 0", "proposal") },
      { id: "why-ai", href: "#why-ai", label: s("Why AI?", "11 §4 red 0; 03 §33 (naslov sekcije)", "proposal", "03 §33: pretpostavka o Droppableovoj sekciji [TREBA POTVRDU]") },
      { id: "faq", href: "#faq", label: s("FAQ", "11 §4 red 0; 03 §31", "proposal") },
    ],
    cta: s("Brief us", "03 §5 C1 (★ primarni); 03 §23, §31: tekst CTA gumba još nije odlučen", "proposal"),
  },

  hero: {
    eyebrow: s("AI production studio", "03 §16 (K3, kategorija)", "approved"),
    // H1 je u DOM-u jedna rečenica (11 §4 red 1); uvod je prikazuje u dva dijela.
    h1: s("Where art meets intelligence, boundaries disappear.", "03 §16 (H1 odlučeno), §23 B2", "approved"),
    h1Part1: s("Where art meets intelligence,", "07 Otvaranje kadar 1; 03 §23 B2", "approved"),
    h1Part2: s("boundaries disappear.", "07 Otvaranje kadar 2; 03 §23 B2", "approved"),
  },

  manifest: {
    lines: [
      s("Imagination never had limits. Cameras and sets did.", "03 §29 (manifest, Kristianova verzija); §31", "approved"),
      s("Now, AI shows what no camera could reach.", "03 §29; §31", "approved"),
    ],
  },

  reels: {
    label: s("Reels", "03 §26 (reelovi odmah ispod manifesta)", "proposal", "Naslov sekcije; 03 R1 'The work carries the argument.' je kandidat, nije odluka."),
    note: s("Client work and spec work, always labeled.", "03 §7 R3 (★ oznaka uz filtre)", "proposal"),
    filters: [
      { id: "all", label: s("All", "UI", "proposal") },
      { id: "video", label: s("Video", "brief §5 (filtri Video / Web / AI alati)", "proposal") },
      { id: "web", label: s("Web", "brief §5", "proposal") },
      { id: "ai-tools", label: s("AI tools", "brief §5; 11 §4 red 4", "proposal") },
    ],
    empty: s(
      "Reel slot",
      "brief §4 pitanje 5 (koji radovi smiju biti javni) — radova još nema",
      "placeholder",
      "Prazni slotovi; nikad izmišljeni rad. Vidi content/reels.ts.",
    ),
  },

  worlds: {
    line: s("We don’t build campaigns. We build worlds.", "03 §26, §29, §31 (iza reelova)", "approved"),
  },

  services: {
    opener: s("Worlds that revolve around your product.", "03 §27 W1 (odluka 6. 10.)", "approved"),
    items: [
      {
        id: "ads",
        pose: "otvara",
        name: s("Ads & Product Films", "03 §8 U1 (naziv)", "proposal"),
        body: s(
          "Description to come.",
          "03 §8 U1 — opis nosi stvarno snimanje, odbačeno u §16",
          "placeholder",
          "Opis čeka Kristiana.",
        ),
      },
      {
        id: "websites",
        pose: "seze",
        name: s("Websites", "03 §8 U2 (naziv)", "proposal"),
        body: s(
          "The site your ad sends people to. Interactive, 3D, designed and built in-house. You are looking at one.",
          "03 §8 U2; F11 (§30)",
          "approved",
          "'approved' u smislu F11 (11 §4 red 7): stranica mora zaslužiti tvrdnju.",
        ),
      },
      {
        id: "characters",
        pose: "kontrapost",
        name: s("AI Brand Characters", "03 §8 U3 (naziv)", "proposal"),
        body: s("One face for your brand, built once and directed in every campaign.", "03 §8 U3", "needs-confirmation", "Lik Sofia kao dokaz [TREBA POTVRDU javno]."),
      },
      {
        id: "tools",
        pose: "b_seconde",
        name: s("AI Tools for Business", "03 §8 U4 (naziv); brief §1", "proposal"),
        body: s("Description to come.", "03 §8 U4 — brief §4 pitanje 6 (što su alati i za koga)", "placeholder"),
      },
    ],
  },

  whyAi: {
    heading: s("Why AI?", "03 §33", "proposal"),
    lead: s("Not to make it cheaper. To make it possible.", "03 §33 WA1 (★)", "proposal"),
    rows: [
      { label: s("Possible", "03 §33", "proposal"), text: s("Any place, any light, any season, built around your product.", "03 §33 (svjetovi oko proizvoda)", "proposal") },
      { label: s("Fixed", "03 §33", "proposal"), text: s("A fixed quote and a fixed deadline before any work starts.", "03 §33; §16 (potvrđena obećanja)", "proposal") },
      { label: s("Human", "03 §33", "proposal"), text: s("The idea, the direction and the final cut stay human.", "03 §33", "proposal") },
    ],
  },

  cta: {
    line: s("Tell us what you're selling.", "03 §10 B1 bez broja (11 §4 red 12)", "proposal"),
    button: s("Brief us", "03 §5 C1", "proposal"),
  },

  faq: {
    heading: s("FAQ", "03 §30, §31", "proposal"),
    items: [
      {
        id: "f1",
        q: s("Is everything made with AI?", "03 §30 F1", "proposal"),
        a: s("The worlds are built with AI. The ideas, the direction and the final cut are human. When a project needs a real shot, we film it.", "03 §30 F1 (potvrđeno: ponekad se snima)", "proposal"),
      },
      {
        id: "f2",
        q: s("Will it look like AI?", "03 §30 F2 / §32 dorada", "proposal"),
        a: s("Watch the reel and judge for yourself. Where the law requires AI content to be labeled, we label it.", "03 §32 F2 (dorada)", "needs-confirmation", "Pitanje 8, pravnik (čl. 50 AI Acta)."),
      },
      {
        id: "f3",
        q: s("Will my product look like my product?", "03 §30 F3", "proposal"),
        a: s("Your product is the one thing we never reinvent. We build every world around your real product, from your photos and files.", "03 §30 F3", "needs-confirmation", "Što klijent šalje [TREBA POTVRDU]."),
      },
      {
        id: "f4",
        q: s("We're a small brand. Is this for us?", "03 §30 F4", "proposal"),
        a: s("Yes. If you have a product to show, we can build its world.", "03 §30 F4 (odluka 2)", "proposal"),
      },
      {
        id: "f5",
        q: s("Who will I be working with?", "03 §30 F5", "proposal"),
        a: s("Kristian Vajda directs every project, from the first idea to the final cut.", "03 §30 F5", "needs-confirmation", "Vrijedi li za svaki projekt [TREBA POTVRDU]."),
      },
      {
        id: "f6",
        q: s("What do you need from us to start?", "03 §30 F6", "proposal"),
        a: s("A short brief, your product and your brand guidelines, if you have them.", "03 §30 F6", "needs-confirmation", "Kristianov popis [TREBA POTVRDU]."),
      },
      {
        id: "f7",
        q: s("How much does it cost?", "03 §30 F7", "proposal"),
        a: s("Every project gets a fixed quote before any work starts.", "03 §30 F7 (bez iznosa)", "proposal", "Fiksna cijena potvrđena (03 §16); iznos opcionalno (pitanje 2)."),
      },
      {
        id: "f8",
        q: s("How long does it take?", "03 §30 F8", "proposal"),
        a: s("Every project gets a fixed deadline, agreed before any work starts.", "03 §30 F8 (bez broja dana)", "proposal", "Fiksni rok potvrđen (03 §16); broj dana opcionalno (pitanje 3)."),
      },
      {
        id: "f11",
        q: s("Can you build the website too?", "03 §30 F11", "proposal"),
        a: s("Yes. The site your ad leads to, built in-house. You are looking at one.", "03 §30 F11", "proposal", "Stranica mora zaslužiti tvrdnju."),
      },
      {
        id: "f13",
        q: s("Where are you based?", "03 §30 F13", "proposal"),
        a: s("We work with brands worldwide, remotely.", "03 §30 F13 (bez lokacije u copyju)", "proposal"),
      },
    ],
  },

  footer: {
    copyright: s("© 2026 Artificial Media LLC", "01-inventura §7 odluka 3; 11 §4 red 11", "approved"),
    founder: s("Founded and directed by Kristian Vajda.", "01 H4; 03 §11 O2 bez titule; 03 §16 (we + imenovani osnivač)", "approved"),
    address: s("Registered address", "11 §4 red 11", "placeholder", "[TREBA POTVRDU Northwest] — adresa registriranog agenta (Wyoming)."),
    impressum: s("Legal notice", "11 §4 red 11", "placeholder", "[TREBA POTVRDU Northwest] — impressum za LLC, bez d.o.o. i OIB-a (01 G4)."),
  },

  start: {
    heading: s("Tell us what you're selling.", "03 §10 B1 bez broja (11 §4 red 12)", "proposal"),
    alt: s("Tell us what you're building.", "01-inventura G1 bez 'Same-day reply' (alternativa)", "proposal"),
    projectTypes: [
      { id: "ads", label: s("Ads & Product Films", "03 §8 U1", "proposal") },
      { id: "websites", label: s("Websites", "03 §8 U2", "proposal") },
      { id: "characters", label: s("AI Brand Characters", "03 §8 U3", "proposal") },
      { id: "tools", label: s("AI Tools for Business", "03 §8 U4", "proposal") },
    ],
    promise: s("Every project gets a fixed quote and a fixed deadline before any work starts.", "03 §16 (potvrđena obećanja); §30 F7, F8", "proposal"),
  },
} as const;

export type Site = typeof site;

/** Svi stringovi kao ravna lista (za REVIEW.md i testove). */
export function allStrings(): Array<{ path: string } & Str> {
  const out: Array<{ path: string } & Str> = [];
  const walk = (node: unknown, path: string) => {
    if (node && typeof node === "object" && "text" in node && "status" in node && "source" in node) {
      out.push({ path, ...(node as Str) });
      return;
    }
    if (Array.isArray(node)) node.forEach((v, i) => walk(v, `${path}[${i}]`));
    else if (node && typeof node === "object") for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
  };
  walk(site, "");
  return out;
}
