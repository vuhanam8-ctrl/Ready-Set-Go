import { C as Live2DError, E as Live2DErrorOptions, S as Live2DAssetType, T as Live2DErrorDetails, _ as MotionSequenceStep, a as Live2DBackend, b as StageHandle, c as ModelHandle, d as ModelTransform, f as MotionOptions, g as MotionSequenceResult, h as MotionPriority, i as Live2DAssetResolver, l as ModelInfo, m as MotionPlaybackStatus, n as IdleMotion, o as Live2DCanvasAccessibility, p as MotionPlaybackResult, r as IdleMotionOptions, s as LoadModelOptions, t as ExpressionOptions, u as ModelParameterInfo, v as Point, w as Live2DErrorCode, x as StageOptions, y as Size } from "./contract-Jj-UVMwt.mjs";
import { n as fitModel, t as ModelFit } from "./fit-CFnXF6-R.mjs";
import { S as LipSyncProfileInput, _ as isMobileViewport, a as Live2DModelHandle, b as selectLowerResolution, d as RuntimeRenderState, g as ResolvedAutoQualityPolicy, h as QualityInput, i as Live2DInstance, l as RuntimeLoadingStage, m as DEFAULT_AUTO_QUALITY_POLICY, n as CreateLive2DOptions, o as Live2DRuntimeState, p as AutoQualityPolicy, r as LipSyncDriver, s as ParameterDriver, t as AddModelOptions, v as resolveAutoQualityPolicy, x as LipSyncProfile, y as selectInitialResolution } from "./runtime-DmtpZk--.mjs";
import { n as ensureCubismCore, t as OFFICIAL_CUBISM_CORE_URL } from "./ensureCubismCore-CbblxXsG.mjs";
import { CSSProperties, ReactNode } from "react";
//#region src/react/controller.d.ts
interface Live2DModelController {
  /** Plays a motion. Resolves when playback finishes (or is interrupted). */
  motion: (group: string, index?: number, options?: MotionOptions) => Promise<void>;
  playMotion: (group: string, index?: number, options?: MotionOptions) => Promise<MotionPlaybackResult>;
  sequence: (steps: readonly MotionSequenceStep[]) => Promise<MotionSequenceResult>;
  isMotionPlaying: () => boolean;
  expression: (id?: string, options?: ExpressionOptions) => Promise<void>;
  clearExpression: () => void;
  getModelInfo: () => ModelInfo;
  focus: (x: number, y: number) => void;
  getParameter: (id: string) => number;
  /** Persistent override until clearParameter() removes it. */
  setParameter: (id: string, value: number) => void;
  clearParameter: (id: string) => void;
  /** Writes a transient value after every SDK update. */
  addParameterDriver: (id: string, driver: ParameterDriver) => () => void;
}
//#endregion
//#region src/react/store.d.ts
type LoadingStage = 'core' | 'stage' | 'model';
interface Live2DCanvasState {
  status: 'loading' | 'ready' | 'error';
  loadingStage?: LoadingStage;
  error?: Live2DError;
  render?: {
    width: number;
    height: number;
    resolution: number;
    bufferPixels: number;
  };
  retry: () => void;
}
//#endregion
//#region src/react/hooks.d.ts
declare function useLive2DCanvas(): Live2DCanvasState;
declare function useLive2DModel(): Live2DModelController | null;
declare function useLive2DParameter(id: string, value: number): void;
interface UseLive2DOptions extends Omit<CreateLive2DOptions, 'container'> {
  /** Pass null until the container ref is attached. */
  container: HTMLElement | null;
}
interface UseLive2DResult {
  error: Live2DError | undefined;
  /** Non-null once the model is ready. */
  instance: Live2DInstance | null;
  /** Disposes the current generation and starts a fresh one. */
  retry: () => void;
  state: Live2DRuntimeState;
}
/**
 * Owns a vanilla Live2D instance from React: creation, StrictMode replays,
 * state subscription and disposal. Changing container or src recreates the
 * instance; change other options by remounting with a key.
 */
