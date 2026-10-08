import type { Metadata } from "next";
import { ScenaLab } from "@/components/lab/scena-lab";

export const metadata: Metadata = { title: "Lab · scena", robots: { index: false, follow: false } };

/** Testna ruta za F3: dirigent i orkestar na pozornici. Nije u navigaciji, noindex. */
export default function LabScena() {
  return <ScenaLab />;
}
