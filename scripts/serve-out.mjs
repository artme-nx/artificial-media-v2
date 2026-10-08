#!/usr/bin/env node
/** Poslužuje out/ pod basePathom /artificial-media-v2/ (kao GitHub Pages) za testiranje produkcijskog builda. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "out");
const BASE = "/artificial-media-v2";
const PORT = Number(process.env.PORT || 3108);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif",
  ".woff2": "font/woff2", ".txt": "text/plain", ".ico": "image/x-icon", ".ktx2": "image/ktx2", ".bin": "application/octet-stream",
  ".hdr": "application/octet-stream", ".mp4": "video/mp4", ".webmanifest": "application/manifest+json",
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    if (url === "/" || url === "") { res.writeHead(302, { Location: BASE + "/" }); return res.end(); }
    if (!url.startsWith(BASE)) { res.writeHead(404); return res.end("404 (izvan basePatha)"); }
    let p = path.join(ROOT, url.slice(BASE.length));
    if (!p.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
    if (!fs.existsSync(p)) {
      const nf = path.join(ROOT, "404.html");
      res.writeHead(404, { "Content-Type": TYPES[".html"] });
      return res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : "404");
    }
    const type = TYPES[path.extname(p)] || "application/octet-stream";
    // gzip za tekst (kao GitHub Pages), da lokalni Lighthouse mjeri iste veličine prijenosa
    if (/text|javascript|json|svg/.test(type) && /gzip/.test(String(req.headers["accept-encoding"] || ""))) {
      res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache", "Content-Encoding": "gzip", Vary: "Accept-Encoding" });
      return fs.createReadStream(p).pipe(zlib.createGzip({ level: 6 })).pipe(res);
    }
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
    fs.createReadStream(p).pipe(res);
  })
  .listen(PORT, () => console.log(`[serve-out] http://localhost:${PORT}${BASE}/`));
