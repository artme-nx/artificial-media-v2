import { test, expect } from "@playwright/test";
import { layout, blendPose, partMap, type Pose, type BallPart, type LathePart } from "../src/figure/kanon";
import { collisions, feetLows } from "../src/figure/checks";
import { getPose, allPoseNames } from "../src/motion/library";
import lutkaV2 from "../src/brand/lutka-v2.json";

/**
 * Provjere tijela (11 §3, kao test_paritet.py): nijedan dio ne prolazi kroz drugi i stopala ne propadaju kroz pod
 * ni u jednoj pozi ni u 41 točki svakog scroll-niza. Bez preglednika — samo matematika kanona.
 */
test.describe("lutka: sudari i pod", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== "desktop-1440", "jednom je dovoljno"));

  const floorOk = (p: Pose) => {
    const lows = feetLows(layout(p));
    const vals = Object.values(lows);
    const min = Math.min(...vals), max = Math.max(...vals);
    if (p.support) return min > -0.012 && Math.abs(lows["foot" + p.support]) < 0.02;
    return min > -0.012 && max < 0.02;
  };

  for (const name of allPoseNames()) {
    test(`poza ${name}`, () => {
      const p = getPose(name);
      expect(collisions(layout(p)), name).toEqual([]);
      expect(floorOk(p), `${name}: stopala ${JSON.stringify(feetLows(layout(p)))}`).toBe(true);
    });
  }

  const SEQUENCES: Record<string, Array<[number, string]>> = {
    // baletna scena (07, 6. 10.): port de bras → révérence
    balet: [[0, "b_enhaut"], [0.08, "b_enhaut"], [0.36, "b_seconde"], [0.6, "b_bas"], [0.88, "b_reverence"], [1, "b_reverence"]],
  };
  for (const [seq, keys] of Object.entries(SEQUENCES)) {
    test(`niz ${seq}: 41 točka`, () => {
      const bad: string[] = [];
      for (let i = 0; i <= 40; i++) {
        const u = i / 40;
        let p: Pose = getPose(keys[0][1] as never);
        for (let k = 0; k < keys.length - 1; k++) {
          const [a, na] = keys[k], [b, nb] = keys[k + 1];
          if (u >= a && u <= b) {
            let w = b === a ? 0 : (u - a) / (b - a);
            w = w * w * (3 - 2 * w);
            p = blendPose(getPose(na as never), getPose(nb as never), w);
            break;
          }
        }
        const c = collisions(layout(p));
        if (c.length) bad.push(`${u.toFixed(3)}: ${JSON.stringify(c)}`);
        if (!floorOk(p)) bad.push(`${u.toFixed(3)}: pod ${JSON.stringify(feetLows(layout(p)))}`);
      }
      expect(bad).toEqual([]);
    });
  }

  test("dirigent: kutovi iz lutka-v2.json vraćaju isti raspored", () => {
    const P = partMap(layout(getPose("dirigent")));
    let worst = 0;
    for (const q of (lutkaV2 as unknown as { pose: Array<Record<string, unknown>> }).pose) {
      const p = P[q.n as string];
      const a = (q.k === "ball" ? q.c : q.S) as number[];
      const b = p.k === "ball" ? (p as BallPart).c : (p as LathePart).S;
      worst = Math.max(worst, ...a.map((v, i) => Math.abs(v - b[i])));
    }
    expect(worst).toBeLessThan(0.02);
  });
});
