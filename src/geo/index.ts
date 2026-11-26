/**
 * Отдельная точка входа для гео-карт: рендерится без шрифтов из интернета.
 * npx remotion render src/geo/index.ts Geo1-Esil out/geo1.mp4
 */
import { registerRoot } from "remotion";
import { GeoRoot } from "./GeoRoot";

registerRoot(GeoRoot);
