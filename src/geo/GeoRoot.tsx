import React from "react";
import { Composition } from "remotion";
import { FPS, H, W } from "./engine/geo";
import { Reel1 } from "./reel1/Reel1";
import { DURATION as D1 } from "./reel1/plan";
import { Reel2 } from "./reel2/Reel2";
import { DURATION as D2 } from "./reel2/plan";
import { Reel3 } from "./reel3/Reel3";
import { DURATION as D3 } from "./reel3/plan";

/** Все ролики «Гео-карта» (9:16, 30 к/с). */
export const GeoCompositions: React.FC = () => (
  <>
    <Composition id="Geo1-Esil" component={Reel1} durationInFrames={Math.round(D1 * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="Geo2-Karagiye" component={Reel2} durationInFrames={Math.round(D2 * FPS)} fps={FPS} width={W} height={H} />
    <Composition id="Geo3-Africa" component={Reel3} durationInFrames={Math.round(D3 * FPS)} fps={FPS} width={W} height={H} />
  </>
);

export const GeoRoot: React.FC = () => <GeoCompositions />;
