import { d as ModelTransform, y as Size } from "./contract-Jj-UVMwt.mjs";
//#region src/core/fit.d.ts
type ModelFit = 'upper-body' | 'full' | {
  /** Multiplier applied to the upper-body fit. */
  scale: number;
  /** Horizontal offset from the upper-body centered position. */
  offsetX?: number;
  /** Vertical offset from the upper-body bottom position. */
  offsetY?: number;
  /**
   * How the offsets are read. `'px'` (the default) treats them as CSS
   * pixels, which is fixed to the stage size they were measured at.
   * `'stage'` treats them as a fraction of the stage width and height, so
   * the placement holds when the stage resizes.
   */
  units?: 'px' | 'stage';
};
declare function fitModel(stage: Size, model: Size, fit?: ModelFit): ModelTransform;
//#endregion
export { fitModel as n, ModelFit as t };