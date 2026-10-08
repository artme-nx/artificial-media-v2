/** Sve putanje do statičnih datoteka (teksture, nizovi slika, posteri) idu kroz basePath. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const asset = (p: string) => `${BASE_PATH}${p.startsWith("/") ? p : `/${p}`}`;
