//#region src/core/errors.d.ts
type Live2DErrorCode = 'browser-only' |
/** Cubism Core is not loaded and no working coreUrl was provided. */
'core-missing' |
/** The backend requires WebGL2 and the browser could not create it. */
'webgl-unsupported' |
/** An option or argument value is invalid; never retried. */
'invalid-props' |
/** A React component is mounted outside its required parent. */
'invalid-tree' |
/** Lip sync failed; only the feature stops, the stage keeps running. */
'lipsync-error' |
/** An optional tracking provider failed to initialize or infer a frame. */
'tracking-error' |
/** A model asset failed to fetch or parse (see details.assetType/url). */
'model-load-failed' |
/** The stage or renderer failed after setup (including context loss). */
'render-error' |
/** The backend rejected the call (e.g. a foreign StageHandle). */
'adapter-error';
type Live2DAssetType = 'core' | 'model3' | 'moc3' | 'texture' | 'physics' | 'pose' | 'user-data' | 'motion' | 'expression' | 'shader';
interface Live2DErrorDetails {
  readonly assetType?: Live2DAssetType;
  readonly backend?: string;
  readonly url?: string;
  readonly httpStatus?: number;
}
interface Live2DErrorOptions extends ErrorOptions {
  details?: Live2DErrorDetails;
}
declare class Live2DError extends Error {
  readonly code: Live2DErrorCode;
  readonly details?: Readonly<Live2DErrorDetails>;
  constructor(code: Live2DErrorCode, message: string, options?: Live2DErrorOptions);
}
//#endregion
//#region src/core/contract.d.ts
/**
 * Backend-neutral contracts. Keep renderer-specific concepts out of this file.
 */
