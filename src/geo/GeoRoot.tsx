import React from "react";
import { Composition } from "remotion";
import { FPS, H, W } from "./engine/geo";
import { Reel1 } from "./reel1/Reel1";
import { DURATION as D1 } from "./reel1/plan";

/** Все ролики «Гео-карта» (9:16, 30 к/с). */
export const GeoCompositions: React.FC = () => (
  <>
    <Composition id="Geo1-Esil" component={Reel1} durationInFrames={Math.round(D1 * FPS)} fps={FPS} width={W} height={H} />
  </>
);

export const GeoRoot: React.FC = () => <GeoCompositions />;
