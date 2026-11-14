import { C as Live2DError, E as Live2DErrorOptions, S as Live2DAssetType, T as Live2DErrorDetails, _ as MotionSequenceStep, a as Live2DBackend, b as StageHandle, c as ModelHandle, d as ModelTransform, f as MotionOptions, g as MotionSequenceResult, h as MotionPriority, i as Live2DAssetResolver, l as ModelInfo, m as MotionPlaybackStatus, n as IdleMotion, o as Live2DCanvasAccessibility, p as MotionPlaybackResult, r as IdleMotionOptions, s as LoadModelOptions, t as ExpressionOptions, u as ModelParameterInfo, v as Point, w as Live2DErrorCode, x as StageOptions, y as Size } from "./contract-Jj-UVMwt.mjs";
import { n as fitModel, t as ModelFit } from "./fit-CFnXF6-R.mjs";
import { S as LipSyncProfileInput, _ as isMobileViewport, a as Live2DModelHandle, b as selectLowerResolution, c as RuntimeLipSyncOptions, d as RuntimeRenderState, f as createLive2D, g as ResolvedAutoQualityPolicy, h as QualityInput, i as Live2DInstance, l as RuntimeLoadingStage, m as DEFAULT_AUTO_QUALITY_POLICY, n as CreateLive2DOptions, o as Live2DRuntimeState, p as AutoQualityPolicy, r as LipSyncDriver, s as ParameterDriver, t as AddModelOptions, u as RuntimeQualityOptions, v as resolveAutoQualityPolicy, x as LipSyncProfile, y as selectInitialResolution } from "./runtime-DmtpZk--.mjs";
import { n as ensureCubismCore, t as OFFICIAL_CUBISM_CORE_URL } from "./ensureCubismCore-CbblxXsG.mjs";
//#region src/features/lipsync/mouthController.d.ts
declare const MOUTH_PARAMETER_ID = "ParamMouthOpenY";
declare const MOUTH_RELEASE_MS = 200;
declare const MOUTH_HANDOFF_HOLD_MS = 500;
//#endregion
//#region src/features/lipsync/volume.d.ts
interface VolumeLipSyncDriver {
  sample: (rms: number, elapsedMs: number) => void;
  getMouthOpen: () => number;
  isSpeaking: () => boolean;
}
/**
 * Turns caller-sampled RMS volume into a stable mouth-open driver.
 * The caller retains ownership of audio capture, analysis and scheduling.
 */
declare function createVolumeLipSync(): VolumeLipSyncDriver;
//#endregion
export { type AddModelOptions, type AutoQualityPolicy, type CreateLive2DOptions, DEFAULT_AUTO_QUALITY_POLICY, type ExpressionOptions, type IdleMotion, type IdleMotionOptions, type LipSyncDriver, type LipSyncProfile, type LipSyncProfileInput, type Live2DAssetResolver, type Live2DAssetType, type Live2DBackend, type Live2DCanvasAccessibility, Live2DError, type Live2DErrorCode, type Live2DErrorDetails, type Live2DErrorOptions, type Live2DInstance, type Live2DModelHandle, type Live2DRuntimeState, type LoadModelOptions, MOUTH_HANDOFF_HOLD_MS, MOUTH_PARAMETER_ID, MOUTH_RELEASE_MS, type ModelFit, type ModelHandle, type ModelInfo, type ModelParameterInfo, type ModelTransform, type MotionOptions, type MotionPlaybackResult, type MotionPlaybackStatus, type MotionPriority, type MotionSequenceResult, type MotionSequenceStep, OFFICIAL_CUBISM_CORE_URL, type ParameterDriver, type Point, type QualityInput, type ResolvedAutoQualityPolicy, type RuntimeLipSyncOptions, type RuntimeLoadingStage, type RuntimeQualityOptions, type RuntimeRenderState, type Size, type StageHandle, type StageOptions, type VolumeLipSyncDriver, createLive2D, createVolumeLipSync, ensureCubismCore, fitModel, isMobileViewport, resolveAutoQualityPolicy, selectInitialResolution, selectLowerResolution };