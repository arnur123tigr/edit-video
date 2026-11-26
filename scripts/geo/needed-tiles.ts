/**
 * Считает, какие тайлы подложки увидит камера ролика, и печатает их список.
 * Запуск: npx tsx scripts/geo/needed-tiles.ts reel1 > tiles.txt
 */
import { FPS, tileKey, visibleTiles } from "../../src/geo/engine/geo";

const main = async () => {
  const reel = process.argv[2] ?? "reel1";
  const plan = await import(`../../src/geo/${reel}/plan`);
  const keys = new Set<string>();
  // весь мир на нижних уровнях — всегда (запасная подложка)
  for (let l = 0; l <= 3; l++) {
    const n = 2 ** l;
    for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) keys.add(`${l}/${x}/${y}`);
  }
  const frames = Math.ceil(plan.DURATION * FPS);
  for (let f = 0; f <= frames; f++) {
    for (const t of visibleTiles(plan.camAt(f / FPS), 96)) keys.add(tileKey(t));
  }
  process.stdout.write([...keys].join("\n") + "\n");
};
main();
