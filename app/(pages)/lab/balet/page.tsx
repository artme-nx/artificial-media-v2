import type { Metadata } from "next";
import { BaletLab } from "@/components/lab/balet-lab";

export const metadata: Metadata = { title: "Lab · balet", robots: { index: false, follow: false } };

/** Testna ruta za F5: baletna scena manifesta (?p=0..1, ?kruzenje=0|1). Nije u navigaciji, noindex. */
export default function LabBalet() {
  return <BaletLab />;
}
