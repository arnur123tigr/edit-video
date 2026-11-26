import { Composition } from "remotion";
import { MyComposition } from "./Composition";
import { DURATION_SEC, Reel01 } from "./reel01/Reel01";
import { FPS, H, W } from "./reel01/lib";
import { DURATION_SEC_02, Reel02 } from "./reel02/Reel02";
import { FontTest } from "./reel02/FontTest";
import { Reel02Sketch } from "./reel02/Reel02Sketch";
import { SketchBold, SketchColors, SketchThin } from "./reel02/SketchOptions";
import { PodcastFonts } from "./reel02/PodcastFonts";
import { GeoCompositions } from "./geo/GeoRoot";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <MyComposition />
      <Composition
        id="Reel01"
        component={Reel01}
        durationInFrames={Math.round(DURATION_SEC * FPS)}
        fps={FPS}
        width={W}
        height={H}
      />
      <Composition
        id="Reel02"
        component={Reel02}
        durationInFrames={Math.round(DURATION_SEC_02 * FPS)}
        fps={FPS}
        width={W}
        height={H}
      />
      <Composition id="FontTest" component={FontTest} durationInFrames={1} fps={30} width={1650} height={1938} />
      <Composition id="Reel02Sketch" component={Reel02Sketch} durationInFrames={Math.round(DURATION_SEC_02 * FPS)} fps={FPS} width={W} height={H} />
      <Composition id="SketchColors" component={SketchColors} durationInFrames={1} fps={30} width={2192} height={2584} />
      <Composition id="SketchBold" component={SketchBold} durationInFrames={1} fps={30} width={2192} height={2584} />
      <Composition id="SketchThin" component={SketchThin} durationInFrames={1} fps={30} width={2192} height={2584} />
      <GeoCompositions />
      <Composition id="PodcastFonts" component={PodcastFonts} durationInFrames={1} fps={30} width={2192} height={2584} />
    </>
  );
};
