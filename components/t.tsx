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
      {s.text}
    </Tag>
  );
}
