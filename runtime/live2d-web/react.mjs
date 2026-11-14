"use client";
import { t as Live2DError } from "./errors-DjppR7Ty.mjs";
import { c as resolveAutoQualityPolicy, d as fitModel, f as sameFit, l as selectInitialResolution, m as ensureCubismCore, o as DEFAULT_AUTO_QUALITY_POLICY, p as OFFICIAL_CUBISM_CORE_URL, s as isMobileViewport, t as Live2DRuntime, u as selectLowerResolution } from "./runtime-CKhdT1Le.mjs";
import { a as idleMotionIdentity, c as validateIdleMotion } from "./motion-options-CE7R-nHn.mjs";
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/react/context.ts
const StageContext = createContext(null);
const RuntimeHostContext = createContext(null);
const ModelContext = createContext(null);
//#endregion
//#region src/react/hooks.ts
function useLive2DCanvas() {
	const store = useContext(StageContext);
	if (!store) throw new Live2DError("invalid-tree", "useLive2DCanvas() must be used inside <Live2DCanvas>.");
	return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
function useLive2DModel() {
	const context = useContext(ModelContext);
	if (!context) throw new Live2DError("invalid-tree", "useLive2DModel() must be used inside <Live2DModel>.");
	return useSyncExternalStore(context.store.subscribe, context.store.getSnapshot, context.store.getSnapshot).controller;
}
function useLive2DParameter(id, value) {
	const model = useLive2DModel();
	useEffect(() => {
		model?.setParameter(id, value);
		return () => {
			try {
				model?.clearParameter(id);
			} catch {}
		};
	}, [
		id,
		model,
		value
	]);
}
/**
* Owns a vanilla Live2D instance from React: creation, StrictMode replays,
* state subscription and disposal. Changing container or src recreates the
* instance; change other options by remounting with a key.
*/
function useLive2D(options) {
	const [runtime, setRuntime] = useState(null);
	const [version, setVersion] = useState(0);
	const [, forceRender] = useReducer((count) => count + 1, 0);
	const optionsRef = useRef(options);
	optionsRef.current = options;
	const { container, src } = options;
	useEffect(() => {
		if (!container) {
			queueMicrotask(() => setRuntime(null));
			return;
		}
		let active = true;
		const generation = new Live2DRuntime({
			...optionsRef.current,
			container
		});
		queueMicrotask(() => {
			if (active) setRuntime(generation);
		});
		const unsubscribe = generation.subscribe(forceRender);
		generation.start().catch(() => {});
		return () => {
			active = false;
			unsubscribe();
			generation.dispose();
			queueMicrotask(() => {
				setRuntime((current) => current === generation ? null : current);
			});
		};
	}, [
		container,
		src,
		version
	]);
	const state = runtime?.getState() ?? {
		loadingStage: "core",
		status: "loading"
	};
	return {
		error: state.error,
		instance: runtime && state.status === "ready" ? runtime : null,
		retry: () => setVersion((current) => current + 1),
		state
	};
}
function useParameterDriver(id, getter) {
	const context = useContext(ModelContext);
	if (!context) throw new Live2DError("invalid-tree", "useParameterDriver() must be used inside <Live2DModel>.");
	const runtime = useSyncExternalStore(context.store.subscribe, context.store.getSnapshot, context.store.getSnapshot).runtime;
	const getterRef = useRef(getter);
	getterRef.current = getter;
	useEffect(() => {
		if (!runtime) return;
		return context.lifecycle.add(runtime.addParameterDriver(id, { getValue: () => getterRef.current() }));
	}, [
		context.lifecycle,
		id,
		runtime
	]);
}
//#endregion
//#region src/react/LipSync.tsx
function isAudioNodeLike(value) {
	if (!value || typeof value !== "object") return false;
	const candidate = value;
	return typeof candidate.connect === "function" && typeof candidate.disconnect === "function" && Boolean(candidate.context);
}
function isProfileInput(value) {
	if (typeof value === "string") return value.trim().length > 0;
	if (typeof URL !== "undefined" && value instanceof URL) return true;
	if (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) return true;
	return Boolean(value) && typeof value === "object";
}
function resolveMode(props) {
	const candidate = props;
	const hasDriver = candidate.driver !== void 0;
	const hasSourceProps = "source" in candidate || "active" in candidate || "profile" in candidate;
	const hasValueProps = "mouthOpen" in candidate || "speaking" in candidate;
	if (Number(hasDriver) + Number(hasSourceProps) + Number(hasValueProps) !== 1) throw new Live2DError("invalid-props", "<LipSync> requires exactly one mode: driver, source/active/profile, or mouthOpen/speaking.");
	if (hasValueProps) {
		if (typeof candidate.mouthOpen !== "number" || typeof candidate.speaking !== "boolean") throw new Live2DError("invalid-props", "<LipSync mouthOpen/speaking> requires a number and a boolean.");
		return "values";
	}
	if (hasDriver) {
		const driver = candidate.driver;
		if (!driver || typeof driver.getMouthOpen !== "function" || typeof driver.isSpeaking !== "function") throw new Live2DError("invalid-props", "<LipSync driver> must provide getMouthOpen() and isSpeaking().");
		return "driver";
	}
	if (typeof candidate.active !== "boolean" || !(candidate.source === null || isAudioNodeLike(candidate.source)) || !isProfileInput(candidate.profile)) throw new Live2DError("invalid-props", "<LipSync source> requires an AudioNode or null, a boolean active prop, and a valid profile.");
	return "source";
}
function LipSync(props) {
	const context = useContext(ModelContext);
	if (!context) throw new Live2DError("invalid-tree", "<LipSync> must be rendered inside <Live2DModel>.");
	const mode = resolveMode(props);
	const runtime = useSyncExternalStore(context.store.subscribe, context.store.getSnapshot, context.store.getSnapshot).runtime;
	const activeRef = useRef(false);
	const driverRef = useRef(null);
	const mouthOpenRef = useRef(0);
	const onErrorRef = useRef(props.onError);
	const speakingRef = useRef(false);
	activeRef.current = mode === "source" ? Boolean(props.active) : false;
	driverRef.current = mode === "driver" ? props.driver ?? null : null;
	mouthOpenRef.current = mode === "values" ? props.mouthOpen ?? 0 : 0;
	speakingRef.current = mode === "values" ? Boolean(props.speaking) : false;
	onErrorRef.current = props.onError;
	const source = mode === "source" ? props.source : null;
	const profile = mode === "source" ? props.profile instanceof URL ? props.profile.href : props.profile : null;
	useEffect(() => {
		if (!runtime) return;
		const report = (error) => {
			if (onErrorRef.current) onErrorRef.current(error);
			else console.error("[live2d-web] lip sync disabled:", error);
		};
		if (mode === "driver" || mode === "values") {
			const driver = mode === "driver" ? {
				getMouthOpen: () => driverRef.current?.getMouthOpen() ?? 0,
				isSpeaking: () => driverRef.current?.isSpeaking() ?? false
			} : {
				getMouthOpen: () => mouthOpenRef.current,
				isSpeaking: () => speakingRef.current
			};
			return context.lifecycle.add(runtime.addLipSync({
				driver,
				onError: report,
				parameterId: props.parameterId
			}));
		}
		if (!source || !profile) return;
		return context.lifecycle.add(runtime.addLipSync({
			isSpeaking: () => activeRef.current,
			onError: report,
			parameterId: props.parameterId,
			profile,
			source
		}));
	}, [
		context.lifecycle,
		mode,
		profile,
		props.parameterId,
		runtime,
		source
	]);
	return null;
}
//#endregion
//#region src/react/store.ts
var StageStore = class {
	listeners = /* @__PURE__ */ new Set();
	models = /* @__PURE__ */ new Map();
	stageReady = false;
	structuralError;
	snapshot;
	constructor(retry) {
		this.snapshot = {
			loadingStage: "core",
			retry,
			status: "loading"
		};
	}
	subscribe = (listener) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};
	getSnapshot = () => this.snapshot;
	update(patch) {
		this.snapshot = {
			...this.snapshot,
			...patch
		};
		for (const listener of this.listeners) listener();
	}
	fail(error) {
		if (error.code === "invalid-tree") this.structuralError = error;
		this.update({
			error,
			loadingStage: void 0,
			status: "error"
		});
	}
	syncRuntime(state) {
		if (this.structuralError) return;
		if (state.status === "disposed") return;
		this.stageReady = state.status === "ready";
		this.update({
			error: state.error,
			loadingStage: state.loadingStage,
			render: state.render,
			status: state.status
		});
		this.settle();
	}
	registerModel(owner) {
		this.models.set(owner, { loading: true });
		this.settle();
	}
	setModelResource(owner, resource) {
		const entry = this.models.get(owner);
		if (!entry) {
			resource.dispose();
			return false;
		}
		entry.resource?.dispose();
		entry.resource = resource;
		return true;
	}
	setModelReady(owner) {
		const entry = this.models.get(owner);
		if (!entry) return;
		entry.loading = false;
		this.settle();
	}
	releaseModel(owner) {
		const entry = this.models.get(owner);
		if (!entry) return;
		this.models.delete(owner);
		entry.resource?.dispose();
		this.settle();
	}
	disposeModelResource() {
		for (const entry of this.models.values()) entry.resource?.dispose();
		this.models.clear();
	}
	/**
	* The canvas is ready when the stage is and no model is still loading. An
	* empty canvas counts as ready: a consumer can mount one and add models to
	* it later.
	*/
	settle() {
		if (this.structuralError || this.snapshot.status === "error") return;
		const loading = [...this.models.values()].some((entry) => entry.loading);
		if (this.stageReady && !loading) {
			if (this.snapshot.status !== "ready") this.update({
				loadingStage: void 0,
				status: "ready"
			});
			return;
		}
		if (this.stageReady && loading && this.snapshot.status !== "loading") this.update({
			loadingStage: "model",
			status: "loading"
		});
	}
};
var ModelStore = class {
	listeners = /* @__PURE__ */ new Set();
	snapshot = {
		controller: null,
		runtime: null
	};
	subscribe = (listener) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};
	getSnapshot = () => this.snapshot;
	setController(controller) {
		if (this.snapshot.controller === controller) return;
		this.snapshot = {
			...this.snapshot,
			controller
		};
		for (const listener of this.listeners) listener();
	}
	setRuntime(runtime) {
		if (this.snapshot.runtime === runtime) return;
		this.snapshot = {
			...this.snapshot,
			runtime
		};
		for (const listener of this.listeners) listener();
	}
};
//#endregion
//#region src/react/Live2DCanvas.tsx
function useStableQuality(quality) {
	const policy = typeof quality === "object" ? quality : void 0;
	const auto = quality === "auto";
	return useMemo(() => {
		if (!policy) return auto ? "auto" : void 0;
		return { ...policy };
	}, [
		auto,
		policy?.desktopMaxResolution,
		policy?.desktopPixelBudget,
		policy?.longFrameMs,
		policy?.longFrameRatioThreshold,
		policy?.minResolution,
		policy?.mobileMaxResolution,
		policy?.mobilePixelBudget,
		policy?.resolutionStep,
		policy?.sampleWindowMs
	]);
}
function useStableAccessibility(accessibility) {
	const decorative = accessibility?.mode === "decorative";
	const image = accessibility && !decorative ? accessibility : void 0;
	return useMemo(() => {
		if (!accessibility) return void 0;
		if (decorative) return { mode: "decorative" };
		return {
			describedBy: image?.describedBy,
			fallbackText: image?.fallbackText,
			label: image?.label ?? "",
			mode: "image"
		};
	}, [
		decorative,
		image?.describedBy,
		image?.fallbackText,
		image?.label
	]);
}
function useUnstableBackendWarning(backend, coreUrl) {
	const previousRef = useRef({
		backend,
		coreUrl
	});
	const warnedRef = useRef(false);
	if (!warnedRef.current && previousRef.current.backend !== backend && previousRef.current.coreUrl === coreUrl) {
		warnedRef.current = true;
		console.warn("[live2d-web] The <Live2DCanvas backend> prop changed identity, which reloads the model. Pass a stable value: the exported cubismWebGL instance, or a createCubismWebGLBackend() call hoisted out of render.");
	}
	previousRef.current = {
		backend,
		coreUrl
	};
}
function Live2DCanvas(props) {
	const { accessibility, backend, children, className, coreUrl, errorFallback, fallback, maxFps, onError, paused = false, pauseWhenOffscreen, style } = props;
	const quality = "quality" in props ? props.quality : void 0;
	const stableAccessibility = useStableAccessibility(accessibility);
	const accessibilityRef = useRef(stableAccessibility);
	accessibilityRef.current = stableAccessibility;
	const stableQuality = useStableQuality(quality);
	const resolution = "resolution" in props ? props.resolution : void 0;
	const [container, setContainer] = useState(null);
	const [retryVersion, setRetryVersion] = useState(0);
	const retry = useMemo(() => () => setRetryVersion((version) => version + 1), []);
	const store = useMemo(() => new StageStore(retry), [retry]);
	const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
	const lastReportedErrorRef = useRef(void 0);
	useUnstableBackendWarning(backend, coreUrl);
	const [runtime, setRuntime] = useState(null);
	useEffect(() => {
		if (!container) return;
		let active = true;
		const generation = new Live2DRuntime({
			accessibility: accessibilityRef.current,
			backend,
			container,
			coreUrl,
			maxFps,
			onError: (error) => {
				store.fail(error);
			},
			pauseWhenOffscreen,
			quality: stableQuality,
			resolution
		});
		const unsubscribe = generation.subscribe(() => store.syncRuntime(generation.getState()));
		setRuntime(generation);
		store.syncRuntime(generation.getState());
		generation.start().catch((error) => {
			if (!active) return;
			store.fail(error instanceof Live2DError ? error : new Live2DError("adapter-error", error instanceof Error ? error.message : String(error)));
		});
		return () => {
			active = false;
			unsubscribe();
			setRuntime((current) => current === generation ? null : current);
			generation.dispose();
		};
	}, [
		backend,
		container,
		coreUrl,
		maxFps,
		pauseWhenOffscreen,
		resolution,
		retryVersion,
		stableQuality,
		store
	]);
	useEffect(() => {
		if (!runtime) return;
		if (paused) {
			runtime.pause();
			return () => runtime.resume();
		}
	}, [paused, runtime]);
	const runtimeHost = useMemo(() => ({
		accessibilityRef,
		backend,
		container,
		coreUrl,
		maxFps,
		pauseWhenOffscreen,
		quality: stableQuality,
		resolution,
		retryVersion,
		runtime
	}), [
		accessibilityRef,
		backend,
		container,
		coreUrl,
		maxFps,
		pauseWhenOffscreen,
		resolution,
		retryVersion,
		runtime,
		stableQuality
	]);
	useEffect(() => {
		if (!snapshot.error || snapshot.error === lastReportedErrorRef.current) return;
		lastReportedErrorRef.current = snapshot.error;
		onError?.(snapshot.error);
	}, [onError, snapshot.error]);
	useEffect(() => {
		return () => store.disposeModelResource();
	}, [store]);
	useEffect(() => {
		runtime?.setAccessibility(stableAccessibility);
	}, [runtime, stableAccessibility]);
	const loadingNode = snapshot.status === "loading" && snapshot.loadingStage ? fallback?.(snapshot.loadingStage) : null;
	const errorNode = snapshot.status === "error" && snapshot.error ? errorFallback?.(snapshot.error, retry) : null;
	return /* @__PURE__ */ jsx(StageContext.Provider, {
		value: store,
		children: /* @__PURE__ */ jsx(RuntimeHostContext.Provider, {
			value: runtimeHost,
			children: /* @__PURE__ */ jsxs("div", {
				className,
				style: {
					height: "100%",
					position: "relative",
					width: "100%",
					...style
				},
				children: [
					/* @__PURE__ */ jsx("div", {
						ref: setContainer,
						"data-live2d-canvas": "",
						style: {
							height: "100%",
							touchAction: "none",
							width: "100%"
						}
					}),
					children,
					loadingNode,
					errorNode
				]
			})
		})
	});
}
//#endregion
//#region src/core/lifecycle.ts
function once$1(cleanup) {
	let active = true;
	return () => {
		if (!active) return;
		active = false;
		cleanup();
	};
}
/** A reusable LIFO cleanup scope for model features. */
var LifecycleScope = class {
	cleanups = /* @__PURE__ */ new Set();
	add(cleanup) {
		const wrapped = once$1(() => {
			this.cleanups.delete(wrapped);
			cleanup();
		});
		this.cleanups.add(wrapped);
		return wrapped;
	}
	disposeAll() {
		const cleanups = Array.from(this.cleanups).reverse();
		for (const cleanup of cleanups) cleanup();
	}
};
//#endregion
//#region src/react/controller.ts
/**
* Wraps one model's handle for React. The invalidation exists because a
* controller handed to `onLoad` outlives the render that produced it, and using
* it after unmount has to say so rather than reach a disposed model.
*/
function createLive2DModelController(handle) {
	let active = true;
	const requireActive = () => {
		if (!active) throw new Live2DError("invalid-props", "This React Live2D model controller is no longer active.");
		return handle;
	};
	return {
		controller: Object.freeze({
			addParameterDriver: (id, driver) => requireActive().addParameterDriver(id, driver),
			clearExpression: () => requireActive().clearExpression(),
			clearParameter: (id) => requireActive().clearParameter(id),
			expression: async (id, options) => requireActive().expression(id, options),
			focus: (x, y) => requireActive().focus(x, y),
			getModelInfo: () => requireActive().getModelInfo(),
			getParameter: (id) => requireActive().getParameter(id),
			isMotionPlaying: () => requireActive().isMotionPlaying(),
			motion: async (group, index, options) => requireActive().motion(group, index, options),
			playMotion: async (group, index, options) => requireActive().playMotion(group, index, options),
			sequence: async (steps) => requireActive().sequence(steps),
			setParameter: (id, value) => requireActive().setParameter(id, value)
		}),
		invalidate: () => {
			active = false;
		}
	};
}
//#endregion
//#region src/react/Live2DModel.tsx
function once(cleanup) {
	let active = true;
	return () => {
		if (!active) return;
		active = false;
		cleanup();
	};
}
function modelError(error) {
	if (error instanceof Live2DError) return error;
	return new Live2DError("model-load-failed", error instanceof Error ? error.message : String(error), { cause: error });
}
function Live2DModel({ children, debug = false, fit = "upper-body", followPointer = false, idleMotion, onError, onFitChange, onLoad, onTap, paused = false, resolveAsset, retries = 2, src }) {
	const stageStore = useContext(StageContext);
	const runtimeHost = useContext(RuntimeHostContext);
	if (!stageStore || !runtimeHost) throw new Live2DError("invalid-tree", "<Live2DModel> must be rendered inside <Live2DCanvas>.");
	const currentStageStore = stageStore;
	const currentRuntimeHost = runtimeHost;
	const accessibility = currentRuntimeHost.accessibilityRef.current;
	const owner = useMemo(() => Symbol("Live2DModel"), []);
	const modelStore = useMemo(() => new ModelStore(), []);
	const lifecycle = useMemo(() => new LifecycleScope(), []);
	const contextValue = useMemo(() => ({
		lifecycle,
		store: modelStore
	}), [lifecycle, modelStore]);
	const onLoadRef = useRef(onLoad);
	const onErrorRef = useRef(onError);
	const onTapRef = useRef(onTap);
	const fitRef = useRef(fit);
	const debugRef = useRef(debug);
	const onFitChangeRef = useRef(onFitChange);
	const handleRef = useRef(null);
	const lastErrorRef = useRef(null);
	onLoadRef.current = onLoad;
	onErrorRef.current = onError;
	onTapRef.current = onTap;
	fitRef.current = fit;
	debugRef.current = debug;
	onFitChangeRef.current = onFitChange;
	const hasOnTap = onTap != null;
	let idleError = null;
	try {
		validateIdleMotion(idleMotion);
	} catch (error) {
		idleError = error;
	}
	const idleIdentity = idleError ? `invalid:${idleError.message}` : idleMotionIdentity(idleMotion);
	const idleMotionRef = useRef(void 0);
	if (!idleMotionRef.current || idleMotionRef.current.identity !== idleIdentity) {
		const value = idleError ? false : idleMotion && typeof idleMotion === "object" ? {
			group: idleMotion.group,
			weights: [...idleMotion.weights]
		} : idleMotion;
		idleMotionRef.current = {
			error: idleError,
			identity: idleIdentity,
			value
		};
	}
	const stableIdleMotion = idleMotionRef.current.value;
	const stableIdleError = idleMotionRef.current.error;
	const reportError = useCallback((error) => {
		if (lastErrorRef.current === error) return;
		lastErrorRef.current = error;
		onErrorRef.current?.(error);
	}, []);
	useEffect(() => {
		if (stableIdleError) reportError(stableIdleError);
	}, [stableIdleError, reportError]);
	useEffect(() => {
		const unsubscribe = currentStageStore.subscribe(() => {
			const error = currentStageStore.getSnapshot().error;
			if (error) reportError(error);
		});
		return () => {
			unsubscribe();
		};
	}, [currentStageStore, reportError]);
	useEffect(() => {
		const runtime = currentRuntimeHost.runtime;
		if (!runtime) return;
		currentStageStore.registerModel(owner);
		let active = true;
		let invalidateController;
		let handle;
		const dispose = once(() => {
			active = false;
			invalidateController?.();
			invalidateController = void 0;
			lifecycle.disposeAll();
			modelStore.setController(null);
			modelStore.setRuntime(null);
			handleRef.current = null;
			handle?.dispose();
			handle = void 0;
		});
		runtime.addModel({
			fit: fitRef.current,
			idleMotion: stableIdleMotion,
			onFitChange: (next) => onFitChangeRef.current?.(next),
			resolveAsset,
			retries,
			src
		}).then((added) => {
			if (!active) {
				added.dispose();
				return;
			}
			handle = added;
			handleRef.current = added;
			modelStore.setRuntime(added);
			added.setDebug(debugRef.current);
			currentStageStore.setModelResource(owner, { dispose });
			const binding = createLive2DModelController(added);
			invalidateController = binding.invalidate;
			modelStore.setController(binding.controller);
			currentStageStore.setModelReady(owner);
			onLoadRef.current?.(binding.controller);
		}).catch((error) => {
			if (!active) return;
			const normalized = modelError(error);
			currentStageStore.fail(normalized);
			reportError(normalized);
		});
		return () => {
			dispose();
			currentStageStore.releaseModel(owner);
		};
	}, [
		currentRuntimeHost.runtime,
		currentStageStore,
		stableIdleMotion,
		lifecycle,
		modelStore,
		owner,
		reportError,
		resolveAsset,
		retries,
		src
	]);
	useEffect(() => {
		const handle = handleRef.current;
		if (!handle || sameFit(handle.getFit(), fit)) return;
		handle.setFit(fit);
	}, [fit]);
	useEffect(() => {
		handleRef.current?.setDebug(debug);
	}, [debug]);
	useEffect(() => {
		currentRuntimeHost.runtime?.setAccessibility(accessibility);
	}, [accessibility, currentRuntimeHost.runtime]);
	useEffect(() => {
		const runtime = currentRuntimeHost.runtime;
		if (!runtime || !paused) return;
		runtime.pause();
		return () => runtime.resume();
	}, [currentRuntimeHost.runtime, paused]);
	useEffect(() => {
		const container = currentRuntimeHost.container;
		if (!container || !followPointer && !hasOnTap) return;
		const onPointerMove = (event) => {
			handleRef.current?.focusAt(event.clientX, event.clientY);
		};
		const onPointerLeave = () => {
			const rect = container.getBoundingClientRect();
			handleRef.current?.focus(rect.width / 2, rect.height / 2);
		};
		const onClick = (event) => {
			const handle = handleRef.current;
			if (handle && onTapRef.current) onTapRef.current(handle.hitTest(event.clientX, event.clientY), event);
		};
		if (followPointer) {
			container.addEventListener("pointermove", onPointerMove);
			container.addEventListener("pointerleave", onPointerLeave);
		}
		if (hasOnTap) container.addEventListener("click", onClick);
		return () => {
			container.removeEventListener("pointermove", onPointerMove);
			container.removeEventListener("pointerleave", onPointerLeave);
			container.removeEventListener("click", onClick);
		};
	}, [
		currentRuntimeHost.container,
		followPointer,
		hasOnTap
	]);
	return /* @__PURE__ */ jsx(ModelContext.Provider, {
		value: contextValue,
		children
	});
}
//#endregion
export { DEFAULT_AUTO_QUALITY_POLICY, LipSync, Live2DCanvas, Live2DError, Live2DModel, OFFICIAL_CUBISM_CORE_URL, ensureCubismCore, fitModel, isMobileViewport, resolveAutoQualityPolicy, selectInitialResolution, selectLowerResolution, useLive2D, useLive2DCanvas, useLive2DModel, useLive2DParameter, useParameterDriver };
