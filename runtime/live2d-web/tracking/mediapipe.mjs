import { t as Live2DError } from "../errors-DjppR7Ty.mjs";
import { a as perfectSyncParameterId, i as missingPerfectSyncParameters, n as PERFECT_SYNC_PARAMETER_IDS, r as hasPerfectSyncParameters, t as ARKIT_BLENDSHAPES } from "../perfect-sync-Jwt1TKtx.mjs";
//#region src/tracking/mediapipe/blendshapes.ts
const MEDIAPIPE_BLENDSHAPES = Object.freeze([
	"_neutral",
	"browDownLeft",
	"browDownRight",
	"browInnerUp",
	"browOuterUpLeft",
	"browOuterUpRight",
	"cheekPuff",
	"cheekSquintLeft",
	"cheekSquintRight",
	"eyeBlinkLeft",
	"eyeBlinkRight",
	"eyeLookDownLeft",
	"eyeLookDownRight",
	"eyeLookInLeft",
	"eyeLookInRight",
	"eyeLookOutLeft",
	"eyeLookOutRight",
	"eyeLookUpLeft",
	"eyeLookUpRight",
	"eyeSquintLeft",
	"eyeSquintRight",
	"eyeWideLeft",
	"eyeWideRight",
	"jawForward",
	"jawLeft",
	"jawOpen",
	"jawRight",
	"mouthClose",
	"mouthDimpleLeft",
	"mouthDimpleRight",
	"mouthFrownLeft",
	"mouthFrownRight",
	"mouthFunnel",
	"mouthLeft",
	"mouthLowerDownLeft",
	"mouthLowerDownRight",
	"mouthPressLeft",
	"mouthPressRight",
	"mouthPucker",
	"mouthRight",
	"mouthRollLower",
	"mouthRollUpper",
	"mouthShrugLower",
	"mouthShrugUpper",
	"mouthSmileLeft",
	"mouthSmileRight",
	"mouthStretchLeft",
	"mouthStretchRight",
	"mouthUpperUpLeft",
	"mouthUpperUpRight",
	"noseSneerLeft",
	"noseSneerRight"
]);
//#endregion
//#region src/tracking/mediapipe/mapping.ts
const STANDARD_PARAMETERS = {
	ParamAngleX: {
		defaultValue: 0,
		id: "ParamAngleX",
		maximum: 30,
		minimum: -30
	},
	ParamAngleY: {
		defaultValue: 0,
		id: "ParamAngleY",
		maximum: 30,
		minimum: -30
	},
	ParamAngleZ: {
		defaultValue: 0,
		id: "ParamAngleZ",
		maximum: 30,
		minimum: -30
	},
	ParamBodyAngleX: {
		defaultValue: 0,
		id: "ParamBodyAngleX",
		maximum: 10,
		minimum: -10
	},
	ParamBodyAngleY: {
		defaultValue: 0,
		id: "ParamBodyAngleY",
		maximum: 10,
		minimum: -10
	},
	ParamBodyAngleZ: {
		defaultValue: 0,
		id: "ParamBodyAngleZ",
		maximum: 10,
		minimum: -10
	},
	ParamEyeLOpen: {
		defaultValue: 1,
		id: "ParamEyeLOpen",
		maximum: 1,
		minimum: 0
	},
	ParamEyeROpen: {
		defaultValue: 1,
		id: "ParamEyeROpen",
		maximum: 1,
		minimum: 0
	},
	ParamEyeBallX: {
		defaultValue: 0,
		id: "ParamEyeBallX",
		maximum: 1,
		minimum: -1
	},
	ParamEyeBallY: {
		defaultValue: 0,
		id: "ParamEyeBallY",
		maximum: 1,
		minimum: -1
	},
	ParamBrowLY: {
		defaultValue: 0,
		id: "ParamBrowLY",
		maximum: 1,
		minimum: -1
	},
	ParamBrowRY: {
		defaultValue: 0,
		id: "ParamBrowRY",
		maximum: 1,
		minimum: -1
	},
	ParamMouthOpenY: {
		defaultValue: 0,
		id: "ParamMouthOpenY",
		maximum: 1,
		minimum: 0
	},
	ParamMouthForm: {
		defaultValue: 0,
		id: "ParamMouthForm",
		maximum: 1,
		minimum: -1
	},
	ParamCheek: {
		defaultValue: 0,
		id: "ParamCheek",
		maximum: 1,
		minimum: 0
	}
};
function clamp$1(value, minimum, maximum) {
	return Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? value : minimum));
}
/**
* A signal is a deflection from rest, never a position in the range. Every
* MediaPipe coefficient rests at 0 once calibration subtracts the neutral, and
* every Live2D parameter rests at its own defaultValue, which is often not a
* rail: the official Hiyori opens its eyes at 1.0 inside 0..1.2 and Haru at 1.0
* inside 0..2. Reading `minimum` as the resting value left those eyes
* permanently over-open, and the first sixth of every blink (half, on Haru) was
* spent undoing that before the lid moved at all.
*
* A rigger who authored no travel on the side a channel drives gets no movement
* from it. The polarity is not inferable: the two published Hiyori rigs declare
* ParamCheek as -1..0 and -1..1 under the same name, so a rule that guessed the
* active rail would drive one of them backwards.
*/
function scaleFromDefault(value, parameter) {
	const normalized = clamp$1(value, -1, 1);
	return clamp$1(parameter.defaultValue + normalized * (normalized >= 0 ? parameter.maximum - parameter.defaultValue : parameter.defaultValue - parameter.minimum), parameter.minimum, parameter.maximum);
}
function score(signals, name) {
	return signals.blendshapes.get(name) ?? 0;
}
function parameterMap(info) {
	return new Map((info.parameters ?? []).map((parameter) => [parameter.id, parameter]));
}
function isEnabled(options, channel) {
	return options.channels?.[channel] !== false;
}
/**
* A sensitivity of 1 maps a degree of real head rotation onto a degree of
* model rotation. MediaPipe estimates head rotation well below what the wearer
* feels, so pose defaults higher; 3 is where a live camera stopped looking
* understated (2026-08-25, one laptop camera below eye level). Facial
* coefficients already arrive normalized and need no correction.
*/
const DEFAULT_SENSITIVITY = {
	brows: 1,
	cheeks: 1,
	eyes: 1,
	mouth: 1,
	pose: 3
};
function gain(options, channel) {
	return options.sensitivity?.[channel] ?? DEFAULT_SENSITIVITY[channel];
}
function createParameterBindings(info, options) {
	const parameters = parameterMap(info);
	const mapping = options.mapping === "auto" || options.mapping === void 0 ? hasPerfectSyncParameters(info) ? "perfect-sync" : "standard" : options.mapping;
	if (mapping === "perfect-sync" && !hasPerfectSyncParameters(info)) {
		const missing = missingPerfectSyncParameters(info);
		throw new Error(`Perfect Sync mapping needs at least 45 of ${PERFECT_SYNC_PARAMETER_IDS.length} ARKit parameters; missing: ${missing.join(", ")}`);
	}
	const bindings = [];
	const add = (id, channel, read, required = false) => {
		if (!isEnabled(options, channel)) return;
		const parameter = parameters.get(id) ?? (info.parameters ? void 0 : STANDARD_PARAMETERS[id]);
		if (!parameter && !required) return;
		const range = parameter ?? STANDARD_PARAMETERS[id];
		if (!range) return;
		const channelGain = gain(options, channel);
		bindings.push({
			channel,
			defaultValue: range.defaultValue,
			id,
			read: (signals) => {
				const scaled = scaleFromDefault(read(signals), range);
				if (channelGain === 1) return scaled;
				return clamp$1(range.defaultValue + (scaled - range.defaultValue) * channelGain, range.minimum, range.maximum);
			}
		});
	};
	add("ParamAngleX", "pose", (signals) => signals.pose.x / 30);
	add("ParamAngleY", "pose", (signals) => signals.pose.y / 30);
	add("ParamAngleZ", "pose", (signals) => signals.pose.z / 30);
	add("ParamBodyAngleX", "pose", (signals) => signals.pose.x / 30 * .3);
	add("ParamBodyAngleY", "pose", (signals) => signals.pose.y / 30 * .3);
	add("ParamBodyAngleZ", "pose", (signals) => signals.pose.z / 30 * .3);
	if (mapping === "perfect-sync") {
		for (const name of ARKIT_BLENDSHAPES) {
			if (name === "tongueOut") continue;
			const channel = name.startsWith("eye") ? "eyes" : name.startsWith("brow") ? "brows" : name.startsWith("cheek") || name.startsWith("nose") ? "cheeks" : "mouth";
			add(perfectSyncParameterId(name), channel, (signals) => score(signals, name));
		}
		return bindings;
	}
	const blink = (blinkName, squintName) => (signals) => -Math.max(score(signals, blinkName), score(signals, squintName) * .6);
	add("ParamEyeLOpen", "eyes", blink("eyeBlinkLeft", "eyeSquintLeft"));
	add("ParamEyeROpen", "eyes", blink("eyeBlinkRight", "eyeSquintRight"));
	add("ParamEyeBallX", "eyes", (signals) => (score(signals, "eyeLookOutLeft") - score(signals, "eyeLookInLeft") + score(signals, "eyeLookInRight") - score(signals, "eyeLookOutRight")) / 2);
	add("ParamEyeBallY", "eyes", (signals) => (score(signals, "eyeLookUpLeft") + score(signals, "eyeLookUpRight") - score(signals, "eyeLookDownLeft") - score(signals, "eyeLookDownRight")) / 2);
	add("ParamBrowLY", "brows", (signals) => Math.max(score(signals, "browInnerUp"), score(signals, "browOuterUpLeft")) - score(signals, "browDownLeft"));
	add("ParamBrowRY", "brows", (signals) => Math.max(score(signals, "browInnerUp"), score(signals, "browOuterUpRight")) - score(signals, "browDownRight"));
	add("ParamMouthOpenY", "mouth", (signals) => Math.max(score(signals, "jawOpen"), score(signals, "mouthFunnel") * .65));
	add("ParamMouthForm", "mouth", (signals) => (score(signals, "mouthSmileLeft") + score(signals, "mouthSmileRight") - score(signals, "mouthFrownLeft") - score(signals, "mouthFrownRight")) / 2);
	add("ParamCheek", "cheeks", (signals) => Math.max(score(signals, "cheekPuff"), score(signals, "cheekSquintLeft"), score(signals, "cheekSquintRight")));
	return bindings;
}
//#endregion
//#region src/tracking/mediapipe/state.ts
const CALIBRATION_MS = 1e3;
const LOST_HOLD_MS = 1e3;
const LOST_RELEASE_MS = 800;
const POSE_SMOOTHING_MS = 100;
const FACE_SMOOTHING_MS = 60;
const BLINK_CLOSE_SMOOTHING_MS = 12;
const BLINK_BLENDSHAPES = /* @__PURE__ */ new Set(["eyeBlinkLeft", "eyeBlinkRight"]);
const FULL_BLINK_SCORE = .72;
const MAX_POSE_DEGREES_PER_SECOND = 360;
function clamp(value, minimum = 0, maximum = 1) {
	return Math.max(minimum, Math.min(maximum, Number.isFinite(value) ? value : minimum));
}
function exponentialStep(current, target, deltaMs, timeMs) {
	if (deltaMs <= 0) return current;
	const alpha = 1 - Math.exp(-deltaMs / timeMs);
	return current + (target - current) * alpha;
}
function columnLength(matrix, column) {
	const x = matrix[column * 4];
	const y = matrix[column * 4 + 1];
	const z = matrix[column * 4 + 2];
	return Math.hypot(x, y, z);
}
/**
* Extracts Live2D-oriented Euler angles from a column-major 4x4 matrix.
*
* MediaPipe fits the canonical face with a similarity transform, so the basis
* carries the head's scale as well as its rotation. Dividing it out matters
* asymmetrically: the two atan2 axes take a ratio and cancel scale on their
* own, but asin reads a single entry and would report a smaller angle than the
* head actually turned.
*/
function poseFromMatrix(matrix) {
	if (!matrix || matrix.length < 16 || matrix.some((value) => !Number.isFinite(value))) return {
		x: 0,
		y: 0,
		z: 0
	};
	const scaleX = columnLength(matrix, 0);
	const scaleY = columnLength(matrix, 1);
	const scaleZ = columnLength(matrix, 2);
	if (scaleX === 0 || scaleY === 0 || scaleZ === 0) return {
		x: 0,
		y: 0,
		z: 0
	};
	const r00 = matrix[0] / scaleX;
	const r10 = matrix[1] / scaleX;
	const r20 = matrix[2] / scaleX;
	const r21 = matrix[6] / scaleY;
	const r22 = matrix[10] / scaleZ;
	const radiansToDegrees = 180 / Math.PI;
	return {
		x: Math.asin(clamp(-r20, -1, 1)) * radiansToDegrees,
		y: -Math.atan2(r21, r22) * radiansToDegrees,
		z: -Math.atan2(r10, r00) * radiansToDegrees
	};
}
function emptySignals() {
	return {
		blendshapes: new Map(MEDIAPIPE_BLENDSHAPES.map((name) => [name, 0])),
		pose: {
			x: 0,
			y: 0,
			z: 0
		}
	};
}
var FaceTrackingState = class {
	onFaceLost;
	baselineBlendshapeSums = /* @__PURE__ */ new Map();
	baselinePoseSum = {
		x: 0,
		y: 0,
		z: 0
	};
	calibrationStartedAt;
	calibrationFrames = 0;
	calibrated = false;
	lastFaceTimestamp;
	lastTimestamp;
	lostSignals;
	neutralBlendshapes = /* @__PURE__ */ new Map();
	neutralPose = {
		x: 0,
		y: 0,
		z: 0
	};
	smoothed = emptySignals();
	rawPose;
	constructor(options = {}) {
		this.onFaceLost = options.onFaceLost ?? "hold";
	}
	calibrate() {
		this.baselineBlendshapeSums.clear();
		this.baselinePoseSum = {
			x: 0,
			y: 0,
			z: 0
		};
		this.calibrationStartedAt = void 0;
		this.calibrationFrames = 0;
		this.calibrated = false;
		this.lastFaceTimestamp = void 0;
		this.lastTimestamp = void 0;
		this.lostSignals = void 0;
		this.neutralBlendshapes.clear();
		this.neutralPose = {
			x: 0,
			y: 0,
			z: 0
		};
		this.rawPose = void 0;
		this.smoothed = emptySignals();
	}
	update(input, timestampMs) {
		const previousTimestamp = this.lastTimestamp;
		const deltaMs = previousTimestamp === void 0 ? 0 : Math.max(0, Math.min(100, timestampMs - previousTimestamp));
		this.lastTimestamp = timestampMs;
		if (!input) return this.updateLost(timestampMs, deltaMs);
		this.lastFaceTimestamp = timestampMs;
		this.lostSignals = void 0;
		const pose = this.rateLimitPose(input.pose ?? poseFromMatrix(input.matrix), deltaMs);
		if (!this.calibrated) {
			this.calibrationStartedAt ??= timestampMs;
			this.calibrationFrames++;
			this.baselinePoseSum.x += pose.x;
			this.baselinePoseSum.y += pose.y;
			this.baselinePoseSum.z += pose.z;
			for (const name of MEDIAPIPE_BLENDSHAPES) {
				const score = clamp(input.blendshapes.get(name) ?? 0);
				this.baselineBlendshapeSums.set(name, (this.baselineBlendshapeSums.get(name) ?? 0) + score);
			}
			if (timestampMs - this.calibrationStartedAt < CALIBRATION_MS) return {
				calibrated: false,
				signals: void 0,
				status: "calibrating"
			};
			this.finishCalibration();
		}
		const targetBlendshapes = /* @__PURE__ */ new Map();
		for (const name of MEDIAPIPE_BLENDSHAPES) {
			const score = clamp(input.blendshapes.get(name) ?? 0);
			const baseline = this.neutralBlendshapes.get(name) ?? 0;
			const reachable = BLINK_BLENDSHAPES.has(name) ? FULL_BLINK_SCORE : 1;
			targetBlendshapes.set(name, clamp((score - baseline) / Math.max(.2, reachable - baseline)));
		}
		const targetPose = {
			x: pose.x - this.neutralPose.x,
			y: pose.y - this.neutralPose.y,
			z: pose.z - this.neutralPose.z
		};
		this.smoothToward(targetBlendshapes, targetPose, deltaMs);
		return {
			calibrated: true,
			signals: this.smoothed,
			status: "tracked"
		};
	}
	rateLimitPose(pose, deltaMs) {
		const previous = this.rawPose;
		if (!previous || !this.calibrated || deltaMs <= 0) {
			this.rawPose = pose;
			return pose;
		}
		const limit = MAX_POSE_DEGREES_PER_SECOND * deltaMs / 1e3;
		const step = (current, target) => current + clamp(target - current, -limit, limit);
		const limited = {
			x: step(previous.x, pose.x),
			y: step(previous.y, pose.y),
			z: step(previous.z, pose.z)
		};
		this.rawPose = limited;
		return limited;
	}
	finishCalibration() {
		const frames = Math.max(1, this.calibrationFrames);
		for (const name of MEDIAPIPE_BLENDSHAPES) this.neutralBlendshapes.set(name, (this.baselineBlendshapeSums.get(name) ?? 0) / frames);
		this.neutralPose = {
			x: this.baselinePoseSum.x / frames,
			y: this.baselinePoseSum.y / frames,
			z: this.baselinePoseSum.z / frames
		};
		this.calibrated = true;
	}
	smoothToward(blendshapes, pose, deltaMs) {
		const nextBlendshapes = /* @__PURE__ */ new Map();
		for (const name of MEDIAPIPE_BLENDSHAPES) {
			const current = this.smoothed.blendshapes.get(name) ?? 0;
			const target = blendshapes.get(name) ?? 0;
			const closing = target > current && BLINK_BLENDSHAPES.has(name);
			nextBlendshapes.set(name, exponentialStep(current, target, deltaMs, closing ? BLINK_CLOSE_SMOOTHING_MS : FACE_SMOOTHING_MS));
		}
		this.smoothed = {
			blendshapes: nextBlendshapes,
			pose: {
				x: exponentialStep(this.smoothed.pose.x, pose.x, deltaMs, POSE_SMOOTHING_MS),
				y: exponentialStep(this.smoothed.pose.y, pose.y, deltaMs, POSE_SMOOTHING_MS),
				z: exponentialStep(this.smoothed.pose.z, pose.z, deltaMs, POSE_SMOOTHING_MS)
			}
		};
	}
	updateLost(timestampMs, _deltaMs) {
		if (!this.calibrated) return {
			calibrated: false,
			signals: void 0,
			status: "lost"
		};
		const elapsed = timestampMs - (this.lastFaceTimestamp ?? timestampMs);
		this.lostSignals ??= {
			blendshapes: new Map(this.smoothed.blendshapes),
			pose: { ...this.smoothed.pose }
		};
		if (this.onFaceLost === "neutral" && elapsed > LOST_HOLD_MS) {
			const releaseProgress = clamp((elapsed - LOST_HOLD_MS) / LOST_RELEASE_MS);
			const blendshapes = /* @__PURE__ */ new Map();
			for (const name of MEDIAPIPE_BLENDSHAPES) blendshapes.set(name, (this.lostSignals.blendshapes.get(name) ?? 0) * (1 - releaseProgress));
			this.smoothed = {
				blendshapes,
				pose: {
					x: this.lostSignals.pose.x * (1 - releaseProgress),
					y: this.lostSignals.pose.y * (1 - releaseProgress),
					z: this.lostSignals.pose.z * (1 - releaseProgress)
				}
			};
		}
		return {
			calibrated: true,
			signals: this.smoothed,
			status: "lost"
		};
	}
};
//#endregion
//#region src/tracking/mediapipe/index.ts
const CHANNELS = [
	"pose",
	"eyes",
	"brows",
	"mouth",
	"cheeks"
];
const DEFAULT_MAX_FPS = 30;
const DEFAULT_DETECTION_CONFIDENCE = .4;
const DEFAULT_PRESENCE_CONFIDENCE = .4;
const DEFAULT_TRACKING_CONFIDENCE = .3;
const MIN_ADAPTIVE_FPS = 10;
const WORKER_DETECT_TIMEOUT_MS = 1e4;
const WORKER_INIT_TIMEOUT_MS = 3e4;
const INFERENCE_EMA_WEIGHT = .2;
const SLOW_DOWN_LOAD = .6;
const SPEED_UP_LOAD = .25;
function runCleanups(cleanups) {
	let firstError;
	for (const cleanup of cleanups) try {
		cleanup();
	} catch (error) {
		firstError ??= error;
	}
	if (firstError) throw firstError;
}
let modulePromise;
const filesetPromises = /* @__PURE__ */ new Map();
function loadVisionModule() {
	if (!modulePromise) modulePromise = import("@mediapipe/tasks-vision").catch((error) => {
		modulePromise = void 0;
		throw new Live2DError("tracking-error", "MediaPipe tracking requires the optional @mediapipe/tasks-vision dependency.", {
			cause: error,
			details: { backend: "mediapipe" }
		});
	});
	return modulePromise;
}
function loadFileset(module, wasmPath) {
	const cached = filesetPromises.get(wasmPath);
	if (cached) return cached;
	const promise = module.FilesetResolver.forVisionTasks(wasmPath).catch((error) => {
		filesetPromises.delete(wasmPath);
		throw error;
	});
	filesetPromises.set(wasmPath, promise);
	return promise;
}
function isAbort(error, signal) {
	return Boolean(signal?.aborted) || error instanceof Error && error.name === "AbortError";
}
function abortError(signal) {
	return signal.reason instanceof Error ? signal.reason : new DOMException("MediaPipe tracker creation was aborted.", "AbortError");
}
async function awaitWithAbort(promise, signal) {
	if (!signal) return promise;
	if (signal.aborted) throw abortError(signal);
	return new Promise((resolve, reject) => {
		const onAbort = () => reject(abortError(signal));
		signal.addEventListener("abort", onAbort, { once: true });
		promise.then((value) => {
			signal.removeEventListener("abort", onAbort);
			resolve(value);
		}, (error) => {
			signal.removeEventListener("abort", onAbort);
			reject(error);
		});
	});
}
function confidence(name, value) {
	if (value !== void 0 && (!Number.isFinite(value) || value < 0 || value > 1)) throw new Live2DError("invalid-props", `${name} must be a finite number between 0 and 1.`);
}
function validateOptions(options) {
	if (typeof window === "undefined" || typeof document === "undefined") throw new Live2DError("browser-only", "MediaPipe face tracking can only be created in a browser.");
	if (!options || typeof options !== "object") throw new Live2DError("invalid-props", "MediaPipe tracker options are required.");
	if (typeof options.wasmPath !== "string" || options.wasmPath.trim() === "") throw new Live2DError("invalid-props", "wasmPath must be a non-empty string.");
	const hasPath = typeof options.modelAssetPath === "string" && options.modelAssetPath.trim() !== "";
	if (hasPath === (options.modelAssetBuffer instanceof Uint8Array && options.modelAssetBuffer.byteLength > 0)) throw new Live2DError("invalid-props", "Provide exactly one non-empty modelAssetPath or modelAssetBuffer.");
	if (options.delegate !== void 0 && options.delegate !== "CPU" && options.delegate !== "GPU") throw new Live2DError("invalid-props", "delegate must be CPU or GPU.");
	if (options.execution !== void 0 && options.execution !== "main" && options.execution !== "worker") throw new Live2DError("invalid-props", "execution must be main or worker.");
	if (options.execution === "worker" && typeof options.workerFactory !== "function") throw new Live2DError("invalid-props", "workerFactory must be provided for worker execution.");
	if (options.execution !== "worker" && options.workerFactory !== void 0) throw new Live2DError("invalid-props", "workerFactory requires execution: worker.");
	if (options.maxFps !== void 0 && (!Number.isFinite(options.maxFps) || options.maxFps < 1 || options.maxFps > 60)) throw new Live2DError("invalid-props", "maxFps must be a finite number from 1 through 60.");
	if (options.inputMirrored !== void 0 && typeof options.inputMirrored !== "boolean") throw new Live2DError("invalid-props", "inputMirrored must be a boolean.");
	confidence("minFaceDetectionConfidence", options.minFaceDetectionConfidence);
	confidence("minFacePresenceConfidence", options.minFacePresenceConfidence);
	confidence("minTrackingConfidence", options.minTrackingConfidence);
	if (options.onFaceLost !== void 0 && options.onFaceLost !== "hold" && options.onFaceLost !== "neutral") throw new Live2DError("invalid-props", "onFaceLost must be hold or neutral.");
	return hasPath ? { modelAssetPath: options.modelAssetPath } : { modelAssetBuffer: options.modelAssetBuffer };
}
function normalizeScore(value) {
	return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}
