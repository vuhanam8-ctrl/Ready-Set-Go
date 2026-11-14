import { C as Live2DError, _ as MotionSequenceStep, a as Live2DBackend, f as MotionOptions, g as MotionSequenceResult, i as Live2DAssetResolver, l as ModelInfo, n as IdleMotion, o as Live2DCanvasAccessibility, p as MotionPlaybackResult, t as ExpressionOptions } from "./contract-Jj-UVMwt.mjs";
import { t as ModelFit } from "./fit-CFnXF6-R.mjs";
import { Profile } from "wlipsync";
//#region src/features/lipsync/source.d.ts
type LipSyncProfile = Profile;
type LipSyncProfileInput = string | URL | ArrayBuffer | LipSyncProfile;
//#endregion
//#region src/core/quality.d.ts
declare const DEFAULT_AUTO_QUALITY_POLICY: {
  readonly desktopMaxResolution: 2;
  readonly desktopPixelBudget: 4000000;
  readonly longFrameMs: 33;
  readonly longFrameRatioThreshold: 0.05;
  readonly minResolution: 1;
  readonly mobileMaxResolution: 1.5;
  readonly mobilePixelBudget: 1500000;
  readonly resolutionStep: 0.25;
  readonly sampleWindowMs: 3000;
};
/** Overrides for the automatic quality policy. Omitted fields use DEFAULT_AUTO_QUALITY_POLICY. */
interface AutoQualityPolicy {
  /** Resolution (backing-buffer multiplier) cap on desktop. Default 2. */
  desktopMaxResolution?: number;
  /** Backing-buffer pixel cap on desktop. Default 4,000,000. */
  desktopPixelBudget?: number;
  /** Frame duration counted as "long". Default 33 ms. */
  longFrameMs?: number;
  /** Long-frame ratio that triggers a downshift. Default 0.05 (5%). */
  longFrameRatioThreshold?: number;
  /** Floor the resolution never drops below. Default 1. */
  minResolution?: number;
  /** Resolution cap on mobile viewports. Default 1.5. */
  mobileMaxResolution?: number;
  /** Backing-buffer pixel cap on mobile. Default 1,500,000. */
  mobilePixelBudget?: number;
  /** Amount removed per downshift. Default 0.25. */
  resolutionStep?: number;
  /** Measurement window per downshift decision. Default 3,000 ms. */
  sampleWindowMs?: number;
}
interface ResolvedAutoQualityPolicy {
  desktopMaxResolution: number;
  desktopPixelBudget: number;
  longFrameMs: number;
  longFrameRatioThreshold: number;
  minResolution: number;
  mobileMaxResolution: number;
  mobilePixelBudget: number;
  resolutionStep: number;
  sampleWindowMs: number;
}
interface QualityInput {
  width: number;
  height: number;
  devicePixelRatio: number;
  mobile: boolean;
}
declare function resolveAutoQualityPolicy(policy?: AutoQualityPolicy): ResolvedAutoQualityPolicy;
declare function selectInitialResolution(input: QualityInput, policy?: ResolvedAutoQualityPolicy): number;
declare function selectLowerResolution(current: number, longFrameRatio: number, policy?: ResolvedAutoQualityPolicy): number;
declare function isMobileViewport(width: number, height: number): boolean;
//#endregion
//#region src/core/runtime.d.ts
type RuntimeLoadingStage = 'core' | 'stage' | 'model';
interface RuntimeRenderState {
  width: number;
  height: number;
  resolution: number;
  bufferPixels: number;
}
interface Live2DRuntimeState {
  status: 'loading' | 'ready' | 'error' | 'disposed';
  loadingStage?: RuntimeLoadingStage;
  error?: Live2DError;
  render?: RuntimeRenderState;
}
type RuntimeQualityOptions = {
  quality?: 'auto' | AutoQualityPolicy;
  resolution?: never;
} | {
  quality?: never;
  resolution: number;
};
/** A model added to a canvas that already exists. */
interface AddModelOptions {
  /** Same meaning as `src` on createLive2D(). */
  src: string;
  /** Defaults to the resolver the canvas was created with. */
  resolveAsset?: Live2DAssetResolver;
  /** Layout for this model alone. Default 'upper-body'. */
  fit?: ModelFit;
  /** Defaults to the idle motion the canvas was created with. */
  idleMotion?: IdleMotion;
  /** Defaults to the retry count the canvas was created with. */
  retries?: number;
  /** Make this model look toward the pointer. Default false. */
  followPointer?: boolean;
  /** Receives every placement this model's debug overlay applies. */
  onFitChange?: (fit: ModelFit) => void;
  /** Aborts this load. */
  signal?: AbortSignal;
}
/**
 * One model on a shared canvas. It carries what belongs to a model; pausing,
 * retrying and the canvas description stay on the instance that owns the stage.
 */
