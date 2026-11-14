import { t as Live2DError } from "./errors-DjppR7Ty.mjs";
//#region src/core/idle-motion.ts
function validateIdleMotion(idleMotion) {
	if (idleMotion === void 0 || idleMotion === false) return;
	if (typeof idleMotion === "string") {
		if (idleMotion.trim() !== "") return;
		throw new Live2DError("invalid-props", "idleMotion must be a non-empty motion group name, weighted options or false.");
	}
	if (typeof idleMotion !== "object" || idleMotion === null || Array.isArray(idleMotion)) throw new Live2DError("invalid-props", "idleMotion weighted options must be an object.");
	if (typeof idleMotion.group !== "string" || idleMotion.group.trim() === "") throw new Live2DError("invalid-props", "idleMotion.group must be a non-empty string.");
	if (!Array.isArray(idleMotion.weights) || idleMotion.weights.length === 0) throw new Live2DError("invalid-props", "idleMotion.weights must be a non-empty array.");
	let positive = false;
	for (const weight of idleMotion.weights) {
		if (!Number.isFinite(weight) || weight < 0) throw new Live2DError("invalid-props", "Every idleMotion weight must be a finite, non-negative number.");
		positive ||= weight > 0;
	}
	if (!positive) throw new Live2DError("invalid-props", "At least one idleMotion weight must be greater than 0.");
}
function resolveIdleMotion(idleMotion, getMotionCount) {
	validateIdleMotion(idleMotion);
	if (idleMotion === false) return false;
	if (idleMotion === void 0) return { group: "Idle" };
	if (typeof idleMotion === "string") {
		if (getMotionCount(idleMotion) <= 0) throw new Live2DError("invalid-props", `Unknown idle motion group: ${idleMotion}.`);
		return { group: idleMotion };
	}
	const count = getMotionCount(idleMotion.group);
	if (count <= 0) throw new Live2DError("invalid-props", `Unknown weighted idle motion group: ${idleMotion.group}.`);
	if (idleMotion.weights.length !== count) throw new Live2DError("invalid-props", `idleMotion.weights has ${idleMotion.weights.length} entries but group ${idleMotion.group} has ${count} motions.`);
	return {
		group: idleMotion.group,
		weights: [...idleMotion.weights]
	};
}
function selectIdleMotionIndex(count, weights, random = Math.random) {
	if (!weights) return Math.min(count - 1, Math.floor(random() * count));
	let scale = 0;
	for (const weight of weights) scale = Math.max(scale, weight);
	const total = weights.reduce((sum, weight) => sum + weight / scale, 0);
	let target = Math.min(1 - Number.EPSILON, Math.max(0, random())) * total;
	for (let index = 0; index < weights.length; index++) {
		target -= weights[index] / scale;
		if (target < 0) return index;
	}
	return weights.length - 1;
}
function idleMotionIdentity(idleMotion) {
	if (idleMotion === void 0) return "default";
	if (idleMotion === false) return "false";
	if (typeof idleMotion === "string") return `group:${idleMotion}`;
	return `weighted:${idleMotion.group}:${idleMotion.weights.join(",")}`;
}
//#endregion
//#region src/core/motion-options.ts
function toSeconds(subject, name, value) {
	if (value === void 0) return void 0;
	if (!Number.isFinite(value) || value < 0) throw new Live2DError("invalid-props", `${subject} ${name} must be a finite, non-negative number of milliseconds.`);
	return value / 1e3;
}
function resolveFadeMs(subject, options) {
	if (options !== void 0 && (typeof options !== "object" || options === null)) throw new Live2DError("invalid-props", `${subject} options must be an object.`);
	return {
		fadeInSeconds: toSeconds(subject, "fadeInMs", options?.fadeInMs),
		fadeOutSeconds: toSeconds(subject, "fadeOutMs", options?.fadeOutMs)
	};
}
function resolveMotionFade(options) {
	return resolveFadeMs("Motion", options);
}
function resolveExpressionFade(options) {
	return resolveFadeMs("Expression", options);
}
function hasMotionFadeOverride(fade) {
	return fade.fadeInSeconds !== void 0 || fade.fadeOutSeconds !== void 0;
}
function validateMotionOptions(options) {
	if (options === void 0) return;
	if (typeof options !== "object" || options === null) throw new Live2DError("invalid-props", "Motion options must be an object.");
	if (options.priority !== void 0 && options.priority !== "force" && options.priority !== "idle" && options.priority !== "normal") throw new Live2DError("invalid-props", "Motion priority must be 'force', 'idle' or 'normal'.");
	resolveMotionFade(options);
}
//#endregion
export { idleMotionIdentity as a, validateIdleMotion as c, validateMotionOptions as i, resolveExpressionFade as n, resolveIdleMotion as o, resolveMotionFade as r, selectIdleMotionIndex as s, hasMotionFadeOverride as t };
