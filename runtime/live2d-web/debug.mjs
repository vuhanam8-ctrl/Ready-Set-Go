import { t as Live2DError } from "./errors-DjppR7Ty.mjs";
//#region src/debug/placement.ts
const PLACEMENT_LIMITS = {
	offset: {
		max: 1,
		min: -1
	},
	scale: {
		max: 2.5,
		min: .25
	}
};
const UPPER_BODY_PLACEMENT = Object.freeze({
	offsetX: 0,
	offsetY: 0,
	scale: 1
});
const FULL_PLACEMENT = Object.freeze({
	offsetX: 0,
	offsetY: -.5,
	scale: .5
});
function clampTo(value, { max, min }) {
	if (!Number.isFinite(value)) return min;
	return Math.min(max, Math.max(min, value));
}
function clampPlacement(placement) {
	return {
		offsetX: clampTo(placement.offsetX, PLACEMENT_LIMITS.offset),
		offsetY: clampTo(placement.offsetY, PLACEMENT_LIMITS.offset),
		scale: clampTo(placement.scale, PLACEMENT_LIMITS.scale)
	};
}
/**
* Normalizes a client point into the space the offsets live in: horizontally
* from the stage center, vertically from its bottom. Each axis has to match
* the origin of the offset it moves, or zooming drifts along that axis.
*/
function normalizeStagePoint(point, rect) {
	return {
		x: rect.width > 0 ? (point.x - rect.left) / rect.width - .5 : 0,
		y: rect.height > 0 ? (point.y - rect.top) / rect.height - 1 : 0
	};
}
/**
* Changes scale around a stage point while keeping what is under that point
* visually stationary.
*/
function zoomPlacementAtPoint(placement, scale, point) {
	const next = clampTo(scale, PLACEMENT_LIMITS.scale);
	const ratio = placement.scale === 0 ? 1 : next / placement.scale;
	return clampPlacement({
		offsetX: point.x - (point.x - placement.offsetX) * ratio,
		offsetY: point.y - (point.y - placement.offsetY) * ratio,
		scale: next
	});
}
function samePlacement(left, right) {
	return left.scale === right.scale && left.offsetX === right.offsetX && left.offsetY === right.offsetY;
}
function placementToFit(placement) {
	return {
		offsetX: placement.offsetX,
		offsetY: placement.offsetY,
		scale: placement.scale,
		units: "stage"
	};
}
/**
* Reads any `fit` back into the overlay's space. Pixel offsets need the stage
* they were measured against, which is why the current size is required.
*/
function fitToPlacement(fit, stage) {
	if (fit === "full") return { ...FULL_PLACEMENT };
	if (fit === "upper-body") return { ...UPPER_BODY_PLACEMENT };
	const relative = fit.units === "stage";
	const offsetX = fit.offsetX ?? 0;
	const offsetY = fit.offsetY ?? 0;
	return clampPlacement({
		offsetX: relative ? offsetX : stage.width > 0 ? offsetX / stage.width : 0,
		offsetY: relative ? offsetY : stage.height > 0 ? offsetY / stage.height : 0,
		scale: fit.scale
	});
}
function round(value) {
	return Number(value.toFixed(3));
}
/** The placement as source a consumer can paste into a `fit` prop. */
function formatPlacement(placement) {
	const { offsetX, offsetY, scale } = placement;
	return `{ scale: ${round(scale)}, offsetX: ${round(offsetX)}, offsetY: ${round(offsetY)}, units: 'stage' }`;
}
//#endregion
//#region src/debug/styles.ts
const DEBUG_OVERLAY_STYLES = `
:host {
  --debug-accent: #ff718f;
  --debug-line: #343942;
  position: absolute;
  inset: 0;
  z-index: 2147483000;
  color-scheme: dark;
  color: #f5f5f6;
  font: 12px/1.45 'MiSans Latin', 'Pretendard Variable', ui-sans-serif, system-ui, sans-serif;
}

* { box-sizing: border-box; }

.surface {
  position: absolute;
  inset: 0;
  cursor: grab;
  touch-action: none;
  outline: none;
}
.surface[data-dragging='true'] { cursor: grabbing; }
.surface:focus-visible { box-shadow: inset 0 0 0 2px var(--debug-accent); }

.frame {
  position: absolute;
  inset: 0;
  border: 1px dashed rgba(245, 245, 246, .3);
  pointer-events: none;
}
.crosshair {
  position: absolute;
  background: rgba(245, 245, 246, .16);
  pointer-events: none;
}
.crosshair.x { left: 50%; top: 0; bottom: 0; width: 1px; }
.crosshair.y { top: 50%; left: 0; right: 0; height: 1px; }

/* One row at every width. A wrapping toolbar grew to a third of a phone-sized
   canvas, covering the model it exists to position. */
.bar {
  position: absolute;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0;
  max-width: calc(100% - 24px);
  padding: 5px 7px;
  overflow-x: auto;
  scrollbar-width: none;
  border-radius: 13px;
  background: rgba(23, 26, 32, .94);
  white-space: nowrap;
}
.bar::-webkit-scrollbar { display: none; }
.bar[data-dragging='true'] { opacity: .3; }
@media (prefers-reduced-motion: no-preference) {
  .bar { transition: opacity .12s ease; }
}

/* Hierarchy by brightness, not by filling the selected item. A high-contrast
   chip on a near-black canvas pulls the eye off the model being positioned. */
button {
  flex: none;
  min-height: 26px;
  padding: 4px 10px;
  color: #8b919c;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font: inherit;
  cursor: pointer;
}
button:hover { color: #d7dae0; }
button:disabled { color: #565c66; cursor: default; }
button:focus-visible { outline: 2px solid var(--debug-accent); outline-offset: -2px; }
button[aria-pressed='true'] { color: #f5f5f6; }
button.step { min-width: 28px; padding: 4px 0; font-size: 15px; }

.zoom {
  flex: none;
  min-width: 44px;
  color: #f5f5f6;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.divider {
  flex: none;
  width: 1px;
  height: 16px;
  margin: 0 7px;
  background: rgba(245, 245, 246, .12);
}

/* Onboarding, not chrome: it goes once the tool has been touched. */
.hint {
  position: absolute;
  left: 50%;
  bottom: 56px;
  transform: translateX(-50%);
  max-width: calc(100% - 24px);
  margin: 0;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(23, 26, 32, .82);
  color: #8b919c;
  text-align: center;
}

/* Only shown when the clipboard refuses, so the value can still be selected. */
.value {
  position: absolute;
  left: 50%;
  bottom: 52px;
  transform: translateX(-50%);
  max-width: calc(100% - 24px);
  overflow-x: auto;
  padding: 6px 10px;
  border: 1px solid var(--debug-line);
  border-radius: 7px;
  background: #0b0d11;
  color: #d7dae0;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  white-space: nowrap;
  user-select: all;
}

[hidden] { display: none !important; }
`;
//#endregion
//#region src/debug/index.ts
const NUDGE = .01;
const FINE_NUDGE = .001;
const ZOOM_STEP = .05;
const NUDGES = {
	ArrowDown: [0, 1],
	ArrowLeft: [-1, 0],
	ArrowRight: [1, 0],
	ArrowUp: [0, -1]
};
function invalid(message) {
	throw new Live2DError("invalid-props", message);
}
function assertTarget(target) {
	if (!target || typeof target !== "object") invalid("Debug overlay target must be a Live2D instance.");
	for (const method of ["setFit", "getFit"]) if (typeof target[method] !== "function") invalid(`Debug overlay target must provide ${method}().`);
}
/** Mounts a framework-free placement overlay over one loaded model. */
function mountLive2DDebugOverlay(options) {
	if (typeof document === "undefined") throw new Live2DError("browser-only", "The Live2D debug overlay can only be mounted in a browser.");
	if (!options || typeof options !== "object") invalid("mountLive2DDebugOverlay options must be an object.");
	assertTarget(options.target);
	if (!(options.container instanceof HTMLElement)) invalid("mountLive2DDebugOverlay container must be an HTMLElement.");
	const { container } = options;
	let target = options.target;
	let disposed = false;
	let frame = 0;
	let pending = false;
	let applying = false;
	let copied = 0;
	const previousPosition = container.style.position;
	const position = getComputedStyle(container).position;
	if (!position || position === "static") container.style.position = "relative";
	const host = document.createElement("div");
	host.dataset.live2dDebug = "";
	const shadow = host.attachShadow({ mode: "open" });
	const style = document.createElement("style");
	style.textContent = DEBUG_OVERLAY_STYLES;
	const surface = document.createElement("div");
	surface.className = "surface";
	surface.tabIndex = 0;
	surface.setAttribute("role", "application");
	surface.setAttribute("aria-label", "Live2D placement. Drag to move, scroll to zoom, arrow keys to nudge.");
	surface.innerHTML = "<div class=\"frame\"></div><div class=\"crosshair x\"></div><div class=\"crosshair y\"></div>";
	const bar = document.createElement("div");
	bar.className = "bar";
	const zoom = document.createElement("output");
	zoom.className = "zoom";
	const value = document.createElement("code");
	value.className = "value";
	value.hidden = true;
	const hint = document.createElement("p");
	hint.className = "hint";
	hint.textContent = "Drag to move, scroll to zoom, arrow keys to nudge.";
	const button = (label, onClick, className) => {
		const element = document.createElement("button");
		element.type = "button";
		element.textContent = label;
		if (className) element.className = className;
		element.addEventListener("click", onClick);
		return element;
	};
	const divider = () => {
		const element = document.createElement("span");
		element.className = "divider";
		element.setAttribute("aria-hidden", "true");
		return element;
	};
	const stageRect = () => container.getBoundingClientRect();
	const readPlacement = (source) => fitToPlacement(source.getFit(), {
		height: stageRect().height,
		width: stageRect().width
	});
	let placement = readPlacement(target);
	let upperBody;
	let full;
	let resetButton;
	let copyButton;
	let baseline = { ...placement };
	const render = () => {
		value.textContent = formatPlacement(placement);
		zoom.textContent = `${Math.round(placement.scale * 100)}%`;
		upperBody.setAttribute("aria-pressed", String(samePlacement(placement, UPPER_BODY_PLACEMENT)));
		full.setAttribute("aria-pressed", String(samePlacement(placement, FULL_PLACEMENT)));
		resetButton.disabled = samePlacement(placement, baseline);
	};
	const touched = () => {
		hint.hidden = true;
	};
	const commit = (next) => {
		placement = clampPlacement(next);
		render();
		if (pending) return;
		pending = true;
		frame = requestAnimationFrame(() => {
			pending = false;
			frame = 0;
			if (disposed) return;
			const fit = placementToFit(placement);
			applying = true;
			try {
				target.setFit(fit);
			} finally {
				applying = false;
			}
			options.onChange?.(fit);
		});
	};
	const confirmCopy = (label) => {
		copyButton.textContent = label;
		clearTimeout(copied);
		copied = window.setTimeout(() => {
			if (!disposed) copyButton.textContent = "Copy";
		}, 2e3);
	};
	const copy = () => {
		touched();
		const text = formatPlacement(placement);
		const clipboard = navigator.clipboard;
		if (!clipboard) {
			value.hidden = false;
			return;
		}
		clipboard.writeText(text).then(() => confirmCopy("Copied")).catch(() => {
			value.hidden = false;
		});
	};
	const applyPreset = (preset) => {
		touched();
		commit({ ...preset });
	};
	const step = (amount) => {
		touched();
		zoomFromCenter(amount);
	};
	upperBody = button("Upper body", () => applyPreset(UPPER_BODY_PLACEMENT));
	full = button("Full", () => applyPreset(FULL_PLACEMENT));
	resetButton = button("Reset", () => applyPreset(baseline));
	copyButton = button("Copy", copy);
	bar.append(button("−", () => step(-.05), "step"), zoom, button("+", () => step(ZOOM_STEP), "step"), divider(), upperBody, full, resetButton, divider(), copyButton);
	shadow.append(style, surface, hint, value, bar);
	container.append(host);
	render();
	function zoomFromCenter(amount) {
		commit(zoomPlacementAtPoint(placement, placement.scale + amount, {
			x: placement.offsetX,
			y: placement.offsetY
		}));
	}
	let drag = null;
	const setDragging = (dragging) => {
		surface.dataset.dragging = String(dragging);
		bar.dataset.dragging = String(dragging);
	};
	const onPointerDown = (event) => {
		event.stopPropagation();
		if (event.button !== 0) return;
		touched();
		surface.setPointerCapture(event.pointerId);
		drag = {
			placement,
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY
		};
		setDragging(true);
		surface.focus();
	};
	const onPointerMove = (event) => {
		if (!drag || drag.pointerId !== event.pointerId) return;
		event.stopPropagation();
		const rect = stageRect();
		commit({
			...drag.placement,
			offsetX: drag.placement.offsetX + (event.clientX - drag.x) / Math.max(1, rect.width),
			offsetY: drag.placement.offsetY + (event.clientY - drag.y) / Math.max(1, rect.height)
		});
	};
	const onPointerUp = (event) => {
		if (!drag || drag.pointerId !== event.pointerId) return;
		event.stopPropagation();
		if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
		drag = null;
		setDragging(false);
	};
	const onWheel = (event) => {
		event.preventDefault();
		event.stopPropagation();
		touched();
		const pixels = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
		commit(zoomPlacementAtPoint(placement, placement.scale * Math.exp(-pixels * .0015), normalizeStagePoint({
			x: event.clientX,
			y: event.clientY
		}, stageRect())));
	};
	const onKeyDown = (event) => {
		const direction = NUDGES[event.key];
		if (direction) {
			event.preventDefault();
			touched();
			const step = event.shiftKey ? FINE_NUDGE : NUDGE;
			commit({
				...placement,
				offsetX: placement.offsetX + direction[0] * step,
				offsetY: placement.offsetY + direction[1] * step
			});
			return;
		}
		if (event.key === "+" || event.key === "=") {
			event.preventDefault();
			touched();
			zoomFromCenter(ZOOM_STEP);
		} else if (event.key === "-") {
			event.preventDefault();
			touched();
			zoomFromCenter(-.05);
		}
	};
	const onClick = (event) => event.stopPropagation();
	surface.addEventListener("click", onClick);
	surface.addEventListener("pointerdown", onPointerDown);
	surface.addEventListener("pointermove", onPointerMove);
	surface.addEventListener("pointerup", onPointerUp);
	surface.addEventListener("pointercancel", onPointerUp);
	surface.addEventListener("wheel", onWheel, { passive: false });
	surface.addEventListener("keydown", onKeyDown);
	return {
		dispose() {
			if (disposed) return;
			disposed = true;
			clearTimeout(copied);
			if (frame) cancelAnimationFrame(frame);
			frame = 0;
			pending = false;
			surface.removeEventListener("click", onClick);
			surface.removeEventListener("pointerdown", onPointerDown);
			surface.removeEventListener("pointermove", onPointerMove);
			surface.removeEventListener("pointerup", onPointerUp);
			surface.removeEventListener("pointercancel", onPointerUp);
			surface.removeEventListener("wheel", onWheel);
			surface.removeEventListener("keydown", onKeyDown);
			host.remove();
			container.style.position = previousPosition;
		},
		getFit: () => placementToFit(placement),
		refresh() {
			if (disposed || applying) return;
			placement = readPlacement(target);
			baseline = { ...placement };
			render();
		},
		setTarget(next) {
			assertTarget(next);
			target = next;
			placement = readPlacement(next);
			baseline = { ...placement };
			render();
		}
	};
}
//#endregion
export { mountLive2DDebugOverlay };
