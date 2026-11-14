import { S as Live2DAssetType, i as Live2DAssetResolver, l as ModelInfo } from "./contract-Jj-UVMwt.mjs";
//#region src/inspect/types.d.ts
interface ModelInspectionLimits {
  /** Maximum bytes read from one model asset. Defaults to 64 MiB. */
  maxAssetBytes?: number;
  /** Maximum number of declared model assets. Defaults to 2,048. */
  maxReferences?: number;
  /** Maximum bytes read across the model and its assets. Defaults to 256 MiB. */
  maxTotalBytes?: number;
}
interface InspectModelSourceBase {
  limits?: ModelInspectionLimits;
  signal?: AbortSignal;
  src: string;
}
type InspectModelSourceOptions = (InspectModelSourceBase & {
  resolveAsset?: never;
}) | (InspectModelSourceBase & {
  resolveAsset: Live2DAssetResolver;
});
type ModelInspectionStatus = 'compatible' | 'warning' | 'incompatible';
type ModelInspectionSeverity = 'warning' | 'error';
type ModelInspectionAssetStatus = 'available' | 'external' | 'missing' | 'too-large' | 'unreadable';
type ModelInspectionFindingCode = 'asset-too-large' | 'cross-origin-asset' | 'empty-reference' | 'external-asset' | 'invalid-model3' | 'missing-asset' | 'missing-file-reference' | 'too-many-references' | 'total-assets-too-large' | 'unreadable-asset' | 'unsupported-model3-version';
/** One stable, actionable content finding discovered during source inspection. */
interface ModelInspectionFinding {
  assetType?: Live2DAssetType;
  code: ModelInspectionFindingCode;
  message: string;
  path?: string;
  severity: ModelInspectionSeverity;
}
interface ModelInspectionAsset {
  assetType: Live2DAssetType;
  bytes?: number;
  external: boolean;
  path: string;
  status: ModelInspectionAssetStatus;
}
/** Aggregate source report. An error finding makes the report incompatible. */
interface ModelInspectionReport {
  assets: readonly ModelInspectionAsset[];
  expressions: readonly string[];
  findings: readonly ModelInspectionFinding[];
  hitAreas: readonly string[];
  model3Version?: number;
  motions: Readonly<Record<string, number>>;
  source: string;
  status: ModelInspectionStatus;
}
type ModelTrackingChannel = 'pose' | 'eyes' | 'brows' | 'mouth' | 'cheeks';
type ModelTrackingChannelSupport = 'full' | 'partial' | 'missing';
/** Tracking parameter coverage derived from a loaded backend's ModelInfo. */
interface ModelCapabilityReport {
  model3Version?: number;
  mocVersion?: number;
  perfectSync: {
    compatible: boolean;
    matched: number;
    minimum: number;
    missing: readonly string[];
    total: number;
  };
  recommendedMapping: 'standard' | 'perfect-sync' | 'none';
  standardChannels: Readonly<Record<ModelTrackingChannel, ModelTrackingChannelSupport>>;
}
//#endregion
//#region src/inspect/capabilities.d.ts
/** Reports Standard channel and ARKit Perfect Sync coverage from model metadata. */
declare function inspectModelCapabilities(info: ModelInfo): ModelCapabilityReport;
//#endregion
//#region src/inspect/source.d.ts
/**
 * Reads model3.json and every declared asset without creating a renderer.
 * Content problems are aggregated in the returned report; only invalid caller
 * input and cancellation reject.
 */
declare function inspectModelSource(options: InspectModelSourceOptions): Promise<ModelInspectionReport>;
//#endregion
export { type InspectModelSourceOptions, type ModelCapabilityReport, type ModelInspectionAsset, type ModelInspectionAssetStatus, type ModelInspectionFinding, type ModelInspectionFindingCode, type ModelInspectionLimits, type ModelInspectionReport, type ModelInspectionSeverity, type ModelInspectionStatus, type ModelTrackingChannel, type ModelTrackingChannelSupport, inspectModelCapabilities, inspectModelSource };