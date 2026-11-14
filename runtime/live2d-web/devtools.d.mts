import { _ as MotionSequenceStep, f as MotionOptions, g as MotionSequenceResult, l as ModelInfo, p as MotionPlaybackResult, t as ExpressionOptions } from "./contract-Jj-UVMwt.mjs";
import { o as Live2DRuntimeState, s as ParameterDriver } from "./runtime-DmtpZk--.mjs";
//#region src/devtools/index.d.ts
type Live2DDevtoolsTab = 'overview' | 'parameters' | 'motion' | 'expression';
interface Live2DDevtoolsTarget {
  getModelInfo: () => ModelInfo;
  getParameter: (id: string) => number;
  addParameterDriver: (id: string, driver: ParameterDriver) => () => void;
  isMotionPlaying: () => boolean;
  playMotion: (group: string, index?: number, options?: MotionOptions) => Promise<MotionPlaybackResult>;
  sequence: (steps: readonly MotionSequenceStep[]) => Promise<MotionSequenceResult>;
  expression: (id?: string, options?: ExpressionOptions) => Promise<void>;
  clearExpression: () => void;
  getState?: () => Live2DRuntimeState;
  subscribe?: (listener: () => void) => () => void;
}
interface Live2DDevtools {
  setTarget: (target: Live2DDevtoolsTarget) => void;
  setTab: (tab: Live2DDevtoolsTab) => void;
  dispose: () => void;
}
interface MountLive2DDevtoolsOptions {
  target: Live2DDevtoolsTarget;
  container: HTMLElement;
  initialTab?: Live2DDevtoolsTab;
}
/** Mounts a framework-free debugging panel for one loaded Live2D target. */
declare function mountLive2DDevtools(options: MountLive2DDevtoolsOptions): Live2DDevtools;
//#endregion
export { Live2DDevtools, Live2DDevtoolsTab, Live2DDevtoolsTarget, MountLive2DDevtoolsOptions, mountLive2DDevtools };