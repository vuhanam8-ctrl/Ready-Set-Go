import { t as Live2DError } from "./errors-DjppR7Ty.mjs";
//#region src/devtools/styles.ts
const DEVTOOLS_STYLES = `
:host {
  --devtools-accent: #ff718f;
  color-scheme: dark;
  display: block;
  min-width: 0;
  height: 100%;
  color: #f5f5f6;
  background: #111318;
  font: 13px/1.45 'MiSans Latin', 'Pretendard Variable', ui-sans-serif, system-ui, sans-serif;
}

* { box-sizing: border-box; }
button, input, select { font: inherit; }
button, input, select {
  color: inherit;
  border: 1px solid #343942;
  border-radius: 6px;
  background: #1d2128;
}
button, select { min-height: 34px; padding: 7px 9px; }
button { cursor: pointer; }
button:disabled { cursor: not-allowed; opacity: .45; }
button:focus-visible, input:focus-visible, select:focus-visible {
  outline: 2px solid var(--devtools-accent);
  outline-offset: 2px;
}
input[type='text'], input[type='number'] { width: 100%; padding: 7px 9px; }
input[type='range'] { width: 100%; accent-color: var(--devtools-accent); }

.shell { display: flex; height: 100%; min-height: 0; flex-direction: column; }
/* 패널은 자기 제목을 그리지 않는다. 호스트가 이미 이 영역에 라벨을 붙이므로
   제목이 두 번 쌓이고, 무엇을 부를지는 붙이는 쪽이 정하는 편이 낫다. */
.tabs {
  display: grid;
  /* 탭이 늘어도 한 줄을 유지한다. 개수를 박아두면 다섯 번째가 줄바꿈된다. */
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid #292d34;
}
.tabs button { position: relative; min-width: 0; border-color: transparent; background: transparent; color: #b9bdc6; font-size: 12px; }
.tabs button[aria-selected='true'] { border-color: #343942; background: #171a20; color: #f5f5f6; }
.tabs button[aria-selected='true']::after { content: ''; position: absolute; right: 8px; bottom: -9px; left: 8px; height: 2px; background: var(--devtools-accent); }
.panel { flex: 1; min-height: 0; overflow-y: auto; padding: 12px; scrollbar-color: #343942 transparent; scrollbar-width: thin; }
.panel::-webkit-scrollbar { width: 10px; }
.panel::-webkit-scrollbar-track { background: transparent; }
.panel::-webkit-scrollbar-thumb { border: 2px solid transparent; border-radius: 999px; background: #343942; background-clip: padding-box; }
.panel::-webkit-scrollbar-thumb:hover { background: #505762; background-clip: padding-box; }
.stack { display: grid; gap: 10px; }
.card { padding: 12px; border: 1px solid #30353e; border-radius: 8px; background: #1a1e25; }
.card-title { margin: 0 0 10px; padding-bottom: 8px; border-bottom: 1px solid #292d34; color: #b9bdc6; font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; }
.row { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.row + .row { margin-top: 6px; }
.muted { color: #868c96; }
.value { color: #d7dbe3; font-family: ui-monospace, monospace; font-size: 11px; }
.field { display: grid; gap: 5px; }
.field > span { color: #b9bdc6; font-size: 12px; }
.actions { display: flex; flex-wrap: wrap; gap: 7px; }
.actions button { flex: 1; }
.parameter { display: grid; gap: 6px; padding: 9px 0; border-bottom: 1px solid #292d34; }
.parameter:last-child { border-bottom: 0; }
.parameter-name { overflow-wrap: anywhere; font-family: ui-monospace, monospace; font-size: 11px; }
.parameter-controls { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 7px; }
.parameter-controls button { min-height: 28px; padding: 4px 7px; font-size: 10px; }
.status { min-height: 28px; padding: 7px 12px; border-top: 1px solid #292d34; color: #868c96; font-size: 11px; }
.status[data-error='true'] { color: #ffaaa5; }
.queue { margin: 0; padding-left: 20px; color: #b9bdc6; }
.empty { padding: 24px 10px; color: #868c96; text-align: center; }
@media (max-width: 420px) {
  .tabs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
`;
//#endregion
//#region src/devtools/index.ts
const TABS = [
	"overview",
	"parameters",
	"motion",
	"expression"
];
function invalid(message) {
	throw new Live2DError("invalid-props", message);
}
function assertTarget(target) {
	if (!target || typeof target !== "object") invalid("Devtools target must be a Live2D instance or model controller.");
	for (const method of [
		"getModelInfo",
		"getParameter",
		"addParameterDriver",
		"isMotionPlaying",
		"playMotion",
		"sequence",
		"expression",
		"clearExpression"
	]) if (typeof target[method] !== "function") invalid(`Devtools target must provide ${method}().`);
}
function assertTab(tab) {
	if (!TABS.includes(tab)) invalid(`Unknown Devtools tab: ${String(tab)}.`);
}
function escape(value) {
	return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;").replaceAll("'", "&#039;");
}
function finiteInput(value) {
	if (value.trim() === "") return void 0;
	const number = Number(value);
	if (!Number.isFinite(number) || number < 0) invalid("Fade values must be finite, non-negative milliseconds.");
	return number;
}
function option(value, label = value) {
	return `<option value="${escape(value)}">${escape(label)}</option>`;
}
function findByData(root, attribute, value) {
	return Array.from(root.querySelectorAll(`[data-${attribute}]`)).find((element) => element.dataset[attribute.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] === value);
}
/** Mounts a framework-free debugging panel for one loaded Live2D target. */
function mountLive2DDevtools(options) {
	if (typeof document === "undefined") throw new Live2DError("browser-only", "Live2D Devtools can only be mounted in a browser.");
	if (!options || typeof options !== "object") invalid("mountLive2DDevtools options must be an object.");
	assertTarget(options.target);
	if (!(options.container instanceof HTMLElement)) invalid("mountLive2DDevtools container must be an HTMLElement.");
	const initialTab = options.initialTab ?? "overview";
	assertTab(initialTab);
	const host = document.createElement("div");
	host.dataset.live2dDevtools = "";
	const shadow = host.attachShadow({ mode: "open" });
	const style = document.createElement("style");
	style.textContent = DEVTOOLS_STYLES;
	const shell = document.createElement("div");
	shell.className = "shell";
	shadow.append(style, shell);
	options.container.append(host);
	let target = options.target;
	let tab = initialTab;
	let disposed = false;
	let unsubscribe;
	let parameterFrame;
	let lastParameterSample = 0;
	let status = "";
	let statusError = false;
	let sequence = [];
	const overrides = /* @__PURE__ */ new Map();
	const stopSampling = () => {
		if (parameterFrame !== void 0) cancelAnimationFrame(parameterFrame);
		parameterFrame = void 0;
	};
	const clearOverrides = () => {
		for (const entry of overrides.values()) entry.cleanup();
		overrides.clear();
	};
	const readInfo = () => target.getModelInfo();
	const renderStatus = () => {
		const output = shadow.querySelector("[data-status]");
		if (!output) return;
		output.textContent = status;
		output.dataset.error = String(statusError);
		output.hidden = !status;
	};
	const showError = (error) => {
		status = error instanceof Error ? error.message : String(error);
		statusError = true;
		renderStatus();
	};
	const showStatus = (message) => {
		status = message;
		statusError = false;
		renderStatus();
	};
	const diagnostic = () => {
		const info = readInfo();
		const parameters = Object.fromEntries((info.parameters ?? []).map((parameter) => [parameter.id, target.getParameter(parameter.id)]));
		return {
			runtime: target.getState?.(),
			model: {
				model3Version: info.model3Version,
				mocVersion: info.mocVersion,
				motions: info.motions,
				expressions: info.expressions,
				hitAreas: info.hitAreas,
				parameters
			}
		};
	};
	const overviewPanel = (info) => {
		const state = target.getState?.();
		return `<div class="stack">
      <section aria-label="Runtime" class="card" role="group">
        <p class="card-title">Runtime</p>
        ${state ? `<div class="row"><span class="muted">Stage</span><span class="value">${escape(state.status)}</span></div>` : "<div class=\"row\"><span class=\"muted\">Stage</span><span class=\"value muted\">not attached</span></div>"}
        <div class="row"><span class="muted">Motion</span><span class="value">${target.isMotionPlaying() ? "playing" : "idle"}</span></div>
        ${state?.render ? `<div class="row"><span class="muted">Buffer</span><span class="value">${state.render.width}×${state.render.height} @ ${state.render.resolution.toFixed(2)}</span></div>` : ""}
      </section>
      <section aria-label="Model" class="card" role="group">
        <p class="card-title">Model</p>
        <div class="row"><span class="muted">Format</span><span class="value">model3 v${escape(info.model3Version ?? "?")} · moc v${escape(info.mocVersion ?? "?")}</span></div>
        <div class="row"><span class="muted">Parameters</span><span class="value">${info.parameters?.length ?? 0}</span></div>
        <div class="row"><span class="muted">Motion groups</span><span class="value">${Object.keys(info.motions).length}</span></div>
        <div class="row"><span class="muted">Expressions</span><span class="value${info.expressions.length ? "" : " muted"}">${info.expressions.length || "none"}</span></div>
        <div class="row"><span class="muted">Hit areas</span><span class="value${info.hitAreas.length ? "" : " muted"}">${info.hitAreas.length || "none"}</span></div>
      </section>
      <button data-action="copy-diagnostic" type="button">Copy diagnostic JSON</button>
    </div>`;
	};
	const parametersPanel = (info) => {
		const parameters = info.parameters ?? [];
		if (!parameters.length) return "<p class=\"empty\">This backend does not expose parameter metadata.</p>";
		return `<div class="stack">
      <label class="field"><span>Search parameters</span><input data-parameter-search type="text" placeholder="ParamAngleX"></label>
      <div data-parameter-list>${parameters.map((parameter) => {
			const current = overrides.get(parameter.id)?.value ?? target.getParameter(parameter.id);
			return `<div class="parameter" data-parameter="${escape(parameter.id)}">
          <div class="row"><span class="parameter-name">${escape(parameter.id)}</span><output class="value" data-param-value="${escape(parameter.id)}">${current.toFixed(3)}</output></div>
          <div class="parameter-controls">
            <input aria-label="${escape(parameter.id)}" data-param-slider="${escape(parameter.id)}" type="range" min="${parameter.minimum}" max="${parameter.maximum}" step="${Math.max((parameter.maximum - parameter.minimum) / 1e3, .001)}" value="${current}">
            <button data-reset-param="${escape(parameter.id)}" type="button">Reset</button>
          </div>
        </div>`;
		}).join("")}</div>
    </div>`;
	};
	const motionPanel = (info) => {
		const groups = Object.keys(info.motions);
		if (!groups.length) return "<p class=\"empty\">This model declares no motions.</p>";
		const group = groups[0];
		return `<div class="stack">
      <label class="field"><span>Group</span><select data-motion-group>${groups.map((value) => option(value)).join("")}</select></label>
      <label class="field"><span>Index</span><input data-motion-index type="number" min="0" max="${Math.max(0, info.motions[group] - 1)}" value="0"></label>
      <label class="field"><span>Priority</span><select data-motion-priority>${option("normal", "Normal")}${option("idle", "Idle")}${option("force", "Force")}</select></label>
      <label class="field"><span>Fade in (ms, blank = model)</span><input data-motion-fade-in type="number" min="0" placeholder="model default"></label>
      <label class="field"><span>Fade out (ms, blank = model)</span><input data-motion-fade-out type="number" min="0" placeholder="model default"></label>
      <div class="actions"><button data-action="play-motion" type="button">Play</button><button data-action="queue-motion" type="button">Queue step</button></div>
      <section aria-label="Sequence queue" class="card" role="group"><p class="card-title">Sequence queue</p>${sequence.length ? `<ol class="queue">${sequence.map((step) => `<li>${escape(step.group)}[${step.index ?? 0}]</li>`).join("")}</ol>` : "<p class=\"muted\">No queued steps.</p>"}<div class="actions"><button data-action="play-sequence" ${sequence.length ? "" : "disabled"} type="button">Play queue</button><button data-action="clear-sequence" ${sequence.length ? "" : "disabled"} type="button">Clear</button></div></section>
    </div>`;
	};
	const expressionPanel = (info) => {
		if (!info.expressions.length) return "<p class=\"empty\">This model declares no expressions.</p>";
		return `<div class="stack">
      <label class="field"><span>Expression</span><select data-expression>${info.expressions.map((value) => option(value)).join("")}</select></label>
      <label class="field"><span>Fade in (ms, blank = model)</span><input data-expression-fade-in type="number" min="0" placeholder="model default"></label>
      <label class="field"><span>Fade out (ms, blank = model)</span><input data-expression-fade-out type="number" min="0" placeholder="model default"></label>
      <div class="actions"><button data-action="apply-expression" type="button">Apply</button><button data-action="clear-expression" type="button">Clear</button></div>
    </div>`;
	};
	const sampleParameters = (now) => {
		parameterFrame = void 0;
		if (disposed || tab !== "parameters") return;
		if (!document.hidden && now - lastParameterSample >= 1e3 / 15) {
			lastParameterSample = now;
			for (const output of Array.from(shadow.querySelectorAll("[data-param-value]"))) {
				const id = output.dataset.paramValue;
				const value = overrides.get(id)?.value ?? target.getParameter(id);
				output.textContent = value.toFixed(3);
				const slider = findByData(shadow, "param-slider", id);
				if (slider && !overrides.has(id)) slider.value = String(value);
			}
		}
		parameterFrame = requestAnimationFrame(sampleParameters);
	};
	const startSampling = () => {
		stopSampling();
		if (tab === "parameters") parameterFrame = requestAnimationFrame(sampleParameters);
	};
	const render = () => {
		if (disposed) return;
		stopSampling();
		try {
			const info = readInfo();
			const panel = tab === "overview" ? overviewPanel(info) : tab === "parameters" ? parametersPanel(info) : tab === "motion" ? motionPanel(info) : expressionPanel(info);
			shell.innerHTML = `
        <div class="tabs" role="tablist">${TABS.map((value) => `<button aria-selected="${tab === value}" data-tab="${value}" role="tab" type="button">${value[0].toUpperCase()}${value.slice(1)}</button>`).join("")}</div>
        <div class="panel" role="tabpanel">${panel}</div>
        <output class="status" data-error="${statusError}" data-status${status ? "" : " hidden"}>${escape(status)}</output>`;
			startSampling();
		} catch (error) {
			shell.innerHTML = `<p class="empty">${escape(error instanceof Error ? error.message : error)}</p><output class="status" data-error="true" data-status>${escape(error instanceof Error ? error.message : error)}</output>`;
		}
	};
	const motionRequest = () => {
		return {
			group: shadow.querySelector("[data-motion-group]")?.value ?? "",
			index: Number(shadow.querySelector("[data-motion-index]")?.value ?? 0),
			options: {
				priority: shadow.querySelector("[data-motion-priority]")?.value,
				fadeInMs: finiteInput(shadow.querySelector("[data-motion-fade-in]")?.value ?? ""),
				fadeOutMs: finiteInput(shadow.querySelector("[data-motion-fade-out]")?.value ?? "")
			}
		};
	};
	shadow.addEventListener("click", (event) => {
		const element = event.target.closest("[data-tab], [data-action], [data-reset-param]");
		if (!element || disposed) return;
		const nextTab = element.dataset.tab;
		if (nextTab) {
			tab = nextTab;
			render();
			return;
		}
		const reset = element.dataset.resetParam;
		if (reset) {
			overrides.get(reset)?.cleanup();
			overrides.delete(reset);
			render();
			showStatus(`${reset} restored`);
			return;
		}
		const action = element.dataset.action;
		(async () => {
			try {
				if (action === "copy-diagnostic") {
					if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable.");
					await navigator.clipboard.writeText(JSON.stringify(diagnostic(), null, 2));
					showStatus("Diagnostic JSON copied");
				} else if (action === "play-motion") {
					const step = motionRequest();
					const result = await target.playMotion(step.group, step.index, step.options);
					showStatus(`Motion ${result.status}`);
				} else if (action === "queue-motion") {
					sequence.push(motionRequest());
					render();
					showStatus("Motion step queued");
				} else if (action === "clear-sequence") {
					sequence = [];
					render();
					showStatus("Sequence cleared");
				} else if (action === "play-sequence") {
					const result = await target.sequence(sequence);
					showStatus(`Sequence ${result.status}; ${result.completedSteps} completed`);
				} else if (action === "apply-expression") {
					const id = shadow.querySelector("[data-expression]")?.value;
					const fadeInMs = finiteInput(shadow.querySelector("[data-expression-fade-in]")?.value ?? "");
					const fadeOutMs = finiteInput(shadow.querySelector("[data-expression-fade-out]")?.value ?? "");
					await target.expression(id, {
						fadeInMs,
						fadeOutMs
					});
					showStatus(`Expression ${id} applied`);
				} else if (action === "clear-expression") {
					target.clearExpression();
					showStatus("Expression cleared");
				}
			} catch (error) {
				showError(error);
			}
		})();
	});
	shadow.addEventListener("input", (event) => {
		const input = event.target;
		const id = input.dataset.paramSlider;
		if (id) {
			const value = Number(input.value);
			const existing = overrides.get(id);
			if (existing) existing.value = value;
			else {
				const entry = {
					cleanup: () => {},
					value
				};
				entry.cleanup = target.addParameterDriver(id, { getValue: () => entry.value });
				overrides.set(id, entry);
			}
			const output = findByData(shadow, "param-value", id);
			if (output) output.textContent = value.toFixed(3);
			return;
		}
		if (input.matches("[data-parameter-search]")) {
			const query = input.value.trim().toLowerCase();
			for (const row of Array.from(shadow.querySelectorAll("[data-parameter]"))) row.hidden = !row.dataset.parameter.toLowerCase().includes(query);
		}
	});
	shadow.addEventListener("change", (event) => {
		const select = event.target;
		if (!select.matches("[data-motion-group]")) return;
		const info = readInfo();
		const index = shadow.querySelector("[data-motion-index]");
		if (index) {
			index.max = String(Math.max(0, (info.motions[select.value] ?? 1) - 1));
			index.value = "0";
		}
	});
	const connect = () => {
		unsubscribe?.();
		unsubscribe = target.subscribe?.(() => {
			if (tab === "overview") render();
		});
	};
	connect();
	render();
	return Object.freeze({
		setTarget(nextTarget) {
			if (disposed) invalid("Cannot set a target on disposed Live2D Devtools.");
			assertTarget(nextTarget);
			clearOverrides();
			sequence = [];
			target = nextTarget;
			connect();
			showStatus("Target changed");
			render();
		},
		setTab(nextTab) {
			if (disposed) invalid("Cannot select a tab on disposed Live2D Devtools.");
			assertTab(nextTab);
			tab = nextTab;
			render();
		},
		dispose() {
			if (disposed) return;
			disposed = true;
			stopSampling();
			unsubscribe?.();
			unsubscribe = void 0;
			clearOverrides();
			host.remove();
		}
	});
}
//#endregion
export { mountLive2DDevtools };
