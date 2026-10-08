import type { Str } from "@/content/site";

/**
 * Tekst iz content/site.ts s oznakom statusa (data-status) i izvora (data-source).
 * Na ?status=1 (components/status-overlay.tsx) svaki string pokazuje status — za Kristianov pregled.
 */
export function T({
  s,
  as: Tag = "span",
  className,
  style,
  ...rest
}: { s: Str; as?: React.ElementType; className?: string; style?: React.CSSProperties } & Record<`data-${string}`, string | boolean | undefined>) {
  const display = typeof className === "string" && /\bstatement\b/.test(className);
  return (
    <Tag className={className} style={style} data-status={s.status} data-source={s.source} {...rest}>
      {display ? kernDisplay(s.text) : s.text}
    </Tag>
  );
}

/**
 * Ručni kerning za Bodoni u izjavama: "W" ima široku desnu bočnu marginu, pa "We", "Wh", "Wo" na velikim veličinama
 * djeluju kao dvije riječi. textContent ostaje isti (samo omotač oko slova W).
 */
const PAIRS: Record<string, number> = { e: -0.05, h: -0.055, o: -0.05, a: -0.045, i: -0.03, r: -0.03 };
function kernDisplay(text: string): React.ReactNode {
  if (!text.includes("W")) return text;
  const out: React.ReactNode[] = [];
  let buf = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (ch === "W" && next && PAIRS[next] !== undefined) {
      if (buf) out.push(buf);
      buf = "";
      out.push(
        <span key={i} style={{ letterSpacing: `${PAIRS[next]}em` }}>
          W
        </span>,
      );
    } else buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}
