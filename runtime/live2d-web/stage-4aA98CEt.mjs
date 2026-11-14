import { t as Live2DError } from "./errors-DjppR7Ty.mjs";
//#region src/backends/cubism-webgl/diagnostics.ts
function measureSync(diagnostics, scope, phase, operation) {
	if (!diagnostics) return operation();
	const startedAt = performance.now();
	try {
		return operation();
	} finally {
		const durationMs = performance.now() - startedAt;
		if (scope === "frame") diagnostics.framePhase(phase, durationMs);
		else diagnostics.loadPhase(phase, durationMs);
	}
}
async function measureAsync(diagnostics, phase, operation) {
	if (!diagnostics) return operation();
	const startedAt = performance.now();
	try {
		return await operation();
	} finally {
		diagnostics.loadPhase(phase, performance.now() - startedAt);
	}
}
function createGpuTimer(gl, diagnostics) {
	if (!diagnostics) return void 0;
	const extension = gl.getExtension("EXT_disjoint_timer_query_webgl2");
	diagnostics.gpuTimerSupport(Boolean(extension));
	if (!extension) {
		diagnostics.gpuDraw(null);
		return;
	}
	let active;
	const pending = [];
	const poll = () => {
		while (pending.length > 0) {
			const query = pending[0];
			if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) return;
			pending.shift();
			const nanoseconds = Boolean(gl.getParameter(extension.GPU_DISJOINT_EXT)) ? void 0 : Number(gl.getQueryParameter(query, gl.QUERY_RESULT));
			diagnostics.gpuDraw(nanoseconds === void 0 || !Number.isFinite(nanoseconds) ? null : nanoseconds / 1e6);
			gl.deleteQuery(query);
		}
	};
	return {
		begin() {
			poll();
			if (active) return;
			const query = gl.createQuery();
			if (!query) return;
			gl.beginQuery(extension.TIME_ELAPSED_EXT, query);
			active = query;
		},
		dispose() {
			if (active) {
				gl.endQuery(extension.TIME_ELAPSED_EXT);
				gl.deleteQuery(active);
				active = void 0;
			}
			for (const query of pending) gl.deleteQuery(query);
			pending.length = 0;
		},
		end() {
			if (!active) return;
			gl.endQuery(extension.TIME_ELAPSED_EXT);
			pending.push(active);
			active = void 0;
		},
		poll
	};
}
//#endregion
//#region src/backends/cubism-webgl/assets.ts
const VIRTUAL_ORIGIN = "https://live2d-web.invalid/";
function encodeVirtualPath(path) {
	return path.split("/").map((segment) => {
		if (segment === "." || segment === "..") return segment;
		return encodeURIComponent(segment);
	}).join("/");
}
function virtualModelUrl(src) {
	return new URL(encodeVirtualPath(src.replace(/^\/+/, "")), VIRTUAL_ORIGIN).href;
}
/**
* The path a resolver is asked for, or undefined when the URL is a real one
* the model declared absolutely and fetch should handle.
*/
function virtualAssetPath(url) {
	const parsed = new URL(url);
	if (parsed.origin !== new URL(VIRTUAL_ORIGIN).origin) return void 0;
	return parsed.pathname.slice(1).split("/").map((segment) => decodeURIComponent(segment)).join("/");
}
function resolveAssetUrl(path, modelUrl) {
	if (modelUrl.startsWith(VIRTUAL_ORIGIN)) {
		if (/^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith("//")) return new URL(path, modelUrl).href;
		return new URL(encodeVirtualPath(path), modelUrl).href;
	}
	return new URL(path, modelUrl).href;
}
function normalizeBaseUrl(value) {
	const base = typeof window === "undefined" ? void 0 : window.location.href;
	const url = value instanceof URL ? new URL(value.href) : base ? new URL(value, base) : new URL(value);
	if (!url.pathname.endsWith("/")) url.pathname += "/";
	return url.href;
}
function assetDetails(assetType, url, httpStatus) {
	return {
		assetType,
		backend: "cubism-webgl",
		httpStatus,
		url: virtualAssetPath(url) ?? url
	};
}
async function resolveAssetBlob(resolveAsset, path, url, assetType, signal) {
	let resolved;
	try {
		resolved = await resolveAsset(path, signal);
	} catch (error) {
		if (signal?.aborted) throw signal.reason;
		throw new Live2DError("model-load-failed", `resolveAsset threw while loading ${path}.`, {
			cause: error,
			details: assetDetails(assetType, url)
		});
	}
	if (signal?.aborted) throw signal.reason;
	if (resolved === void 0) throw new Live2DError("model-load-failed", `resolveAsset did not provide ${path}. The model declares it, so the source is missing this file or names it differently.`, { details: {
		...assetDetails(assetType, url),
		httpStatus: 404
	} });
	return resolved instanceof Blob ? resolved : new Blob([resolved]);
}
async function checkedResponse(url, assetType, signal) {
	let response;
	try {
		response = await fetch(url, { signal });
	} catch (error) {
		if (signal?.aborted) throw signal.reason;
		throw new Live2DError("model-load-failed", `Failed to load ${url}.`, {
			cause: error,
			details: assetDetails(assetType, url)
		});
	}
	if (!response.ok) throw new Live2DError("model-load-failed", `Failed to load ${url}: HTTP ${response.status}`, { details: assetDetails(assetType, url, response.status) });
	return response;
}
async function loadAssetBlob(url, assetType, signal, resolveAsset) {
	const path = resolveAsset ? virtualAssetPath(url) : void 0;
	if (resolveAsset && path !== void 0) return resolveAssetBlob(resolveAsset, path, url, assetType, signal);
	return (await checkedResponse(url, assetType, signal)).blob();
}
async function fetchArrayBuffer(url, assetType, signal, resolveAsset) {
	const buffer = await (await loadAssetBlob(url, assetType, signal, resolveAsset)).arrayBuffer();
	if (buffer.byteLength === 0) throw new Live2DError("model-load-failed", `Loaded an empty asset from ${virtualAssetPath(url) ?? url}.`, { details: assetDetails(assetType, url) });
	return buffer;
}
async function decodeImage(blob, url, signal) {
	if (signal?.aborted) throw signal.reason;
	if (typeof createImageBitmap === "function") try {
		return await createImageBitmap(blob, { premultiplyAlpha: "premultiply" });
	} catch (error) {
		if (signal?.aborted) throw signal.reason;
		throw new Live2DError("model-load-failed", `Failed to decode model texture ${url}.`, {
			cause: error,
			details: assetDetails("texture", url)
		});
	}
	const objectUrl = URL.createObjectURL(blob);
	try {
		return await new Promise((resolve, reject) => {
			const image = new Image();
			const onAbort = () => reject(signal?.reason);
			signal?.addEventListener("abort", onAbort, { once: true });
			image.onload = () => {
				signal?.removeEventListener("abort", onAbort);
				resolve(image);
			};
			image.onerror = () => {
				signal?.removeEventListener("abort", onAbort);
				reject(new Live2DError("model-load-failed", `Failed to decode model texture ${url}.`, { details: assetDetails("texture", url) }));
			};
			image.src = objectUrl;
		});
	} finally {
		URL.revokeObjectURL(objectUrl);
	}
}
function closeTextureSource(source) {
	if ("close" in source && typeof source.close === "function") source.close();
}
async function fetchTextureSource(url, signal, diagnostics, resolveAsset) {
	const blob = await measureAsync(diagnostics, "textureFetch", () => loadAssetBlob(url, "texture", signal, resolveAsset));
	return measureAsync(diagnostics, "textureDecode", () => decodeImage(blob, url, signal));
}
function uploadTexture(gl, source, url, diagnostics) {
	const texture = gl.createTexture();
	if (!texture) {
		closeTextureSource(source);
		throw new Live2DError("render-error", `WebGL failed to create a texture for ${url}.`, { details: assetDetails("texture", url) });
	}
	const previousPremultiply = gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL);
	try {
		measureSync(diagnostics, "load", "textureUpload", () => {
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.bindTexture(gl.TEXTURE_2D, null);
		});
		return texture;
	} catch (error) {
		gl.deleteTexture(texture);
		if (error instanceof Live2DError) throw error;
		throw new Live2DError("render-error", `Failed to upload model texture ${url} to WebGL.`, {
			cause: error,
			details: assetDetails("texture", url)
		});
	} finally {
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, previousPremultiply);
		closeTextureSource(source);
	}
}
//#endregion
//#region src/backends/cubism-webgl/stage.ts
const internalsByStage = /* @__PURE__ */ new WeakMap();
function applyAccessibility(canvas, accessibility) {
	for (const name of [
		"aria-describedby",
		"aria-hidden",
		"aria-label",
		"role"
	]) canvas.removeAttribute(name);
	canvas.textContent = "";
	if (!accessibility) return;
	if (accessibility.mode === "decorative") {
		canvas.setAttribute("aria-hidden", "true");
		canvas.setAttribute("role", "presentation");
		return;
	}
	canvas.setAttribute("aria-label", accessibility.label);
	canvas.setAttribute("role", "img");
	if (accessibility.describedBy) canvas.setAttribute("aria-describedby", accessibility.describedBy);
	canvas.textContent = accessibility.fallbackText ?? accessibility.label;
}
function once(cleanup) {
	let active = true;
	return () => {
		if (!active) return;
		active = false;
		cleanup();
	};
}
function normalizeError(error) {
	return error instanceof Live2DError ? error : new Live2DError("render-error", error instanceof Error ? error.message : String(error), {
		cause: error,
		details: { backend: "cubism-webgl" }
	});
}
function getStageInternals(stage) {
	const internals = internalsByStage.get(stage);
	if (!internals || internals.disposed) throw new Live2DError("adapter-error", "The StageHandle was not created by the active cubism-webgl adapter.", { details: { backend: "cubism-webgl" } });
	return internals;
}
function createWebGLStage(element, options, diagnostics) {
	if (typeof window === "undefined") throw new Live2DError("browser-only", "cubism-webgl can only run in a browser.");
	const canvas = document.createElement("canvas");
	applyAccessibility(canvas, options.accessibility);
	const gl = canvas.getContext("webgl2", {
		alpha: true,
		antialias: true,
		depth: false,
		premultipliedAlpha: true,
		preserveDrawingBuffer: false,
		stencil: false
	});
	if (!gl) throw new Live2DError("webgl-unsupported", "WebGL2 is required by cubism-webgl.", { details: { backend: "cubism-webgl" } });
	diagnostics?.changeResource("canvas", 1);
	diagnostics?.changeResource("context", 1);
	const gpuTimer = createGpuTimer(gl, diagnostics);
	let size = {
		height: Math.max(1, options.height),
		width: Math.max(1, options.width)
	};
	let resolution = options.resolution ?? 1;
	let disposed = false;
	let running = true;
	let reportedError = false;
	let animationFrame = 0;
	let accumulatedFrameMs = 0;
	let firstDrawReported = false;
	let lastRenderTime;
	let lastTickTime;
	const drivers = /* @__PURE__ */ new Set();
	const frameCallbacks = /* @__PURE__ */ new Set();
	const errorCallbacks = /* @__PURE__ */ new Set();
	const minFrameMs = options.maxFps ? 1e3 / options.maxFps : 0;
	const resizeBuffer = () => {
		canvas.width = Math.max(1, Math.round(size.width * resolution));
		canvas.height = Math.max(1, Math.round(size.height * resolution));
		gl.viewport(0, 0, canvas.width, canvas.height);
		for (const driver of drivers) driver.resize(canvas.width, canvas.height);
	};
	const stopLoop = () => {
		running = false;
		cancelAnimationFrame(animationFrame);
		animationFrame = 0;
		accumulatedFrameMs = 0;
		lastRenderTime = void 0;
		lastTickTime = void 0;
	};
	const reportError = (error) => {
		if (disposed || reportedError) return;
		reportedError = true;
		stopLoop();
		for (const callback of errorCallbacks) callback(error);
	};
	const updateDrivers = (deltaMs) => {
		const capped = Math.min(deltaMs, 100);
		for (const driver of drivers) driver.update(capped);
	};
	const clearFrame = () => {
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, canvas.width, canvas.height);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
	};
	const drawDrivers = () => {
		for (const driver of drivers) driver.draw();
	};
	const frame = (timestamp) => {
		if (!running || disposed) return;
		animationFrame = requestAnimationFrame(frame);
		const tickDeltaMs = lastTickTime === void 0 ? 0 : timestamp - lastTickTime;
		lastTickTime = timestamp;
		accumulatedFrameMs += tickDeltaMs;
		if (lastRenderTime !== void 0 && accumulatedFrameMs < minFrameMs - .25) return;
		const deltaMs = lastRenderTime === void 0 ? 0 : timestamp - lastRenderTime;
		lastRenderTime = timestamp;
		accumulatedFrameMs = minFrameMs ? accumulatedFrameMs >= minFrameMs * 2 ? 0 : Math.max(0, accumulatedFrameMs - minFrameMs) : 0;
		try {
			if (!diagnostics) {
				updateDrivers(deltaMs);
				for (const callback of frameCallbacks) callback(deltaMs);
				clearFrame();
				drawDrivers();
			} else {
				diagnostics.framePhase("frameDelta", deltaMs);
				measureSync(diagnostics, "frame", "stageFrame", () => {
					updateDrivers(deltaMs);
					for (const callback of frameCallbacks) callback(deltaMs);
					clearFrame();
					gpuTimer?.begin();
					try {
						measureSync(diagnostics, "frame", "drawCpu", drawDrivers);
					} finally {
						gpuTimer?.end();
					}
				});
			}
			if (drivers.size > 0 && !firstDrawReported) {
				firstDrawReported = true;
				diagnostics?.firstDraw();
			}
		} catch (error) {
			reportError(normalizeError(error));
		}
	};
	const onContextLost = (event) => {
		event.preventDefault();
		reportError(new Live2DError("render-error", "The WebGL context was lost. Call retry() to recreate the Live2D canvas.", { details: { backend: "cubism-webgl" } }));
	};
	canvas.style.display = "block";
	canvas.style.height = "100%";
	canvas.style.touchAction = "none";
	canvas.style.width = "100%";
	canvas.addEventListener("webglcontextlost", onContextLost);
	element.appendChild(canvas);
	resizeBuffer();
	let handle;
	const stageInternals = {
		attachDriver(nextDriver) {
			drivers.add(nextDriver);
			nextDriver.resize(canvas.width, canvas.height);
			return once(() => {
				drivers.delete(nextDriver);
			});
		},
		canvas,
		diagnostics,
		disposed,
		gl,
		reportError
	};
	handle = {
		dispose: once(() => {
			disposed = true;
			stageInternals.disposed = true;
			stopLoop();
			drivers.clear();
			frameCallbacks.clear();
			errorCallbacks.clear();
			canvas.removeEventListener("webglcontextlost", onContextLost);
			gpuTimer?.poll();
			gpuTimer?.dispose();
			if (!gl.isContextLost()) gl.getExtension("WEBGL_lose_context")?.loseContext();
			canvas.width = 1;
			canvas.height = 1;
			canvas.remove();
			diagnostics?.changeResource("context", -1);
			diagnostics?.changeResource("canvas", -1);
			internalsByStage.delete(handle);
		}),
		getResolution: () => resolution,
		getSize: () => ({ ...size }),
		onError(callback) {
			errorCallbacks.add(callback);
			return once(() => errorCallbacks.delete(callback));
		},
		onFrame(callback) {
			frameCallbacks.add(callback);
			return once(() => frameCallbacks.delete(callback));
		},
		pause: stopLoop,
		resize(width, height) {
			size = {
				height: Math.max(1, height),
				width: Math.max(1, width)
			};
			resizeBuffer();
		},
		resume() {
			if (disposed || reportedError || running) return;
			running = true;
			animationFrame = requestAnimationFrame(frame);
		},
		setAccessibility(accessibility) {
			applyAccessibility(canvas, accessibility);
		},
		setResolution(nextResolution) {
			if (!Number.isFinite(nextResolution) || nextResolution < 1) throw new Live2DError("invalid-props", "Stage resolution must be a finite number greater than or equal to 1.");
			resolution = nextResolution;
			resizeBuffer();
		},
		toWorld(clientX, clientY) {
			const rect = canvas.getBoundingClientRect();
			return {
				x: clientX - rect.left,
				y: clientY - rect.top
			};
		}
	};
	internalsByStage.set(handle, stageInternals);
	animationFrame = requestAnimationFrame(frame);
	return handle;
}
//#endregion
export { fetchTextureSource as a, uploadTexture as c, measureSync as d, fetchArrayBuffer as i, virtualModelUrl as l, getStageInternals as n, normalizeBaseUrl as o, closeTextureSource as r, resolveAssetUrl as s, createWebGLStage as t, measureAsync as u };
