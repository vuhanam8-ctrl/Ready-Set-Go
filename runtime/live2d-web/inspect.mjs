import { t as Live2DError } from "./errors-DjppR7Ty.mjs";
import { i as missingPerfectSyncParameters, n as PERFECT_SYNC_PARAMETER_IDS } from "./perfect-sync-Jwt1TKtx.mjs";
//#region src/inspect/capabilities.ts
const STANDARD_CHANNEL_PARAMETERS = {
	brows: ["ParamBrowLY", "ParamBrowRY"],
	cheeks: ["ParamCheek"],
	eyes: [
		"ParamEyeLOpen",
		"ParamEyeROpen",
		"ParamEyeBallX",
		"ParamEyeBallY"
	],
	mouth: ["ParamMouthOpenY", "ParamMouthForm"],
	pose: [
		"ParamAngleX",
		"ParamAngleY",
		"ParamAngleZ"
	]
};
function channelSupport(ids, required) {
	const matched = required.filter((id) => ids.has(id)).length;
	if (matched === 0) return "missing";
	return matched === required.length ? "full" : "partial";
}
/** Reports Standard channel and ARKit Perfect Sync coverage from model metadata. */
function inspectModelCapabilities(info) {
	const parameterIds = new Set(info.parameters?.map((parameter) => parameter.id) ?? []);
	const standardChannels = Object.fromEntries(Object.entries(STANDARD_CHANNEL_PARAMETERS).map(([channel, required]) => [channel, channelSupport(parameterIds, required)]));
	const missing = missingPerfectSyncParameters(info);
	const matched = PERFECT_SYNC_PARAMETER_IDS.length - missing.length;
	const perfectSync = matched >= 45;
	const standard = Object.values(standardChannels).some((value) => value !== "missing");
	return {
		model3Version: info.model3Version,
		mocVersion: info.mocVersion,
		perfectSync: {
			compatible: perfectSync,
			matched,
			minimum: 45,
			missing,
			total: PERFECT_SYNC_PARAMETER_IDS.length
		},
		recommendedMapping: perfectSync ? "perfect-sync" : standard ? "standard" : "none",
		standardChannels: Object.freeze(standardChannels)
	};
}
//#endregion
//#region src/inspect/source.ts
const DEFAULT_LIMITS = Object.freeze({
	maxAssetBytes: 64 * 1024 * 1024,
	maxReferences: 2048,
	maxTotalBytes: 256 * 1024 * 1024
});
var AssetTooLargeError = class extends Error {
	bytes;
	constructor(bytes) {
		super("asset exceeds inspection limit");
		this.bytes = bytes;
	}
};
function invalidProps(message) {
	return new Live2DError("invalid-props", message);
}
function validateLimit(name, value) {
	if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) throw invalidProps(`inspectModelSource limits.${name} must be a positive finite integer.`);
	return value;
}
function resolveLimits(input) {
	return {
		maxAssetBytes: validateLimit("maxAssetBytes", input?.maxAssetBytes ?? DEFAULT_LIMITS.maxAssetBytes),
		maxReferences: validateLimit("maxReferences", input?.maxReferences ?? DEFAULT_LIMITS.maxReferences),
		maxTotalBytes: validateLimit("maxTotalBytes", input?.maxTotalBytes ?? DEFAULT_LIMITS.maxTotalBytes)
	};
}
function throwIfAborted(signal) {
	if (signal?.aborted) throw signal.reason;
}
function isExternalReference(path) {
	return /^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith("//");
}
function normalizeLocalPath(path) {
	if (path.includes("\0")) throw new Error("Asset paths cannot contain NUL characters.");
	const segments = [];
	for (const segment of path.replaceAll("\\", "/").split("/")) {
		if (!segment || segment === ".") continue;
		if (segment === "..") {
			segments.pop();
			continue;
		}
		segments.push(segment);
	}
	return segments.join("/");
}
function resolveLocalReference(modelPath, declared) {
	if (declared.startsWith("/")) return normalizeLocalPath(declared);
	const slash = modelPath.lastIndexOf("/");
	return normalizeLocalPath(`${slash < 0 ? "" : modelPath.slice(0, slash + 1)}${declared}`);
}
async function responseBytes(response, limit, signal) {
	const declaredSize = Number(response.headers.get("content-length"));
	if (Number.isFinite(declaredSize) && declaredSize > limit) throw new AssetTooLargeError(declaredSize);
	if (!response.body) {
		const buffer = await response.arrayBuffer();
		if (buffer.byteLength > limit) throw new AssetTooLargeError(buffer.byteLength);
		return buffer;
	}
	const reader = response.body.getReader();
	const chunks = [];
	let size = 0;
	try {
		while (true) {
			throwIfAborted(signal);
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > limit) {
				await reader.cancel();
				throw new AssetTooLargeError(size);
			}
			chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes.buffer;
}
async function resolverBytes(resolver, path, limit, signal) {
	throwIfAborted(signal);
	const value = await resolver(path, signal);
	throwIfAborted(signal);
	if (value === void 0) return void 0;
	if (value instanceof Blob) {
		if (value.size > limit) throw new AssetTooLargeError(value.size);
		return value.arrayBuffer();
	}
	if (value instanceof ArrayBuffer) {
		if (value.byteLength > limit) throw new AssetTooLargeError(value.byteLength);
		return value;
	}
	throw invalidProps("resolveAsset must return a Blob, ArrayBuffer or undefined.");
}
function readName(value) {
	return typeof value === "string" && value.trim() ? value : void 0;
}
function parseModel3(buffer, findings) {
	let root;
	try {
		const parsed = JSON.parse(new TextDecoder().decode(buffer));
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new TypeError("model3.json must contain a JSON object.");
		root = parsed;
	} catch (error) {
		findings.push({
			code: "invalid-model3",
			message: error instanceof Error ? error.message : "model3.json is not valid JSON.",
			severity: "error"
		});
		return;
	}
	const references = [];
	const add = (value, assetType, label, required = false) => {
		if (value === void 0) {
			if (required) findings.push({
				assetType,
				code: "missing-file-reference",
				message: `model3.json does not declare ${label}.`,
				severity: "error"
			});
			return;
		}
		const path = readName(value);
		if (!path) {
			findings.push({
				assetType,
				code: "empty-reference",
				message: `model3.json declares an empty ${label}.`,
				severity: "error"
			});
			return;
		}
		references.push({
			assetType,
			path
		});
	};
	const model3Version = typeof root.Version === "number" && Number.isFinite(root.Version) ? root.Version : void 0;
	if (model3Version !== 3) findings.push({
		code: "unsupported-model3-version",
		message: model3Version === void 0 ? "model3.json does not declare Version: 3." : `model3.json Version ${model3Version} is not supported; expected Version 3.`,
		severity: "error"
	});
	const fileReferences = root.FileReferences && typeof root.FileReferences === "object" ? root.FileReferences : void 0;
	if (!fileReferences) findings.push({
		code: "missing-file-reference",
		message: "model3.json does not contain FileReferences.",
		severity: "error"
	});
	add(fileReferences?.Moc, "moc3", "FileReferences.Moc", true);
	add(fileReferences?.Physics, "physics", "FileReferences.Physics");
	add(fileReferences?.Pose, "pose", "FileReferences.Pose");
	add(fileReferences?.UserData, "user-data", "FileReferences.UserData");
	if (Array.isArray(fileReferences?.Textures)) fileReferences.Textures.forEach((value, index) => add(value, "texture", `FileReferences.Textures[${index}]`));
	const expressions = [];
	if (Array.isArray(fileReferences?.Expressions)) fileReferences.Expressions.forEach((value, index) => {
		const expression = value && typeof value === "object" ? value : {};
		const name = readName(expression.Name);
		if (name) expressions.push(name);
		add(expression.File, "expression", `FileReferences.Expressions[${index}].File`);
	});
	const motions = {};
	if (fileReferences?.Motions && typeof fileReferences.Motions === "object") for (const [group, value] of Object.entries(fileReferences.Motions)) {
		if (!Array.isArray(value)) continue;
		motions[group] = value.length;
		value.forEach((motion, index) => add(motion && typeof motion === "object" ? motion.File : void 0, "motion", `FileReferences.Motions.${group}[${index}].File`));
	}
	return {
		expressions,
		hitAreas: Array.isArray(root.HitAreas) ? root.HitAreas.flatMap((value) => {
			const name = value && typeof value === "object" ? readName(value.Name) : void 0;
			return name ? [name] : [];
		}) : [],
		model3Version,
		motions,
		references
	};
}
function reportStatus(findings) {
	if (findings.some((finding) => finding.severity === "error")) return "incompatible";
	if (findings.length) return "warning";
	return "compatible";
}
/**
* Reads model3.json and every declared asset without creating a renderer.
* Content problems are aggregated in the returned report; only invalid caller
* input and cancellation reject.
*/
async function inspectModelSource(options) {
	if (!options || typeof options !== "object") throw invalidProps("inspectModelSource options must be an object.");
	if (typeof options.src !== "string" || !options.src.trim()) throw invalidProps("inspectModelSource src must be a non-empty string.");
	if (options.resolveAsset !== void 0 && typeof options.resolveAsset !== "function") throw invalidProps("inspectModelSource resolveAsset must be a function.");
	const limits = resolveLimits(options.limits);
	const local = options.resolveAsset !== void 0;
	let source;
	if (local) {
		if (options.src.includes("\0")) throw invalidProps("inspectModelSource src cannot contain NUL characters.");
		source = normalizeLocalPath(options.src);
	} else try {
		source = new URL(options.src, typeof document === "undefined" ? void 0 : document.baseURI).href;
	} catch {
		throw invalidProps("inspectModelSource src must be a valid HTTP(S) URL.");
	}
	if (!source) throw invalidProps("inspectModelSource src must resolve to a model3.json path.");
	if (!local && !/^https?:/i.test(source)) throw invalidProps("URL model inspection supports only HTTP and HTTPS sources.");
	const assets = [];
	const findings = [];
	let totalBytes = 0;
	const read = async (path, assetType, external) => {
		try {
			const bytes = local ? await resolverBytes(options.resolveAsset, path, limits.maxAssetBytes, options.signal) : await (async () => {
				const response = await fetch(path, { signal: options.signal });
				if (!response.ok) {
					if (response.status === 404) return void 0;
					throw new Error(`HTTP ${response.status}`);
				}
				return responseBytes(response, limits.maxAssetBytes, options.signal);
			})();
			if (!bytes) {
				assets.push({
					assetType,
					external,
					path,
					status: "missing"
				});
				findings.push({
					assetType,
					code: "missing-asset",
					message: `The model references a file that was not found: ${path}`,
					path,
					severity: "error"
				});
				return;
			}
			totalBytes += bytes.byteLength;
			if (totalBytes > limits.maxTotalBytes) {
				assets.push({
					assetType,
					bytes: bytes.byteLength,
					external,
					path,
					status: "too-large"
				});
				findings.push({
					assetType,
					code: "total-assets-too-large",
					message: `Model assets exceed the ${limits.maxTotalBytes} byte inspection limit.`,
					path,
					severity: "error"
				});
				return;
			}
			assets.push({
				assetType,
				bytes: bytes.byteLength,
				external,
				path,
				status: "available"
			});
			return bytes;
		} catch (error) {
			if (options.signal?.aborted) throw options.signal.reason;
			if (error instanceof Live2DError && error.code === "invalid-props") throw error;
			if (error instanceof AssetTooLargeError) {
				assets.push({
					assetType,
					bytes: error.bytes,
					external,
					path,
					status: "too-large"
				});
				findings.push({
					assetType,
					code: "asset-too-large",
					message: `${path} exceeds the ${limits.maxAssetBytes} byte per-asset limit.`,
					path,
					severity: "error"
				});
			} else {
				assets.push({
					assetType,
					external,
					path,
					status: "unreadable"
				});
				findings.push({
					assetType,
					code: "unreadable-asset",
					message: `Could not read ${path}: ${error instanceof Error ? error.message : String(error)}`,
					path,
					severity: "error"
				});
			}
			return;
		}
	};
	throwIfAborted(options.signal);
	const modelBytes = await read(source, "model3", false);
	const parsed = modelBytes ? parseModel3(modelBytes, findings) : void 0;
	if (parsed) {
		if (parsed.references.length > limits.maxReferences) findings.push({
			code: "too-many-references",
			message: `model3.json declares ${parsed.references.length} assets; the limit is ${limits.maxReferences}.`,
			severity: "error"
		});
		const seen = /* @__PURE__ */ new Set();
		for (const reference of parsed.references.slice(0, limits.maxReferences)) {
			if (totalBytes > limits.maxTotalBytes) break;
			const externalReference = isExternalReference(reference.path);
			if (local && externalReference) {
				assets.push({
					assetType: reference.assetType,
					external: true,
					path: reference.path,
					status: "external"
				});
				findings.push({
					assetType: reference.assetType,
					code: "external-asset",
					message: `A local model references an external URL and it was not fetched: ${reference.path}`,
					path: reference.path,
					severity: "error"
				});
				continue;
			}
			let resolved;
			try {
				resolved = local ? resolveLocalReference(source, reference.path) : new URL(reference.path, source).href;
			} catch (error) {
				findings.push({
					assetType: reference.assetType,
					code: "unreadable-asset",
					message: `Could not resolve ${reference.path}: ${error instanceof Error ? error.message : String(error)}`,
					path: reference.path,
					severity: "error"
				});
				continue;
			}
			if (!local && !/^https?:$/.test(new URL(resolved).protocol)) {
				assets.push({
					assetType: reference.assetType,
					external: true,
					path: reference.path,
					status: "external"
				});
				findings.push({
					assetType: reference.assetType,
					code: "external-asset",
					message: `The model references a non-HTTP(S) URL and it was not fetched: ${reference.path}`,
					path: reference.path,
					severity: "error"
				});
				continue;
			}
			if (seen.has(resolved)) continue;
			seen.add(resolved);
			const crossOrigin = !local && new URL(resolved).origin !== new URL(source).origin;
			if (crossOrigin) findings.push({
				assetType: reference.assetType,
				code: "cross-origin-asset",
				message: `The model reads a cross-origin asset that must allow CORS: ${resolved}`,
				path: resolved,
				severity: "warning"
			});
			await read(resolved, reference.assetType, crossOrigin);
		}
	}
	return {
		assets: Object.freeze(assets),
		expressions: Object.freeze(parsed?.expressions ?? []),
		findings: Object.freeze(findings),
		hitAreas: Object.freeze(parsed?.hitAreas ?? []),
		model3Version: parsed?.model3Version,
		motions: Object.freeze(parsed?.motions ?? {}),
		source,
		status: reportStatus(findings)
	};
}
//#endregion
export { inspectModelCapabilities, inspectModelSource };