function swapLeftRight(name) {
	if (name.endsWith("Left")) return `${name.slice(0, -4)}Right`;
	if (name.endsWith("Right")) return `${name.slice(0, -5)}Left`;
	return name;
}
function faceInput(entries, matrix, mirrored) {
	if (!matrix || matrix.length < 16) return void 0;
	const scores = /* @__PURE__ */ new Map();
	for (const [categoryName, score] of entries) {
		const name = mirrored ? swapLeftRight(categoryName) : categoryName;
		scores.set(name, normalizeScore(score));
	}
	for (const name of MEDIAPIPE_BLENDSHAPES) if (!scores.has(name)) scores.set(name, 0);
	const pose = poseFromMatrix(matrix);
	return {
		blendshapes: scores,
		matrix,
		pose: mirrored ? {
			x: -pose.x,
			y: pose.y,
			z: -pose.z
		} : pose
	};
}
function inputFromResult(result, mirrored) {
	if (!result.faceLandmarks.length) return void 0;
	const categories = result.faceBlendshapes[0]?.categories ?? [];
	if (categories.length === 0) return void 0;
	return faceInput(categories.map((category) => [category.categoryName, category.score]), result.facialTransformationMatrixes[0]?.data, mirrored);
}
function inputFromSerializedResult(result, mirrored) {
	if (!result) return void 0;
	return faceInput(result.blendshapes, result.matrix, mirrored);
}
function trackingError(error, message, url) {
	if (error instanceof Live2DError) return error;
	return new Live2DError("tracking-error", error instanceof Error ? `${message}: ${error.message}` : `${message}: ${String(error)}`, {
		cause: error,
		details: {
			backend: "mediapipe",
			url
		}
	});
}
var MediaPipeFaceTrackerImpl = class {
	task;
	requestedMaxFps;
	inputMirrored;
	abortCleanup;
	attached = /* @__PURE__ */ new Set();
	attachedByTarget = /* @__PURE__ */ new WeakMap();
	disposed = false;
	inferenceEmaMs;
	lastInferenceTimestamp;
	maxFps;
	signals;
	state;
	tracking = false;
	constructor(task, requestedMaxFps, inputMirrored, onFaceLost) {
		this.task = task;
		this.requestedMaxFps = requestedMaxFps;
		this.inputMirrored = inputMirrored;
		this.maxFps = requestedMaxFps;
		this.state = new FaceTrackingState({ onFaceLost });
	}
	bindAbortSignal(signal) {
		const onAbort = () => {
			try {
				this.dispose();
			} catch {}
		};
		signal.addEventListener("abort", onAbort, { once: true });
		this.abortCleanup = () => signal.removeEventListener("abort", onAbort);
	}
	update(source, timestampMs) {
		if (!this.canUpdate(timestampMs) || !this.task) return { status: "skipped" };
		const startedAt = performance.now();
		let result;
		try {
			result = this.task.detectForVideo(source, timestampMs);
		} catch (error) {
			throw trackingError(error, "MediaPipe face inference failed");
		}
		const inferenceMs = Math.max(0, performance.now() - startedAt);
		return this.applyResult(inputFromResult(result, this.inputMirrored), timestampMs, inferenceMs);
	}
	canUpdate(timestampMs) {
		if (this.disposed || !Number.isFinite(timestampMs) || timestampMs < 0) return false;
		if (this.lastInferenceTimestamp !== void 0) {
			if (timestampMs <= this.lastInferenceTimestamp) return false;
			if (timestampMs - this.lastInferenceTimestamp < 1e3 / this.maxFps - 1) return false;
		}
		this.lastInferenceTimestamp = timestampMs;
		return true;
	}
	applySerializedResult(result, timestampMs, inferenceMs) {
		return this.applyResult(inputFromSerializedResult(result, this.inputMirrored), timestampMs, inferenceMs);
	}
	applyResult(input, timestampMs, inferenceMs) {
		this.adaptCap(inferenceMs);
		const stateUpdate = this.state.update(input, timestampMs);
		this.signals = stateUpdate.signals;
		this.tracking = stateUpdate.status === "tracked";
		return {
			effectiveFps: this.maxFps,
			inferenceMs,
			status: stateUpdate.status
		};
	}
	adaptCap(inferenceMs) {
		if (!this.task) return;
		this.inferenceEmaMs = this.inferenceEmaMs === void 0 ? inferenceMs : this.inferenceEmaMs * (1 - INFERENCE_EMA_WEIGHT) + inferenceMs * INFERENCE_EMA_WEIGHT;
		const load = this.inferenceEmaMs / (1e3 / this.maxFps);
		if (load > SLOW_DOWN_LOAD && this.maxFps > MIN_ADAPTIVE_FPS) this.maxFps = Math.max(MIN_ADAPTIVE_FPS, this.maxFps / 2);
		else if (load < SPEED_UP_LOAD && this.maxFps < this.requestedMaxFps) this.maxFps = Math.min(this.requestedMaxFps, this.maxFps * 2);
	}
	attach(target, options = {}) {
		if (this.disposed) throw new Live2DError("invalid-props", "Cannot attach a disposed MediaPipe tracker.");
		if (!target || typeof target.getModelInfo !== "function" || typeof target.addParameterDriver !== "function") throw new Live2DError("invalid-props", "MediaPipe attach target must provide getModelInfo() and addParameterDriver().");
		if (options.mapping !== void 0 && ![
			"auto",
			"standard",
			"perfect-sync"
		].includes(options.mapping)) throw new Live2DError("invalid-props", "mapping must be auto, standard, or perfect-sync.");
		if (options.channels !== void 0) {
			if (!options.channels || typeof options.channels !== "object") throw new Live2DError("invalid-props", "channels must be an object.");
			for (const channel of CHANNELS) if (options.channels[channel] !== void 0 && typeof options.channels[channel] !== "boolean") throw new Live2DError("invalid-props", `channels.${channel} must be a boolean.`);
		}
		if (options.sensitivity !== void 0) {
			if (!options.sensitivity || typeof options.sensitivity !== "object") throw new Live2DError("invalid-props", "sensitivity must be an object.");
			for (const channel of CHANNELS) {
				const value = options.sensitivity[channel];
				if (value !== void 0 && (!Number.isFinite(value) || value < .1 || value > 5)) throw new Live2DError("invalid-props", `sensitivity.${channel} must be a finite number between 0.1 and 5.`);
			}
		}
		let bindings;
		try {
			bindings = createParameterBindings(target.getModelInfo(), options);
		} catch (error) {
			throw new Live2DError("invalid-props", error instanceof Error ? error.message : String(error), {
				cause: error,
				details: { backend: "mediapipe" }
			});
		}
		const previous = this.attachedByTarget.get(target);
		if (previous) {
			runCleanups(previous.cleanups);
			this.attached.delete(previous);
		}
		const cleanups = [];
		try {
			for (const binding of bindings) cleanups.push(target.addParameterDriver(binding.id, {
				getValue: () => this.signals ? binding.read(this.signals) : binding.defaultValue,
				phase: binding.channel === "pose" ? "before-physics" : "after-motion"
			}));
		} catch (error) {
			runCleanups(cleanups);
			throw error;
		}
		const record = {
			cleanups,
			target
		};
		this.attached.add(record);
		this.attachedByTarget.set(target, record);
		let active = true;
		return () => {
			if (!active) return;
			active = false;
			if (this.attachedByTarget.get(target) !== record) return;
			this.attachedByTarget.delete(target);
			this.attached.delete(record);
			runCleanups(record.cleanups);
		};
	}
	calibrate() {
		if (this.disposed) return;
		this.state.calibrate();
		this.signals = void 0;
		this.tracking = false;
		this.lastInferenceTimestamp = void 0;
		this.inferenceEmaMs = void 0;
		this.maxFps = this.requestedMaxFps;
	}
	isTracking() {
		return !this.disposed && this.tracking;
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.abortCleanup?.();
		this.abortCleanup = void 0;
		let firstError;
		for (const record of [...this.attached]) {
			this.attachedByTarget.delete(record.target);
			try {
				runCleanups(record.cleanups);
			} catch (error) {
				firstError ??= error;
			}
		}
		this.attached.clear();
		this.signals = void 0;
		this.tracking = false;
		try {
			this.task?.close();
		} catch (error) {
			firstError ??= error;
		}
		if (firstError) throw firstError;
	}
};
var MediaPipeWorkerFaceTrackerImpl = class {
	worker;
	core;
	abortCleanup;
	activeToken;
	disposed = false;
	generation = 0;
	nextId = 1;
	nextToken = 1;
	pending = /* @__PURE__ */ new Map();
	staleRequests = /* @__PURE__ */ new Map();
	terminateTimer;
	constructor(worker, core) {
		this.worker = worker;
		this.core = core;
		worker.addEventListener("message", this.onMessage);
		worker.addEventListener("error", this.onWorkerError);
		worker.addEventListener("messageerror", this.onWorkerError);
	}
	bindAbortSignal(signal) {
		const onAbort = () => {
			try {
				this.dispose();
			} catch {}
		};
		signal.addEventListener("abort", onAbort, { once: true });
		this.abortCleanup = () => signal.removeEventListener("abort", onAbort);
	}
	update(source, timestampMs) {
		if (this.disposed || this.activeToken !== void 0 || !this.core.canUpdate(timestampMs)) return Promise.resolve({ status: "skipped" });
		const token = this.nextToken++;
		this.activeToken = token;
		const generation = this.generation;
		return createImageBitmap(source).catch((error) => {
			this.release(token);
			if (this.disposed) return void 0;
			throw trackingError(error, "MediaPipe worker frame capture failed");
		}).then((bitmap) => {
			if (!bitmap) return { status: "skipped" };
			if (this.disposed || generation !== this.generation) {
				bitmap.close();
				this.release(token);
				return { status: "skipped" };
			}
			return new Promise((resolve, reject) => {
				const id = this.nextId++;
				const timer = setTimeout(() => this.expirePending(id), WORKER_DETECT_TIMEOUT_MS);
				this.pending.set(id, {
					generation,
					reject,
					resolve,
					timer,
					timestampMs,
					token
				});
				const request = {
					bitmap,
					id,
					timestampMs,
					type: "detect"
				};
				try {
					this.worker.postMessage(request, [bitmap]);
				} catch (error) {
					this.removePending(id);
					bitmap.close();
					reject(trackingError(error, "MediaPipe worker frame transfer failed"));
				}
			});
		});
	}
	attach = (target, options) => this.core.attach(target, options);
	calibrate() {
		if (this.disposed) return;
		this.generation++;
		this.settlePendingAsSkipped(true);
		this.core.calibrate();
	}
	isTracking() {
		return !this.disposed && this.core.isTracking();
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.generation++;
		this.abortCleanup?.();
		this.abortCleanup = void 0;
		this.settlePendingAsSkipped();
		this.clearStaleRequests();
		this.activeToken = void 0;
		try {
			this.core.dispose();
		} finally {
			const id = this.nextId++;
			try {
				this.worker.postMessage({
					id,
					type: "dispose"
				});
				this.terminateTimer = setTimeout(() => this.terminate(), 1e3);
			} catch {
				this.terminate();
			}
		}
	}
	release(token) {
		if (this.activeToken === token) this.activeToken = void 0;
	}
	removePending(id) {
		const pending = this.pending.get(id);
		if (!pending) return void 0;
		this.pending.delete(id);
		clearTimeout(pending.timer);
		this.release(pending.token);
		return pending;
	}
	expirePending(id) {
		if (!this.pending.has(id)) return;
		this.fail(trackingError(/* @__PURE__ */ new Error(`no response within ${WORKER_DETECT_TIMEOUT_MS}ms`), "MediaPipe worker inference timed out"));
	}
	expireStale(id) {
		if (!this.staleRequests.get(id)) return;
		this.staleRequests.delete(id);
		this.fail(trackingError(/* @__PURE__ */ new Error(`no response within ${WORKER_DETECT_TIMEOUT_MS}ms`), "MediaPipe worker inference timed out after calibration"));
	}
	clearStaleRequests() {
		for (const stale of this.staleRequests.values()) clearTimeout(stale.timer);
		this.staleRequests.clear();
	}
	settlePendingAsSkipped(waitForWorker = false) {
		for (const [id, pending] of this.pending) {
			clearTimeout(pending.timer);
			pending.resolve({ status: "skipped" });
			if (waitForWorker) {
				const timer = setTimeout(() => this.expireStale(id), WORKER_DETECT_TIMEOUT_MS);
				this.staleRequests.set(id, {
					timer,
					token: pending.token
				});
			} else this.release(pending.token);
		}
		this.pending.clear();
	}
	terminate() {
		if (this.terminateTimer !== void 0) clearTimeout(this.terminateTimer);
		this.terminateTimer = void 0;
		this.worker.removeEventListener("message", this.onMessage);
		this.worker.removeEventListener("error", this.onWorkerError);
		this.worker.removeEventListener("messageerror", this.onWorkerError);
		this.worker.terminate();
	}
	fail(error) {
		if (this.disposed) return;
		this.disposed = true;
		this.generation++;
		this.abortCleanup?.();
		this.abortCleanup = void 0;
		for (const pending of this.pending.values()) {
			clearTimeout(pending.timer);
			pending.reject(error);
		}
		this.pending.clear();
		this.clearStaleRequests();
		this.activeToken = void 0;
		try {
			this.core.dispose();
		} catch {} finally {
			this.terminate();
		}
	}
	onMessage = (event) => {
		const response = event.data;
		if (!response || typeof response !== "object" || typeof response.id !== "number" || typeof response.type !== "string") {
			this.fail(trackingError(/* @__PURE__ */ new Error("MediaPipe worker returned an invalid response."), "MediaPipe worker protocol failed"));
			return;
		}
		if (response.type === "disposed") {
			if (this.disposed) this.terminate();
			else this.fail(trackingError(/* @__PURE__ */ new Error("MediaPipe worker stopped before disposal was requested."), "MediaPipe worker protocol failed"));
			return;
		}
		const stale = this.staleRequests.get(response.id);
		if (stale) {
			if (response.type !== "result" && response.type !== "error") {
				this.fail(trackingError(/* @__PURE__ */ new Error(`Unexpected ${response.type} response for a detect request.`), "MediaPipe worker protocol failed"));
				return;
			}
			this.staleRequests.delete(response.id);
			clearTimeout(stale.timer);
			this.release(stale.token);
			return;
		}
		const pending = this.pending.get(response.id);
		if (!pending) return;
		if (response.type !== "result" && response.type !== "error") {
			this.fail(trackingError(/* @__PURE__ */ new Error(`Unexpected ${response.type} response for a detect request.`), "MediaPipe worker protocol failed"));
			return;
		}
		this.removePending(response.id);
		if (response.type === "error") {
			const cause = new Error(response.error.message);
			cause.name = response.error.name ?? "Error";
			cause.stack = response.error.stack;
			pending.reject(trackingError(cause, "MediaPipe worker inference failed"));
			return;
		}
		if (response.type !== "result") return;
		if (this.disposed || pending.generation !== this.generation) {
			pending.resolve({ status: "skipped" });
			return;
		}
		pending.resolve(this.core.applySerializedResult(response.result, pending.timestampMs, response.inferenceMs));
	};
	onWorkerError = (event) => {
		if (this.disposed) return;
		const error = trackingError(event instanceof ErrorEvent ? event.error ?? new Error(event.message) : /* @__PURE__ */ new Error("MediaPipe worker message could not be deserialized."), "MediaPipe worker crashed");
		this.fail(error);
	};
};
function absoluteUrl(value) {
	return new URL(value, document.baseURI).href;
}
async function createWorkerTracker(options, modelAsset) {
	let worker;
	try {
		worker = options.workerFactory();
	} catch (error) {
		throw trackingError(error, "MediaPipe worker creation failed");
	}
	if (!worker || typeof worker.postMessage !== "function" || typeof worker.terminate !== "function") throw new Live2DError("invalid-props", "workerFactory must return a Worker.");
	const workerOptions = {
		delegate: options.delegate ?? "CPU",
		minFaceDetectionConfidence: options.minFaceDetectionConfidence ?? DEFAULT_DETECTION_CONFIDENCE,
		minFacePresenceConfidence: options.minFacePresenceConfidence ?? DEFAULT_PRESENCE_CONFIDENCE,
		minTrackingConfidence: options.minTrackingConfidence ?? DEFAULT_TRACKING_CONFIDENCE,
		wasmPath: absoluteUrl(options.wasmPath),
		...typeof modelAsset.modelAssetPath === "string" ? { modelAssetPath: absoluteUrl(modelAsset.modelAssetPath) } : { modelAssetBuffer: new Uint8Array(modelAsset.modelAssetBuffer) }
	};
	const signal = options.signal;
	const initId = 0;
	try {
		await awaitWithAbort(new Promise((resolve, reject) => {
			let cleanup = () => {};
			const onMessage = (event) => {
				const response = event.data;
				if (!response || response.id !== initId) return;
				cleanup();
				if (response.type === "ready") resolve();
				else if (response.type === "error") reject(new Error(response.error.message));
				else reject(/* @__PURE__ */ new Error(`unexpected ${response.type} response during initialization`));
			};
			const onError = (event) => {
				cleanup();
				reject(event.error ?? new Error(event.message));
			};
			const onMessageError = () => {
				cleanup();
				reject(/* @__PURE__ */ new Error("MediaPipe worker initialization response was invalid."));
			};
			const deadline = setTimeout(() => {
				cleanup();
				reject(/* @__PURE__ */ new Error(`no ready response within ${WORKER_INIT_TIMEOUT_MS}ms`));
			}, WORKER_INIT_TIMEOUT_MS);
			cleanup = () => {
				clearTimeout(deadline);
				worker.removeEventListener("message", onMessage);
				worker.removeEventListener("error", onError);
				worker.removeEventListener("messageerror", onMessageError);
			};
			worker.addEventListener("message", onMessage);
			worker.addEventListener("error", onError);
			worker.addEventListener("messageerror", onMessageError);
			const request = {
				id: initId,
				options: workerOptions,
				protocol: 1,
				type: "init"
			};
			if (workerOptions.modelAssetBuffer) worker.postMessage(request, [workerOptions.modelAssetBuffer.buffer]);
			else worker.postMessage(request);
		}), signal);
	} catch (error) {
		worker.terminate();
		if (isAbort(error, signal)) throw error;
		throw trackingError(error, "MediaPipe worker failed to initialize");
	}
	const core = new MediaPipeFaceTrackerImpl(void 0, options.maxFps ?? DEFAULT_MAX_FPS, options.inputMirrored ?? false, options.onFaceLost ?? "hold");
	const tracker = new MediaPipeWorkerFaceTrackerImpl(worker, core);
	if (signal) tracker.bindAbortSignal(signal);
	return tracker;
}
async function createMediaPipeFaceTracker(options) {
	const modelAsset = validateOptions(options);
	if (options.execution === "worker") return createWorkerTracker(options, modelAsset);
	const modelAssetUrl = "modelAssetPath" in modelAsset ? modelAsset.modelAssetPath : void 0;
	const signal = options.signal;
	if (signal?.aborted) throw abortError(signal);
	let taskPromise;
	try {
		const module = await awaitWithAbort(loadVisionModule(), signal);
		const fileset = await awaitWithAbort(loadFileset(module, options.wasmPath), signal).catch((error) => {
			if (isAbort(error, signal)) throw error;
			throw trackingError(error, "MediaPipe WASM fileset failed to load", options.wasmPath);
		});
		taskPromise = module.FaceLandmarker.createFromOptions(fileset, {
			baseOptions: {
				delegate: options.delegate ?? "CPU",
				...modelAsset
			},
			minFaceDetectionConfidence: options.minFaceDetectionConfidence ?? DEFAULT_DETECTION_CONFIDENCE,
			minFacePresenceConfidence: options.minFacePresenceConfidence ?? DEFAULT_PRESENCE_CONFIDENCE,
			minTrackingConfidence: options.minTrackingConfidence ?? DEFAULT_TRACKING_CONFIDENCE,
			numFaces: 1,
			outputFaceBlendshapes: true,
			outputFacialTransformationMatrixes: true,
			runningMode: "VIDEO"
		});
		const tracker = new MediaPipeFaceTrackerImpl(await awaitWithAbort(taskPromise, signal).catch((error) => {
			if (signal?.aborted) taskPromise?.then((lateTask) => lateTask.close()).catch(() => {});
			if (isAbort(error, signal)) throw error;
			throw trackingError(error, "MediaPipe Face Landmarker failed to initialize", modelAssetUrl);
		}), options.maxFps ?? DEFAULT_MAX_FPS, options.inputMirrored ?? false, options.onFaceLost ?? "hold");
		if (signal?.aborted) {
			tracker.dispose();
			throw abortError(signal);
		}
		if (signal) tracker.bindAbortSignal(signal);
		return tracker;
	} catch (error) {
		if (isAbort(error, signal)) throw error;
		throw trackingError(error, "MediaPipe face tracker initialization failed");
	}
}
//#endregion
export { MEDIAPIPE_BLENDSHAPES, PERFECT_SYNC_PARAMETER_IDS, createMediaPipeFaceTracker };
