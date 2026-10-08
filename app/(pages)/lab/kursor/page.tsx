import type { Metadata } from "next";
import { KursorLab } from "@/components/lab/kursor-lab";

export const metadata: Metadata = { title: "Lab · kursor", robots: { index: false, follow: false } };

/** Testna ruta za F6: drvo / robot ispod kursora. Nije u navigaciji, noindex. */
export default function LabKursor() {
  return <KursorLab />;
}
