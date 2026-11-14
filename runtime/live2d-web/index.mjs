import { t as Live2DError } from "./errors-DjppR7Ty.mjs";
import { a as MOUTH_RELEASE_MS, c as resolveAutoQualityPolicy, d as fitModel, i as MOUTH_PARAMETER_ID, l as selectInitialResolution, m as ensureCubismCore, n as createLive2D, o as DEFAULT_AUTO_QUALITY_POLICY, p as OFFICIAL_CUBISM_CORE_URL, r as MOUTH_HANDOFF_HOLD_MS, s as isMobileViewport, u as selectLowerResolution } from "./runtime-CKhdT1Le.mjs";
//#region src/features/lipsync/volume.ts
const INITIAL_NOISE_FLOOR = .008;
const CALIBRATION_MS = 1500;
const CALIBRATION_SAMPLE_CAP = .04;
const NOISE_FLOOR_MULTIPLIER = 2.4;
const MINIMUM_THRESHOLD = .01;
const MINIMUM_DYNAMIC_RANGE = .045;
const DYNAMIC_RANGE_MULTIPLIER = 5;
const ATTACK_SMOOTHING = .45;
const RELEASE_SMOOTHING = .16;
const SPEAKING_ON_LEVEL = .12;
const SPEAKING_OFF_LEVEL = .05;
function finiteRms(value) {
	return Number.isFinite(value) ? Math.max(0, value) : 0;
}
function normalizedElapsed(value, previous) {
	if (!Number.isFinite(value)) return previous;
	return Math.max(previous, value, 0);
}
function clampUnit(value) {
	return Math.min(1, Math.max(0, value));
}
/**
* Turns caller-sampled RMS volume into a stable mouth-open driver.
* The caller retains ownership of audio capture, analysis and scheduling.
*/
function createVolumeLipSync() {
	let elapsedMs = 0;
	let mouthOpen = 0;
	let noiseFloor = INITIAL_NOISE_FLOOR;
	let speaking = false;
	return {
		sample(rawRms, rawElapsedMs) {
			const rms = finiteRms(rawRms);
			elapsedMs = normalizedElapsed(rawElapsedMs, elapsedMs);
			if (elapsedMs <= CALIBRATION_MS) noiseFloor = noiseFloor * .92 + Math.min(rms, CALIBRATION_SAMPLE_CAP) * .08;
			else if (!speaking && rms < noiseFloor * 2) noiseFloor = noiseFloor * .995 + rms * .005;
			const threshold = Math.max(MINIMUM_THRESHOLD, noiseFloor * NOISE_FLOOR_MULTIPLIER);
			const dynamicRange = Math.max(MINIMUM_DYNAMIC_RANGE, threshold * DYNAMIC_RANGE_MULTIPLIER);
			const target = clampUnit((rms - threshold) / dynamicRange);
			const smoothing = target > mouthOpen ? ATTACK_SMOOTHING : RELEASE_SMOOTHING;
			mouthOpen += (target - mouthOpen) * smoothing;
			mouthOpen = clampUnit(mouthOpen);
			speaking = speaking ? mouthOpen >= SPEAKING_OFF_LEVEL : mouthOpen >= SPEAKING_ON_LEVEL;
		},
		getMouthOpen: () => mouthOpen,
		isSpeaking: () => speaking
	};
}
//#endregion
export { DEFAULT_AUTO_QUALITY_POLICY, Live2DError, MOUTH_HANDOFF_HOLD_MS, MOUTH_PARAMETER_ID, MOUTH_RELEASE_MS, OFFICIAL_CUBISM_CORE_URL, createLive2D, createVolumeLipSync, ensureCubismCore, fitModel, isMobileViewport, resolveAutoQualityPolicy, selectInitialResolution, selectLowerResolution };
