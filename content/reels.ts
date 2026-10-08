/**
 * Reelovi (11 §4 red 4). Radova još nema (brief §4 pitanje 5): svi slotovi su `placeholder`.
 * Nikad izmišljeni rad. Kad rad postoji, popuni `stream` (Bunny ili Cloudflare Stream ID), `title`,
 * `kind` (client / spec, 03 §7 R3) i `category`, i promijeni status u "approved".
 * 4K video nikad ne ide u repo (brief §5).
 */
export type ReelCategory = "video" | "web" | "ai-tools";
export type Reel = {
  id: string;
  category: ReelCategory;
  aspect: "16:9" | "9:16" | "4:5";
  kind: "client" | "spec" | null;
  title: string | null;
  stream: { provider: "bunny" | "cloudflare"; id: string; libraryId?: string } | null;
  poster: string | null;
  status: "approved" | "placeholder";
};

export const reels: Reel[] = [
  { id: "slot-1", category: "video", aspect: "16:9", kind: null, title: null, stream: null, poster: null, status: "placeholder" },
  { id: "slot-2", category: "video", aspect: "9:16", kind: null, title: null, stream: null, poster: null, status: "placeholder" },
  { id: "slot-3", category: "video", aspect: "4:5", kind: null, title: null, stream: null, poster: null, status: "placeholder" },
  { id: "slot-4", category: "web", aspect: "16:9", kind: null, title: null, stream: null, poster: null, status: "placeholder" },
  { id: "slot-5", category: "video", aspect: "9:16", kind: null, title: null, stream: null, poster: null, status: "placeholder" },
  { id: "slot-6", category: "ai-tools", aspect: "4:5", kind: null, title: null, stream: null, poster: null, status: "placeholder" },
];
