//#region src/tracking/mediapipe/worker.ts
function serializeResult(result) {
	if (!result.faceLandmarks.length) return void 0;
	const categories = result.faceBlendshapes[0]?.categories ?? [];
	const matrix = result.facialTransformationMatrixes[0]?.data;
	if (categories.length === 0 || !matrix || matrix.length < 16) return void 0;
	return {
		blendshapes: categories.map((category) => [category.categoryName, category.score]),
		matrix: Array.from(matrix).slice(0, 16)
	};
}
function serializeError(error) {
	return error instanceof Error ? {
		message: error.message,
		name: error.name,
		stack: error.stack
	} : { message: String(error) };
}
/**
* MediaPipe 1.0.1 reaches for `document` while loading its WASM, and there is
* no document in any worker, so the task dies with a bare `Can't find variable:
* document`. Measured on Chrome and the Google app on iOS; Safari and KakaoTalk
* run the same build without it.
*
* Do not gate this on whether the worker is classic or a module. An earlier
* version did, on the theory that only a true module worker could reach
* MediaPipe's document branch, and real devices disproved it: the failure
* arrives from a classic worker too, and the advice was silently skipped.
*
* Say so instead of forwarding the raw message. The caller cannot act on
* "document is not defined"; it can act on "run this tracker on the main
* thread". Falling back silently is deliberately not offered: execution mode is
* the application's choice, not something a library should switch underneath it.
*/
function explainWorkerFailure(error) {
	const message = error instanceof Error ? error.message : String(error);
	if (!/\bdocument\b/.test(message)) return error;
	return new Error(`${message}. The bundled MediaPipe loader reaches for document while fetching its WASM, and no worker has one. Create the tracker with execution: 'main' here.`, { cause: error });
}
function isClassicWorker() {
	const importScripts = globalThis.importScripts;
	if (!importScripts) return false;
	try {
		importScripts();
		return true;
	} catch {
		return false;
	}
}
let started = false;
/**
* Starts the MediaPipe module-worker message loop. Call this once from the
* application's own worker entry; importing this module has no side effects.
*/
function startMediaPipeFaceTrackerWorker() {
	if (started) return;
	started = true;
	const scope = globalThis;
	let task;
	let disposed = false;
	const send = (message) => scope.postMessage(message);
	scope.addEventListener("message", async (event) => {
		const request = event.data;
		if (!request) return;
		if (disposed) {
			if (request.type === "detect") request.bitmap.close();
			return;
		}
		try {
			if (request.type === "init") {
				if (request.protocol !== 1) throw new Error(`MediaPipe worker protocol mismatch: the worker chunk speaks v1 but the library sent v${request.protocol}. Rebuild or redeploy the app's worker entry.`);
				const vision = await import("@mediapipe/tasks-vision");
				const fileset = await vision.FilesetResolver.forVisionTasks(request.options.wasmPath, !isClassicWorker());
				if (disposed) return;
				task = await vision.FaceLandmarker.createFromOptions(fileset, {
					baseOptions: {
						delegate: request.options.delegate,
						...request.options.modelAssetPath ? { modelAssetPath: request.options.modelAssetPath } : { modelAssetBuffer: request.options.modelAssetBuffer }
					},
					minFaceDetectionConfidence: request.options.minFaceDetectionConfidence,
					minFacePresenceConfidence: request.options.minFacePresenceConfidence,
					minTrackingConfidence: request.options.minTrackingConfidence,
					numFaces: 1,
					outputFaceBlendshapes: true,
					outputFacialTransformationMatrixes: true,
					runningMode: "VIDEO"
				});
				send({
					id: request.id,
					type: "ready"
				});
				return;
			}
			if (request.type === "detect") {
				try {
					if (!task) throw new Error("MediaPipe worker has not been initialized.");
					const startedAt = performance.now();
					const result = task.detectForVideo(request.bitmap, request.timestampMs);
					send({
						id: request.id,
						inferenceMs: Math.max(0, performance.now() - startedAt),
						result: serializeResult(result),
						type: "result"
					});
				} finally {
					request.bitmap.close();
				}
				return;
			}
			if (request.type === "dispose") {
				disposed = true;
				task?.close();
				task = void 0;
				send({
					id: request.id,
					type: "disposed"
				});
				scope.close();
			}
		} catch (error) {
			send({
				id: request.id,
				error: serializeError(explainWorkerFailure(error)),
				type: "error"
			});
		}
	});
}
//#endregion
export { startMediaPipeFaceTrackerWorker };