declare function useLive2D(options: UseLive2DOptions): UseLive2DResult;
declare function useParameterDriver(id: string, getter: () => number): void;
//#endregion
//#region src/react/LipSync.d.ts
interface LipSyncErrorProps {
  onError?: (error: Live2DError) => void;
  /** Mouth parameter to drive. Default ParamMouthOpenY. */
  parameterId?: string;
}
type LipSyncProps = LipSyncErrorProps & {
  driver: LipSyncDriver;
  source?: never;
  active?: never;
  profile?: never;
  mouthOpen?: never;
  speaking?: never;
} | LipSyncErrorProps & {
  source: AudioNode | null;
  active: boolean;
  profile: string | URL | ArrayBuffer | LipSyncProfile;
  driver?: never;
  mouthOpen?: never;
  speaking?: never;
} | LipSyncErrorProps & {
  /** Latest mouth openness (0-1). Plain values; no stable ref needed. */
  mouthOpen: number;
  speaking: boolean;
  driver?: never;
  source?: never;
  active?: never;
  profile?: never;
};
declare function LipSync(props: LipSyncProps): null;
//#endregion
//#region src/react/Live2DCanvas.d.ts
interface BaseLive2DCanvasProps {
  /** Optional accessibility semantics for the rendered canvas. */
  accessibility?: Live2DCanvasAccessibility;
  /**
   * Omit to use the official Framework-based cubism-webgl adapter. A changed
   * backend reloads the model, so keep the value stable: use the exported
   * `cubismWebGL` instance, or hoist `createCubismWebGLBackend()` out of render
   * (module scope or `useMemo`) instead of calling it inline.
   */
  backend?: Live2DBackend;
  coreUrl?: string;
  maxFps?: number;
  /** Pause rendering while the canvas is outside the viewport. Default true. */
  pauseWhenOffscreen?: boolean;
  className?: string;
  style?: CSSProperties;
  fallback?: (stage: LoadingStage) => ReactNode;
  errorFallback?: (error: Live2DError, retry: () => void) => ReactNode;
  onError?: (error: Live2DError) => void;
  /** Pauses rendering for the whole canvas, models included. */
  paused?: boolean;
  children?: ReactNode;
}
type Live2DCanvasQualityProps = {
  quality?: 'auto' | AutoQualityPolicy;
  resolution?: never;
} | {
  quality?: never;
  resolution: number;
};
type Live2DCanvasProps = BaseLive2DCanvasProps & Live2DCanvasQualityProps;
declare function Live2DCanvas(props: Live2DCanvasProps): import("react").JSX.Element;
//#endregion
//#region src/react/Live2DModel.d.ts
interface Live2DModelProps {
  src: string;
  /**
   * Supplies the model's files instead of fetching them. `src` then names a
   * path inside that source. Keep the function referentially stable (useCallback
   * or a module constant): a new identity reloads the model.
   */
  resolveAsset?: Live2DAssetResolver;
  fit?: ModelFit;
  /**
   * Shows the placement overlay over the canvas so `fit` can be found by
   * dragging. The overlay is loaded on demand and reports what it applies
   * through `onFitChange`, which a controlled `fit` needs to keep the value.
   */
  debug?: boolean;
  /** Receives every placement the debug overlay applies. */
  onFitChange?: (fit: ModelFit) => void;
  /** Make the model look toward the pointer while it is over the canvas. */
  followPointer?: boolean;
  /** Idle motion group name (default 'Idle'), or false to disable idle playback. */
  idleMotion?: IdleMotion;
  /** Pauses rendering declaratively (e.g. while a modal is open). */
  paused?: boolean;
  /** Retries after the initial attempt. */
  retries?: number;
  onLoad?: (model: Live2DModelController) => void;
  onError?: (error: Live2DError) => void;
  /** Called on canvas taps with the hit-area names under the pointer. */
  onTap?: (hitAreas: string[], event: MouseEvent) => void;
  children?: ReactNode;
}
declare function Live2DModel({ children, debug, fit, followPointer, idleMotion, onError, onFitChange, onLoad, onTap, paused, resolveAsset, retries, src }: Live2DModelProps): import("react").JSX.Element;
//#endregion
export { type AddModelOptions, type AutoQualityPolicy, type CreateLive2DOptions, DEFAULT_AUTO_QUALITY_POLICY, type ExpressionOptions, type IdleMotion, type IdleMotionOptions, LipSync, type LipSyncDriver, type LipSyncProfile, type LipSyncProfileInput, type LipSyncProps, type Live2DAssetResolver, type Live2DAssetType, type Live2DBackend, Live2DCanvas, type Live2DCanvasAccessibility, type Live2DCanvasProps, type Live2DCanvasQualityProps, type Live2DCanvasState, Live2DError, type Live2DErrorCode, type Live2DErrorDetails, type Live2DErrorOptions, type Live2DInstance, Live2DModel, type Live2DModelController, type Live2DModelHandle, type Live2DModelProps, type Live2DRuntimeState, type LoadModelOptions, type LoadingStage, type ModelFit, type ModelHandle, type ModelInfo, type ModelParameterInfo, type ModelTransform, type MotionOptions, type MotionPlaybackResult, type MotionPlaybackStatus, type MotionPriority, type MotionSequenceResult, type MotionSequenceStep, OFFICIAL_CUBISM_CORE_URL, type ParameterDriver, type Point, type QualityInput, type ResolvedAutoQualityPolicy, type RuntimeLoadingStage, type RuntimeRenderState, type Size, type StageHandle, type StageOptions, type UseLive2DOptions, type UseLive2DResult, ensureCubismCore, fitModel, isMobileViewport, resolveAutoQualityPolicy, selectInitialResolution, selectLowerResolution, useLive2D, useLive2DCanvas, useLive2DModel, useLive2DParameter, useParameterDriver };