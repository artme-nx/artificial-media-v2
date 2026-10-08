"use client";

import { useEffect } from "react";

/** ?status=1 → obrubi i oznake statusa na svim stringovima iz content/site.ts (pregled za Kristiana). */
export function StatusOverlay() {
  useEffect(() => {
    if (new URLSearchParams(location.search).get("status") !== "1") return;
    document.documentElement.dataset.showStatus = "1";
    for (const el of document.querySelectorAll<HTMLElement>("[data-status]")) el.title = `${el.dataset.status} · ${el.dataset.source}`;
  }, []);
  return null;
}
