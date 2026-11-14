import { a as Live2DBackend } from "../contract-Jj-UVMwt.mjs";
//#region src/backends/cubism-webgl/types.d.ts
interface CubismWebGLBackendOptions {
  shaderBaseUrl?: string | URL;
}
//#endregion
//#region src/backends/cubism-webgl/index.d.ts
declare function createCubismWebGLBackend(options?: CubismWebGLBackendOptions): Live2DBackend;
declare const cubismWebGL: Live2DBackend;
//#endregion
export { type CubismWebGLBackendOptions, createCubismWebGLBackend, cubismWebGL };