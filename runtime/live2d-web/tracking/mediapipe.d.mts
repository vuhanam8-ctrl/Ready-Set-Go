import { l as ModelInfo } from "../contract-Jj-UVMwt.mjs";
import { s as ParameterDriver } from "../runtime-DmtpZk--.mjs";
//#region src/tracking/mediapipe/types.d.ts
type MediaPipeModelAsset = {
  modelAssetPath: string;
  modelAssetBuffer?: never;
} | {
  modelAssetBuffer: Uint8Array;
  modelAssetPath?: never;
};
interface CreateMediaPipeFaceTrackerBaseOptions {
  wasmPath: string;
  delegate?: 'CPU' | 'GPU';
  maxFps?: number;
  /** True only when the pixels passed to update(), rather than CSS preview, are mirrored. */
  inputMirrored?: boolean;
  /** 0..1, default 0.4. MediaPipe's own default of 0.5 drops a head turn early. */
  minFaceDetectionConfidence?: number;
  /** 0..1, default 0.4. */
  minFacePresenceConfidence?: number;
  /**
   * 0..1, default 0.3. Lowest of the three: keeping a face already found is
   * what carries a profile turn, and losing it snaps the head back.
   */
  minTrackingConfidence?: number;
  /** What the head does while the face is lost. Default 'hold'. */
  onFaceLost?: MediaPipeFaceLostBehaviour;
  signal?: AbortSignal;
}
interface CreateMediaPipeMainThreadOptions {
  execution?: 'main';
  workerFactory?: never;
}
interface CreateMediaPipeWorkerOptions {
  execution: 'worker';
  workerFactory: () => Worker;
}
type CreateMediaPipeMainThreadFaceTrackerOptions = CreateMediaPipeFaceTrackerBaseOptions & MediaPipeModelAsset & CreateMediaPipeMainThreadOptions;
type CreateMediaPipeWorkerFaceTrackerOptions = CreateMediaPipeFaceTrackerBaseOptions & MediaPipeModelAsset & CreateMediaPipeWorkerOptions;
type CreateMediaPipeFaceTrackerOptions = CreateMediaPipeMainThreadFaceTrackerOptions | CreateMediaPipeWorkerFaceTrackerOptions;
type MediaPipeFaceChannel = 'pose' | 'eyes' | 'brows' | 'mouth' | 'cheeks';
type MediaPipeMappingMode = 'auto' | 'standard' | 'perfect-sync';
type MediaPipeFaceLostBehaviour = 'hold' | 'neutral';
interface MediaPipeAttachOptions {
  mapping?: MediaPipeMappingMode;
  channels?: Partial<Record<MediaPipeFaceChannel, boolean>>;
  /**
   * Per-channel multiplier applied before the model's parameter range, 0.1
   * through 5, default 1. MediaPipe reports head rotation conservatively, so
   * pose usually needs more than 1 to feel like the wearer's own movement.
   */
  sensitivity?: Partial<Record<MediaPipeFaceChannel, number>>;
}
interface MediaPipeParameterTarget {
  getModelInfo: () => ModelInfo;
  addParameterDriver: (id: string, driver: ParameterDriver) => () => void;
}
type MediaPipeFaceTrackingUpdate = {
  status: 'skipped';
} | {
  status: 'calibrating' | 'tracked' | 'lost';
  inferenceMs: number;
  /** Current inference cap. Falls below `maxFps` while inference is too slow for it. */
  effectiveFps: number;
};
interface MediaPipeFaceTracker {
  update: (source: TexImageSource, timestampMs: number) => MediaPipeFaceTrackingUpdate;
  attach: (target: MediaPipeParameterTarget, options?: MediaPipeAttachOptions) => () => void;
  calibrate: () => void;
  isTracking: () => boolean;
  dispose: () => void;
}
interface MediaPipeWorkerFaceTracker {
  update: (source: TexImageSource, timestampMs: number) => Promise<MediaPipeFaceTrackingUpdate>;
  attach: MediaPipeFaceTracker['attach'];
  calibrate: () => void;
  isTracking: () => boolean;
  dispose: () => void;
}
//#endregion
//#region src/core/perfect-sync.d.ts
declare const PERFECT_SYNC_PARAMETER_IDS: readonly string[];
//#endregion
//#region src/tracking/mediapipe/blendshapes.d.ts
declare const MEDIAPIPE_BLENDSHAPES: readonly ["_neutral", "browDownLeft", "browDownRight", "browInnerUp", "browOuterUpLeft", "browOuterUpRight", "cheekPuff", "cheekSquintLeft", "cheekSquintRight", "eyeBlinkLeft", "eyeBlinkRight", "eyeLookDownLeft", "eyeLookDownRight", "eyeLookInLeft", "eyeLookInRight", "eyeLookOutLeft", "eyeLookOutRight", "eyeLookUpLeft", "eyeLookUpRight", "eyeSquintLeft", "eyeSquintRight", "eyeWideLeft", "eyeWideRight", "jawForward", "jawLeft", "jawOpen", "jawRight", "mouthClose", "mouthDimpleLeft", "mouthDimpleRight", "mouthFrownLeft", "mouthFrownRight", "mouthFunnel", "mouthLeft", "mouthLowerDownLeft", "mouthLowerDownRight", "mouthPressLeft", "mouthPressRight", "mouthPucker", "mouthRight", "mouthRollLower", "mouthRollUpper", "mouthShrugLower", "mouthShrugUpper", "mouthSmileLeft", "mouthSmileRight", "mouthStretchLeft", "mouthStretchRight", "mouthUpperUpLeft", "mouthUpperUpRight", "noseSneerLeft", "noseSneerRight"];
//#endregion
//#region src/tracking/mediapipe/index.d.ts
declare function createMediaPipeFaceTracker(options: CreateMediaPipeWorkerFaceTrackerOptions): Promise<MediaPipeWorkerFaceTracker>;
declare function createMediaPipeFaceTracker(options: CreateMediaPipeMainThreadFaceTrackerOptions): Promise<MediaPipeFaceTracker>;
//#endregion
export { type CreateMediaPipeFaceTrackerBaseOptions, type CreateMediaPipeFaceTrackerOptions, type CreateMediaPipeMainThreadFaceTrackerOptions, type CreateMediaPipeMainThreadOptions, type CreateMediaPipeWorkerFaceTrackerOptions, type CreateMediaPipeWorkerOptions, MEDIAPIPE_BLENDSHAPES, type MediaPipeAttachOptions, type MediaPipeFaceChannel, type MediaPipeFaceLostBehaviour, type MediaPipeFaceTracker, type MediaPipeFaceTrackingUpdate, type MediaPipeMappingMode, type MediaPipeModelAsset, type MediaPipeParameterTarget, type MediaPipeWorkerFaceTracker, PERFECT_SYNC_PARAMETER_IDS, createMediaPipeFaceTracker };