interface Live2DModelHandle {
  motion: (group: string, index?: number, options?: MotionOptions) => Promise<void>;
  playMotion: (group: string, index?: number, options?: MotionOptions) => Promise<MotionPlaybackResult>;
  sequence: (steps: readonly MotionSequenceStep[]) => Promise<MotionSequenceResult>;
  isMotionPlaying: () => boolean;
  expression: (id?: string, options?: ExpressionOptions) => Promise<void>;
  clearExpression: () => void;
  getModelInfo: () => ModelInfo;
  /** Stage-local coordinates, like the instance-level focus(). */
  focus: (x: number, y: number) => void;
  /** Like focus(), but takes viewport client coordinates. */
  focusAt: (clientX: number, clientY: number) => void;
  /** Hit areas of this model alone, from viewport client coordinates. */
  hitTest: (clientX: number, clientY: number) => string[];
  getParameter: (id: string) => number;
  setParameter: (id: string, value: number) => void;
  clearParameter: (id: string) => void;
  addParameterDriver: (id: string, driver: ParameterDriver) => () => void;
  addLipSync: (options: RuntimeLipSyncOptions) => () => void;
  /** Layout for this model alone. */
  setFit: (fit: ModelFit) => void;
  /** Shows the placement overlay for this model's layout. */
  setDebug: (enabled: boolean) => void;
  getFit: () => ModelFit;
  /** Removes this model and leaves the canvas and the others alone. */
  dispose: () => void;
}
interface BaseCreateLive2DOptions {
  /** Optional accessibility semantics for the backend canvas. */
  accessibility?: Live2DCanvasAccessibility;
  /** Element that receives the canvas. Must have a CSS size. */
  container: HTMLElement;
  /**
   * The model3.json file: a URL by default, or a path inside the source when
   * `resolveAsset` is given. Sibling assets load relative to it either way.
   *
   * Omit it to start with an empty canvas and fill it with addModel().
   */
  src?: string;
  /**
   * Supplies the model's files instead of fetching them, for models that live
   * in memory or in browser storage rather than on a server.
   */
  resolveAsset?: Live2DAssetResolver;
  /** Omit to use the official Framework-based cubism-webgl adapter. */
  backend?: Live2DBackend;
  /** URL of the official live2dcubismcore.min.js. Omit only when the Core global is already loaded. */
  coreUrl?: string;
  /**
   * Mounts the placement overlay over the container so `fit` can be found by
   * dragging instead of guessing. The entry is loaded on demand, so leaving
   * this off costs nothing. Default false.
   */
  debug?: boolean;
  /** Receives every placement the debug overlay applies. */
  onFitChange?: (fit: ModelFit) => void;
  /** Layout preset or custom scale/offset. Default 'upper-body'. */
  fit?: ModelFit;
  /** Make the model look toward the pointer while it is over the container. Default false. */
  followPointer?: boolean;
  /** Idle motion group name (default 'Idle'), or false to disable automatic idle playback. */
  idleMotion?: IdleMotion;
  /** Frame-rate cap. Omit for the display refresh rate. */
  maxFps?: number;
  /** Pause rendering while the container is outside the viewport. Default true. */
  pauseWhenOffscreen?: boolean;
  /** Model-load retry count for transient failures (default 2). HTTP 4xx never retries. */
  retries?: number;
  /** Aborts the initial load. */
  signal?: AbortSignal;
  /** Called for runtime errors after the instance became ready. */
  onError?: (error: Live2DError) => void;
}
type CreateLive2DOptions = BaseCreateLive2DOptions & RuntimeQualityOptions;
interface ParameterDriver {
  getValue: () => number;
  /**
   * Where in the frame the value is written. `'after-motion'` (the default)
   * wins over every effect and over manual overrides. `'before-physics'` feeds
   * physics instead, which head pose needs so hair and body follow the value;
   * the cost is that a manual setParameter() for the same id then wins.
   * Backends without the hook fall back to `'after-motion'`.
   */
  phase?: ParameterDriverPhase;
}
type ParameterDriverPhase = 'after-motion' | 'before-physics';
interface LipSyncDriver {
  getMouthOpen: () => number;
  isSpeaking: () => boolean;
}
type RuntimeLipSyncOptions = ({
  onError?: (error: Live2DError) => void;
  /** Mouth parameter to drive. Default ParamMouthOpenY. */
  parameterId?: string;
} & ({
  driver: LipSyncDriver;
} | {
  source: AudioNode;
  profile: LipSyncProfileInput;
  isSpeaking: () => boolean;
}));
interface Live2DInstance {
  /** Current lifecycle/render state snapshot. */
  readonly getState: () => Live2DRuntimeState;
  /** Notifies on state changes. Returns an idempotent unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Plays a motion. Resolves when playback finishes (or is interrupted). */
  motion: (group: string, index?: number, options?: MotionOptions) => Promise<void>;
  /** Plays a motion and reports how playback settled. */
  playMotion: (group: string, index?: number, options?: MotionOptions) => Promise<MotionPlaybackResult>;
  /** Plays validated motion steps until completion or the first interruption. */
  sequence: (steps: readonly MotionSequenceStep[]) => Promise<MotionSequenceResult>;
  /** True while any motion (including idle) is playing. */
  isMotionPlaying: () => boolean;
  /** Applies an expression by name, or a random one when omitted. */
  expression: (id?: string, options?: ExpressionOptions) => Promise<void>;
  /** Returns the model to its default (no expression) state. */
  clearExpression: () => void;
  /** Motion groups, expressions and hit areas declared by the model. */
  getModelInfo: () => ModelInfo;
  /** Makes the model look at a stage-local point (0,0 = container top-left, CSS pixels). */
  focus: (x: number, y: number) => void;
  /** Like focus(), but takes viewport client coordinates (e.g. PointerEvent clientX/Y). */
  focusAt: (clientX: number, clientY: number) => void;
  /** Hit-area names under the given client coordinates. Empty before ready. */
  hitTest: (clientX: number, clientY: number) => string[];
  /** Reads the current value of a Cubism parameter. */
  getParameter: (id: string) => number;
  /** Persistent per-frame override until clearParameter() removes it. */
  setParameter: (id: string, value: number) => void;
  /** Removes a setParameter() override so motion curves regain the parameter. */
  clearParameter: (id: string) => void;
  /** Changes the layout preset without reloading the model. */
  setFit: (fit: ModelFit) => void;
  /** Shows or hides the placement overlay without reloading the model. */
  setDebug: (enabled: boolean) => void;
  /** The layout currently applied, whether it came from options or setFit(). */
  getFit: () => ModelFit;
  /**
   * Re-describes the canvas for assistive technologies without reloading the
   * model. Backends that cannot re-describe their canvas keep the value given
   * at creation.
   */
  setAccessibility: (accessibility: Live2DCanvasAccessibility | undefined) => void;
  /** Writes a value after each SDK update. Returns an idempotent cleanup. */
  addParameterDriver: (id: string, driver: ParameterDriver) => () => void;
  /** Attaches lip sync. Returns an idempotent cleanup. */
  addLipSync: (options: RuntimeLipSyncOptions) => () => void;
  /**
   * Loads another model onto this canvas. A second character then costs a
   * model rather than a second WebGL context, which browsers cap. It draws
   * over the models already there.
   */
  addModel: (options: AddModelOptions) => Promise<Live2DModelHandle>;
  /** Pauses rendering until resume(). Hidden-tab/offscreen pauses stack separately. */
  pause: () => void;
  /** Releases a pause() call. Rendering resumes when no pause reason remains. */
  resume: () => void;
  /** Recreates the whole stage after a runtime error (e.g. context loss). */
  retry: () => Promise<void>;
  /** Releases the model, canvas and GL context. Safe to call twice. */
  dispose: () => void;
}
declare function createLive2D(options: CreateLive2DOptions): Promise<Live2DInstance>;
//#endregion
export { LipSyncProfileInput as S, isMobileViewport as _, Live2DModelHandle as a, selectLowerResolution as b, RuntimeLipSyncOptions as c, RuntimeRenderState as d, createLive2D as f, ResolvedAutoQualityPolicy as g, QualityInput as h, Live2DInstance as i, RuntimeLoadingStage as l, DEFAULT_AUTO_QUALITY_POLICY as m, CreateLive2DOptions as n, Live2DRuntimeState as o, AutoQualityPolicy as p, LipSyncDriver as r, ParameterDriver as s, AddModelOptions as t, RuntimeQualityOptions as u, resolveAutoQualityPolicy as v, LipSyncProfile as x, selectInitialResolution as y };