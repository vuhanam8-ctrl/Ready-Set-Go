//#region src/core/perfect-sync.ts
const ARKIT_BLENDSHAPES = Object.freeze([
	"browDownLeft",
	"browDownRight",
	"browInnerUp",
	"browOuterUpLeft",
	"browOuterUpRight",
	"cheekPuff",
	"cheekSquintLeft",
	"cheekSquintRight",
	"eyeBlinkLeft",
	"eyeBlinkRight",
	"eyeLookDownLeft",
	"eyeLookDownRight",
	"eyeLookInLeft",
	"eyeLookInRight",
	"eyeLookOutLeft",
	"eyeLookOutRight",
	"eyeLookUpLeft",
	"eyeLookUpRight",
	"eyeSquintLeft",
	"eyeSquintRight",
	"eyeWideLeft",
	"eyeWideRight",
	"jawForward",
	"jawLeft",
	"jawOpen",
	"jawRight",
	"mouthClose",
	"mouthDimpleLeft",
	"mouthDimpleRight",
	"mouthFrownLeft",
	"mouthFrownRight",
	"mouthFunnel",
	"mouthLeft",
	"mouthLowerDownLeft",
	"mouthLowerDownRight",
	"mouthPressLeft",
	"mouthPressRight",
	"mouthPucker",
	"mouthRight",
	"mouthRollLower",
	"mouthRollUpper",
	"mouthShrugLower",
	"mouthShrugUpper",
	"mouthSmileLeft",
	"mouthSmileRight",
	"mouthStretchLeft",
	"mouthStretchRight",
	"mouthUpperUpLeft",
	"mouthUpperUpRight",
	"noseSneerLeft",
	"noseSneerRight",
	"tongueOut"
]);
function perfectSyncParameterId(name) {
	return `Param${name[0].toUpperCase()}${name.slice(1)}`;
}
const PERFECT_SYNC_PARAMETER_IDS = Object.freeze(ARKIT_BLENDSHAPES.map(perfectSyncParameterId));
function missingPerfectSyncParameters(info) {
	const ids = new Set(info.parameters?.map((parameter) => parameter.id) ?? []);
	return PERFECT_SYNC_PARAMETER_IDS.filter((id) => !ids.has(id));
}
function hasPerfectSyncParameters(info) {
	const missing = missingPerfectSyncParameters(info).length;
	return PERFECT_SYNC_PARAMETER_IDS.length - missing >= 45;
}
//#endregion
export { perfectSyncParameterId as a, missingPerfectSyncParameters as i, PERFECT_SYNC_PARAMETER_IDS as n, hasPerfectSyncParameters as r, ARKIT_BLENDSHAPES as t };
