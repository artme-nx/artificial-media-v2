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
  return (
    <Tag className={className} style={style} data-status={s.status} data-source={s.source} {...rest}>
      {kernW(s.text)}
    </Tag>
  );
}

/**
 * Ručni kerning za Bodoni (izjave, nazivi usluga, FAQ): "W" ima široku desnu bočnu marginu, pa "We", "Wh", "Wo" na
 * većim veličinama djeluju kao dvije riječi. Slovo W se omota u span.kw; razmak se primjenjuje samo u display fontu
 * (CSS: .statement .kw, .faq-q .kw). textContent ostaje isti.
 */
export function kernW(text: string): React.ReactNode {
  if (!/W[a-z]/.test(text)) return text;
  const out: React.ReactNode[] = [];
  let buf = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (ch === "W" && next && /[a-z]/.test(next)) {
      if (buf) out.push(buf);
      buf = "";
      out.push(
        <span key={i} className="kw">
          W
        </span>,
      );
    } else buf += ch;
  }
  if (buf) out.push(buf);
  return out;
}
