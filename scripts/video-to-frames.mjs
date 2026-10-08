#!/usr/bin/env node
/**
 * Seedance (ili bilo koji) video → niz slika za ScrollSequence (11 §3 "Niz slika umjesto videa", F9).
 * Isti oblik mape kao scripts/render-sequences.mjs: public/seq/<niz>-<varijanta>/NNN.webp + manifest.json.
 * 4K video nikad ne ide u repo (brief §5): ovdje se koristi samo kao izvor; u repo idu smanjeni frameovi.
 *
 *   node scripts/video-to-frames.mjs <video.mp4> <niz> <desk|mob> [--frames=96] [--width=1600] [--quality=72] [--from=0] [--to=end]
 *   npr. node scripts/video-to-frames.mjs ~/Downloads/balet-4k.mp4 balet desk --frames=120
 *
 * Nizovi koje stranica čita: ples (kadar 2 uvoda), uvod (kadrovi 6–10), balet (manifest). Isti broj frameova nije
 * nužan — ScrollSequence čita count iz manifest.json. Treba ffmpeg i ffprobe (brew install ffmpeg).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const [video, name, variant] = process.argv.slice(2);
const opt = Object.fromEntries(process.argv.slice(5).map((a) => a.replace(/^--/, "").split("=")));
if (!video || !name || !["desk", "mob"].includes(variant)) {
  console.error("upotreba: node scripts/video-to-frames.mjs <video> <niz> <desk|mob> [--frames=96] [--width=1600] [--quality=72] [--from=s] [--to=s]");
  process.exit(1);
}
const frames = Number(opt.frames ?? 96);
const width = Number(opt.width ?? (variant === "desk" ? 1600 : 720));
const quality = Number(opt.quality ?? 72);
const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", video]).toString());
const dur = Number(probe.format.duration);
const from = Number(opt.from ?? 0), to = opt.to ? Number(opt.to) : dur;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "v2f-"));
// ravnomjerno uzorkovanje frameova kroz [from, to]; ffmpeg izvlači PNG, sharp smanjuje u WebP
const fps = frames / Math.max(0.01, to - from);
execFileSync("ffmpeg", ["-v", "error", "-ss", String(from), "-to", String(to), "-i", video, "-vf", `fps=${fps}`, "-frames:v", String(frames), path.join(tmp, "%04d.png")]);
const out = path.join(process.cwd(), "public", "seq", `${name}-${variant}`);
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const pngs = fs.readdirSync(tmp).filter((f) => f.endsWith(".png")).sort();
let bytes = 0, w = 0, h = 0;
for (const [i, f] of pngs.entries()) {
  const file = path.join(out, `${String(i).padStart(3, "0")}.webp`);
  const info = await sharp(path.join(tmp, f)).resize({ width, kernel: "lanczos3" }).webp({ quality, effort: 5 }).toFile(file);
  w = info.width;
  h = info.height;
  bytes += fs.statSync(file).size;
}
fs.writeFileSync(path.join(out, "manifest.json"), JSON.stringify({ name, variant, count: pngs.length, width: w, height: h, ext: "webp", source: path.basename(video), rendered: new Date().toISOString().slice(0, 10) }, null, 2));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${name}-${variant}: ${pngs.length} frameova ${w}×${h}, ${(bytes / 1024 / 1024).toFixed(1)} MB → ${path.relative(process.cwd(), out)}`);
