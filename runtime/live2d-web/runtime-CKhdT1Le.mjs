import { t as Live2DError } from "./errors-DjppR7Ty.mjs";
import { c as validateIdleMotion, i as validateMotionOptions } from "./motion-options-CE7R-nHn.mjs";
//#region src/core/ensureCubismCore.ts
/**
* Cubism 5.3 Core URL that Live2D publishes for hosting use. Handy to get
* started (`coreUrl: OFFICIAL_CUBISM_CORE_URL`); self-host the file for
* production so your app does not depend on a third-party host.
*/
const OFFICIAL_CUBISM_CORE_URL = "https://cubism.live2d.com/sdk-web/core/06/live2dcubismcore.min.js";
const pendingLoads = /* @__PURE__ */ new Map();
const CORE_LOAD_TIMEOUT_MS = 3e4;
function resourceHttpStatus(url) {
	if (typeof performance === "undefined" || !performance.getEntriesByName) return void 0;
	const status = performance.getEntriesByName(url, "resource").at(-1)?.responseStatus;
	return typeof status === "number" && status > 0 ? status : void 0;
}
function coreDetails(url) {
	return {
		assetType: "core",
		httpStatus: url ? resourceHttpStatus(url) : void 0,
		url
	};
}
function coreMissingMessage() {
	return "Live2D Cubism Core is not loaded. Pass a coreUrl option (to createLive2D() or <Live2DCanvas>), for example the OFFICIAL_CUBISM_CORE_URL constant, or load the script before creating a model:\n  <script src=\"/path/to/live2dcubismcore.min.js\"><\/script>\nOfficial SDK download: https://www.live2d.com/sdk/download/web/";
}
function assertBrowser() {
	if (typeof window === "undefined" || typeof document === "undefined") throw new Live2DError("browser-only", "live2d-web can only create a stage in a browser.");
}
function loadCoreScript(absoluteUrl) {
	return new Promise((resolve, reject) => {
		const script = document.createElement("script");
		const listeners = new AbortController();
		let timer;
		const settle = (error) => {
			if (timer !== void 0) clearTimeout(timer);
			timer = void 0;
			listeners.abort();
			if (!error) {
				resolve();
				return;
			}
			script.remove();
			reject(error);
		};
		const onSettleEvent = (event) => {
			if (event.type === "load" && window.Live2DCubismCore) {
				settle();
				return;
			}
			settle(event.type === "load" ? new Live2DError("core-missing", coreMissingMessage(), { details: coreDetails(absoluteUrl) }) : new Live2DError("core-missing", `Failed to load Live2D Cubism Core from ${absoluteUrl}.`, {
				cause: event,
				details: coreDetails(absoluteUrl)
			}));
		};
		script.addEventListener("load", onSettleEvent, { signal: listeners.signal });
		script.addEventListener("error", onSettleEvent, { signal: listeners.signal });
		timer = setTimeout(() => {
			settle(new Live2DError("core-missing", `Live2D Cubism Core did not load from ${absoluteUrl} within ${CORE_LOAD_TIMEOUT_MS} ms.`, { details: coreDetails(absoluteUrl) }));
		}, CORE_LOAD_TIMEOUT_MS);
		script.src = absoluteUrl;
		script.async = true;
		script.dataset.live2dWebCore = "true";
		document.head.appendChild(script);
	});
}
function withAbort(load, signal) {
	return new Promise((resolve, reject) => {
		const onAbort = () => reject(signal.reason);
		signal.addEventListener("abort", onAbort, { once: true });
		load.then(resolve, reject).finally(() => {
			signal.removeEventListener("abort", onAbort);
		});
	});
}
/**
* Verifies the user-supplied Cubism Core global, optionally loading a user-hosted
* script first. Concurrent calls for the same URL share one script load.
*/
async function ensureCubismCore(coreUrl, options = {}) {
	assertBrowser();
	const { signal } = options;
	if (signal?.aborted) throw signal.reason;
	if (window.Live2DCubismCore) return;
	if (!coreUrl) throw new Live2DError("core-missing", coreMissingMessage(), { details: coreDetails() });
	const absoluteUrl = new URL(coreUrl, document.baseURI).href;
	let load = pendingLoads.get(absoluteUrl);
	if (!load) {
		load = loadCoreScript(absoluteUrl).finally(() => {
			if (pendingLoads.get(absoluteUrl) === load) pendingLoads.delete(absoluteUrl);
		});
		pendingLoads.set(absoluteUrl, load);
	}
	await (signal ? withAbort(load, signal) : load);
	if (signal?.aborted) throw signal.reason;
	if (!window.Live2DCubismCore) throw new Live2DError("core-missing", coreMissingMessage(), { details: coreDetails(absoluteUrl) });
}
//#endregion
//#region src/core/fit.ts
/**
* Compares by value, because an inline `fit={{ ... }}` prop is a new object on
* every render. Reapplying it each time is wasted work on its own, and it wipes
* whatever the debug overlay has been dragged to.
*/
function sameFit(left, right) {
	if (left === right) return true;
	if (typeof left === "string" || typeof right === "string") return false;
	return left.scale === right.scale && (left.offsetX ?? 0) === (right.offsetX ?? 0) && (left.offsetY ?? 0) === (right.offsetY ?? 0) && (left.units ?? "px") === (right.units ?? "px");
}
function safeScale(value) {
	return Number.isFinite(value) && value > 0 ? value : 1e-6;
}
function fitModel(stage, model, fit = "upper-body") {
	const widthScale = stage.width / model.width;
	const heightScale = stage.height / model.height;
	if (fit === "full") return {
		scale: safeScale(Math.min(widthScale, heightScale)),
		x: stage.width / 2,
		y: stage.height / 2
	};
	const baseScale = safeScale(Math.min(widthScale * 2, heightScale * 2));
	if (fit === "upper-body") return {
		scale: baseScale,
		x: stage.width / 2,
		y: stage.height
	};
	const offsetX = fit.offsetX ?? 0;
	const offsetY = fit.offsetY ?? 0;
	const relative = fit.units === "stage";
	return {
		scale: safeScale(baseScale * fit.scale),
		x: stage.width / 2 + (relative ? offsetX * stage.width : offsetX),
		y: stage.height + (relative ? offsetY * stage.height : offsetY)
	};
}
//#endregion
//#region src/core/quality.ts
const DEFAULT_AUTO_QUALITY_POLICY = {
	desktopMaxResolution: 2,
	desktopPixelBudget: 4e6,
	longFrameMs: 33,
	longFrameRatioThreshold: .05,
	minResolution: 1,
	mobileMaxResolution: 1.5,
	mobilePixelBudget: 15e5,
	resolutionStep: .25,
	sampleWindowMs: 3e3
};
function positive(value, name) {
	if (!Number.isFinite(value) || value <= 0) throw new Live2DError("invalid-props", `${name} must be a finite number greater than 0.`);
	return value;
}
function resolveAutoQualityPolicy(policy) {
	const resolved = {
		...DEFAULT_AUTO_QUALITY_POLICY,
		...policy
	};
	positive(resolved.desktopMaxResolution, "quality.desktopMaxResolution");
	positive(resolved.desktopPixelBudget, "quality.desktopPixelBudget");
	positive(resolved.longFrameMs, "quality.longFrameMs");
	positive(resolved.minResolution, "quality.minResolution");
	positive(resolved.mobileMaxResolution, "quality.mobileMaxResolution");
	positive(resolved.mobilePixelBudget, "quality.mobilePixelBudget");
	positive(resolved.resolutionStep, "quality.resolutionStep");
	positive(resolved.sampleWindowMs, "quality.sampleWindowMs");
	if (!Number.isFinite(resolved.longFrameRatioThreshold) || resolved.longFrameRatioThreshold < 0 || resolved.longFrameRatioThreshold > 1) throw new Live2DError("invalid-props", "quality.longFrameRatioThreshold must be between 0 and 1.");
	if (resolved.mobileMaxResolution < resolved.minResolution || resolved.desktopMaxResolution < resolved.minResolution) throw new Live2DError("invalid-props", "quality max resolutions must be greater than or equal to minResolution.");
	return resolved;
}
function normalizeDimension(value) {
	return Number.isFinite(value) && value > 0 ? value : 1;
}
function selectInitialResolution(input, policy = DEFAULT_AUTO_QUALITY_POLICY) {
	const width = normalizeDimension(input.width);
	const height = normalizeDimension(input.height);
	const maxResolution = input.mobile ? policy.mobileMaxResolution : policy.desktopMaxResolution;
	const pixelBudget = input.mobile ? policy.mobilePixelBudget : policy.desktopPixelBudget;
	const dpr = Number.isFinite(input.devicePixelRatio) && input.devicePixelRatio > 0 ? input.devicePixelRatio : policy.minResolution;
	const budgetResolution = Math.sqrt(pixelBudget / (width * height));
	return Math.max(policy.minResolution, Math.min(dpr, maxResolution, budgetResolution));
}
function selectLowerResolution(current, longFrameRatio, policy = DEFAULT_AUTO_QUALITY_POLICY) {
	if (!Number.isFinite(current) || current <= policy.minResolution) return policy.minResolution;
	if (!Number.isFinite(longFrameRatio) || longFrameRatio <= policy.longFrameRatioThreshold) return current;
	return Math.max(policy.minResolution, Math.round((current - policy.resolutionStep) * 100) / 100);
}
function isMobileViewport(width, height) {
	return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches || Math.min(width, height) < 768;
}
//#endregion
//#region src/features/lipsync/mouthController.ts
const MOUTH_PARAMETER_ID = "ParamMouthOpenY";
const MOUTH_RELEASE_MS = 200;
const MOUTH_HANDOFF_HOLD_MS = 500;
function clampMouthOpen(value) {
	if (!Number.isFinite(value)) return 0;
	return Math.min(1, Math.max(0, value));
}
function frameDelta(value) {
	return Number.isFinite(value) && value > 0 ? value : 0;
}
function motionParameter(value) {
	return Number.isFinite(value) ? value : 0;
}
function smoothstep(value) {
	return value * value * (3 - 2 * value);
}
/**
* Backend- and React-neutral ownership state for ParamMouthOpenY.
*
* `update()` returns `null` once motion should retain control for the frame.
*/
var MouthController = class {
	holdRemainingMs = 0;
	lastForcedValue = 0;
	releaseRemainingMs = 0;
	update(frame) {
		if (frame.speaking) {
			this.lastForcedValue = clampMouthOpen(frame.mouthOpen);
			this.releaseRemainingMs = 200;
			this.holdRemainingMs = 500;
			return this.lastForcedValue;
		}
		let remainingDeltaMs = frameDelta(frame.deltaMs);
		if (this.releaseRemainingMs > 0) {
			const consumedMs = Math.min(this.releaseRemainingMs, remainingDeltaMs);
			this.releaseRemainingMs -= consumedMs;
			remainingDeltaMs -= consumedMs;
			if (this.releaseRemainingMs > 0) {
				const blend = smoothstep(1 - this.releaseRemainingMs / 200);
				return this.lastForcedValue * (1 - blend) + motionParameter(frame.motionValue) * blend;
			}
			if (remainingDeltaMs === 0) return motionParameter(frame.motionValue);
		}
		if (this.holdRemainingMs > 0) {
			this.holdRemainingMs = Math.max(0, this.holdRemainingMs - remainingDeltaMs);
			if (this.holdRemainingMs > 0) return 0;
		}
		return null;
	}
};
//#endregion
//#region src/features/lipsync/source.ts
const RAW_VOWELS = [
	["A", "A"],
	["E", "E"],
	["I", "I"],
	["O", "O"],
	["U", "U"],
	["S", "I"]
];
const MOUTH_CAP = .7;
const MOUTH_UPDATE_INTERVAL_MS = 50;
const MOUTH_SMOOTHING_MS = 50;
const VOLUME_EXPONENT = .7;
const VOLUME_SCALE = .9;
const profileRequests = /* @__PURE__ */ new Map();
let moduleRequest;
function idempotent(cleanup) {
	let active = true;
	return () => {
		if (!active) return;
		active = false;
		cleanup();
	};
}
function finitePositive(value) {
	return Number.isFinite(value) ? Math.max(0, value) : 0;
}
function defaultNow() {
	return typeof performance === "undefined" ? Date.now() : performance.now();
}
function loadWLipSyncModule() {
	if (!moduleRequest) moduleRequest = import("wlipsync").catch((error) => {
		moduleRequest = void 0;
		throw error;
	});
	return moduleRequest;
}
function profileUrl(input) {
	if (input instanceof URL) return input.href;
	const base = typeof location === "undefined" ? "http://localhost/" : location.href;
	return new URL(input, base).href;
}
function fetchProfile(input, module, fetcher) {
	const url = profileUrl(input);
	const cached = profileRequests.get(url);
	if (cached) return cached;
	const request = fetcher(url).then(async (response) => {
		if (!response.ok) throw new Error(`Failed to load the lip-sync profile (${response.status}).`);
		if (new URL(url).pathname.toLowerCase().endsWith(".bin")) return module.parseBinaryProfile(await response.arrayBuffer());
		return await response.json();
	});
	profileRequests.set(url, request);
	request.catch(() => {
		if (profileRequests.get(url) === request) profileRequests.delete(url);
	});
	return request;
}
function resolveLipSyncProfile(input, module, fetcher = fetch) {
	if (typeof input === "string" || input instanceof URL) return fetchProfile(input, module, fetcher);
	if (input instanceof ArrayBuffer) return Promise.resolve(module.parseBinaryProfile(input));
	return Promise.resolve(input);
}
function createSourceMouthReader(node, now = defaultNow) {
	let lastRawMouthOpen = 0;
	let lastRawUpdateMs = NaN;
	let lastSmoothedMouthOpen = 0;
	let lastSmoothedUpdateMs = NaN;
	const computeMouthOpen = () => {
		const volume = Math.min(finitePositive(node.volume) * VOLUME_SCALE, 1) ** VOLUME_EXPONENT;
		const projected = {
			A: 0,
			E: 0,
			I: 0,
			O: 0,
			U: 0
		};
		for (const [raw, vowel] of RAW_VOWELS) {
			const weight = Math.min(MOUTH_CAP, finitePositive(node.weights?.[raw] ?? 0) * volume);
			projected[vowel] = Math.max(projected[vowel], weight);
		}
		return Math.max(...Object.values(projected));
	};
	return () => {
		const timestamp = now();
		if (Number.isNaN(lastRawUpdateMs) || timestamp - lastRawUpdateMs >= MOUTH_UPDATE_INTERVAL_MS) {
			lastRawMouthOpen = computeMouthOpen();
			lastRawUpdateMs = timestamp;
		}
		if (Number.isNaN(lastSmoothedUpdateMs)) {
			lastSmoothedMouthOpen = lastRawMouthOpen;
			lastSmoothedUpdateMs = timestamp;
			return lastSmoothedMouthOpen;
		}
		const elapsedMs = Math.max(0, timestamp - lastSmoothedUpdateMs);
		const alpha = Math.min(1, elapsedMs / MOUTH_SMOOTHING_MS);
		lastSmoothedMouthOpen += (lastRawMouthOpen - lastSmoothedMouthOpen) * alpha;
		lastSmoothedUpdateMs = timestamp;
		return lastSmoothedMouthOpen;
	};
}
async function createSourceLipSync(source, profile, options = {}) {
	if (typeof window !== "undefined" && window.isSecureContext === false) throw new Error("wLipSync requires HTTPS or localhost because it uses AudioWorklet.");
	if (!source.context || !("audioWorklet" in source.context)) throw new Error("The source AudioNode context does not support AudioWorklet.");
	const module = await (options.loadModule ?? loadWLipSyncModule)();
	const fetcher = options.fetcher ?? (typeof fetch === "undefined" ? void 0 : fetch.bind(globalThis));
	if ((typeof profile === "string" || profile instanceof URL) && !fetcher) throw new Error("fetch is unavailable, so the lip-sync profile URL cannot be loaded.");
	const resolvedProfile = await resolveLipSyncProfile(profile, module, fetcher);
	const node = await module.createWLipSyncNode(source.context, resolvedProfile);
	const disposeNode = idempotent(() => {
		try {
			node.disconnect();
		} catch {}
		try {
			node.port.close();
		} catch {}
	});
	try {
		source.connect(node);
	} catch (error) {
		disposeNode();
		throw error;
	}
	const getMouthOpen = createSourceMouthReader(node, options.now);
	return {
		dispose: idempotent(() => {
			try {
				source.disconnect(node);
			} catch {}
			disposeNode();
		}),
		getMouthOpen,
		node
	};
}
//#endregion
//#region src/core/motion-sequence.ts
function validateMotionSequence(steps, modelInfo) {
	if (!Array.isArray(steps)) throw new Live2DError("invalid-props", "Motion sequence steps must be an array.");
	for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
		const step = steps[stepIndex];
		if (typeof step !== "object" || step === null || Array.isArray(step)) throw new Live2DError("invalid-props", `Motion sequence step ${stepIndex} must be an object.`);
		if (typeof step.group !== "string" || step.group.trim() === "") throw new Live2DError("invalid-props", `Motion sequence step ${stepIndex} needs a non-empty group.`);
		const count = modelInfo.motions[step.group];
		if (!Number.isInteger(count) || count <= 0) throw new Live2DError("invalid-props", `Unknown Live2D motion group in sequence step ${stepIndex}: ${step.group}.`);
		if (step.index !== void 0 && (!Number.isInteger(step.index) || step.index < 0 || step.index >= count)) throw new Live2DError("invalid-props", `Motion index ${step.index} is outside group ${step.group} in sequence step ${stepIndex}.`);
		validateMotionOptions(step.options);
	}
}
async function playMotionSequence(steps, modelInfo, play) {
	validateMotionSequence(steps, modelInfo);
	for (let stepIndex = 0; stepIndex < steps.length; stepIndex++) {
		const step = steps[stepIndex];
		const result = await play(step.group, step.index, step.options);
		if (result.status !== "completed") return {
			completedSteps: stepIndex,
			status: result.status,
			stepIndex
		};
	}
	return {
		completedSteps: steps.length,
		status: "completed"
	};
}
//#endregion
//#region src/core/runtime-feature.ts
function once$1(cleanup) {
	let active = true;
	return () => {
		if (!active) return;
		active = false;
		cleanup();
	};
}
/** Owns one model-bound feature across runtime model generations. */
var ManagedFeature = class {
	setup;
	report;
	cleanup;
	generation = 0;
	constructor(setup, report) {
		this.setup = setup;
		this.report = report;
	}
	attach(model) {
		this.detach();
		const generation = this.generation;
		try {
			const result = this.setup(model);
			if (result instanceof Promise) result.then((cleanup) => {
				if (generation !== this.generation) {
					cleanup();
					return;
				}
				this.cleanup = once$1(cleanup);
			}).catch((error) => {
				if (generation === this.generation) this.report(error);
			});
			else this.cleanup = once$1(result);
		} catch (error) {
			this.report(error);
		}
	}
	detach() {
		this.generation++;
		this.cleanup?.();
		this.cleanup = void 0;
	}
};
//#endregion
//#region src/core/runtime.ts
function once(cleanup) {
	let active = true;
	return () => {
		if (!active) return;
		active = false;
		cleanup();
	};
}
function asLive2DError(error, fallbackCode) {
	if (error instanceof Live2DError) return error;
	return new Live2DError(fallbackCode, error instanceof Error ? error.message : String(error), { cause: error });
}
function assertAccessibility(accessibility) {
	if (accessibility === void 0) return;
	if (!accessibility || typeof accessibility !== "object") throw new Live2DError("invalid-props", "accessibility must be a decorative or image accessibility object.");
	if (accessibility.mode !== "decorative" && accessibility.mode !== "image" && accessibility.mode !== void 0) throw new Live2DError("invalid-props", "accessibility.mode must be \"decorative\" or \"image\".");
	if (accessibility.mode === "decorative") return;
	if (typeof accessibility.label !== "string" || accessibility.label.trim() === "") throw new Live2DError("invalid-props", "image accessibility requires a non-empty label.");
	for (const [name, value] of [["describedBy", accessibility.describedBy], ["fallbackText", accessibility.fallbackText]]) if (value !== void 0 && typeof value !== "string") throw new Live2DError("invalid-props", `accessibility.${name} must be a string when provided.`);
}
function assertOptions(options) {
	if (typeof window === "undefined" || typeof document === "undefined" || typeof HTMLElement === "undefined") throw new Live2DError("browser-only", "Live2D can only be created in a browser.");
	if (!(options.container instanceof HTMLElement)) throw new Live2DError("invalid-props", "container must be an HTMLElement.");
	assertAccessibility(options.accessibility);
	if (options.src !== void 0 && (typeof options.src !== "string" || options.src.trim() === "")) throw new Live2DError("invalid-props", "src must be a non-empty model3.json path or URL string.");
	if (options.resolveAsset !== void 0 && typeof options.resolveAsset !== "function") throw new Live2DError("invalid-props", "resolveAsset must be a function.");
	if (options.quality !== void 0 && options.resolution !== void 0) throw new Live2DError("invalid-props", "quality and resolution are mutually exclusive.");
	if (!Number.isInteger(options.retries ?? 2) || (options.retries ?? 2) < 0) throw new Live2DError("invalid-props", "retries must be a non-negative integer.");
	if ("resolution" in options && options.resolution !== void 0 && (!Number.isFinite(options.resolution) || options.resolution < 1)) throw new Live2DError("invalid-props", "resolution must be a finite number greater than or equal to 1.");
	if (options.maxFps !== void 0 && (!Number.isFinite(options.maxFps) || options.maxFps <= 0)) throw new Live2DError("invalid-props", "maxFps must be a finite number greater than 0.");
	if (options.pauseWhenOffscreen !== void 0 && typeof options.pauseWhenOffscreen !== "boolean") throw new Live2DError("invalid-props", "pauseWhenOffscreen must be a boolean.");
	if (options.followPointer !== void 0 && typeof options.followPointer !== "boolean") throw new Live2DError("invalid-props", "followPointer must be a boolean.");
	if (options.debug !== void 0 && typeof options.debug !== "boolean") throw new Live2DError("invalid-props", "debug must be a boolean.");
	validateIdleMotion(options.idleMotion);
}
function wait(ms, signal) {
	return new Promise((resolve, reject) => {
		if (signal.aborted) {
			reject(signal.reason);
			return;
		}
		let timeout;
		const onAbort = () => {
			clearTimeout(timeout);
			reject(signal.reason);
		};
		timeout = setTimeout(() => {
			signal.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		signal.addEventListener("abort", onAbort, { once: true });
	});
}
var Live2DRuntime = class {
	options;
	abortController;
	disposed = false;
	features = [];
	accessibility;
	fit;
	debug;
	debugOverlay;
	debugWanted;
	intersectionObserver;
	listeners = /* @__PURE__ */ new Set();
	models = [];
	backend;
	onStageResume;
	pauseReasons = /* @__PURE__ */ new Set();
	resizeAnimationFrame = 0;
	resizeObserver;
	stage;
	stageCleanup = [];
	state = {
		loadingStage: "core",
		status: "loading"
	};
	constructor(options) {
		this.options = options;
		this.fit = options.fit ?? "upper-body";
		this.debug = options.debug ?? false;
		this.accessibility = options.accessibility;
	}
	/** The model `src` created. Instance-level methods act on this one. */
	get model() {
		return this.models[0]?.handle;
	}
	getState = () => this.state;
	/** Internal bridge for framework bindings that preserve the ModelHandle API. */
	getModelHandle = () => this.model ?? null;
	subscribe = (listener) => {
		this.listeners.add(listener);
		return once(() => this.listeners.delete(listener));
	};
	updateState(patch) {
		this.state = {
			...this.state,
			...patch
		};
		for (const listener of this.listeners) listener();
	}
	report(error) {
		if (this.disposed) return;
		this.updateState({
			error,
			loadingStage: void 0,
			status: "error"
		});
		this.options.onError?.(error);
	}
	readRenderState(stage) {
		const size = stage.getSize();
		const resolution = stage.getResolution();
		return {
			bufferPixels: Math.round(size.width * size.height * resolution ** 2),
			height: size.height,
			resolution,
			width: size.width
		};
	}
	async resolveBackend() {
		if (this.options.backend) return this.options.backend;
		const { cubismWebGL } = await import("./backends/cubism-webgl.mjs");
		return cubismWebGL;
	}
	addPauseReason(reason) {
		if (this.pauseReasons.has(reason)) return;
		const wasRunning = this.pauseReasons.size === 0;
		this.pauseReasons.add(reason);
		if (wasRunning) this.stage?.pause();
	}
	removePauseReason(reason) {
		if (!this.pauseReasons.delete(reason) || this.pauseReasons.size > 0) return;
		this.onStageResume?.();
		this.stage?.resume();
	}
	teardown() {
		this.abortController?.abort();
		this.abortController = void 0;
		cancelAnimationFrame(this.resizeAnimationFrame);
		this.resizeAnimationFrame = 0;
		this.intersectionObserver?.disconnect();
		this.intersectionObserver = void 0;
		this.onStageResume = void 0;
		this.resizeObserver?.disconnect();
		this.resizeObserver = void 0;
		for (const cleanup of this.stageCleanup.splice(0).reverse()) cleanup();
		for (const feature of [...this.features].reverse()) feature.detach();
		for (const record of this.models) {
			this.releaseDebugOverlay(record);
			for (const feature of record.features.splice(0).reverse()) feature.detach();
			record.handle.dispose();
		}
		this.models = [];
		this.stage?.dispose();
		this.stage = void 0;
	}
	async start() {
		if (this.disposed) throw new Live2DError("invalid-props", "Cannot start a disposed Live2D instance.");
		assertOptions(this.options);
		this.pauseReasons.delete("hidden");
		this.pauseReasons.delete("offscreen");
		const policy = this.options.resolution !== void 0 ? void 0 : resolveAutoQualityPolicy(typeof this.options.quality === "object" ? this.options.quality : void 0);
		const controller = new AbortController();
		this.abortController = controller;
		const onExternalAbort = () => controller.abort(this.options.signal?.reason);
		if (this.options.signal?.aborted) onExternalAbort();
		this.options.signal?.addEventListener("abort", onExternalAbort, { once: true });
		this.stageCleanup.push(() => {
			this.options.signal?.removeEventListener("abort", onExternalAbort);
		});
		try {
			this.updateState({
				error: void 0,
				loadingStage: "core",
				status: "loading"
			});
			await ensureCubismCore(this.options.coreUrl, { signal: controller.signal });
			if (controller.signal.aborted) throw controller.signal.reason;
			const backend = this.backend ?? await this.resolveBackend();
			this.backend = backend;
			if (controller.signal.aborted) throw controller.signal.reason;
			this.updateState({ loadingStage: "stage" });
			const rect = this.options.container.getBoundingClientRect();
			if (rect.width < 1 || rect.height < 1) console.warn("[live2d-web] The container has zero size, so the canvas will be 1x1 and nothing will be visible. Give the container a CSS width and height.");
			let width = Math.max(1, rect.width);
			let height = Math.max(1, rect.height);
			const resolution = this.options.resolution !== void 0 ? this.options.resolution : selectInitialResolution({
				devicePixelRatio: window.devicePixelRatio,
				height,
				mobile: isMobileViewport(width, height),
				width
			}, policy);
			const stage = backend.createStage(this.options.container, {
				accessibility: this.accessibility,
				height,
				maxFps: this.options.maxFps,
				resolution,
				width
			});
			this.stage = stage;
			if (this.pauseReasons.size > 0) stage.pause();
			this.stageCleanup.push(stage.onError((error) => {
				this.report(asLive2DError(error, "render-error"));
			}));
			let elapsedMs = 0;
			let frameCount = 0;
			let longFrameCount = 0;
			if (policy) this.stageCleanup.push(stage.onFrame((deltaMs) => {
				elapsedMs += deltaMs;
				frameCount++;
				if (deltaMs > policy.longFrameMs) longFrameCount++;
				if (elapsedMs < policy.sampleWindowMs) return;
				const next = selectLowerResolution(stage.getResolution(), frameCount ? longFrameCount / frameCount : 0, policy);
				if (next < stage.getResolution()) {
					stage.setResolution(next);
					this.updateState({ render: this.readRenderState(stage) });
				}
				elapsedMs = 0;
				frameCount = 0;
				longFrameCount = 0;
			}));
			const resize = () => {
				this.resizeAnimationFrame = 0;
				if (this.disposed || this.stage !== stage) return;
				const nextRect = this.options.container.getBoundingClientRect();
				const nextWidth = Math.max(1, nextRect.width);
				const nextHeight = Math.max(1, nextRect.height);
				if (Math.abs(nextWidth - width) < .5 && Math.abs(nextHeight - height) < .5) return;
				width = nextWidth;
				height = nextHeight;
				if (policy) {
					const cap = selectInitialResolution({
						devicePixelRatio: window.devicePixelRatio,
						height,
						mobile: isMobileViewport(width, height),
						width
					}, policy);
					if (cap < stage.getResolution()) stage.setResolution(cap);
				}
				stage.resize(width, height);
				this.applyFit();
				this.updateState({ render: this.readRenderState(stage) });
			};
			const scheduleResize = () => {
				if (!this.resizeAnimationFrame) this.resizeAnimationFrame = requestAnimationFrame(resize);
			};
			this.resizeObserver = typeof ResizeObserver === "undefined" ? void 0 : new ResizeObserver(scheduleResize);
			this.resizeObserver?.observe(this.options.container);
			this.onStageResume = () => {
				elapsedMs = 0;
				frameCount = 0;
				longFrameCount = 0;
				scheduleResize();
			};
			const onVisibilityChange = () => {
				if (document.hidden) this.addPauseReason("hidden");
				else this.removePauseReason("hidden");
			};
			document.addEventListener("visibilitychange", onVisibilityChange);
			onVisibilityChange();
			this.stageCleanup.push(() => {
				document.removeEventListener("visibilitychange", onVisibilityChange);
			});
			this.intersectionObserver = (this.options.pauseWhenOffscreen ?? true) && typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((entries) => {
				const entry = entries[entries.length - 1];
				if (!entry) return;
				if (entry.isIntersecting) this.removePauseReason("offscreen");
				else this.addPauseReason("offscreen");
			}) : void 0;
			this.intersectionObserver?.observe(this.options.container);
			this.updateState({
				loadingStage: "model",
				render: this.readRenderState(stage)
			});
			if (this.options.src !== void 0) {
				const model = await this.loadModel(backend, stage, this.options.src, controller.signal);
				if (controller.signal.aborted || this.stage !== stage) {
					model.dispose();
					throw controller.signal.reason;
				}
				this.models.push({
					features: [],
					fit: this.fit,
					followPointer: this.options.followPointer ?? false,
					handle: model
				});
				this.applyFit();
				for (const feature of this.features) feature.attach(model);
			}
			{
				const container = this.options.container;
				const onPointerMove = (event) => {
					if (this.stage !== stage) return;
					const point = stage.toWorld(event.clientX, event.clientY);
					for (const record of this.models) if (record.followPointer) record.handle.focus(point.x, point.y);
				};
				const onPointerLeave = () => {
					if (this.stage !== stage) return;
					const size = stage.getSize();
					for (const record of this.models) if (record.followPointer) record.handle.focus(size.width / 2, size.height / 2);
				};
				container.addEventListener("pointermove", onPointerMove);
				container.addEventListener("pointerleave", onPointerLeave);
				this.stageCleanup.push(() => {
					container.removeEventListener("pointermove", onPointerMove);
					container.removeEventListener("pointerleave", onPointerLeave);
				});
			}
			if (this.debug && this.models[0]) await this.mountDebugOverlay(stage, this.models[0]);
			this.updateState({
				error: void 0,
				loadingStage: void 0,
				render: this.readRenderState(stage),
				status: "ready"
			});
		} catch (error) {
			if (controller.signal.aborted) {
				if (this.disposed) return;
				throw error;
			}
			const normalized = asLive2DError(error, "adapter-error");
			this.teardown();
			this.report(normalized);
			throw normalized;
		}
	}
	async loadModel(backend, stage, src, signal, options) {
		const retries = options?.retries ?? this.options.retries ?? 2;
		let lastError;
		for (let attempt = 0; attempt <= retries; attempt++) try {
			return await backend.loadModel(stage, src, {
				idleMotion: options?.idleMotion ?? this.options.idleMotion,
				resolveAsset: options?.resolveAsset ?? this.options.resolveAsset,
				signal
			});
		} catch (error) {
			if (signal.aborted) throw error;
			lastError = asLive2DError(error, "model-load-failed");
			const status = lastError.details?.httpStatus;
			if (lastError.code === "invalid-props" || status !== void 0 && status >= 400 && status < 500 || attempt === retries) break;
			await wait(attempt === 0 ? 250 : 500, signal);
		}
		if (!lastError) throw new Live2DError("model-load-failed", "The model could not be loaded.");
		throw lastError;
	}
	requireModel() {
		if (this.disposed) throw new Live2DError("invalid-props", "The Live2D instance has been disposed.");
		if (!this.model) throw new Live2DError("model-load-failed", "The Live2D model is not ready.");
		return this.model;
	}
	async mountDebugOverlay(stage, record) {
		const { mountLive2DDebugOverlay } = await import("./debug.mjs");
		if (this.disposed || this.stage !== stage || !this.models.includes(record)) return;
		if (this.debugWanted !== record || this.debugOverlay?.owner === record) return;
		this.releaseDebugOverlay();
		const overlay = mountLive2DDebugOverlay({
			container: this.options.container,
			onChange: (fit) => (record.onFitChange ?? this.options.onFitChange)?.(fit),
			target: {
				getFit: () => typeof record.fit === "object" ? { ...record.fit } : record.fit,
				setFit: (fit) => {
					record.fit = fit;
					this.applyFit();
				}
			}
		});
		this.debugOverlay = {
			dispose: overlay.dispose,
			owner: record,
			refresh: overlay.refresh
		};
		this.stageCleanup.push(() => this.releaseDebugOverlay(record));
	}
	/** Removes the overlay, or leaves it alone when `owner` does not hold it. */
	releaseDebugOverlay(owner) {
		const current = this.debugOverlay;
		if (!current || owner !== void 0 && current.owner !== owner) return;
		this.debugOverlay = void 0;
		current.dispose();
	}
	setDebug(enabled, record) {
		if (typeof enabled !== "boolean") throw new Live2DError("invalid-props", "debug must be a boolean.");
		const target = record ?? this.models[0];
		if (!enabled) {
			if (this.debugWanted === target) this.debugWanted = void 0;
			this.releaseDebugOverlay(target);
			if (!record) this.debug = false;
			return;
		}
		if (!record) this.debug = true;
		if (!this.stage || !target) return;
		const previous = this.debugWanted;
		this.debugWanted = target;
		if (previous && previous !== target) console.warn("[live2d-web] The placement overlay moved to the model that asked for it last. It covers the canvas to take the pointer, so only one model can have it at a time.");
		this.mountDebugOverlay(this.stage, target);
	}
	applyFit() {
		const stage = this.stage;
		if (!stage) return;
		const size = stage.getSize();
		for (const record of this.models) record.handle.setTransform(fitModel(size, record.handle.getIntrinsicSize(), record.fit));
	}
	motion(group, index, options) {
		return this.requireModel().motion(group, index, options);
	}
	async playMotion(group, index, options) {
		const model = this.requireModel();
		if (!model.playMotion) throw new Live2DError("adapter-error", "The selected Live2D backend does not support detailed motion playback.");
		return model.playMotion(group, index, options);
	}
	async sequence(steps) {
		const model = this.requireModel();
		if (!model.playMotion) throw new Live2DError("adapter-error", "The selected Live2D backend does not support motion sequences.");
		return playMotionSequence(steps, model.getModelInfo(), (group, index, options) => model.playMotion(group, index, options));
	}
	isMotionPlaying() {
		return this.model?.isMotionPlaying() ?? false;
	}
	expression(id, options) {
		return this.requireModel().expression(id, options);
	}
	clearExpression() {
		this.requireModel().clearExpression();
	}
	getModelInfo() {
		return this.requireModel().getModelInfo();
	}
	focus(x, y) {
		this.requireModel().focus(x, y);
	}
	focusAt(clientX, clientY) {
		const stage = this.stage;
		if (!stage || this.models.length === 0) return;
		const point = stage.toWorld(clientX, clientY);
		for (const record of this.models) record.handle.focus(point.x, point.y);
	}
	hitTest(clientX, clientY) {
		const stage = this.stage;
		if (!stage) return [];
		const point = stage.toWorld(clientX, clientY);
		for (let index = this.models.length - 1; index >= 0; index--) {
			const areas = this.models[index].handle.hitTest(point.x, point.y);
			if (areas.length > 0) return areas;
		}
		return [];
	}
	getParameter(id) {
		return this.requireModel().getParameter(id);
	}
	setParameter(id, value) {
		this.requireModel().setParameter(id, value);
	}
	clearParameter(id) {
		this.requireModel().clearParameter(id);
	}
	setFit(fit) {
		this.fit = fit;
		if (this.models[0]) this.models[0].fit = fit;
		this.applyFit();
		this.debugOverlay?.refresh();
	}
	/**
	* Loads another model onto the same canvas, so a second character costs a
	* model rather than a second WebGL context. It draws over the ones already
	* there, and owns its own layout, motions and parameters.
	*/
	async addModel(options) {
		if (this.disposed) throw new Live2DError("invalid-props", "The Live2D instance has been disposed.");
		if (!options || typeof options.src !== "string" || options.src === "") throw new Live2DError("invalid-props", "addModel requires a src.");
		await this.whenStageReady();
		const stage = this.stage;
		const backend = this.backend;
		if (!stage || !backend) throw new Live2DError("invalid-props", "The Live2D canvas is not ready. Await createLive2D() before adding a model.");
		const controller = new AbortController();
		const abort = () => controller.abort(options.signal?.reason);
		options.signal?.addEventListener("abort", abort, { once: true });
		let handle;
		try {
			handle = await this.loadModel(backend, stage, options.src, controller.signal, options);
		} finally {
			options.signal?.removeEventListener("abort", abort);
		}
		if (this.disposed || this.stage !== stage) {
			handle.dispose();
			throw new Live2DError("invalid-props", "The Live2D canvas went away while the model loaded.");
		}
		const record = {
			features: [],
			fit: options.fit ?? "upper-body",
			followPointer: options.followPointer ?? false,
			handle,
			onFitChange: options.onFitChange
		};
		this.models.push(record);
		this.applyFit();
		return this.createModelHandle(record);
	}
	whenStageReady() {
		if (this.stage && this.backend) return Promise.resolve();
		if (this.state.status === "error") return Promise.reject(this.state.error ?? new Live2DError("adapter-error", "The Live2D canvas failed to start."));
		return new Promise((resolve, reject) => {
			const unsubscribe = this.subscribe(() => {
				if (this.disposed) {
					unsubscribe();
					reject(new Live2DError("invalid-props", "The Live2D instance has been disposed."));
					return;
				}
				if (this.stage && this.backend) {
					unsubscribe();
					resolve();
					return;
				}
				if (this.state.status === "error") {
					unsubscribe();
					reject(this.state.error ?? new Live2DError("adapter-error", "The Live2D canvas failed to start."));
				}
			});
		});
	}
	createModelHandle(record) {
		const require = () => {
			if (!this.models.includes(record)) throw new Live2DError("invalid-props", "This Live2D model has been disposed.");
			return record.handle;
		};
		return Object.freeze({
			addLipSync: (lipSyncOptions) => this.addLipSync(lipSyncOptions, record),
			addParameterDriver: (id, driver) => this.addParameterDriver(id, driver, record),
			clearExpression: () => require().clearExpression(),
			clearParameter: (id) => require().clearParameter(id),
			dispose: () => {
				const index = this.models.indexOf(record);
				if (index < 0) return;
				this.models.splice(index, 1);
				if (this.debugWanted === record) this.debugWanted = void 0;
				this.releaseDebugOverlay(record);
				for (const feature of record.features.splice(0)) feature.detach();
				record.handle.dispose();
			},
			expression: (id, expressionOptions) => require().expression(id, expressionOptions),
			focus: (x, y) => require().focus(x, y),
			focusAt: (clientX, clientY) => {
				const stage = this.stage;
				if (!stage) return;
				const point = stage.toWorld(clientX, clientY);
				require().focus(point.x, point.y);
			},
			getFit: () => typeof record.fit === "object" ? { ...record.fit } : record.fit,
			getModelInfo: () => require().getModelInfo(),
			getParameter: (id) => require().getParameter(id),
			hitTest: (clientX, clientY) => {
				const stage = this.stage;
				if (!stage) return [];
				const point = stage.toWorld(clientX, clientY);
				return require().hitTest(point.x, point.y);
			},
			isMotionPlaying: () => require().isMotionPlaying(),
			motion: (group, index, motionOptions) => require().motion(group, index, motionOptions),
			playMotion: async (group, index, motionOptions) => {
				const model = require();
				if (!model.playMotion) throw new Live2DError("adapter-error", "The selected Live2D backend does not support detailed motion playback.");
				return model.playMotion(group, index, motionOptions);
			},
			sequence: async (steps) => {
				const model = require();
				if (!model.playMotion) throw new Live2DError("adapter-error", "The selected Live2D backend does not support motion sequences.");
				return playMotionSequence(steps, model.getModelInfo(), (group, index, motionOptions) => model.playMotion(group, index, motionOptions));
			},
			setDebug: (enabled) => this.setDebug(enabled, record),
			setFit: (fit) => {
				record.fit = fit;
				this.applyFit();
			},
			setParameter: (id, value) => require().setParameter(id, value)
		});
	}
	getFit() {
		return typeof this.fit === "object" ? { ...this.fit } : this.fit;
	}
	setAccessibility(accessibility) {
		assertAccessibility(accessibility);
		this.accessibility = accessibility;
		this.stage?.setAccessibility?.(accessibility);
	}
	addFeature(feature, record) {
		const list = record?.features ?? this.features;
		list.push(feature);
		const target = record?.handle ?? this.model;
		if (target) feature.attach(target);
		return once(() => {
			feature.detach();
			const index = list.indexOf(feature);
			if (index >= 0) list.splice(index, 1);
		});
	}
	addParameterDriver(id, driver, record) {
		if (!driver || typeof driver.getValue !== "function") throw new Live2DError("invalid-props", "A parameter driver must provide getValue().");
		return this.addFeature(new ManagedFeature((model) => {
			const write = () => {
				model.setParameter(id, driver.getValue());
				model.clearParameter(id);
			};
			const unsubscribe = (driver.phase === "before-physics" && model.onBeforePhysicsUpdate ? model.onBeforePhysicsUpdate : model.onAfterMotionUpdate).call(model, write);
			return () => {
				unsubscribe();
				model.clearParameter(id);
			};
		}, (error) => this.report(asLive2DError(error, "render-error"))), record);
	}
	addLipSync(options, record) {
		const reportLipSyncError = (error) => {
			const normalized = asLive2DError(error, "lipsync-error");
			options.onError?.(normalized);
			if (!options.onError && this.options.onError) this.options.onError?.(normalized);
			else if (!options.onError && !this.options.onError) console.error("[live2d-web] lip sync disabled:", normalized);
		};
		const parameterId = options.parameterId ?? "ParamMouthOpenY";
		const feature = new ManagedFeature(async (model) => {
			const controller = new MouthController();
			const sourceConnection = "source" in options ? await createSourceLipSync(options.source, options.profile) : void 0;
			const driver = "driver" in options ? options.driver : {
				getMouthOpen: sourceConnection.getMouthOpen,
				isSpeaking: options.isSpeaking
			};
			let failed = false;
			const unsubscribe = model.onAfterMotionUpdate((deltaMs) => {
				if (failed) return;
				try {
					const speaking = driver.isSpeaking();
					const value = controller.update({
						deltaMs,
						motionValue: model.getParameter(parameterId),
						mouthOpen: speaking ? driver.getMouthOpen() : 0,
						speaking
					});
					if (value !== null) {
						model.setParameter(parameterId, value);
						model.clearParameter(parameterId);
					}
				} catch (error) {
					failed = true;
					reportLipSyncError(error);
				}
			});
			return () => {
				unsubscribe();
				model.clearParameter(parameterId);
				sourceConnection?.dispose();
			};
		}, reportLipSyncError);
		return this.addFeature(feature, record);
	}
	pause() {
		this.addPauseReason("user");
	}
	resume() {
		this.removePauseReason("user");
	}
	async retry() {
		if (this.disposed) throw new Live2DError("invalid-props", "Cannot retry a disposed Live2D instance.");
		this.teardown();
		await this.start();
	}
	dispose() {
		if (this.disposed) return;
		this.disposed = true;
		this.teardown();
		this.features = [];
		this.updateState({
			error: void 0,
			loadingStage: void 0,
			render: void 0,
			status: "disposed"
		});
		this.listeners.clear();
	}
};
async function createLive2D(options) {
	const runtime = new Live2DRuntime(options);
	try {
		await runtime.start();
		return runtime;
	} catch (error) {
		runtime.dispose();
		throw error;
	}
}
//#endregion
export { MOUTH_RELEASE_MS as a, resolveAutoQualityPolicy as c, fitModel as d, sameFit as f, MOUTH_PARAMETER_ID as i, selectInitialResolution as l, ensureCubismCore as m, createLive2D as n, DEFAULT_AUTO_QUALITY_POLICY as o, OFFICIAL_CUBISM_CORE_URL as p, MOUTH_HANDOFF_HOLD_MS as r, isMobileViewport as s, Live2DRuntime as t, selectLowerResolution as u };
