//#region src/core/ensureCubismCore.d.ts
declare global {
  interface Window {
    Live2DCubismCore?: unknown;
  }
}
/**
 * Cubism 5.3 Core URL that Live2D publishes for hosting use. Handy to get
 * started (`coreUrl: OFFICIAL_CUBISM_CORE_URL`); self-host the file for
 * production so your app does not depend on a third-party host.
 */
declare const OFFICIAL_CUBISM_CORE_URL = "https://cubism.live2d.com/sdk-web/core/06/live2dcubismcore.min.js";
interface EnsureCubismCoreOptions {
  /** Stops waiting for the script; the shared load continues for other callers. */
  signal?: AbortSignal;
}
/**
 * Verifies the user-supplied Cubism Core global, optionally loading a user-hosted
 * script first. Concurrent calls for the same URL share one script load.
 */
declare function ensureCubismCore(coreUrl?: string, options?: EnsureCubismCoreOptions): Promise<void>;
//#endregion
export { ensureCubismCore as n, OFFICIAL_CUBISM_CORE_URL as t };