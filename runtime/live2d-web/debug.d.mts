import { t as ModelFit } from "./fit-CFnXF6-R.mjs";
//#region src/debug/placement.d.ts
/**
 * A `fit` object in stage-relative units, which is what the overlay edits.
 * `scale` multiplies the upper-body fit; the offsets are fractions of the
 * stage, so a placement found at one size still holds at another.
 */
interface DebugPlacement {
  scale: number;
  offsetX: number;
  offsetY: number;
}
//#endregion
//#region src/debug/index.d.ts
interface Live2DDebugTarget {
  setFit: (fit: ModelFit) => void;
  getFit: () => ModelFit;
}
interface Live2DDebugOverlay {
  /** Points the overlay at another model without remounting it. */
  setTarget: (target: Live2DDebugTarget) => void;
  /** Re-reads the target after something else changed the placement. */
  refresh: () => void;
  /** The placement currently applied, in the form the overlay writes. */
  getFit: () => ModelFit;
  dispose: () => void;
}
interface MountLive2DDebugOverlayOptions {
  target: Live2DDebugTarget;
  /** The element the model is rendered into. The overlay covers it. */
  container: HTMLElement;
  /**
   * Receives every placement the overlay applies. React consumers need this:
   * `fit` is a controlled prop there, so a value only written to the runtime is
   * reverted by the next render that passes the old one.
   */
  onChange?: (fit: ModelFit) => void;
}
/** Mounts a framework-free placement overlay over one loaded model. */
declare function mountLive2DDebugOverlay(options: MountLive2DDebugOverlayOptions): Live2DDebugOverlay;
//#endregion
export { type DebugPlacement, Live2DDebugOverlay, Live2DDebugTarget, MountLive2DDebugOverlayOptions, mountLive2DDebugOverlay };