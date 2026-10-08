import type { Metadata } from "next";
import { LutkaLab } from "@/components/lab/lutka-lab";

export const metadata: Metadata = { title: "Lab · lutka", robots: { index: false, follow: false } };

/** Testna ruta za F2 (11 §5): nije u navigaciji, noindex. */
export default function LabLutka() {
  return <LutkaLab />;
}
