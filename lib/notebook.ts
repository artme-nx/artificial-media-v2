/**
 * "Lutka bilježi" (07, tablica stanja) — događaji iz forme prema 3D lutki. Forma ne ovisi o lutki.
 * Stanja: idle (Čeka) · attention (Pažnja) · typing (Piše) · thinking (Razmišlja, pauza > 1,5 s) ·
 *         newfield (Novo polje) · error (Greška) · sent (Poslano) · leave (Odlazak → natrag u Čeka).
 * Tekst iz forme se ovdje NE prosljeđuje (samo ime polja), pa ništa ne odlazi nikamo zbog animacije.
 */
export type NotebookState = "idle" | "attention" | "typing" | "thinking" | "newfield" | "error" | "sent" | "leave";
export type NotebookEvent =
  | { type: "state"; state: NotebookState; field?: string }
  | { type: "stroke"; field: string }; // svaki znak pomakne olovku

type Listener = (e: NotebookEvent) => void;
type SentHandler = () => Promise<void>;

const listeners = new Set<Listener>();
let sentHandler: SentHandler | null = null;
let state: NotebookState = "idle";
let thinkTimer: ReturnType<typeof setTimeout> | null = null;
let settleTimer: ReturnType<typeof setTimeout> | null = null;
let inside = false;

function emit(e: NotebookEvent) {
  if (e.type === "state") {
    state = e.state;
    if (typeof document !== "undefined") document.documentElement.dataset.notebook = e.state;
  }
  for (const l of listeners) l(e);
}
const setState = (s: NotebookState, field?: string) => emit({ type: "state", state: s, field });
const clearTimers = () => {
  if (thinkTimer) clearTimeout(thinkTimer);
  if (settleTimer) clearTimeout(settleTimer);
  thinkTimer = settleTimer = null;
};

export const notebook = {
  get state() {
    return state;
  },
  on(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  /** 3D lutka registrira révérence; forma čeka da završi prije potvrde. */
  onSent(h: SentHandler | null) {
    sentHandler = h;
  },
  attention(on: boolean) {
    if (state === "sent") return;
    inside = on;
    clearTimers();
    if (on) {
      if (state === "idle" || state === "leave") setState("attention");
    } else {
      setState("leave");
      settleTimer = setTimeout(() => setState("idle"), 900);
    }
  },
  keystroke(field: string) {
    if (state === "sent") return;
    clearTimers();
    if (state !== "typing") setState("typing", field);
    emit({ type: "stroke", field });
    thinkTimer = setTimeout(() => setState("thinking", field), 1500);
  },
  newField(step: number) {
    if (state === "sent") return;
    clearTimers();
    setState("newfield", `step-${step}`);
    settleTimer = setTimeout(() => setState(inside ? "attention" : "idle"), 1100);
  },
  error(field: string) {
    clearTimers();
    setState("error", field);
    settleTimer = setTimeout(() => setState(inside ? "attention" : "idle"), 1600);
  },
  async sent() {
    clearTimers();
    setState("sent");
    if (sentHandler) await sentHandler();
  },
};