interface Point {
  x: number;
  y: number;
}
interface Size {
  width: number;
  height: number;
}
interface ModelTransform extends Point {
  scale: number;
}
/** Optional semantics for the canvas exposed to assistive technologies. */
type Live2DCanvasAccessibility = {
  mode: 'decorative';
} | {
  mode?: 'image';
  label: string;
  describedBy?: string;
  fallbackText?: string;
};
interface StageOptions extends Size {
  accessibility?: Live2DCanvasAccessibility;
  /** Concrete backing-buffer multiplier selected by the React host. */
  resolution?: number;
  maxFps?: number;
}
interface StageHandle {
  resize: (width: number, height: number) => void;
  getSize: () => Size;
  getResolution: () => number;
  setResolution: (resolution: number) => void;
  /**
   * Re-describes the canvas for assistive technologies. Optional so backends
   * that do not own their canvas element keep the create-time value; a caller
   * that changes the semantics should not have to recreate the stage.
   */
  setAccessibility?: (accessibility: Live2DCanvasAccessibility | undefined) => void;
  /** Client coordinates to the backend's stage coordinate system. */
  toWorld: (clientX: number, clientY: number) => Point;
  pause: () => void;
  resume: () => void;
  /**
   * Runs after model updates and parameter drivers, but before rendering.
   * This is for engine work and metrics, never React state updates.
   */
  onFrame: (callback: (deltaMs: number) => void) => () => void;
  onError: (callback: (error: Live2DError) => void) => () => void;
  dispose: () => void;
}
interface ModelHandle {
  getIntrinsicSize: () => Size;
  setTransform: (transform: ModelTransform) => void;
  getParameter: (id: string) => number;
  /** Persists as a per-frame override until clearParameter() removes it. */
  setParameter: (id: string, value: number) => void;
  clearParameter: (id: string) => void;
  /** Stage-local coordinates, same space as toWorld() output. */
  focus: (x: number, y: number) => void;
  /** Hit-area names containing the stage-local point, in declaration order. */
  hitTest: (x: number, y: number) => string[];
  getModelInfo: () => ModelInfo;
  /**
   * Resolves when playback finishes (including interruption), not when it
   * starts. Resolves on dispose, and rejects if the stage reports a render
   * error, because the frame loop never restarts after one.
   */
  motion: (group: string, index?: number, options?: MotionOptions) => Promise<void>;
  /** Optional detailed playback capability for new runtime APIs. */
  playMotion?: (group: string, index?: number, options?: MotionOptions) => Promise<MotionPlaybackResult>;
  isMotionPlaying: () => boolean;
  expression: (id?: string, options?: ExpressionOptions) => Promise<void>;
  clearExpression: () => void;
  /**
   * Runs after the SDK motion manager has written its values, before render.
   * The returned unsubscribe function must be idempotent.
   */
  onAfterMotionUpdate: (callback: (deltaMs: number) => void) => () => void;
  /**
   * Runs after the SDK effects but before physics, so a value written here
   * drives the physics simulation instead of arriving too late for it. Head
   * pose needs this; a mouth value does not. Optional for backends that do not
   * own their frame loop, which fall back to onAfterMotionUpdate.
   */
  onBeforePhysicsUpdate?: (callback: (deltaMs: number) => void) => () => void;
  dispose: () => void;
}
type MotionPriority = 'force' | 'idle' | 'normal';
interface MotionOptions {
  /** Playback priority. 'force' interrupts anything (default). */
  priority?: MotionPriority;
  /** Overrides the motion-wide fade-in duration in milliseconds. */
  fadeInMs?: number;
  /** Overrides natural and interruption fade-out in milliseconds. */
  fadeOutMs?: number;
}
interface ExpressionOptions {
  /** Overrides the expression fade-in duration in milliseconds. */
  fadeInMs?: number;
  /** Overrides replacement fade-out duration in milliseconds. */
  fadeOutMs?: number;
}
type MotionPlaybackStatus = 'completed' | 'interrupted' | 'skipped' | 'disposed';
interface MotionPlaybackResult {
  status: MotionPlaybackStatus;
}
interface MotionSequenceStep {
  group: string;
  index?: number;
  options?: MotionOptions;
}
type MotionSequenceResult = {
  status: 'completed';
  completedSteps: number;
} | {
  status: Exclude<MotionPlaybackStatus, 'completed'>;
  completedSteps: number;
  stepIndex: number;
};
/** Range metadata for one parameter in the loaded Cubism model. */
interface ModelParameterInfo {
  id: string;
  minimum: number;
  maximum: number;
  defaultValue: number;
}
/** Version-neutral model metadata extracted from the model settings file. */
interface ModelInfo {
  expressions: string[];
  hitAreas: string[];
  /** Motion group name to motion count within that group. */
  motions: Record<string, number>;
  /** model3.json schema version, when the backend exposes it. */
  model3Version?: number;
  /** Core moc3 format enum, when the backend exposes it. */
  mocVersion?: number;
  /** Optional for compatibility with third-party backends written before v0.5. */
  parameters?: ModelParameterInfo[];
}
/**
 * Supplies a model's files from somewhere other than the network: an unpacked
 * archive held in memory, a browser storage layer, or any custom source.
 *
 * `path` is relative to the model3.json given as `src`, exactly as the model
 * declares it, already decoded (so non-ASCII filenames arrive readable).
 * Return `undefined` when the source has no such file; loading then fails with
 * `model-load-failed` naming that path.
 */
type Live2DAssetResolver = (path: string, signal?: AbortSignal) => Promise<Blob | ArrayBuffer | undefined> | Blob | ArrayBuffer | undefined;
interface IdleMotionOptions {
  group: string;
  weights: readonly number[];
}
type IdleMotion = string | false | IdleMotionOptions;
interface LoadModelOptions {
  /** Idle group, weighted group selection, or false to disable automatic idle playback. */
  idleMotion?: IdleMotion;
  /**
   * Loads the model's files instead of fetching them. With a resolver, `src`
   * is a path inside the source rather than a URL.
   */
  resolveAsset?: Live2DAssetResolver;
  signal?: AbortSignal;
}
interface Live2DBackend {
  createStage: (element: HTMLElement, options: StageOptions) => StageHandle;
  loadModel: (stage: StageHandle, url: string, options?: LoadModelOptions) => Promise<ModelHandle>;
}
//#endregion
export { Live2DError as C, Live2DErrorOptions as E, Live2DAssetType as S, Live2DErrorDetails as T, MotionSequenceStep as _, Live2DBackend as a, StageHandle as b, ModelHandle as c, ModelTransform as d, MotionOptions as f, MotionSequenceResult as g, MotionPriority as h, Live2DAssetResolver as i, ModelInfo as l, MotionPlaybackStatus as m, IdleMotion as n, Live2DCanvasAccessibility as o, MotionPlaybackResult as p, IdleMotionOptions as r, LoadModelOptions as s, ExpressionOptions as t, ModelParameterInfo as u, Point as v, Live2DErrorCode as w, StageOptions as x, Size as y };