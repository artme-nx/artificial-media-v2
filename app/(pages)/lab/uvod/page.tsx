import type { Metadata } from "next";
import { UvodLab } from "@/components/lab/uvod-lab";

export const metadata: Metadata = { title: "Lab · uvod", robots: { index: false, follow: false } };

/** Testna ruta za F4: 3D dio kazališnog uvoda, ?p=0..1 (kadrovi 6–10), ?ples=1 (kadar 2). Nije u navigaciji. */
export default function LabUvod() {
  return <UvodLab />;
}
