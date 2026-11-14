//#region src/tracking/mediapipe/worker.d.ts
/**
 * Starts the MediaPipe module-worker message loop. Call this once from the
 * application's own worker entry; importing this module has no side effects.
 */
declare function startMediaPipeFaceTrackerWorker(): void;
//#endregion
export { startMediaPipeFaceTrackerWorker };