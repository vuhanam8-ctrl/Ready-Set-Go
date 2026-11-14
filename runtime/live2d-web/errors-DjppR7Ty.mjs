//#region src/core/errors.ts
var Live2DError = class extends Error {
	code;
	details;
	constructor(code, message, options) {
		super(message, options);
		this.name = "Live2DError";
		this.code = code;
		this.details = options?.details ? Object.freeze({ ...options.details }) : void 0;
	}
};
//#endregion
export { Live2DError as t };
