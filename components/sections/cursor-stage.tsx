import { ui } from "@/content/ui";

/**
 * Drvo / robot ispod kursora (11 §4 red 6, F6). Dekoracija: aria-hidden; samo mikrocopy-hint za povlačenje.
 * Puni ekran; 3D se crta u trajni canvas (F6), ova sekcija daje prostor i hint.
 */
export function CursorStageSection() {
  return (
    <section id="atelier" aria-hidden="true" className="cursor-stage relative h-[100dvh] min-h-[38rem]" data-stage-anchor="atelier">
      <p className="label muted absolute inset-x-0 bottom-8 text-center" data-hint>
        <span className="hidden md:inline">{ui.dragHint}</span>
        <span className="md:hidden">{ui.dragHintTouch}</span>
      </p>
    </section>
  );
}
