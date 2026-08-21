/* eslint-disable no-console */
// Annunciator Grid Card v1.0.0
// Backward-compatible with v1.83/v2.x configurations; persisted config schema is v2.

(() => {
  const CARD_VERSION = "1.0.0";
  const CONFIG_VERSION = 2;
  // Legacy keys remain accepted by normalization/runtime compatibility paths, but
  // new v2 schema output does not expose them in the focused editor.
  // ============================================================
  // Helpers
  // ============================================================
  const clampNum = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const ensureObj = (v, fallback = {}) => (v && typeof v === "object" ? v : fallback);

  const migrateConfigV2 = (input) => {
    const src = { ...(input || {}) };
    if (!src.severity_colors && src.colors && typeof src.colors === "object") src.severity_colors = { ...src.colors };
    const items = Array.isArray(src.entities) ? src.entities : [];
    const maxSlot = items.reduce((m, item) => {
      const n = Number(item?.ack_slot);
      return Number.isInteger(n) && n > 0 ? Math.max(m, n) : m;
    }, 0);
    const requestedNext = Number(src.next_ack_slot);
    src.next_ack_slot = Number.isInteger(requestedNext) && requestedNext > maxSlot ? requestedNext : maxSlot + 1;
    if (src.panel_sizing === undefined) src.panel_sizing = "auto_fit";
    if (src.lamp_test_mode === undefined) src.lamp_test_mode = "steady";
    src.config_version = CONFIG_VERSION;
    return src;
  };


  // Apply attention/alert tuning via CSS variables and helper classes
  const applyAttnTuning = (cell, tuning = {}) => {
    const t = ensureObj(tuning, {});
    const speed = String(t.speed || "normal").toLowerCase(); // slow|normal|fast
    const depth = clampNum(t.opacity_depth, 0.5); // 0..1
    const border = String(t.border_emphasis || "soft").toLowerCase(); // none|soft|strong
    const waveRadius = clampNum(t.wave_radius, 10);
    const throbSubtlety = clampNum(t.throb_subtlety, 0.5); // 0..1

    const dur = (slow, normal, fast) => (speed === "slow" ? slow : speed === "fast" ? fast : normal);

    cell.style.setProperty("--attn-blink-dur", `${dur(1.6, 1.0, 0.6)}s`);
    cell.style.setProperty("--attn-pulse-dur", `${dur(1.9, 1.2, 0.8)}s`);
    cell.style.setProperty("--attn-wave-dur", `${dur(2.0, 1.4, 0.9)}s`);
    cell.style.setProperty("--attn-throb-dur", `${dur(2.2, 1.6, 1.0)}s`);
    cell.style.setProperty("--attn-heartbeat-dur", `${dur(2.4, 1.8, 1.1)}s`);
    cell.style.setProperty("--attn-flash-dur", `${dur(1.8, 1.2, 0.7)}s`);

    const dim = Math.max(0.25, Math.min(0.9, 0.85 - depth * 0.55));
    const boost = Math.max(1.04, Math.min(1.42, 1.08 + depth * 0.34));
    const boostSoft = Math.max(1.02, Math.min(1.28, 1.04 + depth * 0.22));
    cell.style.setProperty("--attn-dim", String(dim));
    cell.style.setProperty("--attn-boost", String(boost));
    cell.style.setProperty("--attn-boost-soft", String(boostSoft));

    cell.classList.toggle("attn_border_none", border === "none");
    cell.classList.toggle("attn_border_soft", border === "soft");
    cell.classList.toggle("attn_border_strong", border === "strong");

    cell.style.setProperty("--attn-wave-radius", `${Math.max(0, waveRadius)}px`);
    const throbMin = Math.max(0.75, 0.95 - throbSubtlety * 0.10);
    const throbMax = Math.min(1.20, 1.03 + throbSubtlety * 0.10);
    cell.style.setProperty("--attn-throb-min", String(throbMin));
    cell.style.setProperty("--attn-throb-max", String(throbMax));
  };
  const panelMode = (cfg) => String((cfg && cfg.panel_mode) || "operator").toLowerCase();
  const isPresentation = (cfg) => panelMode(cfg) === "presentation";

  const deepGet = (obj, path) =>
    String(path || "")
      .split(".")
      .reduce((acc, p) => (acc && acc[p] !== undefined ? acc[p] : undefined), obj);

  const renderTemplate = (tpl, vars) => {
    if (!tpl) return "";
    return String(tpl).replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, key) => {
      const val = deepGet(vars, key);
      return val === undefined || val === null ? "" : String(val);
    });
  };

  const escapeHtml = (s) =>
    String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const yamlQuote = (s) => {
    const str = String(s ?? "");
    // Quote if contains special chars, leading/trailing spaces, or looks like a number/bool/null.
    const needs =
      str === "" ||
      /^[\s]|[\s]$/.test(str) ||
      /[:\-\{\}\[\],#&*!|>'"%@`]/.test(str) ||
      /^(true|false|null|~)$/i.test(str) ||
      /^-?\d+(\.\d+)?$/.test(str);
    if (!needs) return str;
    return `"${str.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  };

  const toYaml = (val, indent = 0) => {
    const pad = " ".repeat(indent);
    if (val === null || val === undefined) return "null";
    if (typeof val === "number" || typeof val === "boolean") return String(val);
    if (typeof val === "string") return yamlQuote(val);

    if (Array.isArray(val)) {
      if (val.length === 0) return "[]";
      return val
        .map((v) => {
          const isObj = v && typeof v === "object" && !Array.isArray(v);
          if (isObj) {
            const inner = toYaml(v, indent + 2);
            return `${pad}- ${inner.startsWith("\n") ? inner.slice(1) : inner}`.replace(/\n/g, "\n" + pad + "  ");
          }
          return `${pad}- ${toYaml(v, indent + 2)}`;
        })
        .join("\n");
    }

    if (typeof val === "object") {
      const keys = Object.keys(val);
      if (keys.length === 0) return "{}";
      return keys
        .map((k) => {
          const v = val[k];
          const isObj = v && typeof v === "object" && !Array.isArray(v);
          const isArr = Array.isArray(v);
          if (isObj || (isArr && v.length > 0)) {
            return `${pad}${k}:\n${toYaml(v, indent + 2)}`;
          }
          return `${pad}${k}: ${toYaml(v, indent + 2)}`;
        })
        .join("\n");
    }

    return yamlQuote(String(val));
  };

  const stripInternalKeys = (val) => {
    if (Array.isArray(val)) return val.map(stripInternalKeys);
    if (!val || typeof val !== "object") return val;
    const out = {};
    for (const [k, v] of Object.entries(val)) {
      if (k.startsWith("_") || k.startsWith("__") || k === "lamp_uid") continue;
      out[k] = stripInternalKeys(v);
    }
    return out;
  };

  const describeThresholdRule = (rule) => {
    const r = rule && typeof rule === "object" ? rule : {};
    const type = String(r.type || "above").toLowerCase();
    const a = r.value ?? r.a ?? 0;
    const b = r.b ?? 0;
    const inc = r.inclusive !== false;
    if (type === "between") return `between ${a} and ${b}${inc ? " (inclusive)" : ""}`;
    if (type === "above") return `above ${a}${inc ? " (≥)" : " (>)"}`;
    if (type === "below") return `below ${a}${inc ? " (≤)" : " (<)"}`;
    if (type === "equals") return `equals ${a}`;
    return `${type} ${a}`;
  };

  const describeAutoCondition = (auto) => {
    const kind = String(auto?.__match_kind || auto?.kind || "").toLowerCase();
    if (kind === "numeric") return `numeric ${describeThresholdRule(auto.rule)}`;
    if (kind === "state") return `state == ${yamlQuote(auto.state ?? "")}`;
    if (kind === "string") return `string ${String(auto.match || "contains")} ${yamlQuote(auto.value || "")}`;
    return kind ? `${kind} match` : "match";
  };

  const describeAutoEffects = (auto) => {
    if (!auto || typeof auto !== "object") return "-";
    const effects = [];
    if (auto.severity) effects.push(`severity=${auto.severity}`);
    if (auto.force_on) effects.push("force_on");
    const alert = (typeof auto.alert === "string") ? auto.alert : null;
    if (alert) effects.push(`alert=${alert}`);
    else {
      if (typeof auto.blink === "boolean") effects.push(`blink=${auto.blink}`);
      if (typeof auto.pulse === "boolean") effects.push(`pulse=${auto.pulse}`);
    }
    if (auto.color || auto.on_color) effects.push("on_color");
    return effects.length ? effects.join(", ") : "-";
  };

  const isTruthyState = (s) => s === "on" || s === "true" || s === "1";

  // Handles: "65.2 °F", "1,234", "12ms", etc.
  const toNumber = (v) => {
    if (v === null || v === undefined) return NaN;
    const s = String(v).trim().replace(/,/g, "");
    if (!s) return NaN;
    const direct = Number(s);
    if (Number.isFinite(direct)) return direct;
    const m = s.match(/[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/);
    return m ? Number(m[0]) : NaN;
  };

  // Value formatting / transforms (per-lamp)
  const applyValueTransform = (num, vf) => {
    if (Number.isNaN(num)) return NaN;
    const f = ensureObj(vf, {});
    let n = num;

    // Temperature conversion helpers (only if value is numeric)
    const conv = String(f.convert || "none").toLowerCase();
    if (conv === "c_to_f") n = n * 9 / 5 + 32;
    else if (conv === "f_to_c") n = (n - 32) * 5 / 9;

    const scale = Number(f.scale);
    // Zero is a valid scale (for example, intentionally flattening a value).
    if (Number.isFinite(scale)) n = n * scale;

    const offset = Number(f.offset);
    if (Number.isFinite(offset) && offset !== 0) n = n + offset;

    return n;
  };

  const formatNumberWith = (num, vf) => {
    if (Number.isNaN(num)) return "";
    const f = ensureObj(vf, {});
    const decimals = clampNum(f.decimals, 0);
    const rounding = String(f.rounding || "round").toLowerCase();

    let n = num;
    const pow = Math.pow(10, Math.max(0, Math.min(6, decimals)));
    if (rounding === "floor") n = Math.floor(n * pow) / pow;
    else if (rounding === "ceil") n = Math.ceil(n * pow) / pow;
    else n = Math.round(n * pow) / pow;

    // Ensure fixed decimals when requested
    if (decimals > 0) return n.toFixed(decimals);
    // Avoid "-0"
    if (Object.is(n, -0)) n = 0;
    return String(n);
  };

  const resolveDisplayUnit = (unit, vf) => {
    const f = ensureObj(vf, {});
    const unitMode = String(f.unit || "auto").toLowerCase(); // auto|none|override
    if (unitMode === "none") return "";
    if (unitMode === "override") return String(f.unit_override || "").trim();

    let u = String(unit || "");
    const conv = String(f.convert || "none").toLowerCase();
    const compact = u.trim().toLowerCase().replace(/\s+/g, "");
    if (conv === "c_to_f" && (compact === "°c" || compact === "c" || compact === "celsius")) u = "°F";
    else if (conv === "f_to_c" && (compact === "°f" || compact === "f" || compact === "fahrenheit")) u = "°C";
    return u;
  };

  const formatValueDisplay = (rawState, valueNum, unit, vf) => {
    const f = ensureObj(vf, {});
    const mode = String(f.mode || "auto").toLowerCase(); // auto|number|text
    if (mode === "text") return String(rawState ?? "");
    const n0 = valueNum;
    if (Number.isNaN(n0)) return String(rawState ?? "");
    const n = applyValueTransform(n0, f);
    const numStr = formatNumberWith(n, f);
    const u = resolveDisplayUnit(unit, f);

    const prefix = String(f.prefix || "");
    const suffix = String(f.suffix || "");
    const joinUnit = u ? ` ${u}` : "";
    return `${prefix}${numStr}${joinUnit}${suffix}`.trim();
  };

  const splitCSV = (s) =>
    String(s || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const matchString = (value, mode, needle) => {
    const v = String(value ?? "");
    const n = String(needle ?? "");
    if (!n) return false;
    switch (mode) {
      case "equals":
        return v === n;
      case "contains":
        return v.includes(n);
      case "starts_with":
        return v.startsWith(n);
      case "ends_with":
        return v.endsWith(n);
      default:
        return false;
    }
  };

  const evalRuleThreshold = (rule, valueNum) => {
    const r = ensureObj(rule, null);
    if (!r || Number.isNaN(valueNum)) return false;

    const type = String(r.type || "").toLowerCase();
    const inclusive = r.inclusive !== false;
    const a = Number(r.a);
    const b = Number(r.b);

    if (type === "equal") return valueNum === a;
    if (type === "above") return inclusive ? valueNum >= a : valueNum > a;
    if (type === "below") return inclusive ? valueNum <= a : valueNum < a;

    if (type === "between") {
      if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      return inclusive ? valueNum >= lo && valueNum <= hi : valueNum > lo && valueNum < hi;
    }

    return false;
  };

  const formatDateTime = (d) => {
    try {
      return new Date(d).toLocaleString();
    } catch {
      return "";
    }
  };

  const computeSecondary = (mode, vars, stateObj) => {
    const m = String(mode || "custom").toLowerCase();
    if (m === "none") return "";
    if (m === "state") return String(vars.display_value ?? vars.state ?? "");
    if (m === "entity_id") return String(vars.entity ?? "");
    if (m === "last_changed") return formatDateTime(stateObj?.last_changed);
    if (m === "last_updated") return formatDateTime(stateObj?.last_updated);
    return "";
  };

  // ============================================================
  // Safe cloning + normalization (prevents "object is not extensible")
  // ============================================================
  const normalizeLamp = (input) => {
    const src = ensureObj(input, {});
    const lamp = { ...src };

    lamp.threshold_rule = { ...ensureObj(src.threshold_rule, {}) };
    lamp.blink_on_change_threshold_rule = { ...ensureObj(src.blink_on_change_threshold_rule, {}) };
    lamp.colors = { ...ensureObj(src.colors, {}) };
    lamp.auto_styles = Array.isArray(src.auto_styles)
      ? src.auto_styles.map((r) => {
          const rr = ensureObj(r, {});
          const out = { ...rr };
          if (rr.rule && typeof rr.rule === "object") out.rule = { ...rr.rule };
          return out;
        })
      : [];

    // Base
    if (lamp.entity === undefined) lamp.entity = "";
    if (lamp.group === undefined) lamp.group = "";
    if (lamp.note === undefined) lamp.note = "";
    if (lamp.severity === undefined) lamp.severity = "status";
    if (lamp.blink === undefined) lamp.blink = false;
    
    if (lamp.blink_mode === undefined) lamp.blink_mode = "on"; // on|off|both

    // Generalized alert policy tuning (Behavior)
    if (lamp.alert_speed === undefined) lamp.alert_speed = "normal"; // slow|normal|fast
    if (lamp.alert_opacity_depth === undefined) lamp.alert_opacity_depth = 0.5; // 0..1
    if (lamp.alert_border_emphasis === undefined) lamp.alert_border_emphasis = "soft"; // none|soft|strong
    if (lamp.alert_wave_radius === undefined) lamp.alert_wave_radius = 10; // px
    if (lamp.alert_throb_subtlety === undefined) lamp.alert_throb_subtlety = 0.5; // 0..1

    // Generalized change alert style + tuning overrides
    if (lamp.alert_on_change_style === undefined) lamp.alert_on_change_style = "inherit"; // inherit|off|blink|pulse|wave|throb|heartbeat|flash
    if (lamp.alert_on_change_speed === undefined) lamp.alert_on_change_speed = ""; // "" = inherit
    if (lamp.alert_on_change_opacity_depth === undefined) lamp.alert_on_change_opacity_depth = ""; // "" = inherit
    if (lamp.alert_on_change_border_emphasis === undefined) lamp.alert_on_change_border_emphasis = ""; // "" = inherit
    if (lamp.alert_on_change_wave_radius === undefined) lamp.alert_on_change_wave_radius = ""; // "" = inherit
    if (lamp.alert_on_change_throb_subtlety === undefined) lamp.alert_on_change_throb_subtlety = ""; // "" = inherit

if (lamp.invert === undefined) lamp.invert = false;

    // Change blink
    if (lamp.blink_on_change === undefined) lamp.blink_on_change = false;
    if (lamp.blink_on_change_seconds === undefined) lamp.blink_on_change_seconds = 3;
    if (lamp.blink_on_change_until_ack === undefined) lamp.blink_on_change_until_ack = false;

    // Existing/legacy lamps retain manual ACK rearm unless explicitly changed.
    // Newly-created v2+ alarm lamps opt into automatic rearm in the editor.
    if (lamp.ack_rearm === undefined) lamp.ack_rearm = "manual"; // manual|auto
    if (lamp.ack_slot !== undefined && lamp.ack_slot !== null && lamp.ack_slot !== "") {
      const slot = Number(lamp.ack_slot);
      lamp.ack_slot = Number.isInteger(slot) && slot > 0 ? slot : undefined;
    }

    // Change blink filter (optional)
    if (lamp.blink_on_change_filter_mode === undefined) lamp.blink_on_change_filter_mode = "any"; // any|state_equals|string_match|numeric_threshold
    if (lamp.blink_on_change_state === undefined) lamp.blink_on_change_state = "";
    if (lamp.blink_on_change_string_match === undefined) lamp.blink_on_change_string_match = "contains";
    if (lamp.blink_on_change_string_value === undefined) lamp.blink_on_change_string_value = "";
    if (lamp.blink_on_change_threshold_rule.type === undefined) lamp.blink_on_change_threshold_rule.type = "above";
    if (lamp.blink_on_change_threshold_rule.a === undefined) lamp.blink_on_change_threshold_rule.a = 0;
    if (lamp.blink_on_change_threshold_rule.b === undefined) lamp.blink_on_change_threshold_rule.b = 0;
    if (lamp.blink_on_change_threshold_rule.inclusive === undefined) lamp.blink_on_change_threshold_rule.inclusive = true;

    // Eval
    if (lamp.eval_mode === undefined) lamp.eval_mode = "toggle"; // toggle|state_equals|string_match|numeric_threshold
    if (lamp.on_states === undefined) lamp.on_states = "on,true,1,open";
    if (lamp.string_match === undefined) lamp.string_match = "contains";
    if (lamp.string_value === undefined) lamp.string_value = "";
    if (lamp.threshold_rule.type === undefined) lamp.threshold_rule.type = "above";
    if (lamp.threshold_rule.a === undefined) lamp.threshold_rule.a = 0;
    if (lamp.threshold_rule.b === undefined) lamp.threshold_rule.b = 0;
    if (lamp.threshold_rule.inclusive === undefined) lamp.threshold_rule.inclusive = true;

    // Colors
    if (lamp.use_color_override === undefined) lamp.use_color_override = false;
    if (lamp.colors.on === undefined) lamp.colors.on = "";
    if (lamp.colors.off === undefined) lamp.colors.off = "";
    if (lamp.colors.text === undefined) lamp.colors.text = "";

    // Extended per-lamp colors
    if (lamp.colors.on_text === undefined) lamp.colors.on_text = "";
    if (lamp.colors.unavailable === undefined) lamp.colors.unavailable = "";
    if (lamp.colors.unavailable_text === undefined) lamp.colors.unavailable_text = "";
    // Value formatting (applies to primary/secondary when showing state/value)
    // Kept intentionally simple for v1: decimals + rounding + unit + basic conversions.
    if (lamp.value_format === undefined) lamp.value_format = {};
    lamp.value_format = { ...ensureObj(lamp.value_format, {}) };
    if (lamp.value_format.mode === undefined) lamp.value_format.mode = "auto"; // auto|number|text
    if (lamp.value_format.decimals === undefined) lamp.value_format.decimals = 0; // 0..3 typical
    if (lamp.value_format.rounding === undefined) lamp.value_format.rounding = "round"; // round|floor|ceil
    if (lamp.value_format.unit === undefined) lamp.value_format.unit = "auto"; // auto|none|override
    if (lamp.value_format.unit_override === undefined) lamp.value_format.unit_override = "";
    if (lamp.value_format.convert === undefined) lamp.value_format.convert = "none"; // none|c_to_f|f_to_c
    if (lamp.value_format.scale === undefined || lamp.value_format.scale === "" || !Number.isFinite(Number(lamp.value_format.scale))) lamp.value_format.scale = 1;
    else lamp.value_format.scale = Number(lamp.value_format.scale);
    if (lamp.value_format.offset === undefined || lamp.value_format.offset === "" || !Number.isFinite(Number(lamp.value_format.offset))) lamp.value_format.offset = 0;
    else lamp.value_format.offset = Number(lamp.value_format.offset);
    if (lamp.value_format.prefix === undefined) lamp.value_format.prefix = "";
    if (lamp.value_format.suffix === undefined) lamp.value_format.suffix = "";


    // Display (non-template mode)
    if (lamp.label_source === undefined) lamp.label_source = (lamp.name_override ? "custom" : "entity"); // entity|custom
    if (lamp.name_override === undefined) lamp.name_override = ""; // custom label text
    if (lamp.primary_mode === undefined) lamp.primary_mode = "custom"; // custom|name
    if (lamp.primary_text === undefined) lamp.primary_text = "";
    if (lamp.secondary_mode === undefined) lamp.secondary_mode = "state"; // custom|none|state|entity_id|last_changed|last_updated
    if (lamp.secondary_text === undefined) lamp.secondary_text = "";
    if (lamp.tertiary_mode === undefined) lamp.tertiary_mode = "none"; // custom|none|state|entity_id|last_changed|last_updated

    // Paired lamps: if user hasn't provided custom primary text, default to Label so the window populates immediately.
    const pm = String(lamp.pair_mode || "none");
    // Lamp appearance style
    if (lamp.lamp_style === undefined) lamp.lamp_style = "inherit"; // inherit|modern|retro
    if (lamp.lens_type === undefined) lamp.lens_type = "inherit"; // inherit|plastic|glass|frosted|smoked

    if ((pm === "top" || pm === "bottom") && String(lamp.primary_mode || "custom") === "custom" && !String(lamp.primary_text || "").trim()) {
      lamp.primary_mode = "name";
    }
    if (lamp.tertiary_text === undefined) lamp.tertiary_text = "";

    // Templates
    if (lamp.use_templates === undefined) lamp.use_templates = false;
    if (lamp.label_template === undefined) lamp.label_template = "{{name}}";
    if (lamp.legend_template === undefined) lamp.legend_template = "{{value}} {{unit}}";

    // Auto styles
    if (lamp.always_on === undefined) lamp.always_on = false;
    if (lamp.enable_auto_styles === undefined) lamp.enable_auto_styles = false;

    return lamp;
  };

  const normalizeEntities = (entities) => {
    const arr = Array.isArray(entities) ? entities : [];
    return arr.map((e) => normalizeLamp(e));
  };

  // ============================================================
  // Auto Style Evaluation
  // ============================================================
  const pickAutoStyle = (item, rawState, valueNum) => {
    const styles = Array.isArray(item?.auto_styles) ? item.auto_styles : [];
    for (let i = 0; i < styles.length; i++) {
      const s0 = styles[i];
      const kind = String(s0?.kind || "").toLowerCase();

      const matched =
        (kind === "numeric" && !Number.isNaN(valueNum) && evalRuleThreshold(s0.rule, valueNum)) ||
        (kind === "state" && String(rawState) === String(s0.state ?? "")) ||
        (kind === "string" && matchString(rawState, String(s0.match || "contains"), String(s0.value || "")));

      if (matched) {
        // Return a shallow copy with match metadata for overlays/debug UI.
        const s = { ...(s0 || {}) };
        s.__match_index = i;
        s.__match_kind = kind || String(s0?.kind || "");
        if (s.name !== undefined && s.name !== null && String(s.name).trim() !== "") {
          s.__match_name = String(s.name).trim();
        }
        return s;
      }
    }
    return null;
  };


  // ============================================================
  // v2 Core Model / Evaluation Engine
  // ============================================================
  // The external YAML remains backward-compatible with v1.83. Internally every
  // lamp is adapted into a small set of concepts: value -> condition -> rules ->
  // appearance -> alert -> display. Runtime, group ACK, history and editor all
  // share these helpers so behavior cannot drift between code paths.

  const ALERT_EFFECTS = new Set(["blink", "pulse", "wave", "throb", "heartbeat", "flash"]);

  const makeLampUid = () => `lamp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

  const lampRuntimeId = (item) => String(item?.uid || item?.lamp_uid || item?.entity || "");

  const normalizeAlertEffect = (value) => {
    const raw = String(value ?? "").toLowerCase();
    if (raw === "flash-once") return "flash";
    if (raw === "none" || raw === "off" || raw === "steady") return "";
    return ALERT_EFFECTS.has(raw) ? raw : "";
  };

  const legacyMainCondition = (item) => {
    const mode = String(item?.eval_mode || "toggle").toLowerCase();
    if (item?.always_on) return { kind: "always" };
    if (mode === "state_equals") {
      return { kind: "state_in", values: Array.isArray(item?.on_states) ? item.on_states.map(String) : splitCSV(item?.on_states) };
    }
    if (mode === "string_match") {
      return { kind: "string", operator: String(item?.string_match || "contains"), value: String(item?.string_value || "") };
    }
    if (mode === "numeric_threshold") {
      const r = ensureObj(item?.threshold_rule, {});
      return { kind: "numeric", operator: String(r.type || "above"), a: r.a ?? 0, b: r.b ?? 0, inclusive: r.inclusive !== false };
    }
    return { kind: "truthy" };
  };

  const legacyChangeCondition = (item) => {
    const mode = String(item?.blink_on_change_filter_mode || "any").toLowerCase();
    if (mode === "state_equals") return { kind: "state_equals", value: String(item?.blink_on_change_state || "") };
    if (mode === "string_match") {
      return { kind: "string", operator: String(item?.blink_on_change_string_match || "contains"), value: String(item?.blink_on_change_string_value || "") };
    }
    if (mode === "numeric_threshold") {
      const r = ensureObj(item?.blink_on_change_threshold_rule, {});
      return { kind: "numeric", operator: String(r.type || "above"), a: r.a ?? 0, b: r.b ?? 0, inclusive: r.inclusive !== false };
    }
    return { kind: "always" };
  };

  const matchesCondition = (condition, rawState, valueNum) => {
    const c = ensureObj(condition, {});
    const kind = String(c.kind || "always").toLowerCase();
    if (kind === "always") return true;
    if (kind === "truthy") return isTruthyState(String(rawState).toLowerCase());
    if (kind === "state_equals") return String(rawState) === String(c.value ?? "");
    if (kind === "state_in") return (Array.isArray(c.values) ? c.values : []).map(String).includes(String(rawState));
    if (kind === "string") return matchString(rawState, String(c.operator || "contains"), String(c.value || ""));
    if (kind === "numeric") {
      return evalRuleThreshold({ type: c.operator, a: Number(c.a), b: Number(c.b), inclusive: c.inclusive !== false }, valueNum);
    }
    return false;
  };

  const resolveBaseAlertEffect = (item) => {
    const explicit = normalizeAlertEffect(item?.alert_style);
    if (String(item?.alert_style || "").trim()) return explicit;
    if (item?.blink) return "blink";
    if (item?.pulse) return "pulse";
    return "";
  };

  const resolveRuleAlertEffect = (auto, baseEffect) => {
    if (!auto) return baseEffect;
    if (typeof auto.alert === "string") {
      const a = String(auto.alert).toLowerCase();
      if (a === "inherit" || a === "") return baseEffect;
      return normalizeAlertEffect(a);
    }
    if (typeof auto.blink === "boolean") return auto.blink ? "blink" : "";
    if (typeof auto.pulse === "boolean") return auto.pulse ? "pulse" : "";
    return baseEffect;
  };

  const resolveDisplayLines = (item, stateObj, rawState, rawValueNum, valueNum, severity, isOn, isAcked) => {
    const attrs = stateObj?.attributes || {};
    const unit = attrs.unit_of_measurement || "";
    const friendly = attrs.friendly_name || item?.entity || "";
    const name = String(item?.label_source || "entity") === "custom"
      ? String(item?.name_override || friendly)
      : String(friendly);
    const vars = {
      entity: item?.entity || "",
      name,
      state: rawState,
      raw_value: Number.isNaN(rawValueNum) ? rawState : rawValueNum,
      value: Number.isNaN(valueNum) ? rawState : valueNum,
      display_value: formatValueDisplay(rawState, rawValueNum, unit, item?.value_format),
      unit: resolveDisplayUnit(unit, item?.value_format),
      severity,
      on: isOn,
      acked: isAcked ? "YES" : "NO",
      attributes: attrs,
      last_changed: stateObj?.last_changed,
      last_updated: stateObj?.last_updated,
    };

    if (item?.use_templates) {
      return {
        primary: item?.label_template ? renderTemplate(item.label_template, vars) : "",
        secondary: item?.legend_template ? renderTemplate(item.legend_template, vars) : "",
        tertiary: "",
        vars,
      };
    }

    const pm = String(item?.primary_mode || "custom").toLowerCase();
    const sm = String(item?.secondary_mode || "state").toLowerCase();
    const tm = String(item?.tertiary_mode || "none").toLowerCase();
    const primary = pm === "name" ? name : pm === "state" ? String(vars.display_value || rawState || "") : String(item?.primary_text || name || "");
    const secondary = sm === "custom" ? String(item?.secondary_text || "") : computeSecondary(sm, vars, stateObj) || "";
    const tertiary = tm === "custom" ? String(item?.tertiary_text || "") : tm === "none" ? "" : computeSecondary(tm, vars, stateObj) || "";
    return { primary, secondary, tertiary, vars };
  };

  const buildLampModel = (input) => {
    const item = normalizeLamp(input || {});
    const vf = ensureObj(item.value_format, {});
    return {
      uid: lampRuntimeId(item),
      entity: String(item.entity || ""),
      identity: { label: String(item.name_override || ""), group: String(item.group || ""), note: String(item.note || "") },
      value: { convert: vf.convert || "none", scale: vf.scale ?? 1, offset: vf.offset ?? 0 },
      display: {
        labelSource: item.label_source || "entity",
        primary: item.primary_mode || "custom",
        secondary: item.secondary_mode || "state",
        tertiary: item.tertiary_mode || "none",
        templates: !!item.use_templates,
        format: { decimals: vf.decimals ?? 0, rounding: vf.rounding || "round", unit: vf.unit || "auto", unit_override: vf.unit_override || "", prefix: vf.prefix || "", suffix: vf.suffix || "" },
      },
      condition: legacyMainCondition(item),
      alert: { effect: resolveBaseAlertEffect(item), when: String(item.alert_when || item.blink_mode || "on"), acknowledgement: resolveBaseAlertEffect(item) ? "required" : "none" },
      changeAlert: { enabled: !!item.blink_on_change, condition: legacyChangeCondition(item), untilAck: !!item.blink_on_change_until_ack, seconds: clampNum(item.blink_on_change_seconds, 3), effect: String(item.alert_on_change_style || "inherit") },
      appearance: { severity: String(item.severity || "status"), lampStyle: item.lamp_style || "inherit", lens: item.lens_type || "inherit", colors: { ...ensureObj(item.colors, {}) } },
      pairing: { id: String(item.pair_id || ""), position: String(item.pair_mode || "none") },
      rules: Array.isArray(item.auto_styles) ? item.auto_styles : [],
      legacy: item,
    };
  };

  const inferLampType = (item) => {
    const explicit = String(item?.lamp_type || "").toLowerCase();
    if (["alarm", "status", "sensor", "custom"].includes(explicit)) return explicit;
    const effect = resolveBaseAlertEffect(item);
    if (effect) return "alarm";
    if (item?.always_on) return "sensor";
    if (String(item?.eval_mode || "toggle") === "toggle" && String(item?.severity || "status") === "status") return "status";
    return "custom";
  };

  const evaluateLampState = (input, stateObj, options = {}) => {
    const item = normalizeLamp(input || {});
    const model = buildLampModel(item);
    const exists = !!stateObj;
    const unavailable = !exists || stateObj.state === "unavailable" || stateObj.state === "unknown";
    const rawState = exists ? stateObj.state : "";
    const rawValueNum = toNumber(rawState);
    const valueNum = applyValueTransform(rawValueNum, item.value_format);

    if (unavailable && !options.lampTest) {
      return {
        model, available: false, rawState, rawValueNum, valueNum, changed: !!options.changed,
        isOn: false, severity: String(item.severity || "status"), auto: null,
        alert: { active: false, effect: "", reason: "unavailable", tuning: {} },
        display: { primary: String(item.primary_text || item.name_override || item.entity || ""), secondary: "", tertiary: "", vars: {} },
      };
    }

    const auto = item.enable_auto_styles ? pickAutoStyle(item, rawState, valueNum) : null;
    let isOn = matchesCondition(model.condition, rawState, valueNum);
    if (item.invert) isOn = !isOn;
    if (item.always_on || options.lampTest || auto?.force_on) isOn = true;

    let severity = String(item.severity || "status").toLowerCase();
    if (auto?.severity) severity = String(auto.severity).toLowerCase();

    const baseEffect = resolveBaseAlertEffect(item);
    const mainEffect = resolveRuleAlertEffect(auto, baseEffect);
    const when = String(item.alert_when || item.blink_mode || "on").toLowerCase();
    const whenMatches = options.forceAlert ? true : (when === "both" ? true : when === "off" ? !isOn : isOn);
    const suppressAlerts = !!options.suppressAlerts;
    const mainActive = !!(mainEffect && !options.acked && whenMatches && !suppressAlerts);

    let effect = mainActive ? mainEffect : "";
    let reason = mainActive ? "condition" : "none";
    let tuning = {
      speed: item.alert_speed,
      opacity_depth: item.alert_opacity_depth,
      border_emphasis: item.alert_border_emphasis,
      wave_radius: item.alert_wave_radius,
      throb_subtlety: item.alert_throb_subtlety,
    };

    const changeActive = !!options.changeActive && !options.changeAcked && !suppressAlerts;
    if (changeActive) {
      const raw = String(item.alert_on_change_style || "inherit").toLowerCase();
      const chEffect = raw === "inherit" ? (mainEffect || baseEffect || "blink") : normalizeAlertEffect(raw);
      if (chEffect) {
        effect = chEffect;
        reason = "change";
        tuning = { ...tuning };
        if (String(item.alert_on_change_speed || "").trim()) tuning.speed = item.alert_on_change_speed;
        if (String(item.alert_on_change_opacity_depth ?? "").trim()) tuning.opacity_depth = item.alert_on_change_opacity_depth;
        if (String(item.alert_on_change_border_emphasis || "").trim()) tuning.border_emphasis = item.alert_on_change_border_emphasis;
        if (String(item.alert_on_change_wave_radius ?? "").trim()) tuning.wave_radius = item.alert_on_change_wave_radius;
        if (String(item.alert_on_change_throb_subtlety ?? "").trim()) tuning.throb_subtlety = item.alert_on_change_throb_subtlety;
      }
    }

    const display = resolveDisplayLines(item, stateObj, rawState, rawValueNum, valueNum, severity, isOn, !!options.acked);
    return {
      model, available: true, rawState, rawValueNum, valueNum, changed: !!options.changed,
      isOn, severity, auto,
      autoOnColor: auto?.color ? String(auto.color).trim() : "",
      alert: {
        active: !!effect, effect, reason, tuning, mainActive, changeActive,
        mainEffect, mainConditionMatched: !!(mainEffect && whenMatches), when
      },
      display,
    };
  };


  // ============================================================
  // Compact persistent ACK codec + configuration validation
  // ============================================================
  // input_text helpers are small (often 255 chars). v1.0 stores shared ACKs with
  // stable per-lamp slots and an adaptive dense-bitset/sparse-list codec.
  // Format: A3M|<panel-token>,s2,<main-encoding>,<change-encoding>|...

  const fnv1a32 = (text) => {
    let h = 2166136261;
    const str = String(text || "");
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  };

  const ackSlotFor = (item, index) => {
    const n = Number(item?.ack_slot);
    return Number.isInteger(n) && n > 0 ? n : index + 1;
  };

  const ackLayoutFingerprint = (items) => {
    const rows = (Array.isArray(items) ? items : []).map((raw, index) => {
      const item = normalizeLamp(raw || {});
      return `${ackSlotFor(item, index)}=${lampRuntimeId(item) || item.entity || `#${index + 1}`}`;
    }).sort();
    return fnv1a32(rows.join("|"));
  };

  const bitsetToHex = (slots) => {
    const list = Array.from(slots || []).filter((n) => Number.isInteger(n) && n > 0);
    const max = list.length ? Math.max(...list) : 0;
    if (!max) return "0";
    const nibbles = Array(Math.ceil(max / 4)).fill(0);
    list.forEach((slot) => {
      const bit = slot - 1;
      const nib = Math.floor(bit / 4);
      nibbles[nib] |= 1 << (bit % 4);
    });
    while (nibbles.length > 1 && nibbles[nibbles.length - 1] === 0) nibbles.pop();
    return nibbles.map((n) => n.toString(16)).join("");
  };

  const hexHasSlot = (hex, slot) => {
    if (!Number.isInteger(slot) || slot <= 0) return false;
    const bit = slot - 1;
    const nib = Math.floor(bit / 4);
    const digit = parseInt(String(hex || "0")[nib] || "0", 16);
    return Number.isFinite(digit) && !!(digit & (1 << (bit % 4)));
  };

  const canonicalAckValue = (map, panelId, item, kind = "main") => {
    const uid = lampRuntimeId(item);
    const ent = String(item?.entity || "");
    const suffix = kind === "change" ? "::chg" : "";
    const key = `${panelId}::${uid || ent}${suffix}`;
    const legacy = `${panelId}::${ent}${suffix}`;
    if (Object.prototype.hasOwnProperty.call(map || {}, key)) return Boolean(map[key]);
    if (legacy !== key && Object.prototype.hasOwnProperty.call(map || {}, legacy)) return Boolean(map[legacy]);
    return false;
  };

  const compactPanelToken = (panelId) => fnv1a32(`panel:${String(panelId || "annunciator_panel")}`);
  const ackKeyHash = (key) => fnv1a32(`ack:${String(key || "")}`);

  const candidateAckKeys = (panelId, item, kind = "main") => {
    const uid = lampRuntimeId(item);
    const ent = String(item?.entity || "");
    const suffix = kind === "change" ? "::chg" : "";
    const keys = [`${panelId}::${uid || ent}${suffix}`];
    const legacy = `${panelId}::${ent}${suffix}`;
    if (legacy !== keys[0]) keys.push(legacy);
    return keys;
  };

  const legacyHashSetFromText = (existingText) => {
    const raw = String(existingText || "").trim();
    const hashes = new Set();
    if (raw.startsWith("A3M|") || raw.startsWith("A2M|")) {
      const body = raw.slice(4);
      const seg = body.split("|").find((entry) => entry.startsWith("H,"));
      if (seg) seg.slice(2).split(".").filter(Boolean).forEach((h) => hashes.add(h));
      return hashes;
    }
    if (raw && !raw.startsWith("A2:")) {
      try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === "object" && !Array.isArray(obj)) {
          Object.entries(obj).forEach(([key, value]) => { if (value) hashes.add(ackKeyHash(key)); });
        }
      } catch (_) {}
    }
    return hashes;
  };

  // s2 is adaptive: a dense slot set uses a hexadecimal bitset (b...), while a
  // sparse/high-numbered set uses a compact base36 slot list (l...). The shorter
  // representation wins independently for main and change ACKs.
  const slotSetToAdaptive = (slots) => {
    const sorted = Array.from(slots || []).filter((n) => Number.isInteger(n) && n > 0).sort((a,b)=>a-b);
    if (!sorted.length) return "b0";
    const bitset = `b${bitsetToHex(sorted)}`;
    const list = `l${sorted.map((n) => n.toString(36)).join(".")}`;
    return list.length < bitset.length ? list : bitset;
  };

  const adaptiveHasSlot = (encoded, slot) => {
    const raw = String(encoded || "b0");
    if (raw.startsWith("b")) return hexHasSlot(raw.slice(1) || "0", slot);
    if (raw.startsWith("l")) {
      return raw.slice(1).split(".").filter(Boolean).some((x) => parseInt(x, 36) === slot);
    }
    // Graceful compatibility with an unprefixed s1 hex payload.
    return hexHasSlot(raw || "0", slot);
  };

  const highestHexSlot = (hex) => {
    const raw=String(hex||"0");
    for(let nib=raw.length-1;nib>=0;nib--){const d=parseInt(raw[nib]||"0",16);if(!Number.isFinite(d)||!d)continue;for(let bit=3;bit>=0;bit--)if(d&(1<<bit))return nib*4+bit+1}
    return 0;
  };
  const highestAdaptiveSlot = (encoded) => {
    const raw=String(encoded||"b0");if(raw.startsWith("b"))return highestHexSlot(raw.slice(1));if(raw.startsWith("l"))return raw.slice(1).split(".").filter(Boolean).reduce((m,x)=>Math.max(m,parseInt(x,36)||0),0);return highestHexSlot(raw);
  };
  const highestStoredAckSlot = (text,panelId) => {
    const raw=String(text||"").trim(),token=compactPanelToken(panelId);let format="",main="0",change="0";
    if(raw.startsWith("A3M|")||raw.startsWith("A2M|")){const seg=raw.slice(4).split("|").find((x)=>!x.startsWith("H,")&&x.split(",")[0]===token);if(!seg)return 0;const p=seg.split(",");if(p.length!==4)return 0;[,format,main,change]=p}
    else if(raw.startsWith("A2:")){const p=raw.split(":");if(p.length!==4)return 0;[,format,main,change]=p}else return 0;
    return format==="s2"?Math.max(highestAdaptiveSlot(main),highestAdaptiveSlot(change)):Math.max(highestHexSlot(main),highestHexSlot(change));
  };

  const encodeCompactAckState = (map, items, panelId, existingText = "") => {
    const main = new Set();
    const change = new Set();
    const currentKeyHashes = new Set();
    (Array.isArray(items) ? items : []).forEach((raw, index) => {
      const item = normalizeLamp(raw || {});
      if (!item.entity) return;
      const slot = ackSlotFor(item, index);
      candidateAckKeys(panelId, item, "main").forEach((k) => currentKeyHashes.add(ackKeyHash(k)));
      candidateAckKeys(panelId, item, "change").forEach((k) => currentKeyHashes.add(ackKeyHash(k)));
      if (canonicalAckValue(map, panelId, item, "main")) main.add(slot);
      if (canonicalAckValue(map, panelId, item, "change")) change.add(slot);
    });

    const token = compactPanelToken(panelId);
    const existing = String(existingText || "").trim();
    const existingMulti = existing.startsWith("A3M|") || existing.startsWith("A2M|");
    const segments = existingMulti
      ? existing.slice(4).split("|").filter(Boolean).filter((seg) => !seg.startsWith("H,") && seg.split(",")[0] !== token)
      : [];
    const legacyHashes = legacyHashSetFromText(existing);
    currentKeyHashes.forEach((h) => legacyHashes.delete(h));
    if (legacyHashes.size) segments.unshift(`H,${Array.from(legacyHashes).sort().join(".")}`);
    if (main.size || change.size) segments.push(`${token},s2,${slotSetToAdaptive(main)},${slotSetToAdaptive(change)}`);
    return segments.length ? `A3M|${segments.join("|")}` : "A3M";
  };

  const decodeCompactAckState = (text, items, panelId) => {
    const raw = String(text || "").trim();
    let format = "", mainData = "0", changeData = "0";
    let hasPanelSegment = false;
    let legacyHashes = new Set();
    if (raw === "A3M" || raw === "A2M") return {};
    if (raw.startsWith("A3M|") || raw.startsWith("A2M|")) {
      const all = raw.slice(4).split("|").filter(Boolean);
      const hseg = all.find((entry) => entry.startsWith("H,"));
      if (hseg) legacyHashes = new Set(hseg.slice(2).split(".").filter(Boolean));
      const token = compactPanelToken(panelId);
      const seg = all.find((entry) => !entry.startsWith("H,") && entry.split(",")[0] === token);
      if (seg) {
        const parts = seg.split(",");
        if (parts.length !== 4) return null;
        [, format, mainData, changeData] = parts;
        hasPanelSegment = true;
      }
    } else if (raw.startsWith("A2:")) {
      const parts = raw.split(":");
      if (parts.length !== 4) return null;
      [, format, mainData, changeData] = parts;
      hasPanelSegment = true;
    } else return null;

    if (hasPanelSegment && !["s1","s2"].includes(format) && format !== ackLayoutFingerprint(items)) return null;
    const out = {};
    (Array.isArray(items) ? items : []).forEach((entry, index) => {
      const item = normalizeLamp(entry || {});
      if (!item.entity) return;
      const slot = ackSlotFor(item, index);
      const uid = lampRuntimeId(item) || item.entity;
      if (hasPanelSegment) {
        const mainHit = format === "s2" ? adaptiveHasSlot(mainData, slot) : hexHasSlot(mainData, slot);
        const changeHit = format === "s2" ? adaptiveHasSlot(changeData, slot) : hexHasSlot(changeData, slot);
        if (mainHit) out[`${panelId}::${uid}`] = true;
        if (changeHit) out[`${panelId}::${uid}::chg`] = true;
      } else if (legacyHashes.size) {
        if (candidateAckKeys(panelId, item, "main").some((k) => legacyHashes.has(ackKeyHash(k)))) out[`${panelId}::${uid}`] = true;
        if (candidateAckKeys(panelId, item, "change").some((k) => legacyHashes.has(ackKeyHash(k)))) out[`${panelId}::${uid}::chg`] = true;
      }
    });
    return out;
  };

  const parseAckStateText = (text, items, panelId) => {
    const raw = String(text || "").trim();
    if (raw === "A3M" || raw.startsWith("A3M|") || raw === "A2M" || raw.startsWith("A2M|") || raw.startsWith("A2:")) {
      return decodeCompactAckState(raw, items, panelId);
    }
    try {
      const parsed = JSON.parse(raw || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return null;
    }
  };

  const validPairIdsFor = (items) => {
    const groups = new Map();
    (Array.isArray(items) ? items : []).forEach((raw, index) => {
      const lamp = normalizeLamp(raw || {});
      const id = String(lamp.pair_id || "").trim();
      const mode = String(lamp.pair_mode || "none").toLowerCase();
      if (!id || !["top", "bottom"].includes(mode) || !lamp.entity) return;
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push({ index, lamp, mode });
    });
    const valid = new Set();
    groups.forEach((members, id) => {
      if (members.length === 2 && members.filter((m) => m.mode === "top").length === 1 && members.filter((m) => m.mode === "bottom").length === 1) valid.add(id);
    });
    return valid;
  };

  const physicalBlocksFor = (items) => {
    const arr = (Array.isArray(items) ? items : []).map((x) => normalizeLamp(x || {}));
    const valid = validPairIdsFor(arr);
    const handled = new Set();
    const pairByTopIndex = new Map();
    const pairedBottomIndices = new Set();

    // TOP defines a pair's physical position everywhere. This matters for old/manual
    // YAML where BOTTOM may appear earlier than TOP in the raw array.
    valid.forEach((pid) => {
      const members = arr.map((lamp,index)=>({lamp,index})).filter((x)=>String(x.lamp.pair_id||"").trim()===pid);
      const top = members.find((x)=>String(x.lamp.pair_mode||"none").toLowerCase()==="top");
      const bottom = members.find((x)=>String(x.lamp.pair_mode||"none").toLowerCase()==="bottom");
      if (top && bottom) {
        pairByTopIndex.set(top.index,{pairId:pid,top,bottom});
        pairedBottomIndices.add(bottom.index);
      }
    });

    const blocks = [];
    for (let i = 0; i < arr.length; i++) {
      if (handled.has(i) || pairedBottomIndices.has(i)) continue;
      const pair = pairByTopIndex.get(i);
      if (pair) {
        handled.add(pair.top.index); handled.add(pair.bottom.index);
        blocks.push({ pairId:pair.pairId, paired:true, indices:[pair.top.index,pair.bottom.index], lamps:[pair.top.lamp,pair.bottom.lamp] });
        continue;
      }
      handled.add(i);
      blocks.push({ pairId:"", paired:false, indices:[i], lamps:[arr[i]] });
    }
    return blocks;
  };

  const flattenPhysicalBlocks = (blocks) => (Array.isArray(blocks) ? blocks : []).flatMap((b) => b?.lamps || []);

  const canonicalizePairOrdering = (items) => flattenPhysicalBlocks(physicalBlocksFor(items));

  // Use only the columns that are physically occupied. The configured Columns value
  // remains the maximum row width; users who intentionally want blank positions can
  // add Spacer cells. This prevents a one-lamp panel configured for 7 columns from
  // reserving six invisible columns and being unnecessarily shrunk by Auto Fit.
  const computeOccupiedColumns = (config) => {
    const cfg = config || {};
    const configured = Math.max(1, Math.min(100, Math.floor(clampNum(cfg.columns, 7))));
    const blocks = physicalBlocksFor(cfg.entities || []);
    if (!blocks.length) return 1;
    const showGroups = !!cfg.show_group_headers;
    let col = 0, maxUsed = 0, lastGroup = "";
    for (const block of blocks) {
      const lamp = normalizeLamp(block?.lamps?.[0] || {});
      const group = String(lamp.group || "").trim();
      if (showGroups && group && group !== lastGroup) {
        if (col > 0) { maxUsed = Math.max(maxUsed, col); col = 0; }
        lastGroup = group;
      } else if (!group) {
        lastGroup = "";
      }
      col++;
      maxUsed = Math.max(maxUsed, col);
      if (col >= configured) col = 0;
    }
    if (col > 0) maxUsed = Math.max(maxUsed, col);
    return Math.max(1, Math.min(configured, maxUsed || 1));
  };

  const computePanelMetrics = (config) => {
    const cfg = config || {};
    const columns = Math.max(1, Math.min(100, Math.floor(clampNum(cfg.columns, 7))));
    const renderColumns = computeOccupiedColumns(cfg);
    const blocks = physicalBlocksFor(cfg.entities || []);
    let lampRows = 0, groupRows = 0, col = 0, lastGroup = "";
    const showGroups = !!cfg.show_group_headers;
    for (const block of blocks) {
      const lamp = normalizeLamp(block.lamps?.[0] || {});
      const group = String(lamp.group || "").trim();
      if (showGroups && group && group !== lastGroup) {
        if (col > 0) { lampRows++; col = 0; }
        groupRows++;
        lastGroup = group;
      } else if (!group) lastGroup = "";
      col++;
      if (col >= columns) { lampRows++; col = 0; }
    }
    if (col > 0) lampRows++;
    const configuredMin = String(cfg.row_mode || "auto") === "fixed" ? Math.max(0, Math.floor(clampNum(cfg.rows, 0))) : 0;
    lampRows = Math.max(lampRows, configuredMin, 1);
    const cellHeight = Math.max(20, Math.min(2000, clampNum(cfg.cell_height, 160)));
    const groupHeight = 36;
    const gap = Math.max(0, Math.min(200, clampNum(cfg.cell_gap, 0)));
    const outer = Math.max(0, Math.min(200, clampNum(cfg.outer_frame, 6)));
    const headerPx = String(cfg.title || "").trim() || cfg.show_reset_ack !== false ? 48 : 0;
    const visualRows = lampRows + groupRows;
    const heightPx = (lampRows * cellHeight) + (groupRows * groupHeight) + (Math.max(0, visualRows - 1) * gap) + (outer * 2) + headerPx;
    return { columns, renderColumns, physicalCells: blocks.length, rows: visualRows, lampRows, groupRows, heightPx };
  };

  const validateAndRepairConfig = (config, repairIdentity = true) => {
    const cfg = migrateConfigV2(config || {});
    const raw = Array.isArray(cfg.entities) ? cfg.entities : [];
    const entities = raw.map((x) => normalizeLamp(x || {}));
    const issues = [];
    const repairs = [];
    const seenUid = new Set();
    const seenSlot = new Set();
    const maxExistingSlot = entities.reduce((m, l) => {
      const n = Number(l.ack_slot);
      return Number.isInteger(n) && n > 0 ? Math.max(m, n) : m;
    }, 0);
    const requestedNextSlot = Number(cfg.next_ack_slot);
    let nextSlot = Math.max(
      maxExistingSlot + 1,
      Number.isInteger(requestedNextSlot) && requestedNextSlot > 0 ? requestedNextSlot : 1
    );

    entities.forEach((lamp, index) => {
      if (!lamp.entity) {
        // Spacers still need stable editor identity/slot because reordering them
        // must not reshuffle another lamp's compact ACK bit.
      }
      let uid = String(lamp.uid || lamp.lamp_uid || "").trim();
      if (!uid || seenUid.has(uid)) {
        const reason = !uid ? "missing" : "duplicate";
        issues.push({ type: "identity", index, message: `Cell ${index + 1} has a ${reason} lamp UID.` });
        if (repairIdentity) {
          uid = makeLampUid();
          lamp.uid = uid;
          repairs.push(`Assigned a new UID to cell ${index + 1}.`);
        }
      }
      if (uid) seenUid.add(uid);

      let slot = Number(lamp.ack_slot);
      if (!Number.isInteger(slot) || slot <= 0 || seenSlot.has(slot)) {
        const reason = (!Number.isInteger(slot) || slot <= 0) ? "missing/invalid" : "duplicate";
        issues.push({ type: "identity", index, message: `Cell ${index + 1} has a ${reason} ACK slot.` });
        if (repairIdentity) {
          while (seenSlot.has(nextSlot)) nextSlot++;
          lamp.ack_slot = nextSlot++;
          repairs.push(`Assigned a stable ACK slot to cell ${index + 1}.`);
          slot = lamp.ack_slot;
        }
      }
      if (Number.isInteger(slot) && slot > 0) seenSlot.add(slot);
    });

    const pairGroups = new Map();
    entities.forEach((lamp, index) => {
      const mode = String(lamp.pair_mode || "none").toLowerCase();
      const id = String(lamp.pair_id || "").trim();
      if (mode === "none" && !id) return;
      if (!lamp.entity) {
        issues.push({ type: "pair", pairId: id, index, message: `Cell ${index + 1} is a spacer but has pairing metadata.` });
        return;
      }
      if (!id || !["top", "bottom"].includes(mode)) {
        issues.push({ type: "pair", pairId: id, index, message: `Cell ${index + 1} has incomplete pairing metadata.` });
        return;
      }
      if (!pairGroups.has(id)) pairGroups.set(id, []);
      pairGroups.get(id).push({ lamp, index, mode });
    });
    pairGroups.forEach((members, pairId) => {
      const tops = members.filter((m) => m.mode === "top");
      const bottoms = members.filter((m) => m.mode === "bottom");
      if (members.length !== 2 || tops.length !== 1 || bottoms.length !== 1) {
        issues.push({ type: "pair", pairId, message: `Pair '${pairId}' is malformed (${tops.length} TOP, ${bottoms.length} BOTTOM, ${members.length} total).` });
        return;
      }
      const top = tops[0], bottom = bottoms[0];
      if (Math.abs(top.index - bottom.index) !== 1 || top.index > bottom.index) {
        issues.push({ type: "pair_order", pairId, message: `Pair '${pairId}' is valid but its TOP/BOTTOM entries are not adjacent in physical order.` });
      }
      const tg = String(top.lamp.group || "").trim(), bg = String(bottom.lamp.group || "").trim();
      if (tg !== bg) issues.push({ type: "pair_group", pairId, message: `Pair '${pairId}' has different groups (${tg || "none"} / ${bg || "none"}).` });
    });
    const maxSlotNow = entities.reduce((m,l)=>{const n=Number(l.ack_slot);return Number.isInteger(n)&&n>0?Math.max(m,n):m},0);
    if (!Number.isInteger(Number(cfg.next_ack_slot)) || Number(cfg.next_ack_slot) <= maxSlotNow) cfg.next_ack_slot = maxSlotNow + 1;
    cfg.config_version = CONFIG_VERSION;
    cfg.entities = entities;
    return { config: cfg, issues, repairs };
  };

  const repairMalformedPairs = (entities) => {
    const arr = (Array.isArray(entities) ? entities : []).map((x) => normalizeLamp(x || {}));
    const groups = new Map();
    arr.forEach((lamp, index) => {
      const id = String(lamp.pair_id || "").trim();
      const mode = String(lamp.pair_mode || "none").toLowerCase();
      if (!id && mode === "none") return;
      if (!id || !["top", "bottom"].includes(mode) || !lamp.entity) {
        arr[index] = { ...lamp, pair_id: "", pair_mode: "none" };
        return;
      }
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push({ index, lamp, mode });
    });
    groups.forEach((members, id) => {
      if (members.length === 1) {
        const m = members[0];
        arr[m.index] = { ...arr[m.index], pair_id: "", pair_mode: "none" };
        return;
      }
      let top = members.find((m) => m.mode === "top") || members[0];
      let bottom = members.find((m) => m.mode === "bottom" && m.index !== top.index) || members.find((m) => m.index !== top.index);
      members.forEach((m) => {
        if (m.index === top.index) arr[m.index] = { ...arr[m.index], pair_id: id, pair_mode: "top" };
        else if (bottom && m.index === bottom.index) arr[m.index] = { ...arr[m.index], pair_id: id, pair_mode: "bottom" };
        else arr[m.index] = { ...arr[m.index], pair_id: "", pair_mode: "none" };
      });
    });
    return canonicalizePairOrdering(arr);
  };

  const repairAllSafeConfig = (config) => {
    const identity = validateAndRepairConfig(config, true).config;
    const entities = canonicalizePairOrdering(repairMalformedPairs(identity.entities));
    return migrateConfigV2({ ...identity, entities });
  };

  const shouldTriggerChangeAlert = (item, rawState, valueNum, changed) =>
    !!item?.blink_on_change && !!changed && matchesCondition(legacyChangeCondition(item), rawState, valueNum);

  const changeAlertDurationMs = (item) => Math.max(0, clampNum(item?.blink_on_change_seconds, 3) * 1000);

  const shouldAutoRearm = (item, resolved, acked) =>
    !!acked && String(item?.ack_rearm || "manual").toLowerCase() === "auto" &&
    !!resolved?.available && !resolved?.alert?.mainConditionMatched;

  class AckManager {
    constructor(panelId, map) {
      this.panelId = String(panelId || "annunciator_panel");
      this.map = map || {};
      this.dirty = false;
    }
    keys(item) {
      const uid = lampRuntimeId(item);
      const ent = String(item?.entity || "");
      return {
        main: `${this.panelId}::${uid || ent}`,
        change: `${this.panelId}::${uid || ent}::chg`,
        legacyMain: `${this.panelId}::${ent}`,
        legacyChange: `${this.panelId}::${ent}::chg`,
      };
    }
    _read(item, kind = "main") {
      const k = this.keys(item);
      const key = kind === "change" ? k.change : k.main;
      const legacy = kind === "change" ? k.legacyChange : k.legacyMain;
      if (Object.prototype.hasOwnProperty.call(this.map, key)) return this.map[key];
      if (legacy !== key && Object.prototype.hasOwnProperty.call(this.map, legacy)) return this.map[legacy];
      return false;
    }
    isAcked(item, kind = "main") { return Boolean(this._read(item, kind)); }
    timestamp(item, kind = "main") { const v = this._read(item, kind); return typeof v === "number" ? v : null; }
    acknowledge(item, kind = "main", timestamp = Date.now()) {
      const k = this.keys(item);
      this.map[kind === "change" ? k.change : k.main] = timestamp;
      this.dirty = true;
    }
    clear(item, kind = "main") {
      const k = this.keys(item);
      // Explicit false prevents a migrated UID key from falling back to a legacy entity key.
      this.map[kind === "change" ? k.change : k.main] = false;
      this.dirty = true;
    }
    toggle(item, kind = "main") { this.isAcked(item, kind) ? this.clear(item, kind) : this.acknowledge(item, kind); }
    migrate(item) {
      const k = this.keys(item);
      if (k.main !== k.legacyMain && !Object.prototype.hasOwnProperty.call(this.map, k.main) && Object.prototype.hasOwnProperty.call(this.map, k.legacyMain)) {
        this.map[k.main] = this.map[k.legacyMain]; this.dirty = true;
      }
      if (k.change !== k.legacyChange && !Object.prototype.hasOwnProperty.call(this.map, k.change) && Object.prototype.hasOwnProperty.call(this.map, k.legacyChange)) {
        this.map[k.change] = this.map[k.legacyChange]; this.dirty = true;
      }
    }
  }

  // ============================================================
  // Card (runtime)
  // ============================================================
  class AnnunciatorGridCard extends HTMLElement {
    static getConfigElement() {
      return document.createElement("annunciator-grid-card-editor");
    }

    static getStubConfig() {
      return {
        type: "custom:annunciator-grid-card",
        config_version: CONFIG_VERSION,
        title: "",
        show_reset_ack: true,
        reset_ack_label: "",
        reset_ack_action: "clear",
        panel_id: "annunciator_panel",
        columns: 7,
        rows: 3,
        cell_width: 225,
        cell_height: 160,
        cell_gap: 0,
        mullion: 6,
        outer_frame: 6,
        cell_padding: 10,
        row_mode: "auto",
        panel_sizing: "auto_fit",
        corner_style: "rounded",
        corner_radius: 12,
        font_size: 13,
        font_weight: "700",
        line_height: 1.15,
        unavailable_text: "INOP",
        ack_store: { type: "local" },
        lamp_test_entity: "",
        lamp_test_mode: "steady",
        next_ack_slot: 1,
        default_lamp_style: "modern",
        allow_lamp_style_override: true,
        default_lens_type: "plastic",
        allow_lens_override: true,
        severity_appearance: {},
        panel_theme: "classic",
        imperfections: true,
        flicker: false,
        pair_ack_lock: false,
        retro_warmup: true,
        severity_colors: {
          enabled: true,
          trip: "#ff3a2f",
          alarm: "#ffb000",
          warn: "#ffd24a",
          status: "#8bd66a",
          frame: "#111111",
          panel: "#2a2a2a",
          text: "#1c1c1c",
          /* Optional global text presets */
          on_text: "rgba(0,0,0,0.85)",
          on_window: "",

          off_text: "#1c1c1c",
          unavailable_text: "#1c1c1c",
          unavailable: "#bdbdbd",
          blank: "#111111",
          off: "#f2f2f2",
        },
        entities: [],
      };
    }

    setConfig(config) {
      if (!config) throw new Error("Invalid configuration");
      const previousConfig = this._config || null;
      config = migrateConfigV2(config);

      // runtime caches
      this._lastSeen = this._lastSeen || {};
      this._blinkTimers = this._blinkTimers || {};
      this._changeActive = this._changeActive || {};
      this._changeLastTs = this._changeLastTs || {};
      this._ackShadow = this._ackShadow || null;
      const previousAckNamespace = previousConfig
        ? `${previousConfig.panel_id || "annunciator_panel"}::${previousConfig.ack_store?.type || "local"}::${previousConfig.ack_store?.entity || ""}`
        : "";

      const defaultSeverityColors = {
        enabled: true,
        trip: "#ff3a2f",
        alarm: "#ffb000",
        warn: "#ffd24a",
        status: "#8bd66a",
        off: "#f2f2f2",
        text: "#1c1c1c",
        // Optional global text presets (can be overridden per-lamp)
        on_text: "rgba(0,0,0,0.85)",
        off_text: "#1c1c1c",
        unavailable_text: "#1c1c1c",
        unavailable: "#bdbdbd",
        blank: "#111111",
        frame: "#111111",
        panel: "#2a2a2a",
      };

      const incomingSeverity = config.severity_colors || config.colors || {};
      const severity_colors = { ...defaultSeverityColors, ...incomingSeverity };
      if (severity_colors.enabled === undefined) severity_colors.enabled = true;

      // Runtime validates but never invents ephemeral identity. The visual editor persists UID/ACK-slot repairs.
      const validation = validateAndRepairConfig({ ...config, entities: normalizeEntities(config.entities) }, false);
      const entities = validation.config.entities;
      this._validationIssues = validation.issues;
      this._validationRepairs = validation.repairs;

      this._config = {
        config_version: CONFIG_VERSION,
        title: "",
        show_reset_ack: true,
        reset_ack_label: "",
        reset_ack_action: "clear",
        panel_id: "annunciator_panel",
        columns: 7,
        rows: 3,
        cell_width: 225,
        cell_height: 160,
        cell_gap: 0,
        mullion: 6,
        outer_frame: 6,
        cell_padding: 10,
        row_mode: "auto",
        panel_sizing: "auto_fit",
        corner_style: "rounded",
        corner_radius: 12,
        font_size: 13,
        font_weight: "700",
        line_height: 1.15,
        unavailable_text: "INOP",
        lamp_test_entity: null,
        lamp_test_mode: "steady",
        next_ack_slot: 1,
        default_lamp_style: "modern",
        allow_lamp_style_override: true,
        default_lens_type: "plastic",
        allow_lens_override: true,
        severity_appearance: {},
        panel_theme: "classic",
        imperfections: true,
        flicker: false,
        pair_ack_lock: false,
        retro_warmup: true,
        ack_store: { type: "local" },
        severity_colors,
        entities,
        ...config,
        entities,
        severity_colors,
      };

      const nextAckNamespace = `${this._config.panel_id || "annunciator_panel"}::${this._config.ack_store?.type || "local"}::${this._config.ack_store?.entity || ""}`;
      if (previousAckNamespace && previousAckNamespace !== nextAckNamespace) this._ackShadow = null;
      this._ensureLampUids();
      this._reconcileRuntimeState(previousConfig);
      this._clearTransientChangeStateForConfig();
      this._ensureRoot();
      this._renderStatic();
      if (this._hass) this._renderDynamic();
    }

    _ensureLampUids() {
      if (!this._config) return;
      const ents = Array.isArray(this._config.entities) ? this._config.entities : [];
      // Never invent an ephemeral runtime UID. Older configs without uid continue
      // to use their entity id as the ACK identity until the visual editor assigns
      // and persists a real uid. Legacy lamp_uid is promoted when present.
      this._config.entities = ents.map((raw) => {
        if (!raw || typeof raw !== "object") return raw;
        if (!raw.uid && raw.lamp_uid) return { ...raw, uid: String(raw.lamp_uid) };
        return raw;
      });
    }


    _reconcileRuntimeState(previousConfig) {
      if (!previousConfig) return;
      const prev = new Map((Array.isArray(previousConfig.entities)?previousConfig.entities:[]).map((raw)=>{const l=normalizeLamp(raw||{});return [lampRuntimeId(l),l]}));
      (Array.isArray(this._config?.entities)?this._config.entities:[]).forEach((raw)=>{
        const item=normalizeLamp(raw||{}),rid=lampRuntimeId(item),old=prev.get(rid);if(!rid||!old)return;
        if(String(old.entity||"")!==String(item.entity||"")){
          if(this._blinkTimers?.[rid])clearTimeout(this._blinkTimers[rid]);
          if(this._blinkTimers)delete this._blinkTimers[rid];
          if(this._changeActive)delete this._changeActive[rid];
          if(this._lastSeen)delete this._lastSeen[rid];
          if(this._changeLastTs)delete this._changeLastTs[rid];
        }
      });
    }

    _clearTransientChangeStateForConfig() {
      const activeIds = new Set();
      (Array.isArray(this._config?.entities) ? this._config.entities : []).forEach((raw) => {
        const item = normalizeLamp(raw || {});
        const rid = lampRuntimeId(item);
        if (rid) activeIds.add(rid);
        if (!item.blink_on_change && rid) {
          if (this._blinkTimers?.[rid]) clearTimeout(this._blinkTimers[rid]);
          if (this._blinkTimers) delete this._blinkTimers[rid];
          if (this._changeActive) this._changeActive[rid] = false;
        }
      });
      Object.keys(this._blinkTimers || {}).forEach((rid) => {
        if (!activeIds.has(rid)) { clearTimeout(this._blinkTimers[rid]); delete this._blinkTimers[rid]; }
      });
      Object.keys(this._changeActive || {}).forEach((rid) => { if (!activeIds.has(rid)) delete this._changeActive[rid]; });
      Object.keys(this._lastSeen || {}).forEach((rid) => { if (!activeIds.has(rid)) delete this._lastSeen[rid]; });
    }

    _runtimeDependencies() {
      const deps = new Set();
      (Array.isArray(this._config?.entities) ? this._config.entities : []).forEach((raw) => { const e=String(raw?.entity||"").trim(); if(e) deps.add(e); });
      const lampTest = String(this._config?.lamp_test_entity || "").trim(); if (lampTest) deps.add(lampTest);
      const toggle = String(this._config?.header_toggle_entity || "").trim(); if (toggle) deps.add(toggle);
      const ackEnt = this._config?.ack_store?.type === "input_text" ? String(this._config?.ack_store?.entity || "").trim() : ""; if (ackEnt) deps.add(ackEnt);
      return deps;
    }

    set hass(hass) {
      const prev = this._hass;
      this._hass = hass;
      if (!this._config) return;
      if (!prev) { this._renderDynamic(); return; }
      const deps = this._runtimeDependencies();
      const changed = new Set();
      deps.forEach((id) => { if (prev?.states?.[id] !== hass?.states?.[id]) changed.add(id); });
      if (!changed.size) return;
      const lampTest = String(this._config.lamp_test_entity || "").trim();
      const ackEnt = this._config?.ack_store?.type === "input_text" ? String(this._config?.ack_store?.entity || "").trim() : "";
      const toggle = String(this._config.header_toggle_entity || "").trim();
      if (ackEnt && changed.has(ackEnt) && this._ackShadow) {
        const remoteText = String(hass?.states?.[ackEnt]?.state || "");
        const previousText = String(prev?.states?.[ackEnt]?.state || "");
        if (remoteText === this._ackShadow.encoded || remoteText !== previousText) this._ackShadow = null;
      }
      if ((lampTest && changed.has(lampTest)) || (ackEnt && changed.has(ackEnt))) { this._renderDynamic(); return; }
      if (toggle && changed.has(toggle)) { this._applyHeader(); changed.delete(toggle); }
      if (changed.size) this._renderDynamic(changed);
    }

    disconnectedCallback() {
      if (this._panelResizeObserver) { try { this._panelResizeObserver.disconnect(); } catch (_) {} this._panelResizeObserver = null; }
      Object.values(this._blinkTimers || {}).forEach((timer) => { if (timer) clearTimeout(timer); });
      this._blinkTimers = {};
    }

    getCardSize() {
      const live = this.getBoundingClientRect?.().height || 0;
      if (live > 0) return Math.max(1, Math.ceil(live / 50));
      return Math.max(1, Math.ceil(computePanelMetrics(this._config || {}).heightPx / 50));
    }

    getGridOptions() {
      const live = this.getBoundingClientRect?.().height || 0;
      const px = live > 0 ? live : computePanelMetrics(this._config || {}).heightPx;
      // HA Sections uses 56px grid rows with an 8px gap: one extra 8px in the
      // numerator maps the continuous card height to those 64px row increments.
      const rows = Math.max(2, Math.ceil((px + 8) / 64));
      return { rows, columns: 12, min_rows: 2, min_columns: 3 };
    }

_resolveLampStyle(item, severity) {
  const cfg = this._config || {};
  const raw = String(item?.lamp_style || "inherit").toLowerCase();
  if (cfg.allow_lamp_style_override !== false && (raw === "modern" || raw === "retro")) return raw;

  // Inherit: allow severity-based appearance mapping
  const sev = String(severity || item?.severity || "status").toLowerCase();
  const map = (cfg && typeof cfg.severity_appearance === "object") ? cfg.severity_appearance : {};
  const sevCfg = (map && typeof map[sev] === "object") ? map[sev] : null;
  const fromSev = sevCfg && typeof sevCfg.style === "string" ? String(sevCfg.style).toLowerCase() : "";
  if (fromSev === "modern" || fromSev === "retro") return fromSev;

  return String(cfg.default_lamp_style || "modern").toLowerCase() === "retro" ? "retro" : "modern";
}

_resolveLensType(item, severity) {
  const cfg = this._config || {};
  const raw = String(item?.lens_type || "inherit").toLowerCase();
  if (cfg.allow_lens_override !== false && (raw === "plastic" || raw === "glass" || raw === "frosted" || raw === "smoked")) return raw;

  const sev = String(severity || item?.severity || "status").toLowerCase();
  const map = (cfg && typeof cfg.severity_appearance === "object") ? cfg.severity_appearance : {};
  const sevCfg = (map && typeof map[sev] === "object") ? map[sev] : null;
  const fromSev = sevCfg && typeof sevCfg.lens === "string" ? String(sevCfg.lens).toLowerCase() : "";
  if (fromSev === "plastic" || fromSev === "glass" || fromSev === "frosted" || fromSev === "smoked") return fromSev;

  const def = String(cfg.default_lens_type || "plastic").toLowerCase();
  return (def === "glass" || def === "frosted" || def === "smoked") ? def : "plastic";
}

_hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

_applyImperfections(el, item) {
  const cfg = this._config || {};
  if (cfg.imperfections === false) return;
  const key = String(item?.entity || item?.label || "") + "|" + String(item?.pair_id || "") + "|" + String(item?.pair_mode || "");
  if (!key.trim()) return;

  const h = this._hashStr(key);
  // Stable per-lamp offsets and intensity
  const ox = ((h & 0xff) / 255) * 18 - 9;          // -9..+9 %
  const oy = (((h >> 8) & 0xff) / 255) * 18 - 9;   // -9..+9 %
  const grain = 0.45 + (((h >> 16) & 0xff) / 255) * 0.35; // 0.45..0.80
  const glare = 0.14 + (((h >> 24) & 0xff) / 255) * 0.18; // 0.14..0.32
  try {
    el.style.setProperty("--hotspot-x", (35 + ox).toFixed(1) + "%");
    el.style.setProperty("--hotspot-y", (28 + oy).toFixed(1) + "%");
    el.style.setProperty("--lens-grain", grain.toFixed(3));
    el.style.setProperty("--lens-glare", glare.toFixed(3));
  } catch(e) {}
}



    _ensureRoot() {
      if (this.shadowRoot) return;
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
        <style>
          :host { display:block; }
          /* The annunciator draws its own frame. Keep the HA card wrapper transparent
             so stretched dashboard containers do not leave a dark rectangular slab
             beside/below a compact physical panel. */
          ha-card { border-radius: 0px; overflow: hidden; background: transparent !important; box-shadow: none !important; border: 0 !important; }
          .panelViewport{width:100%;min-width:0;overflow:hidden;background:transparent;}
          .panelScale{width:max-content;transform-origin:top left;will-change:transform;}
          .panelViewport.mode-scroll{overflow-x:auto;overflow-y:hidden;}
          .panelViewport.mode-fixed{overflow:hidden;}

          .header {
            display:flex;
            align-items:center;
            justify-content: space-between;
            gap: 12px;
            padding: 10px 12px 6px 12px;
            box-sizing:border-box;
            max-width:100%;
            transition: width 100ms ease-out;
          }
          .title {
            font-size: 16px;
            font-weight: 900;
            letter-spacing: 0.02em;
            opacity: 0.95;
            min-width:0;
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
          }
          .headerRight {
            display:flex;
            align-items:center;
            gap: 10px;
          }
          .headerToggle {
            display:flex;
            gap: 10px;
            align-items:center;
            opacity: 0.95;
          }
          .headerToggleLabel { font-size: 12px; opacity: 0.85; }

          .headerBtn {
            padding: 6px 10px;
            border-radius: 8px;
            border: 1px solid rgba(255,255,255,0.18);
            background: rgba(255,255,255,0.06);
            color: var(--primary-text-color, #fff);
            cursor: pointer;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.02em;
          }

          .panel {
            padding: 0;
            background: var(--annun-panel, #2a2a2a);
            border: 2px solid #0b0b0b;
            box-shadow:
              inset 0 0 0 1px rgba(255,255,255,0.06),
              0 10px 30px rgba(0,0,0,0.45);
          }

          .grid {
            display: grid;
            gap: 0px;
            background: var(--annun-frame, #111);
            padding: var(--annun-outer, 6px);
          }

          .cell {
            position: relative;
            background: var(--annun-frame, #111);
            padding: var(--annun-mullion, 6px);
            border-radius: var(--annun-radius, 12px);
            overflow: hidden;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
            box-sizing: border-box;
          }

          .window {
            position: absolute;
            inset: var(--annun-mullion, 6px);
            border-radius: var(--annun-radius, 12px);
            overflow: hidden;
            background: var(--annun-off, #f2f2f2);
            border: 2px solid rgba(0,0,0,0.55);
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.55),
              inset 0 -2px 8px rgba(0,0,0,0.25);
          }

          .window::after {
            content:"";
            position:absolute;
            inset: 0;
            background: radial-gradient(circle at 30% 25%, rgba(255,255,255,0.35), transparent 60%);
            opacity: 0.75;
            pointer-events:none;
          }

          
          /* Paired halves need the same ON/UNAVAILABLE window styling as normal cells */
          .pairHalf.on .window {
            background: currentColor;
            border-color: rgba(0,0,0,0.45);
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.25),
              inset 0 -6px 14px rgba(0,0,0,0.25);
          }
          .pairHalf.unavailable .window { background: var(--annun-unavailable, #bdbdbd); }

          .text {
            position: absolute;
            inset: var(--annun-mullion, 6px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--annun-cell-pad, 10px);

            font-family: "Roboto Condensed", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            text-align: center;
            line-height: var(--annun-line-height, 1.15);
            font-weight: var(--annun-weight, 700);
            font-size: var(--annun-font, 13px);
            /* Text color is controlled via CSS vars so per-lamp overrides can apply in all states */
            color: var(--lamp-text, var(--annun-text, #1c1c1c));
            pointer-events: none;
          }

          /* State-specific text colors (per-lamp overrides win via vars set at runtime) */
          .cell.on .text { color: var(--lamp-on-text, var(--lamp-text, rgba(0,0,0,0.85))); }
          .cell.unavailable .text { color: var(--lamp-unavailable-text, var(--lamp-text, var(--annun-text, #1c1c1c))); }
          .primaryLine { margin-bottom: 6px; font-weight: inherit; letter-spacing: 0.08em; }
          .secondaryLine { margin-top: 2px; font-weight: inherit; opacity: 0.92; letter-spacing: 0.05em; }
          .tertiaryLine { margin-top: 2px; font-weight: inherit; opacity: 0.82; letter-spacing: 0.04em; font-size: calc(var(--annun-font, 13px) * 0.92); }
          
          /* Paired lamps (stacked) */
          .cell.paired { padding: var(--annun-mullion, 6px); border-radius: var(--annun-radius, 12px); }
          .pairWrap{ position:relative; display:flex; flex-direction:column; width:100%; height:100%; border-radius: var(--annun-radius, 12px); overflow:hidden; }
          .pairHalf{ position:relative; flex:1 1 0; display:flex; align-items:stretch; justify-content:center; overflow:hidden; }
          .pairHalf .window{ position:absolute; inset:0; }
          .pairHalf .text{ position:relative; width:100%; padding: var(--annun-cell-pad, 10px); display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; }
          .pairDivider{ height:2px; background:#0b0b0b; width:100%; flex:0 0 auto; }
          .pairHalf.top{ border-top-left-radius: var(--annun-radius, 12px); border-top-right-radius: var(--annun-radius, 12px); }
          .pairHalf.bottom{ border-bottom-left-radius: var(--annun-radius, 12px); border-bottom-right-radius: var(--annun-radius, 12px); }

          .inopLine { font-weight: 900; letter-spacing: 0.18em; opacity: 0.9; }

          @keyframes blinkVar { 0%,49% { filter: brightness(1.0); } 50%,100% { filter: brightness(var(--attn-dim,0.55)); } }
          @keyframes pulseVar { 0% { filter: brightness(0.95); } 50% { filter: brightness(var(--attn-boost,1.25)) drop-shadow(0 0 6px currentColor); } 100% { filter: brightness(0.95); } }
.cell.blink .window { animation: blinkVar var(--attn-blink-dur, 1s) steps(2, end) infinite; }
          .cell.pulse .window { animation: pulseVar var(--attn-pulse-dur, 1.2s) ease-in-out infinite; }
          /* Paired halves should animate like normal cells (alerts/blink/change) */
          .pairHalf.blink .window { animation: blinkVar var(--attn-blink-dur, 1s) steps(2, end) infinite; }
          .pairHalf.pulse .window { animation: pulseVar var(--attn-pulse-dur, 1.2s) ease-in-out infinite; }
          .pairHalf.wave .window { animation: waveVar var(--attn-wave-dur, 1.4s) ease-in-out infinite; }
          .pairHalf.throb .window { animation: throbVar var(--attn-throb-dur, 1.6s) ease-in-out infinite; }
          .pairHalf.heartbeat .window { animation: heartbeatVar var(--attn-heartbeat-dur, 1.8s) ease-in-out infinite; }
          .pairHalf.flash .window { animation: flash1hz var(--attn-flash-dur, 2.2s) ease-in-out infinite; }
          .pairHalf.acked.on .window { filter: brightness(0.75); }

          .cell.blinkchg .window { /* change-attn marker; style is applied via chosen alert class */ }

          @keyframes waveVar { 0% { filter: brightness(0.95); box-shadow: 0 0 0 0 rgba(255,255,255,0.0); } 50% { filter: brightness(var(--attn-boost-soft,1.20)); box-shadow: 0 0 0 var(--attn-wave-radius,10px) rgba(255,255,255,0.12); } 100% { filter: brightness(0.95); box-shadow: 0 0 0 0 rgba(255,255,255,0.0); } }
          @keyframes throbVar { 0% { filter: brightness(var(--attn-throb-min,0.92)); } 50% { filter: brightness(var(--attn-throb-max,1.08)); } 100% { filter: brightness(var(--attn-throb-min,0.92)); } }
          @keyframes heartbeatVar { 0% { filter: brightness(0.95); } 10% { filter: brightness(var(--attn-boost,1.22)) drop-shadow(0 0 6px currentColor); } 20% { filter: brightness(0.98); } 35% { filter: brightness(var(--attn-boost-soft,1.18)) drop-shadow(0 0 5px currentColor); } 50% { filter: brightness(0.96); } 100% { filter: brightness(0.95); } }
          @keyframes flash1hz { 0%,85% { filter: brightness(0.98); } 86%,92% { filter: brightness(var(--attn-boost,1.35)) drop-shadow(0 0 7px currentColor); } 93%,100% { filter: brightness(0.98); } }
          .cell.wave .window { animation: waveVar var(--attn-wave-dur, 1.4s) ease-in-out infinite; }
          .cell.throb .window { animation: throbVar var(--attn-throb-dur, 1.6s) ease-in-out infinite; }
          .cell.heartbeat .window { animation: heartbeatVar var(--attn-heartbeat-dur, 1.8s) ease-in-out infinite; }
          .cell.flash .window { animation: flash1hz var(--attn-flash-dur, 1.2s) ease-in-out infinite; }
          .cell.attn_border_none .window,.pairHalf.attn_border_none .window{outline:none;}
          .cell:is(.blink,.pulse,.wave,.throb,.heartbeat,.flash).attn_border_soft .window,
          .pairHalf:is(.blink,.pulse,.wave,.throb,.heartbeat,.flash).attn_border_soft .window{outline:1px solid color-mix(in srgb,currentColor 48%,transparent);outline-offset:-2px;}
          .cell:is(.blink,.pulse,.wave,.throb,.heartbeat,.flash).attn_border_strong .window,
          .pairHalf:is(.blink,.pulse,.wave,.throb,.heartbeat,.flash).attn_border_strong .window{outline:2px solid color-mix(in srgb,currentColor 78%,white 12%);outline-offset:-3px;}

          .cell.acked.on .window { filter: brightness(0.75); }

          .clickable { cursor: pointer; }
          .clickable:focus-visible,.infoIcon:focus-visible,.headerBtn:focus-visible{outline:3px solid var(--primary-color,#03a9f4);outline-offset:2px;}
          :host([presentation]) .clickable { cursor: default; }
          @media (prefers-reduced-motion: reduce){
            .cell .window,.pairHalf .window,#grid.flicker .window::before{animation:none !important;transition:none !important;}
          }
        
        .groupHeader{
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(0,0,0,0.35);
          border-radius: 8px;
          padding: 4px 8px;
          box-sizing: border-box;
        }
        .groupHeaderInner{
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:10px;
        }
        .groupTitle{
          font-weight:700;
          letter-spacing:0.5px;
          text-transform:uppercase;
          font-size: 12px;
          opacity:0.9;
        }
        .groupBtns button{
          margin-left:6px;
          padding:4px 8px;
          font-size:11px;
          border-radius:6px;
          border:1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.06);
          color: currentColor;
          cursor:pointer;
        }
        .groupBtns button:hover{
  background: rgba(255,255,255,0.12);
}
.groupBtns.icons{
  display:flex;
  align-items:center;
  gap:6px;
}
.groupBtns.icons ha-icon-button{
  --mdc-icon-size: 18px;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.06);
}
.groupBtns.icons ha-icon-button:hover{
  background: rgba(255,255,255,0.12);
}

          details.reorderPicked > summary { outline: 2px solid var(--primary-color); outline-offset: 2px; }
          details.reorderMode > summary { cursor: pointer; }

          .infoIcon {
            position: absolute;
            border:0;
            background:transparent;
            color:inherit;
            padding:0;
            min-width:18px;
            min-height:18px;
            top: 4px;
            right: 6px;
            font-size: 12px;
            line-height: 12px;
            opacity: 0.85;
            cursor: pointer;
            user-select: none;
          }
          :host([presentation]) .infoIcon { cursor: default; }
          .infoIcon:hover { opacity: 1; }

          .histOverlay {
            position: fixed;
            inset: 0;
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 10000;
          }
          .histOverlay.open { display: flex; }
          .histBackdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.6); }
          .histCard {
            position: relative;
            width: min(520px, calc(100vw - 28px));
            max-height: min(70vh, 520px);
            overflow: auto;
            border-radius: 14px;
            border: 1px solid rgba(255,255,255,0.18);
            background: rgba(20,20,20,0.96);
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            padding: 14px 14px 10px;
          }
          .histTitle { font-weight: 700; margin: 0 0 6px 0; font-size: 16px; }
          .histRow { display:flex; justify-content:space-between; gap:12px; padding:6px 0; border-top:1px solid rgba(255,255,255,0.08); font-size:13px; }
          .histRow:first-of-type { border-top:none; }
          .histKey { opacity: 0.75; }
          .histVal { text-align:right; word-break: break-word; }
          .histActions { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:6px; margin-top:10px; }
          .histBtn { border:1px solid rgba(255,255,255,0.22); background:rgba(255,255,255,0.06); padding:8px 10px; border-radius:10px; cursor:pointer; }



/* === Lamp style: Retro (incandescent) ===
   NOTE: No filter overrides here so alert animations (blink/pulse/wave/etc) behave identically to Modern.
   Uses currentColor for ON (so severity + per-lamp ON overrides work),
   and CSS vars for OFF/UNAVAILABLE (so per-lamp overrides work).
*/
.cell.retro.on .window,
.pairHalf.retro.on .window {
  background: radial-gradient(circle at 50% 50%,
              /* bright bulb core (same hue) */
              color-mix(in srgb, currentColor 82%, white 18%) 0%,
              /* mid body */
              currentColor 52%,
              /* gentle edge darkening */
              color-mix(in srgb, currentColor 70%, black 30%) 100%) !important;
border-color: rgba(0,0,0,0.45);
  box-shadow:
    inset 0 2px 6px rgba(255,255,255,0.22),
    inset 0 -12px 22px rgba(0,0,0,0.30),
    0 0 10px rgba(255,255,255,0.10) !important;
}
.cell.retro.on .window::before,
.pairHalf.retro.on .window::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at 50% 50%,
              color-mix(in srgb, currentColor 65%, white 35%) 0%,
              rgba(0,0,0,0) 60%);
opacity: 0.95;
  mix-blend-mode: screen;
}
.cell.retro .window::after,
.pairHalf.retro .window::after {
  background:
              /* subtle center lens sheen (tinted) */
              radial-gradient(circle at 50% 50%,
                color-mix(in srgb, currentColor 20%, white 80%) 0%,
                rgba(0,0,0,0) 58%),
              /* very subtle striations */
              repeating-linear-gradient(
                135deg,
                rgba(255, 240, 220, 0.020) 0px,
                rgba(255, 240, 220, 0.020) 2px,
                rgba(0, 0, 0, 0.000) 4px,
                rgba(0, 0, 0, 0.000) 7px
              );
opacity: calc(0.45 + (var(--lens-grain, 0.60) * 0.35));
}
.cell.retro.off .window,
.pairHalf.retro.off .window {
  background: radial-gradient(circle at 35% 30%,
    rgba(255, 244, 232, 0.22),
    var(--lamp-off, var(--annun-off, #f2f2f2)) 70%) !important;
}
.cell.retro.unavailable .window,
.pairHalf.retro.unavailable .window {
  background: var(--lamp-unavailable, var(--annun-unavailable, #bdbdbd)) !important;
}


/* Retro warm-up / cool-down (incandescent feel). Disabled by setting retro_warmup: false */
#grid.retroWarm .cell.retro .window,
#grid.retroWarm .pairHalf.retro .window {
  transition:
    background 160ms ease-out,
    box-shadow 160ms ease-out;
}


/* === Lens types (applies to both Modern and Retro) === */
/* Specular highlight (no big grey circle). Defaults are subtle and overridden by lens types. */
.cell .window::after,
.pairHalf .window::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: var(--lens-glare, 0.18);
  /* two angled streaks + a tiny corner glint */
  background:
    linear-gradient(135deg,
      rgba(255,255,255,0.00) 0%,
      rgba(255,255,255,0.10) 18%,
      rgba(255,255,255,0.00) 32%,
      rgba(255,255,255,0.00) 58%,
      rgba(255,255,255,0.06) 70%,
      rgba(255,255,255,0.00) 84%,
      rgba(255,255,255,0.00) 100%),
    radial-gradient(circle at 18% 16%,
      rgba(255,255,255,0.20) 0%,
      rgba(255,255,255,0.00) 42%);
}
/* Defaults */
.lens-plastic { --lens-glare: 0.14; }

/* Plastic: soft sheen */
.modern.lens-plastic .window::after { opacity: 0.16; }

/* Glass: crisper, brighter highlights */
.lens-glass { --lens-glare: 0.34; }
.modern.lens-glass .window::after { opacity: 0.38; }
.lens-glass .window {
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,0.08),
    inset 0 2px 10px rgba(255,255,255,0.22),
    inset 0 -12px 22px rgba(0,0,0,0.20);
}

/* Frosted: very diffused, almost no streaks */
.lens-frosted { --lens-glare: 0.08; }
.modern.lens-frosted .window::after {
  opacity: 0.10;
  background: radial-gradient(circle at 50% 45%, rgba(255,255,255,0.16), rgba(255,255,255,0.00) 72%);
}
.lens-frosted .window {
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,0.04),
    inset 0 1px 8px rgba(255,255,255,0.12),
    inset 0 -10px 18px rgba(0,0,0,0.18);
}

/* Smoked: darker lens overlay + restrained highlights */
.lens-smoked { --lens-glare: 0.10; }
.modern.lens-smoked .window::after { opacity: 0.12; }
.modern.lens-smoked .window::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.06));
  mix-blend-mode: multiply;
}
.lens-smoked .window {
  box-shadow:
    inset 0 0 0 999px rgba(0,0,0,0.12),
    inset 0 2px 10px rgba(255,255,255,0.10),
    inset 0 -14px 24px rgba(0,0,0,0.34);
}

.lens-smoked .window { box-shadow: inset 0 0 0 999px rgba(0,0,0,0.14), inset 0 2px 10px rgba(255,255,255,0.10), inset 0 -12px 18px rgba(0,0,0,0.30); }


/* === Panel themes === */
#grid.theme-classic { --panel-bg: #0f0f10; --panel-bezel: #1b1b1d; --panel-border: rgba(255,255,255,0.06); --panel-shadow: rgba(0,0,0,0.55); }
#grid.theme-avionics { --panel-bg: #0b0c0d; --panel-bezel: #121315; --panel-border: rgba(255,255,255,0.10); --panel-shadow: rgba(0,0,0,0.70); }
#grid.theme-neon { --panel-bg: #050607; --panel-bezel: #0b0c0d; --panel-border: rgba(255,255,255,0.10); --panel-shadow: rgba(0,0,0,0.85); }

/* Apply panel vars */
#grid {
  background: var(--annun-frame, var(--panel-bg, #0f0f10));
}
.cell {
  background: var(--panel-bezel, #1b1b1d);
  border: 1px solid var(--panel-border, rgba(255,255,255,0.06));
  box-shadow: 0 6px 18px var(--panel-shadow, rgba(0,0,0,0.55));
}

/* Theme-specific typography tweaks */
#grid.theme-avionics .text { letter-spacing: 0.6px; }
#grid.theme-neon .cell.on { box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 14px 34px rgba(0,0,0,0.80); }


@keyframes incFlicker {
  0% { opacity: 0.92; }
  18% { opacity: 0.98; }
  37% { opacity: 0.90; }
  56% { opacity: 1.00; }
  74% { opacity: 0.94; }
  100% { opacity: 0.97; }
}

/* Optional subtle flicker (panel config flicker: true) */
#grid.flicker .cell.retro.on .window::before,
#grid.flicker .pairHalf.retro.on .window::before {
  animation: incFlicker 2.2s ease-in-out infinite;
}


/* Retro lens tuning (keeps retro grain/bloom layers; avoids big streaks) */
.retro.lens-glass.on .window,
.retro.lens-glass.off .window {
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,0.10),
    inset 0 3px 10px rgba(255,255,255,0.18),
    inset 0 -14px 26px rgba(0,0,0,0.28),
    0 0 0 rgba(0,0,0,0);
}

.retro.lens-frosted .window::after {
  /* stronger diffusion in retro */
  opacity: 0.38 !important;
}

.retro.lens-smoked.on .window,
.retro.lens-smoked.off .window {
  box-shadow:
    inset 0 0 0 999px rgba(0,0,0,0.14),
    inset 0 3px 10px rgba(255,255,255,0.10),
    inset 0 -18px 32px rgba(0,0,0,0.38) !important;
}

</style>

        <ha-card>
          <div id="header" class="header" style="display:none;">
            <div id="title" class="title"></div>
            <div class="headerRight">
              <button id="resetAckBtn" class="headerBtn" style="display:none;"></button>
              <div id="headerToggle" class="headerToggle" style="display:none;">
                <div class="headerToggleLabel">Toggle</div>
                <ha-switch id="toggleSwitch"></ha-switch>
              </div>
            </div>
          </div>
          <div id="panelViewport" class="panelViewport">
            <div id="panelScale" class="panel panelScale">
              <div id="grid" class="grid"></div>
            </div>
          </div>
        </ha-card>
      `;
      if (typeof ResizeObserver !== "undefined") {
        this._panelResizeObserver = new ResizeObserver((entries) => {
          const width = entries?.[0]?.contentRect?.width || this.getBoundingClientRect?.().width || 0;
          if (Math.abs((this._lastPanelObservedWidth || 0) - width) < 0.5) return;
          this._lastPanelObservedWidth = width;
          this._applyResponsivePanel();
        });
        try { this._panelResizeObserver.observe(this); } catch (_) {}
      }
    }

    _applyResponsivePanel() {
      const viewport = this.shadowRoot?.getElementById("panelViewport");
      const panel = this.shadowRoot?.getElementById("panelScale");
      const header = this.shadowRoot?.getElementById("header");
      if (!viewport || !panel || !this._config) return;
      const mode = String(this._config.panel_sizing || "auto_fit").toLowerCase();
      viewport.classList.toggle("mode-scroll", mode === "scroll");
      viewport.classList.toggle("mode-fixed", mode === "fixed");
      panel.style.transform = "none";
      panel.style.width = "max-content";
      viewport.style.height = "";
      if (header) header.style.width = "";
      delete viewport.dataset.scale;
      const available = viewport.clientWidth || this.getBoundingClientRect?.().width || 0;
      const naturalRect = panel.getBoundingClientRect?.() || { width:0, height:0 };
      // scrollWidth/scrollHeight do not include borders. Use the larger measured
      // dimension so a tightly fitted panel cannot lose its last border pixels.
      const naturalWidth = Math.max(Number(panel.scrollWidth) || 0, Number(naturalRect.width) || 0);
      const naturalHeight = Math.max(Number(panel.scrollHeight) || 0, Number(naturalRect.height) || 0);
      const syncHeaderWidth = (visualWidth) => {
        if (!header || header.style.display === "none") return;
        const w = Math.max(0, Number(visualWidth) || 0);
        if (w) header.style.width = `${Math.min(w, available || w)}px`;
      };
      if (mode === "scroll") { viewport.style.overflowX = "auto"; syncHeaderWidth(available || naturalWidth); return; }
      viewport.style.overflowX = "hidden";
      if (mode === "fixed") { syncHeaderWidth(naturalWidth); return; }
      if (!available || !naturalWidth) {
        // A newly-connected custom card can be measured before Home Assistant has
        // assigned its final width. Retry once on the next frame; ResizeObserver
        // remains the long-term source of truth after layout settles.
        if (!this._responsiveRetryPending && this.isConnected) {
          this._responsiveRetryPending = true;
          requestAnimationFrame(() => { this._responsiveRetryPending = false; this._applyResponsivePanel(); });
        }
        return;
      }
      const scale = Math.min(1, available / naturalWidth);
      panel.style.transform = `scale(${scale})`;
      viewport.style.height = `${Math.ceil(naturalHeight * scale)}px`;
      viewport.dataset.scale = scale.toFixed(4);
      syncHeaderWidth(naturalWidth * scale);
    }

    _wireLampInteraction(el, lampItem, allowAck, allowMoreInfo) {
      const ent = String(lampItem?.entity || "").trim();
      if (!el || !ent) return;
      if (!allowAck && !allowMoreInfo) {
        el.classList.remove("clickable");
        el.removeAttribute("tabindex");
        el.removeAttribute("role");
        el.removeAttribute("aria-label");
        return;
      }
      if (el.dataset?.__wired === "1") return;
      if (el.dataset) { el.dataset.__wired = "1"; el.dataset.entity = ent; }
      el.classList.add("clickable");
      el.tabIndex = 0;
      el.setAttribute("role", "button");
      const label = String(lampItem?.name_override || this._hass?.states?.[ent]?.attributes?.friendly_name || ent);
      const actions = [allowMoreInfo ? "Enter for more info" : "", allowAck ? "Space or double-click to acknowledge" : ""].filter(Boolean).join("; ");
      el.setAttribute("aria-label", `${label}${actions ? `. ${actions}.` : "."}`);
      let clickTimer = null, pressTimer = null, startX = 0, startY = 0, pointerId = null, suppressClickUntil = 0;
      const cancelPress = () => { if (pressTimer) clearTimeout(pressTimer); pressTimer = null; pointerId = null; };
      el.addEventListener("click", (e) => {
        if (Date.now() < suppressClickUntil) { e.preventDefault(); e.stopPropagation(); return; }
        if (clickTimer) clearTimeout(clickTimer);
        clickTimer = setTimeout(() => { clickTimer = null; if (allowMoreInfo) this._showMoreInfo(ent); }, 250);
      });
      el.addEventListener("dblclick", (e) => {
        if (clickTimer) clearTimeout(clickTimer); clickTimer = null;
        e.preventDefault(); e.stopPropagation(); if (allowAck) this._toggleAck(lampItem);
      });
      el.addEventListener("pointerdown", (e) => {
        if (!allowAck || e.pointerType === "mouse") return;
        startX = e.clientX; startY = e.clientY; pointerId = e.pointerId;
        pressTimer = setTimeout(() => { pressTimer = null; suppressClickUntil = Date.now() + 650; this._toggleAck(lampItem); }, 550);
      });
      el.addEventListener("pointermove", (e) => {
        if (pointerId !== e.pointerId || !pressTimer) return;
        if (Math.hypot(e.clientX - startX, e.clientY - startY) > 12) cancelPress();
      });
      el.addEventListener("pointerup", cancelPress);
      el.addEventListener("pointercancel", cancelPress);
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); if (allowMoreInfo) this._showMoreInfo(ent); }
        if (e.key === " " || e.code === "Space") { e.preventDefault(); if (allowAck) this._toggleAck(lampItem); }
      });
    }

    _applyHeader() {
      const cfg = this._config;
      const headerEl = this.shadowRoot.getElementById("header");
      const titleEl = this.shadowRoot.getElementById("title");
      const toggleWrap = this.shadowRoot.getElementById("headerToggle");
      const sw = this.shadowRoot.getElementById("toggleSwitch");
      const resetBtn = this.shadowRoot.getElementById("resetAckBtn");

      const hasTitle = !!String(cfg.title || "").trim();
      const mode = panelMode(cfg);
      const wantsToggle = mode !== "presentation" && !!cfg.show_header_toggle && !!String(cfg.header_toggle_entity || "").trim();
      const wantsReset = mode !== "presentation" && cfg.show_reset_ack !== false;

      headerEl.style.display = hasTitle || wantsToggle || wantsReset ? "flex" : "none";
      titleEl.textContent = String(cfg.title || "");

      resetBtn.style.display = wantsReset ? "inline-flex" : "none";
      const action = String(cfg.reset_ack_action || "clear");
      const defaultLabel = action === "clear" ? "Clear ACK" : "ACK All";
      resetBtn.textContent = String(cfg.reset_ack_label || defaultLabel);
      resetBtn.setAttribute("aria-label", resetBtn.textContent);
      resetBtn.onclick = () => { if (panelMode(this._config) !== "presentation") this._resetAck(); };
toggleWrap.style.display = wantsToggle ? "flex" : "none";
      if (wantsToggle) {
        const s = this._hass?.states?.[cfg.header_toggle_entity]?.state;
        sw.checked = isTruthyState(s);
        sw.onchange = async () => {
          try {
            await this._hass.callService("homeassistant", "toggle", { entity_id: cfg.header_toggle_entity });
          } catch (e) {
            console.warn("Header toggle failed:", e);
          }
        };
      }
    }

    _applyCssVars() {
      const cfg = this._config;
      const colors = ensureObj(cfg.severity_colors, {});
      const enabled = colors.enabled !== false;

      const grid = this.shadowRoot.getElementById("grid");
      grid.style.setProperty("--annun-frame", enabled ? (colors.frame || "#111") : "#111");
      grid.style.setProperty("--annun-panel", enabled ? (colors.panel || "#2a2a2a") : "#2a2a2a");
      grid.style.setProperty("--annun-text", enabled ? (colors.text || "#1c1c1c") : "#1c1c1c");
      grid.style.setProperty("--annun-unavailable", enabled ? (colors.unavailable || "#bdbdbd") : "#bdbdbd");
      grid.style.setProperty("--annun-off", enabled ? (colors.off || "#f2f2f2") : "#f2f2f2");

      grid.style.setProperty("--annun-mullion", `${Math.max(0, Math.min(100, clampNum(cfg.mullion, 6)))}px`);
      grid.style.setProperty("--annun-outer", `${Math.max(0, Math.min(200, clampNum(cfg.outer_frame, 6)))}px`);
      grid.style.setProperty("--annun-cell-pad", `${Math.max(0, Math.min(200, clampNum(cfg.cell_padding, 10)))}px`);
      const radius = String(cfg.corner_style || "rounded").toLowerCase() === "sharp" ? 0 : Math.max(0, clampNum(cfg.corner_radius, 12));
      grid.style.setProperty("--annun-radius", `${radius}px`);
      grid.style.setProperty("--annun-font", `${Math.max(4, Math.min(200, clampNum(cfg.font_size, 13)))}px`);
      grid.style.setProperty("--annun-weight", String(cfg.font_weight || "700"));
      grid.style.setProperty("--annun-line-height", String(Math.max(0.5, Math.min(3, clampNum(cfg.line_height, 1.15)))));
    }

    _renderStatic() {
      const cfg = this._config;
      this.toggleAttribute("presentation", isPresentation(cfg));
      const grid = this.shadowRoot.getElementById("grid");
      this._applyCssVars();
      this._applyHeader();
      try {
        const g = this.shadowRoot.getElementById("grid");
        g?.classList.toggle("retroWarm", cfg.retro_warmup !== false);
        const th = String(cfg.panel_theme || "classic").toLowerCase();
        g?.classList.toggle("theme-classic", th === "classic");
        g?.classList.toggle("theme-avionics", th === "avionics");
        g?.classList.toggle("theme-neon", th === "neon");
        g?.classList.toggle("flicker", !!cfg.flicker);
      } catch(e) {}

      const __configuredColumns = Math.max(1, Math.min(100, Math.floor(clampNum(cfg.columns, 7))));
      const __columns = computeOccupiedColumns(cfg);
      const __cellW = Math.max(20, Math.min(2000, clampNum(cfg.cell_width, 225)));
      const __cellHNum = Math.max(20, Math.min(2000, clampNum(cfg.cell_height, 160)));
      const __gap = Math.max(0, Math.min(200, clampNum(cfg.cell_gap, 0)));
      const __rows = Math.max(0, Math.min(100, Math.floor(clampNum(cfg.rows, 0))));
      grid.style.gridTemplateColumns = `repeat(${__columns}, ${__cellW}px)`;
      grid.dataset.configuredColumns = String(__configuredColumns);
      grid.dataset.renderColumns = String(__columns);
      grid.style.gridAutoRows = `auto`;
      const __cellH = `${__cellHNum}px`;
      grid.style.gap = `${__gap}px`;
      // Rows is a minimum panel depth. Content may grow beyond it; reducing Rows
      // never hides configured lamps. This gives the old Rows control real, safe behavior.
      const __outer = Math.max(0, clampNum(cfg.outer_frame, 6));
      grid.style.minHeight = (String(cfg.row_mode || "auto") === "fixed" && __rows > 0) ? `${(__rows * __cellHNum) + (Math.max(0, __rows - 1) * __gap)}px` : "";
      grid.innerHTML = "";

      const base = Array.isArray(cfg.entities) ? cfg.entities : [];
      const derived = [];
      let lastGroup = "";
      const showGroups = !!cfg.show_group_headers;
      const gh = ensureObj(cfg.group_header, {});
      const ghShowBtns = gh.show_buttons !== false;
      const ghBg = (gh.background || "").trim();
      const ghFg = (gh.color || "").trim();
      const ghDivider = !!gh.divider;
      const ghBtnMode = String(gh.button_mode || "icons").toLowerCase(); // icons | text
      const ghShowAckAlerts = !!gh.show_ack_alerts_button;
      const normBase = base.map((it) => normalizeLamp(it || {}));
      const validPairIds = validPairIdsFor(normBase);
      // Pre-index only valid bottoms. Malformed pairs degrade to independent lamps
      // instead of disappearing or sharing one bottom across multiple TOP halves.
      const bottomByPairId = new Map();
      for (let i = 0; i < normBase.length; i++) {
        const l = normBase[i];
        const pid = String(l.pair_id || "").trim();
        if (validPairIds.has(pid) && String(l.pair_mode || "none") === "bottom") {
          bottomByPairId.set(pid, { idx: i, lamp: l });
        }
      }

      for (let idx = 0; idx < normBase.length; idx++) {
        const lamp = normBase[idx];
        const g = String(lamp.group || "").trim();
        // pairing (stacked lamps rendered as one cell)
        const pairMode = String(lamp.pair_mode || "none");
        const pairId = String(lamp.pair_id || "").trim();

        // Skip bottoms (they will be rendered by their top partner)
        if (pairMode === "bottom" && validPairIds.has(pairId)) continue;

        if (showGroups && g && g !== lastGroup) {
          derived.push({ __type: "group_header", group: g });
          lastGroup = g;
        } else if (!g) {
          lastGroup = "";
        }

        if (pairMode === "top" && pairId && validPairIds.has(pairId)) {
          // Prefer nearest following bottom if it exists, else use first bottom found
          let bottom = null;

          for (let j = idx + 1; j < normBase.length; j++) {
            const l2 = normBase[j];
            if (String(l2.pair_mode || "none") === "bottom" && String(l2.pair_id || "").trim() === pairId) {
              bottom = { idx: j, lamp: l2 };
              break;
            }
          }
          if (!bottom) bottom = bottomByPairId.get(pairId) || null;

          derived.push({ __type: "lamp_pair", top: { idx, lamp }, bottom });
        } else {
          derived.push({ __type: "lamp", idx, lamp });
        }
      }
      this._derived = derived;

      // Map entity_id -> paired partner entity_id (for optional linked ACK)
      this._pairByEntity = {};
      try {
        derived.forEach((w) => {
          if (w && w.__type === "lamp_pair" && w.top && w.bottom) {
            const te = String(w.top.lamp?.entity || "").trim();
            const be = String(w.bottom.lamp?.entity || "").trim();
            if (te && be) {
              this._pairByEntity[te] = be;
              this._pairByEntity[be] = te;
            }
          }
        });
      } catch(e) {}

      derived.forEach((wrap, dIdx) => {
        const cell = document.createElement("div");
        cell.className = "cell off";
        const item = wrap.__type === "lamp" ? wrap.lamp : null;
        const idx = wrap.__type === "lamp" ? wrap.idx : -1;

        // Group header rows (optional)
if (wrap.__type === "group_header") {
  cell.className = "groupHeader";
  cell.style.gridColumn = "1 / -1";
  if (ghBg) cell.style.background = ghBg;
  if (ghFg) cell.style.color = ghFg;
  if (ghDivider) cell.style.boxShadow = "inset 0 -1px 0 rgba(255,255,255,0.18)";

  const iconMode = ghBtnMode !== "text";
  const ackBtn = iconMode
    ? `<ha-icon-button class="gAck" title="ACK group" aria-label="ACK group"><ha-icon icon="mdi:check-circle-outline"></ha-icon></ha-icon-button>`
    : `<button class="gAck" title="ACK group">ACK</button>`;
  const ackAlertsBtn = iconMode
    ? `<ha-icon-button class="gAckAlerts" title="ACK alerting only" aria-label="ACK alerting only"><ha-icon icon="mdi:bell-check-outline"></ha-icon></ha-icon-button>`
    : `<button class="gAckAlerts" title="ACK alerting only">ACK Alerts</button>`;
  const clrBtn = iconMode
    ? `<ha-icon-button class="gClear" title="Clear ACK group" aria-label="Clear ACK group"><ha-icon icon="mdi:refresh"></ha-icon></ha-icon-button>`
    : `<button class="gClear" title="Clear ACK group">Clear</button>`;

  const btns = [
    ackBtn,
    (ghShowAckAlerts ? ackAlertsBtn : ""),
    clrBtn,
  ].filter(Boolean).join("");

  cell.innerHTML = `<div class="groupHeaderInner">
      <div class="groupTitle">${escapeHtml(wrap.group)}</div>
      <div class="groupBtns ${iconMode ? "icons" : "text"}">${btns}</div>
    </div>`;

  const btnWrap = cell.querySelector(".groupBtns");
  if (btnWrap && (!ghShowBtns || isPresentation(cfg))) btnWrap.style.display = "none";

  const ackEl = cell.querySelector(".gAck");
  const ackAlertsEl = cell.querySelector(".gAckAlerts");
  const clrEl = cell.querySelector(".gClear");
  if (ackEl) ackEl.addEventListener("click", (e) => { if (isPresentation(cfg)) return; e.preventDefault(); e.stopPropagation(); this._ackGroup(wrap.group, true); });
  if (ackAlertsEl) ackAlertsEl.addEventListener("click", (e) => { if (isPresentation(cfg)) return; e.preventDefault(); e.stopPropagation(); this._ackGroup(wrap.group, true, "alerting"); });
  if (clrEl) clrEl.addEventListener("click", (e) => { if (isPresentation(cfg)) return; e.preventDefault(); e.stopPropagation(); this._ackGroup(wrap.group, false); });

  grid.appendChild(cell);
  return;
}
        cell.dataset.index = String(dIdx);
        cell.style.height = __cellH;
        if (idx >= 0) cell.dataset.originalIndex = String(idx);

        if (wrap.__type === "lamp_pair") {
          cell.classList.add("paired");
          cell.innerHTML = `
            <div class="pairWrap">
              <div class="pairHalf top" data-half="top">
                <div class="window"></div>
                <div class="text">
                  <div class="primaryLine"></div>
                  <div class="secondaryLine"></div>
                  <div class="tertiaryLine"></div>
                  <div class="inopLine" hidden></div>
                </div>
              </div>
              <div class="pairDivider"></div>
              <div class="pairHalf bottom" data-half="bottom">
                <div class="window"></div>
                <div class="text">
                  <div class="primaryLine"></div>
                  <div class="secondaryLine"></div>
                  <div class="tertiaryLine"></div>
                  <div class="inopLine" hidden></div>
                </div>
              </div>
            </div>
          `;
          // Mark as clickable if either half has an entity
          const t = wrap.top && wrap.top.lamp;
          const b = wrap.bottom && wrap.bottom.lamp;
          if ((t && t.entity) || (b && b.entity)) cell.classList.add("clickable");
          const __modeP = panelMode(cfg);
          const __allowAckP = __modeP !== "presentation";
          const __allowMoreInfoP = __modeP !== "presentation" ? true : (cfg.presentation_allow_more_info !== false);
          const topHalfEl = cell.querySelector('.pairHalf[data-half="top"]');
          const botHalfEl = cell.querySelector('.pairHalf[data-half="bottom"]');
          if (t && t.entity) this._wireLampInteraction(topHalfEl, t, __allowAckP, __allowMoreInfoP);
          if (b && b.entity) this._wireLampInteraction(botHalfEl, b, __allowAckP, __allowMoreInfoP);

        } else {
          cell.innerHTML = `
            <div class="window"></div>
            <div class="text">
              <div class="primaryLine"></div>
              <div class="secondaryLine"></div>
              <div class="tertiaryLine"></div>
              <div class="inopLine" hidden></div>
            </div>
          `;
        }

        if (item && item.entity) {
          const __mode = panelMode(cfg);
          const __allowAck = __mode !== "presentation";
          const __allowMoreInfo = __mode !== "presentation" ? true : (cfg.presentation_allow_more_info !== false);
          this._wireLampInteraction(cell, item, __allowAck, __allowMoreInfo);
        }

        grid.appendChild(cell);
      });
      requestAnimationFrame(() => this._applyResponsivePanel());
    }

    async _renderDynamic(onlyEntities = null) {
      const cfg = this._config;
      const grid = this.shadowRoot.getElementById("grid");
      if (!grid) return;
      this._applyCssVars();
      this._applyHeader();

      const colors = ensureObj(cfg.severity_colors, {});
      const globalEnabled = colors.enabled !== false;
      const globalOffTextPreset = globalEnabled ? (colors.off_text || colors.text || "#1c1c1c") : "#1c1c1c";
      const globalOnTextPreset = globalEnabled ? (colors.on_text || "rgba(0,0,0,0.85)") : "rgba(0,0,0,0.85)";
      const globalUnavailableTextPreset = globalEnabled ? (colors.unavailable_text || colors.text || "#1c1c1c") : "#1c1c1c";
      const globalOnWindowPreset = globalEnabled ? String(colors.on_window || "").trim() : "";

      const ackMap = await this._getAckMap();
      const ack = new AckManager(cfg.panel_id, ackMap);
      const lampTest = cfg.lamp_test_entity ? this._isOn(cfg.lamp_test_entity) : false;
      const lampTestMode = String(cfg.lamp_test_mode || "steady").toLowerCase();
      const lampTestFull = lampTest && lampTestMode === "full";

      const updateLamp = (cell, rawItem) => {
        const item = normalizeLamp(rawItem || {});
        const primaryEl = cell.querySelector(".primaryLine");
        const secondaryEl = cell.querySelector(".secondaryLine");
        const tertiaryEl = cell.querySelector(".tertiaryLine");
        const inopEl = cell.querySelector(".inopLine");
        const textEl = cell.querySelector(".text");
        if (!primaryEl || !secondaryEl || !inopEl) return;

        if (!item.entity) {
          cell.className = cell.className.replace(/\b(on|blink|pulse|wave|throb|heartbeat|flash|unavailable|acked|blinkchg)\b/g, "");
          cell.classList.add("off");
          cell.style.background = globalEnabled ? (colors.blank || "#111111") : "#111111";
          cell.style.color = globalEnabled ? (colors.blank || "#111111") : "#111111";
          primaryEl.textContent = ""; secondaryEl.textContent = "";
          if (tertiaryEl) { tertiaryEl.textContent = ""; tertiaryEl.style.display = "none"; }
          inopEl.hidden = true;
          if (textEl) textEl.style.color = globalOffTextPreset;
          return;
        }

        ack.migrate(item);
        const stateObj = this._hass?.states?.[item.entity];
        const runtimeId = lampRuntimeId(item);

        // Change-event state machine. It owns only transient event state; all visual
        // resolution stays in evaluateLampState().
        let changed = false;
        let changeActive = !!this._changeActive?.[runtimeId];
        if (!item.blink_on_change) {
          if (this._blinkTimers?.[runtimeId]) clearTimeout(this._blinkTimers[runtimeId]);
          if (this._blinkTimers) delete this._blinkTimers[runtimeId];
          this._changeActive[runtimeId] = false;
          changeActive = false;
        }
        if (stateObj && stateObj.state !== "unknown" && stateObj.state !== "unavailable") {
          const rawState = stateObj.state;
          const transformed = applyValueTransform(toNumber(rawState), item.value_format);
          // Change alerts track the source entity state only. Editing scale/offset,
          // rounding, units or other card configuration must never create a fake alarm.
          const snapshot = String(rawState);
          const last = this._lastSeen?.[runtimeId];
          changed = last !== undefined && last !== snapshot;
          this._lastSeen[runtimeId] = snapshot;

          const trigger = shouldTriggerChangeAlert(item, rawState, transformed, changed);
          if (trigger) {
            this._changeLastTs[runtimeId] = Date.now();
            changeActive = true;
            this._changeActive[runtimeId] = true;
            ack.clear(item, "change");
            if (!item.blink_on_change_until_ack) {
              const ms = changeAlertDurationMs(item);
              if (this._blinkTimers[runtimeId]) clearTimeout(this._blinkTimers[runtimeId]);
              this._blinkTimers[runtimeId] = setTimeout(() => {
                this._changeActive[runtimeId] = false;
                this._blinkTimers[runtimeId] = null;
                this._renderDynamic(new Set([item.entity]));
              }, ms);
            }
          }
        }

        let mainAcked = ack.isAcked(item, "main");
        const changeAcked = ack.isAcked(item, "change");
        if (changeAcked) {
          this._changeActive[runtimeId] = false;
          changeActive = false;
        }

        let resolved = evaluateLampState(item, stateObj, {
          lampTest,
          acked: lampTestFull ? false : mainAcked,
          changeActive: lampTest ? false : changeActive,
          changeAcked,
          changed,
          suppressAlerts: lampTest && !lampTestFull,
          forceAlert: lampTestFull,
        });

        // Automatic rearm clears only after the alert condition has genuinely
        // returned to normal. Legacy lamps default to manual rearm.
        if (!lampTest && shouldAutoRearm(item, resolved, mainAcked)) {
          ack.clear(item, "main");
          mainAcked = false;
          resolved = evaluateLampState(item, stateObj, {
            lampTest, acked: false, changeActive: lampTest ? false : changeActive, changeAcked, changed,
            suppressAlerts: lampTest && !lampTestFull, forceAlert: lampTestFull,
          });
        }

        const useOverride = !!item.use_color_override;
        const eColors = ensureObj(item.colors, {});
        const lampUnavailableColor = useOverride && String(eColors.unavailable || "").trim() ? String(eColors.unavailable).trim() : "";
        const lampUnavailableTextColor = useOverride && String(eColors.unavailable_text || "").trim() ? String(eColors.unavailable_text).trim() : "";

        cell.classList.remove("on", "off", "blink", "pulse", "wave", "throb", "heartbeat", "flash", "unavailable", "acked", "blinkchg");

        if (!resolved.available) {
          cell.classList.add("off", "unavailable");
          const unavailableColor = lampUnavailableColor || (globalEnabled ? (colors.unavailable || "#bdbdbd") : "#bdbdbd");
          cell.style.color = unavailableColor;
          cell.style.setProperty("--lamp-unavailable", lampUnavailableColor);
          cell.querySelectorAll(".window").forEach((w) => { w.style.backgroundColor = unavailableColor; });
          inopEl.hidden = false;
          inopEl.textContent = cfg.unavailable_text || "INOP";
          primaryEl.textContent = resolved.display.primary || item.entity;
          secondaryEl.textContent = "";
          if (tertiaryEl) { tertiaryEl.textContent = ""; tertiaryEl.style.display = "none"; }
          if (textEl) textEl.style.color = lampUnavailableTextColor || globalUnavailableTextPreset;
          return;
        }

        inopEl.hidden = true;
        const severity = resolved.severity;
        const lampOnColor = useOverride && String(eColors.on || "").trim() ? String(eColors.on).trim() : "";
        const lampOffColor = useOverride && String(eColors.off || "").trim() ? String(eColors.off).trim() : "";
        const lampOffTextColor = useOverride && String(eColors.text || "").trim() ? String(eColors.text).trim() : "";
        const lampOnTextColor = useOverride && String(eColors.on_text || "").trim() ? String(eColors.on_text).trim() : "";
        const lampOnWindowColor = useOverride && String(eColors.on_window || "").trim() ? String(eColors.on_window).trim() : "";
        const onColor = resolved.autoOnColor || lampOnColor || (globalEnabled ? (colors[severity] || colors.status) : null) || "#8bd66a";
        const offColor = lampOffColor || (globalEnabled ? colors.off : null) || "#f2f2f2";
        const onWindowColor = lampOnWindowColor || globalOnWindowPreset || "";
        const offTextColor = lampOffTextColor || globalOffTextPreset;

        try { cell.style.setProperty("--lamp-off", offColor); } catch (_) {}
        const style = this._resolveLampStyle(item, severity);
        const lens = this._resolveLensType(item, severity);
        cell.classList.toggle("retro", style === "retro");
        cell.classList.toggle("modern", style !== "retro");
        ["plastic", "glass", "frosted", "smoked"].forEach((x) => cell.classList.toggle(`lens-${x}`, lens === x));
        this._applyImperfections(cell, item);

        cell.classList.toggle("on", resolved.isOn);
        cell.classList.toggle("off", !resolved.isOn);
        cell.classList.toggle("acked", resolved.isOn && mainAcked && !lampTest);
        cell.classList.toggle("blinkchg", !!resolved.alert.changeActive);
        cell.style.color = resolved.isOn ? onColor : offColor;
        cell.querySelectorAll(".window").forEach((w) => { w.style.backgroundColor = resolved.isOn ? onWindowColor : offColor; });

        if (resolved.alert.active && resolved.alert.effect) cell.classList.add(resolved.alert.effect);
        applyAttnTuning(cell, resolved.alert.tuning);

        primaryEl.textContent = String(resolved.display.primary || "");
        secondaryEl.textContent = String(resolved.display.secondary || "");
        if (tertiaryEl) {
          tertiaryEl.textContent = String(resolved.display.tertiary || "");
          tertiaryEl.style.display = resolved.display.tertiary ? "" : "none";
        }
        if (textEl) textEl.style.color = resolved.isOn ? (lampOnTextColor || globalOnTextPreset) : offTextColor;

        // Optional history/debug overlay. It consumes the same resolved state as the renderer.
        const histCfg = cfg.history_overlay || {};
        let info = cell.querySelector(".infoIcon");
        if (histCfg.enabled === true && histCfg.show_icon !== false) {
          if (!info) {
            info = document.createElement("button");
            info.type = "button";
            info.className = "infoIcon";
            info.textContent = "ℹ️";
            info.title = "Lamp info";
            info.setAttribute("aria-label", "Open lamp diagnostics");
            cell.appendChild(info);
          }
          info.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            this._openHistoryOverlay(item, {
              label: resolved.display.vars?.name || item.entity,
              severity,
              isOn: resolved.isOn,
              isAcked: mainAcked,
              ackTs: ack.timestamp(item, "main"),
              formattedValue: resolved.display.vars?.display_value || resolved.rawState,
              alertReason: resolved.alert.reason,
              resolved,
            });
          };
        } else if (info) info.remove();
      };

      const filter = onlyEntities instanceof Set ? onlyEntities : null;
      [...grid.children].forEach((cell, dIdx) => {
        const wrap = (this._derived || [])[dIdx];
        if (!wrap || wrap.__type === "group_header") return;
        if (wrap.__type === "lamp_pair") {
          const topItem = normalizeLamp(wrap.top?.lamp || {});
          const botItem = normalizeLamp(wrap.bottom?.lamp || {});
          const topCell = cell.querySelector('.pairHalf[data-half="top"]') || cell;
          const botCell = cell.querySelector('.pairHalf[data-half="bottom"]') || cell;
          if (!filter || filter.has(topItem.entity)) updateLamp(topCell, topItem);
          if (!filter || filter.has(botItem.entity)) updateLamp(botCell, botItem);
        } else {
          const lampItem = normalizeLamp(wrap.lamp || {});
          if (!filter || filter.has(lampItem.entity)) updateLamp(cell, lampItem);
        }
      });

      if (ack.dirty) await this._setAckMap(ack.map);
    }
    _showMoreInfo(entityId) {
      const ev = new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId } });
      this.dispatchEvent(ev);
    }

    _isOn(entityId) {
      const s = this._hass?.states?.[entityId]?.state;
      return isTruthyState(s);
    }

    async _getAckMap() {
      const store = ensureObj(this._config.ack_store, { type: "local" });
      const panelId = String(this._config.panel_id || "annunciator_panel");
      const key = `annun_ack_map::${panelId}`;
      const fallbackKey = `annun_ack_fallback::${panelId}`;
      let local = {};
      try {
        local = JSON.parse(localStorage.getItem(key) || "{}") || {};
        if (!local || typeof local !== "object" || Array.isArray(local)) local = {};
      } catch { local = {}; }

      if (store.type === "input_text" && store.entity) {
        // If a prior persistent write failed, the local snapshot is authoritative —
        // including the important case where it is intentionally empty after Clear ACK.
        try { if (localStorage.getItem(fallbackKey) === "1") return local; } catch (_) {}
        const stateObj = this._hass?.states?.[store.entity];
        const shadow = this._ackShadow;
        if (shadow && shadow.panelId === panelId && shadow.entity === store.entity) {
          const remoteText = String(stateObj?.state || "");
          if (stateObj && remoteText === shadow.encoded) this._ackShadow = null;
          else return { ...ensureObj(shadow.map, {}) };
        }
        if (!stateObj) return local;
        const parsed = parseAckStateText(stateObj.state || "", this._config.entities, panelId);
        // A compact fingerprint mismatch means the config identity/slot layout changed.
        // Never apply bits to the wrong lamp; local fallback is safer than mis-ACKing.
        if (parsed === null) return local;
        return parsed || {};
      }
      return local;
    }

    async _setAckMap(map) {
      const store = ensureObj(this._config.ack_store, { type: "local" });
      const panelId = String(this._config.panel_id || "annunciator_panel");
      const key = `annun_ack_map::${panelId}`;
      const fallbackKey = `annun_ack_fallback::${panelId}`;

      if (store.type === "input_text" && store.entity) {
        const stateObj = this._hass?.states?.[store.entity];
        const maxLenRaw = stateObj?.attributes?.max ?? stateObj?.attributes?.max_length ?? stateObj?.attributes?.maxLen;
        const maxLen = (typeof maxLenRaw === "number" && Number.isFinite(maxLenRaw)) ? maxLenRaw : 255;
        const compact = encodeCompactAckState(map || {}, this._config.entities, panelId, stateObj?.state || "");

        const writeLocalFallback = () => {
          try {
            localStorage.setItem(key, JSON.stringify(map || {}));
            localStorage.setItem(fallbackKey, "1");
          } catch (e) { console.warn("Failed to write ACK fallback:", e); }
        };

        if (compact.length > maxLen) {
          console.warn(`Compact ACK state (${compact.length} chars) exceeds input_text max (${maxLen}); using local fallback.`);
          this._ackShadow = null;
          writeLocalFallback();
          return;
        }
        try {
          await this._hass.callService("input_text", "set_value", { entity_id: store.entity, value: compact });
          // HA may not reflect the helper's new state until a later hass update. Keep
          // an optimistic shadow so the lamp acknowledges immediately instead of
          // briefly rereading the stale remote value and continuing to blink.
          this._ackShadow = { panelId, entity:store.entity, encoded:compact, map:{ ...ensureObj(map,{}) } };
          try { localStorage.removeItem(key); localStorage.removeItem(fallbackKey); } catch (_) {}
        } catch (e) {
          console.warn("Failed to write compact ACK state; using local fallback:", e);
          this._ackShadow = null;
          writeLocalFallback();
        }
        return;
      }

      this._ackShadow = null;
      try { localStorage.setItem(key, JSON.stringify(map || {})); }
      catch (e) { console.warn("Failed to write local ACK state:", e); }
    }

    
    _ensureHistoryOverlay() {
      if (this._histOverlayEl) return;
      const wrap = document.createElement("div");
      wrap.className = "histOverlay";
      wrap.tabIndex = -1;
      wrap.innerHTML = `
        <div class="histBackdrop"></div>
        <div class="histCard" role="dialog" aria-modal="true">
          <div class="histTitle"></div>
          <div class="histBody"></div>
          <div class="histActions"><button class="histBtn histCopy" type="button" title="Copy entity id">Copy Entity</button><button class="histBtn histCopyYaml" type="button" title="Copy this lamp YAML">Copy YAML</button><button class="histBtn histCopyJson" type="button" title="Copy full lamp config JSON">Copy JSON</button><button class="histBtn histCopyDiag" type="button" title="Copy diagnostic package">Copy Diagnostic</button><button class="histBtn histBtnClose" type="button">Close</button></div>
        </div>
      `;
      wrap.querySelector(".histBackdrop").addEventListener("click", () => this._closeHistoryOverlay());
      wrap.querySelector(".histBtnClose").addEventListener("click", () => this._closeHistoryOverlay());
      wrap.addEventListener("keydown", (e) => { if (e.key === "Escape") this._closeHistoryOverlay(); });
      this.shadowRoot.appendChild(wrap);
      this._histOverlayEl = wrap;
    }

    _closeHistoryOverlay() {
      if (!this._histOverlayEl) return;
      this._histOverlayEl.classList.remove("open");
    }

    _openHistoryOverlay(item, context = {}) {
      this._ensureHistoryOverlay();
      const titleEl = this._histOverlayEl.querySelector(".histTitle");
      const bodyEl = this._histOverlayEl.querySelector(".histBody");
      const copyBtn = this._histOverlayEl.querySelector(".histCopy");
      const copyYamlBtn = this._histOverlayEl.querySelector(".histCopyYaml");
      const copyJsonBtn = this._histOverlayEl.querySelector(".histCopyJson");
      const copyDiagBtn = this._histOverlayEl.querySelector(".histCopyDiag");

      const lamp = normalizeLamp(item || {});
      const entId = lamp.entity || "";
      const ent = entId ? this._hass?.states?.[entId] : null;
      const panelId = String(this._config.panel_id || "annunciator_panel");

      // Synchronous snapshot for diagnostics only. Runtime writes still go through
      // _getAckMap/_setAckMap and AckManager.
      const store = ensureObj(this._config.ack_store, { type: "local" });
      let ackMap = {};
      if (store.type === "input_text" && store.entity) {
        const s = this._hass?.states?.[store.entity];
        const parsed = s ? parseAckStateText(s.state || "", this._config.entities, panelId) : {};
        ackMap = parsed || {};
      } else {
        try { ackMap = JSON.parse(localStorage.getItem(`annun_ack_map::${panelId}`) || "{}") || {}; } catch (_) { ackMap = {}; }
      }
      const ack = new AckManager(panelId, ackMap);
      ack.migrate(lamp);
      const rid = lampRuntimeId(lamp);
      const lampTest = this._config.lamp_test_entity ? this._isOn(this._config.lamp_test_entity) : false;
      const resolved = context.resolved || evaluateLampState(lamp, ent, {
        lampTest,
        acked: ack.isAcked(lamp, "main"),
        changeActive: !!this._changeActive?.[rid],
        changeAcked: ack.isAcked(lamp, "change"),
      });
      const keys = ack.keys(lamp);

      titleEl.textContent = context.label || resolved.display?.vars?.name || entId || "Lamp";
      const copyText = async (text, button, normalLabel) => {
        try {
          await navigator.clipboard.writeText(text);
          button.textContent = "Copied";
          setTimeout(() => (button.textContent = normalLabel), 900);
        } catch (_) { window.prompt("Copy:", text); }
      };
      if (copyBtn) {
        copyBtn.style.display = entId ? "" : "none";
        copyBtn.onclick = () => entId && copyText(entId, copyBtn, "Copy Entity");
      }
      if (copyYamlBtn) {
        copyYamlBtn.style.display = lamp ? "" : "none";
        copyYamlBtn.onclick = () => copyText(`- ${toYaml(stripInternalKeys(lamp), 2).replace(/^  /gm, "  ")}`.replace(/^- - /, "- "), copyYamlBtn, "Copy YAML");
      }
      if (copyJsonBtn) {
        copyJsonBtn.style.display = lamp ? "" : "none";
        copyJsonBtn.onclick = () => copyText(JSON.stringify(stripInternalKeys(lamp), null, 2), copyJsonBtn, "Copy JSON");
      }
      if (copyDiagBtn) {
        copyDiagBtn.style.display = lamp ? "" : "none";
        copyDiagBtn.onclick = () => {
          const diagnostic = { card_version:CARD_VERSION, config_version:CONFIG_VERSION, panel:{panel_id:this._config.panel_id,panel_mode:this._config.panel_mode,panel_sizing:this._config.panel_sizing}, lamp:stripInternalKeys(lamp), state:ent, resolved:{available:resolved.available,rawState:resolved.rawState,rawValueNum:resolved.rawValueNum,valueNum:resolved.valueNum,isOn:resolved.isOn,severity:resolved.severity,alert:resolved.alert,display:resolved.display} };
          copyText(JSON.stringify(diagnostic,null,2), copyDiagBtn, "Copy Diagnostic");
        };
      }

      const rows = [];
      const add = (k, v) => rows.push({ k, v: (v === undefined || v === null || v === "") ? "-" : String(v) });
      add("Entity", entId || "-");
      add("UID", lampRuntimeId(lamp) || "-");
      add("Lamp type", inferLampType(lamp));
      add("Available", resolved.available ? "yes" : "no");
      if (ent) add("State", ent.state);
      if (!Number.isNaN(resolved.rawValueNum)) add("Raw value", `${resolved.rawValueNum}${ent?.attributes?.unit_of_measurement ? ` ${ent.attributes.unit_of_measurement}` : ""}`);
      if (!Number.isNaN(resolved.valueNum)) add("Transformed value", resolved.valueNum);
      add("Computed ON", resolved.isOn ? "yes" : "no");
      add("Condition", JSON.stringify(resolved.model?.condition || {}));
      add("Severity", resolved.severity);
      add("Alert active", resolved.alert?.active ? "yes" : "no");
      add("Alert effect", resolved.alert?.effect || "none");
      add("Alert reason", resolved.alert?.reason || "none");
      add("Primary line", resolved.display?.primary || "-");
      add("Secondary line", resolved.display?.secondary || "-");
      add("Tertiary line", resolved.display?.tertiary || "-");
      add("Classic ACK", ack.isAcked(lamp, "main") ? "yes" : "no");
      add("Change ACK", ack.isAcked(lamp, "change") ? "yes" : "no");
      if (ack.timestamp(lamp, "main")) add("ACK time", new Date(ack.timestamp(lamp, "main")).toLocaleString());
      add("ACK key", keys.main);
      add("Change ACK key", keys.change);
      add("Change alert", this._changeActive?.[rid] ? "active" : "inactive");
      if (this._changeLastTs?.[rid]) add("Last change alert", new Date(this._changeLastTs[rid]).toLocaleString());
      if (resolved.auto) {
        add("Conditional rule", resolved.auto.__match_name || (resolved.auto.__match_index !== undefined ? `#${Number(resolved.auto.__match_index) + 1}` : "matched"));
        add("Rule condition", describeAutoCondition(resolved.auto));
        add("Rule effects", describeAutoEffects(resolved.auto));
      } else add("Conditional rule", "none");

      const grp = String(lamp.group || "").trim();
      add("Group", grp || "-");
      if (grp) {
        const peers = (Array.isArray(this._config.entities) ? this._config.entities : []).map((x) => normalizeLamp(x || {})).filter((x) => x.entity && String(x.group || "").trim() === grp);
        add("Group ACK (classic)", peers.length && peers.every((x) => ack.isAcked(x, "main")) ? "all acked" : "partial / none");
        add("Group ACK (change)", peers.length && peers.every((x) => ack.isAcked(x, "change")) ? "all acked" : "partial / none");
      }
      if (ent?.last_changed) add("Last changed", new Date(ent.last_changed).toLocaleString());
      if (ent?.last_updated) add("Last updated", new Date(ent.last_updated).toLocaleString());
      if (ent?.attributes?.last_triggered) add("Last triggered", new Date(ent.attributes.last_triggered).toLocaleString());

      bodyEl.innerHTML = rows.map((r) => `<div class="histRow"><div class="histKey">${escapeHtml(r.k)}</div><div class="histVal">${escapeHtml(r.v)}</div></div>`).join("");
      this._histOverlayEl.classList.add("open");
      this._histOverlayEl.focus();
    }

    async _resetAck() {
      if (isPresentation(this._config)) return;
      if (this._config.lamp_test_entity && this._isOn(this._config.lamp_test_entity)) return;
      const action = String(this._config.reset_ack_action || "clear");
      if (action === "clear") {
        const store = ensureObj(this._config.ack_store, { type: "local" });
        if (store.type === "input_text" && store.entity) {
          const current = await this._getAckMap();
          const next = {};
          const prefix = `${this._config.panel_id}::`;
          Object.keys(current || {}).forEach((k) => { if (!k.startsWith(prefix)) next[k] = current[k]; });
          await this._setAckMap(next);
        } else {
          localStorage.removeItem(`annun_ack_map::${this._config.panel_id}`);
        }
        // Clear ACK is a rearm operation. Active change events remain active;
        // ACK (not Clear) is what dismisses an until-ACK change event.
      } else {
        const map = await this._getAckMap();
        const ack = new AckManager(this._config.panel_id, map);
        (Array.isArray(this._config.entities) ? this._config.entities : []).forEach((raw) => {
          const item = normalizeLamp(raw || {});
          if (!item.entity) return;
          ack.acknowledge(item, "main");
          ack.acknowledge(item, "change");
          this._changeActive[lampRuntimeId(item)] = false;
        });
        await this._setAckMap(ack.map);
      }
      this._renderDynamic();
    }

    async _clearAcks() {
      this._config.reset_ack_action = "clear";
      await this._resetAck();
    }

    async _ackGroup(groupName, acked, scopeOverride = null) {
      if (isPresentation(this._config)) return;
      if (this._config.lamp_test_entity && this._isOn(this._config.lamp_test_entity)) return;
      const group = String(groupName || "").trim();
      if (!group) return;
      const ga = ensureObj(this._config.group_ack, {});
      const scope = String(scopeOverride || ga.ack_scope || "all").toLowerCase();
      const includeChange = ga.include_change !== false;
      const map = await this._getAckMap();
      const ack = new AckManager(this._config.panel_id, map);
      const lampTest = this._config.lamp_test_entity ? this._isOn(this._config.lamp_test_entity) : false;

      (Array.isArray(this._config.entities) ? this._config.entities : []).forEach((raw) => {
        const item = normalizeLamp(raw || {});
        if (!item.entity || String(item.group || "").trim() !== group) return;
        const rid = lampRuntimeId(item);
        ack.migrate(item);

        if (!acked) {
          ack.clear(item, "main");
          if (includeChange) ack.clear(item, "change");
          if (this._config.pair_ack_lock) {
            const partner = this._pairedPartner(item);
            if (partner) { ack.clear(partner, "main"); if (includeChange) ack.clear(partner, "change"); }
          }
          return;
        }

        if (scope === "all") {
          ack.acknowledge(item, "main");
          if (includeChange) { ack.acknowledge(item, "change"); this._changeActive[rid] = false; }
          if (this._config.pair_ack_lock) {
            const partner = this._pairedPartner(item);
            if (partner) {
              ack.acknowledge(partner, "main");
              if (includeChange) { ack.acknowledge(partner, "change"); this._changeActive[lampRuntimeId(partner)] = false; }
            }
          }
          return;
        }

        const stateObj = this._hass?.states?.[item.entity];
        const changeActive = !!this._changeActive?.[rid];
        const resolved = evaluateLampState(item, stateObj, {
          lampTest,
          acked: ack.isAcked(item, "main"),
          changeActive,
          changeAcked: ack.isAcked(item, "change"),
        });
        const ackedMainNow = !!resolved.alert.mainActive;
        const ackedChangeNow = !!(includeChange && resolved.alert.changeActive);
        if (ackedMainNow) ack.acknowledge(item, "main");
        if (ackedChangeNow) { ack.acknowledge(item, "change"); this._changeActive[rid] = false; }
        if (this._config.pair_ack_lock && (ackedMainNow || ackedChangeNow)) {
          const partner = this._pairedPartner(item);
          if (partner) {
            if (ackedMainNow) ack.acknowledge(partner, "main");
            if (ackedChangeNow) { ack.acknowledge(partner, "change"); this._changeActive[lampRuntimeId(partner)] = false; }
          }
        }
      });

      await this._setAckMap(ack.map);
      this._renderDynamic();
    }

    _findLampByEntity(entityId) {
      return (Array.isArray(this._config.entities) ? this._config.entities : [])
        .map((x) => normalizeLamp(x || {}))
        .find((x) => x.entity === entityId) || null;
    }

    _pairedPartner(item) {
      if (!item || !item.pair_id || String(item.pair_mode || "none") === "none") return null;
      const all = (Array.isArray(this._config.entities) ? this._config.entities : []).map((x) => normalizeLamp(x || {}));
      const id = String(item.pair_id || "");
      if (!validPairIdsFor(all).has(id)) return null;
      return all.find((x) => x.entity && x.uid !== item.uid && String(x.pair_id || "") === id && String(x.pair_mode || "none") !== "none") || null;
    }

    async _toggleAck(itemOrEntity) {
      if (isPresentation(this._config)) return;
      if (this._config.lamp_test_entity && this._isOn(this._config.lamp_test_entity)) return;
      const item = typeof itemOrEntity === "string" ? this._findLampByEntity(itemOrEntity) : normalizeLamp(itemOrEntity || {});
      if (!item?.entity) return;
      const map = await this._getAckMap();
      const ack = new AckManager(this._config.panel_id, map);
      ack.migrate(item);
      const rid = lampRuntimeId(item);
      const changeIsActive = !!this._changeActive?.[rid];
      const lampTest = this._config.lamp_test_entity ? this._isOn(this._config.lamp_test_entity) : false;
      const resolved = evaluateLampState(item, this._hass?.states?.[item.entity], {
        lampTest,
        acked: ack.isAcked(item, "main"),
        changeActive: changeIsActive,
        changeAcked: ack.isAcked(item, "change"),
      });

      // A single operator ACK acknowledges every alert channel that is currently
      // active. This avoids the confusing case where a change alert is ACKed but
      // the same lamp immediately keeps blinking for its main alarm condition.
      const kinds = [];
      if (resolved.alert.mainActive) kinds.push("main");
      if (resolved.alert.changeActive) kinds.push("change");
      if (!kinds.length) return; // ACK is idempotent; explicit Clear controls remove ACK state.
      kinds.forEach((kind) => ack.acknowledge(item, kind));
      if (kinds.includes("change") && ack.isAcked(item, "change")) this._changeActive[rid] = false;

      if (this._config.pair_ack_lock) {
        const partner = this._pairedPartner(item);
        if (partner) {
          kinds.forEach((kind) => {
            if (ack.isAcked(item, kind)) ack.acknowledge(partner, kind);
            else ack.clear(partner, kind);
          });
          if (kinds.includes("change") && ack.isAcked(partner, "change")) this._changeActive[lampRuntimeId(partner)] = false;
        }
      }

      await this._setAckMap(ack.map);
      this._renderDynamic();
    }
  }

  // ============================================================
  // v2 Focused Visual Editor
  // ============================================================
  // The editor is intent-driven: Alarm / Status / Sensor / Custom. Only the
  // selected page is rendered, and configuration commits do not rebuild the
  // entire editor tree. Advanced capability remains available without clutter.
  class AnnunciatorGridCardEditor extends HTMLElement {
    constructor() {
      super();
      this._selectedLamp = 0;
      this._page = "setup";
      this._panelPage = "layout";
      this._filter = "";
      this._navPage = 0;
      this._navPageSize = 8;
      this._navFollowSelection = true;
      this._commitTimer = null;
      // Native text/number fields are edited as a small transaction. Home Assistant
      // re-calls setConfig() after config-changed; dispatching while a field has
      // focus would rebuild that field and drop the caret after every keystroke.
      this._nativeEditDepth = 0;
      this._pendingEditorDispatch = false;
      this._undoState = null;
      this._undoTimer = null;
    }

    set hass(hass) {
      this._hass = hass;
      if (!this.shadowRoot) this._ensure();
    }

    setConfig(config) {
      // Home Assistant reflects config-changed back into this editor. While a native
      // input or color picker is active, accepting that reflected config would rebuild
      // the focused control and close the caret/picker. Local config is already current.
      if ((Number(this._nativeEditDepth) || 0) > 0 && this._config) return;
      const original = config || {};
      const cfg = migrateConfigV2(original);
      const sevDefaults = { enabled:true, trip:"#ff3a2f", alarm:"#ffb000", warn:"#ffd24a", status:"#8bd66a", off:"#f2f2f2", on_text:"rgba(0,0,0,0.85)", off_text:"#1c1c1c", unavailable:"#bdbdbd", unavailable_text:"#1c1c1c", blank:"#111111", frame:"#111111", panel:"#2a2a2a" };
      const rawEntities = Array.isArray(cfg.entities) ? cfg.entities : [];
      const beforeIdentity = rawEntities.map((l) => `${l?.uid || l?.lamp_uid || ""}|${l?.ack_slot || ""}`).join("||");
      const validated = validateAndRepairConfig({ ...cfg, entities: rawEntities }, true);
      const vcfg = validated.config;
      const entities = vcfg.entities;
      const afterIdentity = entities.map((l) => `${l?.uid || ""}|${l?.ack_slot || ""}`).join("||");
      const identityChanged = beforeIdentity !== afterIdentity;
      const migrationChanged = Number(original.config_version) !== CONFIG_VERSION || Number(original.next_ack_slot) !== Number(vcfg.next_ack_slot) || original.panel_sizing === undefined || original.lamp_test_mode === undefined;
      this._configIssues = validated.issues;
      this._configRepairs = validated.repairs;
      this._config = {
        config_version:CONFIG_VERSION, title:"", panel_id:"annunciator_panel", panel_mode:"operator", columns:7, rows:3,
        cell_width:225, cell_height:160, cell_gap:0, mullion:6, outer_frame:6, cell_padding:10, row_mode:"auto", panel_sizing:"auto_fit",
        font_size:13, font_weight:"700", line_height:1.15, unavailable_text:"INOP",
        show_reset_ack:true, reset_ack_label:"", reset_ack_action:"clear",
        ack_store:{type:"local"}, lamp_test_entity:"", lamp_test_mode:"steady", pair_ack_lock:false, next_ack_slot:1,
        default_lamp_style:"modern", default_lens_type:"plastic", allow_lamp_style_override:true,
        allow_lens_override:true, retro_warmup:true, panel_theme:"classic", corner_style:"rounded", corner_radius:12,
        severity_colors:{...sevDefaults, ...ensureObj(vcfg.severity_colors || vcfg.colors, {})}, entities,
        ...vcfg, entities, severity_colors:{...sevDefaults, ...ensureObj(vcfg.severity_colors || vcfg.colors, {})}, config_version:CONFIG_VERSION,
      };
      if (this._selectedLamp >= entities.length) this._selectedLamp = Math.max(0, entities.length - 1);
      this._ensure();
      this._renderAll();
      if ((identityChanged || migrationChanged) && !this._uidPersistScheduled) {
        this._uidPersistScheduled = true;
        queueMicrotask(() => { this._uidPersistScheduled = false; this._dispatch(true); });
      }
    }

    disconnectedCallback() {
      if (this._commitTimer) clearTimeout(this._commitTimer);
      this._commitTimer = null;
      this._nativeEditDepth = 0;
      this._pendingEditorDispatch = false;
      if (this._undoTimer) clearTimeout(this._undoTimer);
      if (this._resizeObserver) {
        try { this._resizeObserver.disconnect(); } catch (e) {}
        this._resizeObserver = null;
      }
    }

    _ensure() {
      if (this.shadowRoot) return;
      this.attachShadow({mode:"open"});
      this.shadowRoot.innerHTML = `
        <style>
          :host{display:block;font-family:var(--paper-font-body1_-_font-family,Roboto,sans-serif);min-width:0}
          *{box-sizing:border-box}
          .shell{display:flex;flex-direction:column;gap:14px;min-width:0}
          .toolbar,.row,.actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
          .toolbar{justify-content:space-between}
          .title{font-weight:900;line-height:1.25;overflow-wrap:anywhere}
          .muted,.hint{font-size:12px;opacity:.74;line-height:1.4;overflow-wrap:anywhere}
          .workspace{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;align-items:start;min-width:0}
          .card{border:1px solid rgba(127,127,127,.22);border-radius:14px;background:rgba(127,127,127,.055);padding:14px;min-width:0}
          .lampListCard{padding:13px}
          .navHead{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,42%);gap:12px;align-items:center;margin-bottom:11px}
          .navTitle{font-weight:900;font-size:15px;line-height:1.25}
          .navCount{font-size:11px;opacity:.72;margin-top:2px;line-height:1.35}
          .searchInput{height:46px}
          .list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;min-width:0;overflow:visible}
          .lampRow{width:100%;min-width:0;min-height:78px;text-align:left;border:1px solid rgba(127,127,127,.18);background:rgba(127,127,127,.045);color:var(--primary-text-color);border-radius:11px;padding:10px 11px;cursor:pointer;overflow:hidden;display:flex;flex-direction:column;justify-content:center;gap:3px}
          .lampRow:hover{border-color:rgba(127,127,127,.38);background:rgba(127,127,127,.075)}
          .lampRow.sel{border-color:var(--primary-color);background:color-mix(in srgb,var(--primary-color) 14%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--primary-color) 28%,transparent)}
          .lampRowTop{display:flex;align-items:flex-start;gap:7px;min-width:0}
          .cellNo{flex:0 0 auto;font-size:11px;font-weight:950;line-height:1.3;padding:2px 6px;border-radius:999px;background:rgba(127,127,127,.12);border:1px solid rgba(127,127,127,.18);white-space:nowrap}
          .lampRow.sel .cellNo{border-color:color-mix(in srgb,var(--primary-color) 65%,transparent);background:color-mix(in srgb,var(--primary-color) 18%,transparent)}
          .pairNav{cursor:default;justify-content:flex-start;gap:7px}.pairNavHead{display:flex;align-items:center;gap:8px;font-weight:900}.pairNavHalves{display:grid;grid-template-columns:1fr 1fr;gap:6px;width:100%}.pairNavHalf{min-width:0;text-align:left;padding:7px 8px;border-radius:8px;background:rgba(127,127,127,.06);font-size:11px}.pairNavHalf.sel{outline:2px solid var(--primary-color);outline-offset:-1px}.pairHalfTag{font-size:9px;font-weight:950;opacity:.75;margin-right:5px}.pairHalfName{font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}.pairHalfEntity{font-size:9px;opacity:.65;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block;margin-top:2px}
          .lampName{font-weight:900;line-height:1.25;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow-wrap:anywhere}
          .lampEntity{font-size:11px;opacity:.7;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
          .chips{display:flex;gap:5px;flex-wrap:wrap;margin-top:3px}.chip{font-size:9px;font-weight:800;padding:2px 6px;border:1px solid rgba(127,127,127,.2);border-radius:99px;opacity:.88}
          .navPager{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:8px;margin-top:11px;padding-top:10px;border-top:1px solid rgba(127,127,127,.12)}
          .navPager .prev{justify-self:start}.navPager .next{justify-self:end}.pageInfo{font-size:12px;font-weight:850;white-space:nowrap;text-align:center}
          .rangeInfo{font-size:11px;opacity:.68;text-align:center;margin-top:4px}
          .spacerPane{display:grid;grid-template-columns:1fr;gap:15px}.spacerNotice{padding:14px;border:1px dashed rgba(127,127,127,.28);border-radius:12px;background:rgba(127,127,127,.035);line-height:1.45}
          .validationBox{display:none;border:1px solid rgba(255,193,7,.45);background:rgba(255,193,7,.10);border-radius:12px;padding:11px 12px;font-size:12px;line-height:1.45}
          .validationBox.show{display:block}.validationTitle{font-weight:900;margin-bottom:5px}.validationList{margin:0;padding-left:18px}.validationActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
          button:disabled{opacity:.38;cursor:not-allowed}
          .editorIdentity{min-width:0;flex:1}.editorActions{flex:0 0 auto}
          .tabs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px;margin:12px 0}
          .tab{width:100%;min-width:0;border:1px solid rgba(127,127,127,.22);background:transparent;color:var(--primary-text-color);border-radius:99px;padding:8px 8px;cursor:pointer;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
          .tab.active{background:color-mix(in srgb,var(--primary-color) 18%,transparent);border-color:var(--primary-color)}
          .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px 14px;min-width:0}.full{grid-column:1/-1}
          .field{min-width:0;padding:1px 0 3px}.label{font-size:13px;font-weight:850;margin:0 0 7px;line-height:1.3}.tip{font-size:12px;opacity:.68;margin-top:6px;line-height:1.38}
          ha-textfield,ha-form{width:100%;min-width:0}
          /* Use native inputs for dynamically-created text/number fields. In some
             Home Assistant builds a dynamically-created ha-textfield without its
             own internal label can collapse to effectively zero height. These
             controls deliberately use HA theme variables but do not depend on
             ha-textfield internals, so Label/Group/Scale/etc. are always visible. */
          .nativeInput{
            width:100%;min-width:0;height:56px;padding:0 14px;
            border:1px solid transparent;border-bottom-color:var(--divider-color,rgba(127,127,127,.55));
            border-radius:4px 4px 0 0;
            background:var(--input-fill-color,var(--mdc-text-field-fill-color,rgba(127,127,127,.16)));
            color:var(--primary-text-color,#fff);
            font:inherit;font-size:14px;line-height:1.3;
            outline:none;transition:border-color 120ms ease,background 120ms ease,box-shadow 120ms ease;
          }
          .nativeInput:hover{background:color-mix(in srgb,var(--primary-text-color,#fff) 10%,transparent)}
          .nativeInput:focus{
            border-bottom:2px solid var(--primary-color,#03a9f4);
            box-shadow:inset 0 -1px 0 var(--primary-color,#03a9f4);
          }
          .nativeInput::placeholder{color:var(--secondary-text-color,rgba(255,255,255,.62));opacity:.75}
          .nativeInput:disabled{opacity:.5;cursor:not-allowed}
          .nativeInput[type="number"]{-moz-appearance:textfield}
          .nativeInput[type="number"]::-webkit-inner-spin-button,
          .nativeInput[type="number"]::-webkit-outer-spin-button{opacity:.65}
          button{border:1px solid rgba(127,127,127,.24);background:rgba(127,127,127,.08);color:var(--primary-text-color);border-radius:8px;padding:8px 11px;min-height:36px;cursor:pointer;font-weight:800}button:focus-visible,.lampRow:focus-visible,.tab:focus-visible,.nativeInput:focus-visible{outline:3px solid var(--primary-color,#03a9f4);outline-offset:2px}.danger{border-color:rgba(244,67,54,.45)}
          .sectionHead{grid-column:1/-1;min-width:0;padding:2px 0 10px;border-bottom:1px solid rgba(127,127,127,.12)}
          .sectionTitle{font-weight:900;font-size:16px;line-height:1.25;margin-bottom:4px}.sectionSub{font-size:12px;line-height:1.42;opacity:.72;margin:0;max-width:72ch}
          .rule{border:1px solid rgba(127,127,127,.2);border-radius:12px;padding:0;margin:10px 0;overflow:hidden}.rule>summary{cursor:pointer;padding:11px 12px;font-weight:850;background:rgba(127,127,127,.045);list-style-position:inside}.ruleBody{padding:12px}.ruleActions{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.summaryBox{padding:10px 11px;border-radius:10px;background:rgba(127,127,127,.065);font-size:12px;line-height:1.5;margin-bottom:2px}
          details.panelSettings{border:1px solid rgba(127,127,127,.22);border-radius:14px;padding:11px;background:rgba(127,127,127,.04)}details.panelSettings>summary{cursor:pointer;font-weight:900}.panelBody{margin-top:14px}
          .colorRow{display:grid;grid-template-columns:130px 48px minmax(0,1fr);gap:9px;align-items:center;margin:9px 0}.colorRow input[type=color]{width:42px;height:36px;border:none;background:transparent}
          .switchLine{display:flex;align-items:center;gap:9px;min-height:38px;line-height:1.35}.empty{padding:20px;text-align:center;opacity:.7}
          .undoBar{display:none;position:sticky;bottom:10px;z-index:20;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px;border-radius:10px;background:var(--card-background-color,#1f1f1f);border:1px solid color-mix(in srgb,var(--primary-color) 45%,transparent);box-shadow:0 8px 24px rgba(0,0,0,.28);font-size:12px}.undoBar.show{display:flex}.schemaBadge{font-size:11px;padding:6px 8px;border-radius:999px;background:rgba(127,127,127,.09);border:1px solid rgba(127,127,127,.17)}

          /* Home Assistant usually renders the visual editor in a narrow column even on
             a wide desktop. ResizeObserver toggles these classes from the editor's actual
             width instead of the browser viewport width. */
          .shell.narrow .workspace{grid-template-columns:1fr}
          .shell.narrow .lampListCard{padding:11px}
          .shell.narrow .list{grid-template-columns:repeat(2,minmax(0,1fr))}
          .shell.narrow .tabs{grid-template-columns:repeat(3,minmax(0,1fr))}
          .shell.narrow .card{padding:15px}

          .shell.compact .editorHeader{flex-direction:column;align-items:stretch}
          .shell.compact .editorActions{justify-content:flex-start}
          .shell.compact .grid{grid-template-columns:1fr}
          .shell.compact .full,.shell.compact .sectionHead{grid-column:1}
          .shell.compact .colorRow{grid-template-columns:110px 44px minmax(0,1fr)}
          .shell.compact .tabs{grid-template-columns:repeat(3,minmax(0,1fr))}
          .shell.compact .tab{padding:9px 6px}
          .shell.compact .navHead{grid-template-columns:1fr}
          .shell.compact .searchInput{height:44px}
          .shell.compact .lampRow{min-height:74px}

          @media(max-width:760px){
            .workspace{grid-template-columns:1fr}
            .grid{grid-template-columns:1fr}
            .full,.sectionHead{grid-column:1}
            .tabs{grid-template-columns:repeat(3,minmax(0,1fr))}
            .colorRow{grid-template-columns:105px 44px minmax(0,1fr)}
          }
          @media(max-width:390px){
            .list,.shell.narrow .list{grid-template-columns:1fr}
          }
        </style>
        <div class="shell">
          <div class="toolbar"><div><div class="title">Annunciator Grid</div><div class="hint">v1.0.0 · physical-cell navigator · schema v2</div></div><div class="actions"><button id="addLamp">+ Lamp</button><button id="addSpacer">+ Spacer</button></div></div>
          <div id="configWarnings" class="validationBox"></div>
          <div class="workspace">
            <div class="card lampListCard">
              <div class="navHead">
                <div><div class="navTitle">Lamp Navigator</div><div id="navCount" class="navCount"></div></div>
                <input id="search" class="nativeInput searchInput" type="text" placeholder="Search lamps, entity, group or #" autocomplete="off">
              </div>
              <div id="lampList" class="list"></div>
              <div id="navPager" class="navPager"></div>
            </div>
            <div id="editor" class="card"></div>
          </div>
          <details class="panelSettings" id="panelSettings"><summary>Panel settings</summary><div id="panelBody" class="panelBody"></div></details>
          <div id="undoBar" class="undoBar" role="status" aria-live="polite"><span id="undoText"></span><button id="undoBtn" type="button">Undo</button></div>
        </div>`;
      this.shadowRoot.getElementById("addLamp").onclick = () => this._addLamp();
      this.shadowRoot.getElementById("addSpacer").onclick = () => this._addSpacer();
      this.shadowRoot.getElementById("undoBtn").onclick = () => this._undo();
      const search = this.shadowRoot.getElementById("search");
      search.value = this._filter || "";
      search.addEventListener("input", () => {
        this._filter = search.value || "";
        this._navPage = 0;
        this._navFollowSelection = false;
        this._renderList();
      });

      // Respond to the width Home Assistant actually gives the editor, not the
      // browser viewport. This keeps the layout readable in the card editor's
      // split preview/config dialog.
      const applyResponsiveWidth = (width) => {
        const shell = this.shadowRoot?.querySelector(".shell");
        if (!shell) return;
        const w = Number(width) || this.getBoundingClientRect().width || 0;
        shell.classList.toggle("narrow", w > 0 && w < 780);
        shell.classList.toggle("compact", w > 0 && w < 620);
      };
      if (typeof ResizeObserver !== "undefined") {
        this._resizeObserver = new ResizeObserver((entries) => {
          const entry = entries && entries[0];
          applyResponsiveWidth(entry?.contentRect?.width);
        });
        this._resizeObserver.observe(this);
      }
      requestAnimationFrame(() => applyResponsiveWidth(this.getBoundingClientRect().width));
    }

    _dispatch(immediate=false) {
      const send = () => {
        this._commitTimer = null;
        this._pendingEditorDispatch = false;
        this._config = migrateConfigV2(this._config);
        this._refreshValidation();
        this._renderWarnings();
        const out = { ...this._config, config_version:CONFIG_VERSION, severity_colors:{...ensureObj(this._config.severity_colors,{})}, ack_store:{...ensureObj(this._config.ack_store,{})}, entities:normalizeEntities(this._config.entities) };
        this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:out},bubbles:true,composed:true}));
      };
      if (this._commitTimer) { clearTimeout(this._commitTimer); this._commitTimer = null; }

      // During a native edit, publish changes immediately so Home Assistant's Save
      // control is live on the first click. setConfig() above deliberately ignores
      // HA's reflected copy until the edit session ends, so the focused DOM node and
      // color picker remain intact no matter how slowly the user types/chooses.
      if (this._nativeEditDepth > 0) {
        this._pendingEditorDispatch = false;
        send();
        return;
      }
      if (immediate) send(); else this._commitTimer=setTimeout(send,220);
    }

    _beginNativeEdit() {
      this._nativeEditDepth = Math.max(0, Number(this._nativeEditDepth) || 0) + 1;
      // A pending debounce from the previous control can also rebuild the editor
      // underneath this newly-focused field. Fold it into the same edit session.
      if (this._commitTimer) {
        clearTimeout(this._commitTimer);
        this._commitTimer = null;
        this._pendingEditorDispatch = true;
      }
    }

    _endNativeEdit() {
      this._nativeEditDepth = Math.max(0, (Number(this._nativeEditDepth) || 0) - 1);
      if (this._nativeEditDepth === 0 && this._pendingEditorDispatch) {
        this._pendingEditorDispatch = false;
        // Use the normal short debounce after blur. This lets the click/tap that
        // moved focus complete before HA reflects the updated config back to us.
        this._dispatch(false);
      }
    }

    _cloneConfig(){ try{return structuredClone(this._config)}catch(_){return JSON.parse(JSON.stringify(this._config||{}))} }
    _pushUndo(label="Change"){
      this._undoState={config:this._cloneConfig(),selected:this._selectedLamp,page:this._page,panelPage:this._panelPage,label};
      const bar=this.shadowRoot?.getElementById("undoBar"),txt=this.shadowRoot?.getElementById("undoText");
      if(txt)txt.textContent=`${label}.`;
      if(bar)bar.classList.add("show");
      if(this._undoTimer)clearTimeout(this._undoTimer);
      this._undoTimer=setTimeout(()=>this._clearUndo(),8000);
    }
    _clearUndo(){if(this._undoTimer)clearTimeout(this._undoTimer);this._undoTimer=null;this._undoState=null;this.shadowRoot?.getElementById("undoBar")?.classList.remove("show")}
    _undo(){const u=this._undoState;if(!u)return;const currentNext=Math.max(1,Number(this._config?.next_ack_slot)||1),restoredNext=Math.max(1,Number(u.config?.next_ack_slot)||1);this._config={...u.config,next_ack_slot:Math.max(currentNext,restoredNext),config_version:CONFIG_VERSION};this._selectedLamp=u.selected;this._page=u.page;this._panelPage=u.panelPage;this._clearUndo();this._dispatch(true);this._renderAll()}
    _allocateAckSlot(){
      const used=new Set((this._config.entities||[]).map((x)=>Number(x?.ack_slot)).filter((n)=>Number.isInteger(n)&&n>0));
      const store=this._config.ack_store||{};const remoteText=store.type==="input_text"&&store.entity?this._hass?.states?.[store.entity]?.state||"":"";const remoteMax=highestStoredAckSlot(remoteText,this._config.panel_id);
      let slot=Math.max(1,Number(this._config.next_ack_slot)||1,remoteMax+1);
      while(used.has(slot))slot++;
      this._config={...this._config,next_ack_slot:slot+1,config_version:CONFIG_VERSION};
      return slot;
    }

    _set(key,val,immediate=false){this._config={...this._config,[key]:val};this._dispatch(immediate)}
    _setNested(key,sub,val){this._config={...this._config,[key]:{...ensureObj(this._config[key],{}),[sub]:val}};this._dispatch()}
    _lamp(i=this._selectedLamp){return normalizeLamp((this._config.entities||[])[i]||{})}
    _indexByUid(uid){return (this._config.entities||[]).findIndex((x)=>String(x?.uid||x?.lamp_uid||"")===String(uid||""))}
    _updateLamp(patch, immediate=false){
      const arr=[...(this._config.entities||[])]; const cur={...this._lamp(),...patch}; cur.uid=cur.uid||makeLampUid(); arr[this._selectedLamp]=cur; this._config={...this._config,entities:arr}; this._dispatch(immediate);
    }
    _updateLampNested(key,patch){const cur=this._lamp();this._updateLamp({[key]:{...ensureObj(cur[key],{}),...patch}})}

    _field(label,el,tip="",full=false){const w=document.createElement("div");w.className=`field${full?" full":""}`;const l=document.createElement("div");l.className="label";l.textContent=label;w.append(l,el);if(label&&el?.setAttribute&&!el.getAttribute?.("aria-label"))el.setAttribute("aria-label",label);if(tip){const t=document.createElement("div");t.className="tip";t.textContent=tip;w.append(t)}return w}
    _text(value,onChange,placeholder=""){
      const e=document.createElement("input");e.className="nativeInput";e.type="text";e.value=value??"";e.placeholder=placeholder||"";e.autocomplete="off";
      let editing=false;
      const begin=()=>{if(editing)return;editing=true;this._beginNativeEdit()};
      const end=()=>{if(!editing)return;editing=false;this._endNativeEdit()};
      e.addEventListener("pointerdown",begin);
      e.addEventListener("focus",begin);
      e.addEventListener("input",()=>{begin();onChange(e.value,false)});
      e.addEventListener("change",()=>{onChange(e.value,true);queueMicrotask(end)});
      e.addEventListener("blur",()=>queueMicrotask(end));
      e.addEventListener("keydown",(ev)=>{begin();if(ev.key==="Enter"){ev.preventDefault();e.blur()}});
      return e;
    }
    _number(value,onChange,min=null,max=null,step=null,allowBlank=false){
      const e=document.createElement("input");e.className="nativeInput";e.type="number";
      const initial=value===null||value===undefined?"":String(value);e.value=initial;
      if(min!==null)e.min=String(min);if(max!==null)e.max=String(max);if(step!==null)e.step=String(step);
      const valid=()=>e.value!==""&&Number.isFinite(Number(e.value));
      let lastValid=(initial!==""&&Number.isFinite(Number(initial)))?initial:"";
      let editing=false;
      const begin=()=>{if(editing)return;editing=true;this._beginNativeEdit()};
      const end=()=>{if(!editing)return;editing=false;this._endNativeEdit()};
      e.addEventListener("pointerdown",begin);
      e.addEventListener("focus",begin);
      e.addEventListener("input",()=>{begin();if(valid()){lastValid=e.value;onChange(e.value,false)}});
      e.addEventListener("change",()=>{
        if(e.value===""){
          if(allowBlank){lastValid="";onChange("",true)}
          else e.value=lastValid!==""?lastValid:initial;
          queueMicrotask(end);return;
        }
        if(valid()){lastValid=e.value;onChange(e.value,true)}
        else e.value=lastValid!==""?lastValid:initial;
        queueMicrotask(end);
      });
      e.addEventListener("blur",()=>queueMicrotask(end));
      e.addEventListener("keydown",(ev)=>{begin();if(ev.key==="Enter"){ev.preventDefault();e.blur()}});
      return e;
    }
    _switch(checked,onChange){const e=document.createElement("ha-switch");e.checked=!!checked;e.addEventListener("change",()=>onChange(e.checked));return e}
    _select(value,options,onChange){
      const f=document.createElement("ha-form");f.hass=this._hass;const EMPTY="__annun_empty__";const normalized=(Array.isArray(options)?options:[]).map((o)=>{const raw=Array.isArray(o)?o[0]:o?.value;const label=Array.isArray(o)?o[1]:(o?.label??raw);return {value:String(raw??"")===""?EMPTY:String(raw??""),label:String(label??raw??"")}});const current=String(value??"");f.schema=[{name:"v",selector:{select:{mode:"dropdown",options:normalized}}}];f.data={v:current===""?EMPTY:current};f.computeLabel=()=>"";f.addEventListener("value-changed",(ev)=>{const raw=ev.detail?.value?.v;onChange(raw===EMPTY?"":raw)});return f;
    }
    _entity(value,onChange){const f=document.createElement("ha-form");f.hass=this._hass;f.schema=[{name:"v",selector:{entity:{}}}];f.data={v:value||""};f.computeLabel=()=>"";f.addEventListener("value-changed",ev=>onChange(ev.detail?.value?.v||""));return f}
    _color(label,value,onChange){
      const row=document.createElement("div");row.className="colorRow";
      const l=document.createElement("div");l.className="label";l.textContent=label;
      const p=document.createElement("input");p.type="color";p.setAttribute("aria-label",`${label} color picker`);p.value=/^#[0-9a-f]{6}$/i.test(value||"")?value:"#000000";
      const t=this._text(value||"",v=>onChange(v),"#RRGGBB");t.setAttribute("aria-label",`${label} color value`);
      let pickerEditing=false;
      const beginPickerEdit=()=>{if(pickerEditing)return;pickerEditing=true;this._beginNativeEdit()};
      const endPickerEdit=()=>{if(!pickerEditing)return;pickerEditing=false;this._endNativeEdit()};
      p.addEventListener("pointerdown",beginPickerEdit);
      p.addEventListener("focus",beginPickerEdit);
      p.addEventListener("input",()=>{beginPickerEdit();t.value=p.value;onChange(p.value)});
      p.addEventListener("change",()=>{t.value=p.value;onChange(p.value);queueMicrotask(endPickerEdit)});
      p.addEventListener("blur",()=>queueMicrotask(endPickerEdit));
      row.append(l,p,t);return row;
    }
    _heading(title,sub){const w=document.createElement("div");w.className="sectionHead full";const a=document.createElement("div");a.className="sectionTitle";a.textContent=title;const b=document.createElement("div");b.className="sectionSub";b.textContent=sub;w.append(a,b);return w}

    _navMeta(arr=this._config.entities||[]){
      const norm=arr.map((x)=>normalizeLamp(x||{}));
      const meta=Array(norm.length).fill(null);
      const validPairIds=validPairIdsFor(norm);
      const bottomByPairId=new Map();
      for(let i=0;i<norm.length;i++){
        const l=norm[i],pid=String(l.pair_id||"").trim();
        if(validPairIds.has(pid)&&String(l.pair_mode||"none")==="bottom") bottomByPairId.set(pid,{idx:i,lamp:l});
      }
      let cellNo=0;
      for(let idx=0;idx<norm.length;idx++){
        const lamp=norm[idx];
        const mode=String(lamp.pair_mode||"none");
        const pid=String(lamp.pair_id||"").trim();
        if(mode==="bottom"&&validPairIds.has(pid)) continue;
        cellNo++;
        if(mode==="top"&&pid&&validPairIds.has(pid)){
          meta[idx]={cellNo,suffix:"TOP"};
          let bottom=null;
          for(let j=idx+1;j<norm.length;j++){
            const l2=norm[j];
            if(String(l2.pair_mode||"none")==="bottom"&&String(l2.pair_id||"").trim()===pid){bottom={idx:j,lamp:l2};break}
          }
          if(!bottom) bottom=bottomByPairId.get(pid)||null;
          if(bottom) meta[bottom.idx]={cellNo,suffix:"BOTTOM"};
        }else{
          meta[idx]={cellNo,suffix:""};
        }
      }
      // Malformed legacy configs can contain an orphan BOTTOM half. Keep it
      // navigable and numbered even though the runtime cannot pair it.
      for(let i=0;i<meta.length;i++){
        if(!meta[i]){cellNo++;const pm=String(norm[i].pair_mode||"none");meta[i]={cellNo,suffix:(pm==="top"||pm==="bottom")?`${pm.toUpperCase()} !`:""}}
      }
      const digits=Math.max(2,String(Math.max(1,cellNo)).length);
      meta.forEach((m)=>{m.label=`#${String(m.cellNo).padStart(digits,"0")}${m.suffix?` ${m.suffix}`:""}`});
      return {meta,totalCells:cellNo};
    }

    _selectedNavMeta(){
      const info=this._navMeta();
      return info.meta[this._selectedLamp]||{cellNo:this._selectedLamp+1,suffix:"",label:`#${String(this._selectedLamp+1).padStart(2,"0")}`};
    }

    _renderAll(){this._navFollowSelection=true;this._refreshValidation();this._renderWarnings();this._renderList();this._renderEditor();this._renderPanel()}
    _refreshValidation(){
      const checked=validateAndRepairConfig(this._config,false);
      this._configIssues=checked.issues;
    }
    _renderWarnings(){
      const box=this.shadowRoot?.getElementById("configWarnings");if(!box)return;
      const issues=Array.isArray(this._configIssues)?this._configIssues:[];const repairs=Array.isArray(this._configRepairs)?this._configRepairs:[];
      if(!issues.length&&!repairs.length){box.className="validationBox";box.innerHTML="";return}
      box.className="validationBox show";box.innerHTML="";const title=document.createElement("div");title.className="validationTitle";title.textContent=issues.length?`Configuration check: ${issues.length} issue${issues.length===1?"":"s"}`:"Configuration identity repaired";box.append(title);
      const ul=document.createElement("ul");ul.className="validationList";[...repairs.slice(0,3).map((message)=>({message:`✓ ${message}`})),...issues.slice(0,8)].forEach((x)=>{const li=document.createElement("li");li.textContent=x.message;ul.append(li)});box.append(ul);
      if(issues.length){const actions=document.createElement("div");actions.className="validationActions";const safe=issues.some((x)=>["identity","pair","pair_order"].includes(x.type));if(safe){const repair=document.createElement("button");repair.type="button";repair.textContent="Repair all safe issues";repair.onclick=()=>{this._pushUndo("Configuration repaired");this._config=repairAllSafeConfig(this._config);this._configRepairs=[];this._refreshValidation();this._dispatch(true);this._renderAll()};actions.append(repair)}if(issues.some((x)=>x.type==="pair_group")){const align=document.createElement("button");align.type="button";align.textContent="Align pair groups to TOP";align.onclick=()=>{this._pushUndo("Paired groups aligned");let arr=(this._config.entities||[]).map(normalizeLamp);for(const b of physicalBlocksFor(arr)){if(!b.paired)continue;const top=b.lamps.find((x)=>x.pair_mode==="top"),bottom=b.lamps.find((x)=>x.pair_mode==="bottom");if(top&&bottom&&String(top.group||"")!==String(bottom.group||""))arr=arr.map((x)=>x.uid===bottom.uid?{...x,group:top.group||""}:x)}this._config={...this._config,entities:arr};this._dispatch(true);this._renderAll()};actions.append(align)}if(actions.childNodes.length)box.append(actions)}
    }
    _renderList(){
      const list=this.shadowRoot.getElementById("lampList"),pager=this.shadowRoot.getElementById("navPager"),count=this.shadowRoot.getElementById("navCount");if(!list||!pager)return;list.innerHTML="";pager.innerHTML="";
      const q=this._filter.trim().toLowerCase(),arr=this._config.entities||[],nav=this._navMeta(arr),blocks=physicalBlocksFor(arr);
      const cells=blocks.map((block)=>{
        const entries=block.indices.map((idx,k)=>{const l=normalizeLamp(block.lamps[k]||arr[idx]||{});const friendly=this._hass?.states?.[l.entity]?.attributes?.friendly_name||"";const title=l.entity?(l.name_override||friendly||l.entity):"SPACER";return {idx,l,friendly,title}});
        const firstIdx=block.indices[0],cellNo=nav.meta[firstIdx]?.cellNo||1,digits=Math.max(2,String(Math.max(1,nav.totalCells)).length),label=`#${String(cellNo).padStart(digits,"0")}`;
        const hay=[label,...entries.flatMap((e)=>[e.title,e.l.entity,e.friendly,e.l.group,e.l.pair_mode])].join(" ").toLowerCase();
        return {block,entries,label,hay};
      }).filter((x)=>!q||x.hay.includes(q));
      const pageSize=Math.max(1,Number(this._navPageSize)||8),pageCount=Math.max(1,Math.ceil(cells.length/pageSize));
      if(this._navFollowSelection){const pos=cells.findIndex((x)=>x.entries.some((e)=>e.idx===this._selectedLamp));if(pos>=0)this._navPage=Math.floor(pos/pageSize);this._navFollowSelection=false}
      this._navPage=Math.max(0,Math.min(this._navPage,pageCount-1));const start=this._navPage*pageSize,shown=cells.slice(start,start+pageSize);
      if(count){const base=`${arr.length} config item${arr.length===1?"":"s"} · ${nav.totalCells} panel cell${nav.totalCells===1?"":"s"}`;count.textContent=q?`${cells.length} matching cells · ${base}`:base}
      shown.forEach((cellData)=>{
        const selected=cellData.entries.some((e)=>e.idx===this._selectedLamp);
        if(cellData.block.paired){
          const wrap=document.createElement("div");wrap.className=`lampRow pairNav${selected?" sel":""}`;wrap.setAttribute("role","group");wrap.setAttribute("aria-label",`${cellData.label} paired annunciator cell`);
          const head=document.createElement("div");head.className="pairNavHead";head.innerHTML=`<span class="cellNo">${escapeHtml(cellData.label)}</span><span>PAIRED CELL</span>`;wrap.append(head);
          const halves=document.createElement("div");halves.className="pairNavHalves";
          cellData.entries.sort((a,b)=>String(a.l.pair_mode)==="top"?-1:String(b.l.pair_mode)==="top"?1:0).forEach((e)=>{const b=document.createElement("button");b.type="button";b.className=`pairNavHalf${e.idx===this._selectedLamp?" sel":""}`;const tag=String(e.l.pair_mode||"").toUpperCase();b.innerHTML=`<span class="pairHalfName"><span class="pairHalfTag">${escapeHtml(tag)}</span>${escapeHtml(e.title)}</span><span class="pairHalfEntity">${escapeHtml(e.l.entity)}</span>`;b.onclick=()=>{this._selectedLamp=e.idx;this._navFollowSelection=true;this._renderList();this._renderEditor()};halves.append(b)});wrap.append(halves);list.append(wrap);return;
        }
        const e=cellData.entries[0],l=e.l,isSpacer=!l.entity,type=isSpacer?"spacer":inferLampType(l),severity=String(l.severity||"status").toLowerCase(),chipVals=[];if(!isSpacer){chipVals.push(type);if(severity!==String(type).toLowerCase())chipVals.push(severity)}
        const b=document.createElement("button");b.type="button";b.className=`lampRow${selected?" sel":""}`;b.setAttribute("aria-label",`${cellData.label} ${e.title}`);const chips=chipVals.length?`<div class="chips">${chipVals.map((x)=>`<span class="chip">${escapeHtml(x)}</span>`).join("")}</div>`:"";b.innerHTML=`<div class="lampRowTop"><span class="cellNo">${escapeHtml(cellData.label)}</span><span class="lampName">${escapeHtml(e.title)}</span></div><div class="lampEntity">${escapeHtml(isSpacer?"Empty grid position":l.entity)}</div>${chips}`;b.onclick=()=>{this._selectedLamp=e.idx;this._navFollowSelection=true;this._renderList();this._renderEditor()};list.append(b)
      });
      if(!shown.length){const e=document.createElement("div");e.className="empty full";e.textContent=q?"No panel cells match your search.":"No lamps yet.";list.append(e)}
      const prev=document.createElement("button");prev.type="button";prev.className="prev";prev.textContent="‹ Previous";prev.disabled=this._navPage<=0||!cells.length;prev.onclick=()=>{this._navPage--;this._navFollowSelection=false;this._renderList()};const info=document.createElement("div");info.className="pageInfo";info.textContent=`${cells.length?this._navPage+1:0} / ${cells.length?pageCount:0}`;const next=document.createElement("button");next.type="button";next.className="next";next.textContent="Next ›";next.disabled=this._navPage>=pageCount-1||!cells.length;next.onclick=()=>{this._navPage++;this._navFollowSelection=false;this._renderList()};pager.append(prev,info,next);const range=document.createElement("div");range.className="rangeInfo";range.style.gridColumn="1 / -1";const end=Math.min(start+pageSize,cells.length);range.textContent=cells.length?`Showing panel cells ${start+1}–${end} of ${cells.length}`:"No cells to show";pager.append(range)
    }

    _renderEditor(){
      const host=this.shadowRoot.getElementById("editor");if(!host)return;host.innerHTML="";const arr=this._config.entities||[];
      if(!arr.length){host.append(this._heading("No lamp selected","Add a lamp or spacer to begin."));return}
      if(this._selectedLamp>=arr.length)this._selectedLamp=Math.max(0,arr.length-1);
      const l=this._lamp();
      const navMeta=this._selectedNavMeta();
      const isSpacer=!l.entity;
      const friendly=l.entity?(this._hass?.states?.[l.entity]?.attributes?.friendly_name||""):"";
      const displayName=l.name_override||friendly||l.entity||"SPACER";
      const top=document.createElement("div");top.className="toolbar editorHeader";
      const name=document.createElement("div");name.className="editorIdentity";
      name.innerHTML=isSpacer
        ?`<div class="title">CELL ${escapeHtml(navMeta.label)} — SPACER</div><div class="muted">Empty grid position</div>`
        :`<div class="title">LAMP ${escapeHtml(navMeta.label)} — ${escapeHtml(displayName)}</div><div class="muted">${escapeHtml(l.entity)}</div>`;
      const acts=document.createElement("div");acts.className="actions editorActions";
      const blocks=physicalBlocksFor(arr),selectedUid=l.uid,blockIndex=blocks.findIndex((b)=>b.lamps.some((x)=>x.uid===selectedUid));
      const up=document.createElement("button");up.textContent="↑";up.title="Move physical cell up";up.setAttribute("aria-label","Move physical cell up");up.disabled=blockIndex<=0;up.onclick=()=>this._move(-1);
      const down=document.createElement("button");down.textContent="↓";down.title="Move physical cell down";down.setAttribute("aria-label","Move physical cell down");down.disabled=blockIndex<0||blockIndex>=blocks.length-1;down.onclick=()=>this._move(1);
      const dup=document.createElement("button");dup.textContent="⧉";dup.title=isSpacer?"Duplicate spacer":"Duplicate lamp";dup.onclick=()=>this._duplicate();
      const del=document.createElement("button");del.textContent="Delete";del.className="danger";del.onclick=()=>this._remove();
      acts.append(up,down,dup,del);top.append(name,acts);host.append(top);

      // Spacer cells are intentionally simple. Selecting an entity converts the
      // spacer into a normal alarm lamp and reveals the full editor.
      if(isSpacer){
        const pane=document.createElement("div");pane.className="spacerPane";
        pane.append(this._heading("Spacer cell","This position intentionally contains no entity. It still counts as a physical annunciator grid cell."));
        const notice=document.createElement("div");notice.className="spacerNotice";notice.innerHTML=`<strong>${escapeHtml(navMeta.label)}</strong> is currently an empty grid position.<br><span class="muted">Choose an entity below to convert it into a normal lamp. Move, duplicate, or delete it with the buttons above.</span>`;pane.append(notice);
        pane.append(this._field("Convert to lamp",this._entity("",v=>{if(!v)return;const base={...normalizeLamp({uid:l.uid||makeLampUid(),ack_slot:l.ack_slot,entity:v,lamp_type:"alarm",severity:"alarm",alert_style:"blink",blink:true,ack_rearm:"auto",primary_mode:"name",secondary_mode:"state"})};const current=this._lamp();this._updateLamp({...base,uid:current.uid||base.uid,entity:v},true);this._page="setup";this._navFollowSelection=true;this._renderList();this._renderEditor()}),"Select an entity. Alarm defaults are applied; you can then change Lamp type in Setup.",true));
        host.append(pane);
        return;
      }

      const tabs=document.createElement("div");tabs.className="tabs";["setup","display","behavior","appearance","rules","advanced"].forEach(p=>{const b=document.createElement("button");b.className=`tab${this._page===p?" active":""}`;b.textContent=p[0].toUpperCase()+p.slice(1);b.onclick=()=>{this._page=p;this._renderEditor()};tabs.append(b)});host.append(tabs);
      const body=document.createElement("div");body.className="grid";host.append(body);
      ({setup:()=>this._pageSetup(body,l),display:()=>this._pageDisplay(body,l),behavior:()=>this._pageBehavior(body,l),appearance:()=>this._pageAppearance(body,l),rules:()=>this._pageRules(body,l),advanced:()=>this._pageAdvanced(body,l)})[this._page]?.();
    }

    _pageSetup(body,l){
      body.append(this._heading("Essential settings","Entity, lamp intent, condition, severity and alert. Most lamps need nothing else."));
      body.append(this._field("Entity",this._entity(l.entity,v=>{if(!v){this._pushUndo("Lamp converted to spacer");this._breakPairForUid(l.uid,false);const idx=this._indexByUid(l.uid);if(idx>=0)this._selectedLamp=idx;this._updateLamp({entity:"",pair_id:"",pair_mode:"none"},true)}else this._updateLamp({entity:v},true);this._navFollowSelection=true;this._renderList();this._renderEditor()}),"Blank creates a spacer and safely breaks any pair.",true));
      if(!l.entity)return;
      const type=inferLampType(l);body.append(this._field("Lamp type",this._select(type,[["alarm","Alarm"],["status","Status"],["sensor","Sensor"],["custom","Custom"]],v=>{this._applyLampType(v);this._renderEditor();this._renderList()}),"Controls sensible defaults; it does not remove advanced capability.",true));
      body.append(this._field("Label",this._text(l.name_override,(v)=>{this._updateLamp({name_override:v,label_source:v?"custom":"entity"});this._renderList()},"Entity friendly name"),"Leave blank to use the entity name.",true));
      body.append(this._field("Group",this._text(l.group,v=>this._updateLamp({group:v}),"e.g. Boiler"),"Optional group header / group ACK grouping.",true));
      if(type!=="sensor"||!l.always_on) this._conditionBuilder(body,l,"Lamp turns ON when",false);
      body.append(this._field("Severity",this._select(l.severity||"status",[["status","Status"],["warn","Warning"],["alarm","Alarm"],["trip","Trip"]],v=>{this._updateLamp({severity:v});this._renderList()}),"Sets the default ON color.",false));
      body.append(this._field("Alert",this._select(resolveBaseAlertEffect(l)||"none",[["none","None (steady)"],["blink","Blink until ACK"],["pulse","Pulse until ACK"],["wave","Wave until ACK"],["throb","Throb until ACK"],["heartbeat","Heartbeat until ACK"],["flash","Flash"]],v=>{this._updateLamp({alert_style:v,blink:v==="blink",pulse:v==="pulse"});this._renderList()}),"Advanced trigger/timing options are on Behavior.",false));
    }

    _conditionBuilder(body,l,title,isChange){
      const c=isChange?legacyChangeCondition(l):legacyMainCondition(l);const modes=isChange?[["always","Any change"],["state_equals","State equals"],["string","String match"],["numeric","Numeric threshold"]]:[["truthy","On / true / 1"],["state_in","State equals one of"],["string","String match"],["numeric","Numeric threshold"]];
      const kind=this._select(c.kind,modes,v=>{if(isChange){const patch={blink_on_change_filter_mode:v==="always"?"any":v==="state_equals"?"state_equals":v==="string"?"string_match":"numeric_threshold"};this._updateLamp(patch)}else{const mode=v==="truthy"?"toggle":v==="state_in"?"state_equals":v==="string"?"string_match":"numeric_threshold";this._updateLamp({eval_mode:mode,always_on:false})}this._renderEditor()});body.append(this._field(title,kind,"One shared condition model is used by lamps, change alerts and rules.",true));
      if(c.kind==="state_in")body.append(this._field("ON states",this._text((c.values||[]).join(","),v=>this._updateLamp({on_states:v}),"on,true,1,open"),"Comma-separated exact states.",true));
      if(c.kind==="state_equals")body.append(this._field("State",this._text(c.value,v=>this._updateLamp({blink_on_change_state:v}),"on"),"Exact state.",true));
      if(c.kind==="string"){
        const matchKey=isChange?"blink_on_change_string_match":"string_match",valKey=isChange?"blink_on_change_string_value":"string_value";body.append(this._field("Match",this._select(c.operator||"contains",[["contains","Contains"],["equals","Equals"],["starts_with","Starts with"],["ends_with","Ends with"]],v=>this._updateLamp({[matchKey]:v})),"",false));body.append(this._field("Text",this._text(c.value,v=>this._updateLamp({[valKey]:v}),"FAULT"),"",false));
      }
      if(c.kind==="numeric"){
        const target=isChange?"blink_on_change_threshold_rule":"threshold_rule";const rule=ensureObj(l[target],{type:"above",a:0,b:0,inclusive:true});body.append(this._field("Comparison",this._select(rule.type||"above",[["above","Above"],["below","Below"],["between","Between"],["equal","Equal"]],v=>{this._updateLampNested(target,{type:v});this._renderEditor()}),"Uses transformed numeric value.",false));body.append(this._field("Threshold",this._number(rule.a??0,v=>this._updateLampNested(target,{a:clampNum(v,0)})),"",false));if((rule.type||"above")==="between")body.append(this._field("Upper threshold",this._number(rule.b??0,v=>this._updateLampNested(target,{b:clampNum(v,0)})),"",false));if((rule.type||"above")!=="equal"){const inc=document.createElement("div");inc.className="switchLine";inc.append(this._switch(rule.inclusive!==false,v=>this._updateLampNested(target,{inclusive:v})),document.createTextNode("Include threshold boundary"));body.append(this._field("Boundary",inc,(rule.type||"above")==="above"?"On = ≥ threshold; Off = > threshold.":(rule.type||"above")==="below"?"On = ≤ threshold; Off = < threshold.":"On includes both endpoints.",true))}
      }
    }

    _pageDisplay(body,l){
      body.append(this._heading("Display","Choose what each line shows. Transform the value first; format it second."));
      const useTpl=this._switch(!!l.use_templates,v=>{this._updateLamp({use_templates:v});this._renderEditor()});const sw=document.createElement("div");sw.className="switchLine";sw.append(useTpl,document.createTextNode("Use templates"));body.append(this._field("Templates",sw,"Templates replace normal primary/secondary controls.",true));
      if(l.use_templates){body.append(this._field("Primary template",this._text(l.label_template||"{{name}}",v=>this._updateLamp({label_template:v})),"Vars: {{name}} {{state}} {{value}} {{unit}} {{acked}} {{severity}} {{attributes.xxx}}",true));body.append(this._field("Secondary template",this._text(l.legend_template||"{{value}} {{unit}}",v=>this._updateLamp({legend_template:v})),"",true));return}
      const lineOpts=[["custom","Custom text"],["name","Label"],["state","State / value"]];const infoOpts=[["none","None"],["custom","Custom text"],["state","State / value"],["entity_id","Entity ID"],["last_changed","Last changed"],["last_updated","Last updated"]];
      body.append(this._field("Primary",this._select(l.primary_mode||"custom",lineOpts,v=>{this._updateLamp({primary_mode:v});this._renderEditor()}),"",false));if((l.primary_mode||"custom")==="custom")body.append(this._field("Primary text",this._text(l.primary_text,v=>this._updateLamp({primary_text:v})),"",false));
      body.append(this._field("Secondary",this._select(l.secondary_mode||"state",infoOpts,v=>{this._updateLamp({secondary_mode:v});this._renderEditor()}),"",false));if((l.secondary_mode||"state")==="custom")body.append(this._field("Secondary text",this._text(l.secondary_text,v=>this._updateLamp({secondary_text:v})),"",false));
      body.append(this._field("Tertiary",this._select(l.tertiary_mode||"none",infoOpts,v=>{this._updateLamp({tertiary_mode:v});this._renderEditor()}),"Optional third line.",false));if((l.tertiary_mode||"none")==="custom")body.append(this._field("Tertiary text",this._text(l.tertiary_text,v=>this._updateLamp({tertiary_text:v})),"",false));
      const vf=ensureObj(l.value_format,{});const sum=document.createElement("div");sum.className="summaryBox full";sum.textContent="Pipeline: HA state → conversion → scale/offset → logic value → display rounding/unit.";body.append(sum);
      body.append(this._field("Value conversion",this._select(vf.convert||"none",[["none","None"],["c_to_f","°C → °F"],["f_to_c","°F → °C"]],v=>this._updateLampNested("value_format",{convert:v})),"Applied before conditions/rules.",false));
      body.append(this._field("Scale",this._number(vf.scale??1,v=>this._updateLampNested("value_format",{scale:Number(v)}),null,null,"any"),"Logic transform.",false));body.append(this._field("Offset",this._number(vf.offset??0,v=>this._updateLampNested("value_format",{offset:Number(v)||0}),null,null,"any"),"Logic transform.",false));
      body.append(this._field("Decimals",this._select(String(vf.decimals??0),[["0","0"],["1","1"],["2","2"],["3","3"]],v=>this._updateLampNested("value_format",{decimals:Number(v)})),"Display only.",false));body.append(this._field("Rounding",this._select(vf.rounding||"round",[["round","Round"],["floor","Floor"],["ceil","Ceil"]],v=>this._updateLampNested("value_format",{rounding:v})),"Display only.",false));
      body.append(this._field("Unit",this._select(vf.unit||"auto",[["auto","Entity unit"],["none","Hide unit"],["override","Override"]],v=>{this._updateLampNested("value_format",{unit:v});this._renderEditor()}),"",false));if((vf.unit||"auto")==="override")body.append(this._field("Unit override",this._text(vf.unit_override||"",v=>this._updateLampNested("value_format",{unit_override:v}),"°F"),"",false));
      body.append(this._field("Value mode",this._select(vf.mode||"auto",[["auto","Auto"],["number","Numeric"],["text","Text"]],v=>this._updateLampNested("value_format",{mode:v})),"Auto falls back to text for non-numeric states.",false));
      body.append(this._field("Prefix",this._text(vf.prefix||"",v=>this._updateLampNested("value_format",{prefix:v}),"$"),"Display only.",false));
      body.append(this._field("Suffix",this._text(vf.suffix||"",v=>this._updateLampNested("value_format",{suffix:v})," / min"),"Display only.",false));
    }

    _pageBehavior(body,l){
      body.append(this._heading("Behavior","One normal alert policy plus an optional change-event policy. Tuning appears only where it is useful."));
      const base=resolveBaseAlertEffect(l)||"none";
      body.append(this._field("Alert effect",this._select(base,[["none","None"],["blink","Blink"],["pulse","Pulse"],["wave","Wave"],["throb","Throb"],["heartbeat","Heartbeat"],["flash","Flash"]],v=>{this._updateLamp({alert_style:v,blink:v==="blink",pulse:v==="pulse"});this._renderEditor()}),"",false));
      body.append(this._field("Alert when",this._select(l.alert_when||l.blink_mode||"on",[["on","Lamp ON"],["off","Lamp OFF"],["both","ON or OFF"]],v=>this._updateLamp({alert_when:v,blink_mode:v})),"ACK suppresses the condition alert.",false));
      if(base!=="none") {
        const autoBoth=String(l.ack_rearm||"manual")==="auto" && String(l.alert_when||l.blink_mode||"on")==="both";
        body.append(this._field("ACK rearm",this._select(l.ack_rearm||"manual",[["manual","Manual — Clear ACK required"],["auto","Automatic — rearm when normal"]],v=>this._updateLamp({ack_rearm:v})),autoBoth?"Automatic rearm needs a normal state; Alert when = ON or OFF is always active, so it cannot auto-rearm.":"Automatic clears the stored ACK after the alert condition returns to normal.",true));
      }
      if(base!=="none"){
        body.append(this._field("Speed",this._select(l.alert_speed||"normal",[["slow","Slow"],["normal","Normal"],["fast","Fast"]],v=>this._updateLamp({alert_speed:v})),"",false));
        body.append(this._field("Opacity depth",this._number(l.alert_opacity_depth??.5,v=>this._updateLamp({alert_opacity_depth:Math.max(0,Math.min(1,clampNum(v,.5)))}),0,1,.05),"0 = subtle, 1 = strongest dimming.",false));
        body.append(this._field("Border emphasis",this._select(l.alert_border_emphasis||"soft",[["none","None"],["soft","Soft"],["strong","Strong"]],v=>this._updateLamp({alert_border_emphasis:v})),"",false));
        if(base==="wave") body.append(this._field("Wave radius",this._number(l.alert_wave_radius??10,v=>this._updateLamp({alert_wave_radius:Math.max(0,clampNum(v,10))}),0,null,1),"Pixels.",false));
        if(base==="throb") body.append(this._field("Throb subtlety",this._number(l.alert_throb_subtlety??.5,v=>this._updateLamp({alert_throb_subtlety:Math.max(0,Math.min(1,clampNum(v,.5)))}),0,1,.05),"",false));
      }

      const sw=document.createElement("div");sw.className="switchLine";sw.append(this._switch(!!l.blink_on_change,v=>{this._updateLamp({blink_on_change:v});this._renderEditor()}),document.createTextNode("Alert when state/value changes"));
      body.append(this._field("Change alert",sw,"Works even while the lamp is OFF.",true));
      if(l.blink_on_change){
        const until=document.createElement("div");until.className="switchLine";until.append(this._switch(!!l.blink_on_change_until_ack,v=>{this._updateLamp({blink_on_change_until_ack:v});this._renderEditor()}),document.createTextNode("Continue until acknowledged"));
        body.append(this._field("Stop behavior",until,"Off = stop after duration; On = stop on ACK.",true));
        if(!l.blink_on_change_until_ack) body.append(this._field("Duration (seconds)",this._number(l.blink_on_change_seconds??3,v=>this._updateLamp({blink_on_change_seconds:Math.max(0,clampNum(v,3))}),0,null,.1),"",false));
        const chEff=String(l.alert_on_change_style||"inherit");
        body.append(this._field("Change effect",this._select(chEff,[["inherit","Inherit main alert"],["blink","Blink"],["pulse","Pulse"],["wave","Wave"],["throb","Throb"],["heartbeat","Heartbeat"],["flash","Flash"],["off","No visual effect"]],v=>{this._updateLamp({alert_on_change_style:v});this._renderEditor()}),"",false));
        this._conditionBuilder(body,l,"Only trigger change alert when",true);

        body.append(this._field("Change speed override",this._select(l.alert_on_change_speed||"",[["","Inherit"],["slow","Slow"],["normal","Normal"],["fast","Fast"]],v=>this._updateLamp({alert_on_change_speed:v})),"Optional; blank inherits main tuning.",false));
        body.append(this._field("Change opacity override",this._number(l.alert_on_change_opacity_depth===""?"":l.alert_on_change_opacity_depth??"",v=>this._updateLamp({alert_on_change_opacity_depth:v===""?"":Math.max(0,Math.min(1,clampNum(v,.5)))}),0,1,.05,true),"Leave blank to inherit.",false));
        body.append(this._field("Change border override",this._select(l.alert_on_change_border_emphasis||"",[["","Inherit"],["none","None"],["soft","Soft"],["strong","Strong"]],v=>this._updateLamp({alert_on_change_border_emphasis:v})),"",false));
        const effectiveCh=chEff==="inherit"?base:normalizeAlertEffect(chEff);
        if(effectiveCh==="wave") body.append(this._field("Change wave radius",this._number(l.alert_on_change_wave_radius===""?"":l.alert_on_change_wave_radius??"",v=>this._updateLamp({alert_on_change_wave_radius:v===""?"":Math.max(0,clampNum(v,10))}),0,null,1,true),"Leave blank to inherit.",false));
        if(effectiveCh==="throb") body.append(this._field("Change throb subtlety",this._number(l.alert_on_change_throb_subtlety===""?"":l.alert_on_change_throb_subtlety??"",v=>this._updateLamp({alert_on_change_throb_subtlety:v===""?"":Math.max(0,Math.min(1,clampNum(v,.5)))}),0,1,.05,true),"Leave blank to inherit.",false));
      }
    }

    _pageAppearance(body,l){
      body.append(this._heading("Appearance","Inherit the panel by default; override only what this lamp needs."));
      body.append(this._field("Severity",this._select(l.severity||"status",[["status","Status"],["warn","Warning"],["alarm","Alarm"],["trip","Trip"]],v=>this._updateLamp({severity:v})),"",false));
      const styleCtl=this._select(l.lamp_style||"inherit",[["inherit","Panel default"],["modern","Modern"],["retro","Retro"]],v=>this._updateLamp({lamp_style:v}));const styleLocked=this._config.allow_lamp_style_override===false;if(styleLocked){styleCtl.style.pointerEvents="none";styleCtl.style.opacity=".5";styleCtl.setAttribute("aria-disabled","true")}body.append(this._field("Lamp style",styleCtl,styleLocked?"Locked to Panel Settings → Appearance default.":"",false));
      const lensCtl=this._select(l.lens_type||"inherit",[["inherit","Panel default"],["plastic","Plastic"],["glass","Glass"],["frosted","Frosted"],["smoked","Smoked"]],v=>this._updateLamp({lens_type:v}));const lensLocked=this._config.allow_lens_override===false;if(lensLocked){lensCtl.style.pointerEvents="none";lensCtl.style.opacity=".5";lensCtl.setAttribute("aria-disabled","true")}body.append(this._field("Lens",lensCtl,lensLocked?"Locked to Panel Settings → Appearance default.":"",false));
      const sw=document.createElement("div");sw.className="switchLine";sw.append(this._switch(!!l.use_color_override,v=>{this._updateLamp({use_color_override:v});this._renderEditor()}),document.createTextNode("Override colors for this lamp"));body.append(this._field("Color overrides",sw,"Conditional-rule color still has highest priority.",true));if(l.use_color_override){const c=ensureObj(l.colors,{});[["ON color","on"],["ON window","on_window"],["ON text","on_text"],["OFF window","off"],["OFF text","text"],["Unavailable","unavailable"],["Unavailable text","unavailable_text"]].forEach(([lab,key])=>body.append(this._color(lab,c[key]||"",v=>this._updateLampNested("colors",{[key]:v}))))}
      body.append(this._field("Pair with lamp",this._pairSelector(l),"Paired halves are managed as one physical panel cell and kept adjacent automatically.",true));
      if(String(l.pair_mode||"none")!=="none")body.append(this._field("This half",this._select(l.pair_mode,[["top","Top"],["bottom","Bottom"]],v=>this._setPairPosition(l.uid,v)),"Changing one half automatically swaps its partner.",false));
    }

    _breakPairForUid(uid,dispatch=true){
      const arr=(this._config.entities||[]).map((x)=>normalizeLamp(x));const idx=arr.findIndex((x)=>x.uid===uid);if(idx<0)return;const lamp=arr[idx],pid=String(lamp.pair_id||"");if(pid){arr.forEach((x,i)=>{if(String(x.pair_id||"")===pid)arr[i]={...x,pair_id:"",pair_mode:"none"}})}else arr[idx]={...lamp,pair_id:"",pair_mode:"none"};this._config={...this._config,entities:arr};if(dispatch)this._dispatch(true)
    }
    _setPairPosition(uid,pos){const lamp=(this._config.entities||[]).map(normalizeLamp).find((x)=>x.uid===uid);const partner=this._findPairPartner(lamp);if(!lamp||!partner)return;this._pushUndo("Pair position changed");let arr=(this._config.entities||[]).map((x)=>normalizeLamp(x));arr=arr.map((x)=>x.uid===uid?{...x,pair_mode:pos}:x.uid===partner.uid?{...x,pair_mode:pos==="top"?"bottom":"top"}:x);arr=canonicalizePairOrdering(arr);this._config={...this._config,entities:arr};this._selectedLamp=arr.findIndex((x)=>x.uid===uid);this._dispatch(true);this._renderAll()}
    _pairSelector(l){
      const current=this._findPairPartner(l);const opts=[{value:"",label:"None"},...(this._config.entities||[]).map((x)=>normalizeLamp(x)).filter((x)=>x.entity&&x.uid!==l.uid).map((x)=>({value:x.uid,label:x.name_override||x.entity}))];
      return this._select(current?.uid||"",opts,(uid)=>{const selectedUid=l.uid;this._pushUndo(uid?"Pair relationship changed":"Pair removed");let arr=(this._config.entities||[]).map((x)=>normalizeLamp(x));const clearPair=(targetUid)=>{const t=arr.find((x)=>x.uid===targetUid);const pid=String(t?.pair_id||"");if(pid)arr=arr.map((x)=>String(x.pair_id||"")===pid?{...x,pair_id:"",pair_mode:"none"}:x)};clearPair(selectedUid);if(!uid){arr=canonicalizePairOrdering(arr);this._config={...this._config,entities:arr};this._selectedLamp=arr.findIndex((x)=>x.uid===selectedUid);this._dispatch(true);this._renderAll();return}clearPair(uid);const selected=arr.find((x)=>x.uid===selectedUid),partner=arr.find((x)=>x.uid===uid);if(!selected||!partner)return;const pid=`pair_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;const pos=(l.pair_mode&&l.pair_mode!=="none")?l.pair_mode:"top";const commonGroup=String(selected.group||partner.group||"");arr=arr.map((x)=>x.uid===selectedUid?{...x,pair_id:pid,pair_mode:pos,group:commonGroup}:x.uid===uid?{...x,pair_id:pid,pair_mode:pos==="top"?"bottom":"top",group:commonGroup}:x);arr=canonicalizePairOrdering(arr);this._config={...this._config,entities:arr};this._selectedLamp=arr.findIndex((x)=>x.uid===selectedUid);this._dispatch(true);this._renderAll()})
    }
    _findPairPartner(l){const all=(this._config.entities||[]).map(normalizeLamp);const id=String(l?.pair_id||"");if(!id||!validPairIdsFor(all).has(id))return null;return all.find(x=>x.uid!==l.uid&&x.pair_id===id&&x.pair_mode!=="none")||null}
    _patchLampByUid(uid,patch,dispatch=true){const arr=(this._config.entities||[]).map(x=>{const l=normalizeLamp(x);return l.uid===uid?{...l,...patch}:l});this._config={...this._config,entities:arr};if(dispatch)this._dispatch()}

    _pageRules(body,l){
      body.append(this._heading("Conditional rules","First matching rule wins. Reorder rules to make priority explicit."));const sw=document.createElement("div");sw.className="switchLine";sw.append(this._switch(!!l.enable_auto_styles,v=>{this._updateLamp({enable_auto_styles:v});this._renderEditor()}),document.createTextNode("Enable conditional rules"));body.append(this._field("Rules",sw,"",true));if(!l.enable_auto_styles)return;
      const rules=Array.isArray(l.auto_styles)?l.auto_styles:[];const add=document.createElement("button");add.textContent="+ Add rule";add.onclick=()=>{this._pushUndo("Conditional rule added");this._updateLamp({auto_styles:[...rules,{kind:"numeric",rule:{type:"above",a:0,b:0,inclusive:true}}]},true);this._renderEditor()};body.append(this._field("",add,"",true));
      rules.forEach((r,ri)=>{const box=document.createElement("details");box.className="rule full";box.open=true;const summary=document.createElement("summary");summary.textContent=this._ruleSummary(r,ri);box.append(summary);const bodyWrap=document.createElement("div");bodyWrap.className="ruleBody";const acts=document.createElement("div");acts.className="ruleActions";[["↑","Move rule up",()=>this._ruleMove(ri,-1),ri<=0],["↓","Move rule down",()=>this._ruleMove(ri,1),ri>=rules.length-1],["⧉","Duplicate rule",()=>this._ruleDuplicate(ri),false],["Delete","Delete rule",()=>this._ruleDelete(ri),false]].forEach(([txt,title,fn,disabled])=>{const b=document.createElement("button");b.type="button";b.textContent=txt;b.title=title;b.disabled=disabled;if(txt==="Delete")b.className="danger";b.onclick=(e)=>{e.preventDefault();fn()};acts.append(b)});bodyWrap.append(acts);const g=document.createElement("div");g.className="grid";bodyWrap.append(g);
        g.append(this._field("Rule name",this._text(r.name||"",v=>this._rulePatch(ri,{name:v}),"Optional name"),"Shown in diagnostics.",true));g.append(this._field("WHEN",this._select(r.kind||"numeric",[["numeric","Numeric threshold"],["state","State equals"],["string","String match"]],v=>{this._rulePatch(ri,{kind:v});this._renderEditor()}),"",true));
        if((r.kind||"numeric")==="numeric"){const rr=ensureObj(r.rule,{type:"above",a:0,b:0,inclusive:true});g.append(this._field("Comparison",this._select(rr.type||"above",[["above","Above"],["below","Below"],["between","Between"],["equal","Equal"]],v=>{this._ruleNested(ri,{type:v});this._renderEditor()}),"",false));g.append(this._field("Threshold",this._number(rr.a??0,v=>this._ruleNested(ri,{a:clampNum(v,0)})),"",false));if(rr.type==="between")g.append(this._field("Upper threshold",this._number(rr.b??0,v=>this._ruleNested(ri,{b:clampNum(v,0)})),"",false));if((rr.type||"above")!=="equal"){const inc=document.createElement("div");inc.className="switchLine";inc.append(this._switch(rr.inclusive!==false,v=>this._ruleNested(ri,{inclusive:v})),document.createTextNode("Include boundary"));g.append(this._field("Boundary",inc,"Controls ≥/≤ versus >/< behavior.",true))}}
        if(r.kind==="state")g.append(this._field("State equals",this._text(r.state||"",v=>this._rulePatch(ri,{state:v}),"on"),"",true));if(r.kind==="string"){g.append(this._field("Match",this._select(r.match||"contains",[["contains","Contains"],["equals","Equals"],["starts_with","Starts with"],["ends_with","Ends with"]],v=>this._rulePatch(ri,{match:v})),"",false));g.append(this._field("Text",this._text(r.value||"",v=>this._rulePatch(ri,{value:v}),"FAULT"),"",false))}
        g.append(this._field("THEN severity",this._select(r.severity||"",[["","Inherit"],["status","Status"],["warn","Warning"],["alarm","Alarm"],["trip","Trip"]],v=>this._rulePatch(ri,{severity:v})),"",false));g.append(this._field("THEN alert",this._select(typeof r.alert==="string"?r.alert:"inherit",[["inherit","Inherit"],["off","Off"],["blink","Blink"],["pulse","Pulse"],["wave","Wave"],["throb","Throb"],["heartbeat","Heartbeat"],["flash","Flash"]],v=>this._rulePatch(ri,{alert:v==="inherit"?undefined:v,blink:undefined,pulse:undefined})),"",false));const fo=document.createElement("div");fo.className="switchLine";fo.append(this._switch(!!r.force_on,v=>this._rulePatch(ri,{force_on:v})),document.createTextNode("Force lamp ON"));g.append(this._field("Lamp state",fo,"",true));g.append(this._color("ON color",r.color||"",v=>this._rulePatch(ri,{color:v})));box.append(bodyWrap);body.append(box)
      })
    }
    _ruleSummary(r,i){const kind=r.kind||"numeric";let when=kind;if(kind==="numeric"){const rr=ensureObj(r.rule,{}),inc=rr.inclusive!==false;when=rr.type==="above"?`${inc?"≥":">"} ${rr.a??0}`:rr.type==="below"?`${inc?"≤":"<"} ${rr.a??0}`:rr.type==="between"?`${inc?"between incl.":"between"} ${rr.a??0}–${rr.b??0}`:`= ${rr.a??0}`}if(kind==="state")when=`state = ${r.state||""}`;if(kind==="string")when=`${r.match||"contains"} ${r.value||""}`;const then=[r.severity&&`severity ${r.severity}`,r.force_on&&"force ON",r.alert&&`alert ${r.alert}`,r.color&&"custom color"].filter(Boolean).join(" · ")||"inherit appearance";return `${r.name||`Rule ${i+1}`}: ${when} → ${then}`}
    _rulePatch(i,patch){const rules=[...(this._lamp().auto_styles||[])];rules[i]={...ensureObj(rules[i],{}),...patch};this._updateLamp({auto_styles:rules})}
    _ruleNested(i,patch){const rules=[...(this._lamp().auto_styles||[])];const r=ensureObj(rules[i],{});rules[i]={...r,rule:{...ensureObj(r.rule,{}),...patch}};this._updateLamp({auto_styles:rules})}
    _ruleMove(i,delta){const rules=[...(this._lamp().auto_styles||[])],to=i+delta;if(to<0||to>=rules.length)return;this._pushUndo("Conditional rule moved");[rules[i],rules[to]]=[rules[to],rules[i]];this._updateLamp({auto_styles:rules},true);this._renderEditor()}
    _ruleDuplicate(i){const rules=[...(this._lamp().auto_styles||[])];this._pushUndo("Conditional rule duplicated");const cp=JSON.parse(JSON.stringify(rules[i]||{}));if(cp.name)cp.name=`${cp.name} Copy`;rules.splice(i+1,0,cp);this._updateLamp({auto_styles:rules},true);this._renderEditor()}
    _ruleDelete(i){this._pushUndo("Conditional rule deleted");const rules=(this._lamp().auto_styles||[]).filter((_,x)=>x!==i);this._updateLamp({auto_styles:rules},true);this._renderEditor()}

    _pageAdvanced(body,l){
      body.append(this._heading("Advanced","Rare controls, diagnostics and maintenance options."));const always=document.createElement("div");always.className="switchLine";always.append(this._switch(!!l.always_on,v=>{this._updateLamp({always_on:v});this._renderList()}),document.createTextNode("Always ON"));body.append(this._field("Always ON",always,"Overrides the normal condition; useful for sensor windows.",true));const inv=document.createElement("div");inv.className="switchLine";inv.append(this._switch(!!l.invert,v=>this._updateLamp({invert:v})),document.createTextNode("Invert ON/OFF result"));body.append(this._field("Invert",inv,"Applied after condition evaluation.",true));body.append(this._field("Maintainer note",this._text(l.note||"",v=>this._updateLamp({note:v}),"Optional note"),"Never displayed on the panel.",true));
      const model=buildLampModel(l);const dbg=document.createElement("div");dbg.className="summaryBox full";dbg.textContent=`Schema v${CONFIG_VERSION} · Card ${CARD_VERSION} · UID: ${model.uid} · ACK slot: ${l.ack_slot || "-"} · Type: ${inferLampType(l)} · Rearm: ${l.ack_rearm || "manual"} · Condition: ${JSON.stringify(model.condition)}`;body.append(dbg);
      const copy=document.createElement("button");copy.textContent="Copy lamp config JSON";copy.onclick=()=>this._copyText(JSON.stringify(stripInternalKeys(l),null,2),copy,"Copy lamp config JSON");body.append(this._field("Lamp config",copy,"Useful for support or manual YAML work.",true));
      const pkg=document.createElement("button");pkg.textContent="Copy diagnostic package";pkg.onclick=()=>{const state=this._hass?.states?.[l.entity]||null;const resolved=evaluateLampState(l,state,{acked:false,changeActive:false,changeAcked:false});const diagnostic={card_version:CARD_VERSION,config_version:CONFIG_VERSION,panel:{panel_id:this._config.panel_id,panel_mode:this._config.panel_mode,panel_sizing:this._config.panel_sizing,columns:this._config.columns},lamp:stripInternalKeys(l),state,resolved:{available:resolved.available,rawState:resolved.rawState,rawValueNum:resolved.rawValueNum,valueNum:resolved.valueNum,isOn:resolved.isOn,severity:resolved.severity,alert:resolved.alert,display:resolved.display}};this._copyText(JSON.stringify(diagnostic,null,2),pkg,"Copy diagnostic package")};body.append(this._field("Support package",pkg,"Copies card version, panel context, lamp config, entity state and resolved evaluation.",true));
    }
    async _copyText(text,button,label){try{await navigator.clipboard.writeText(text);button.textContent="Copied";setTimeout(()=>button.textContent=label,1000)}catch(_){window.prompt("Copy:",text)}}

    _applyLampType(type){const l=this._lamp();let patch={lamp_type:type};if(type==="alarm")patch={...patch,always_on:false,eval_mode:"toggle",severity:l.severity==="status"?"alarm":l.severity,alert_style:resolveBaseAlertEffect(l)||"blink",blink:!resolveBaseAlertEffect(l)||resolveBaseAlertEffect(l)==="blink",ack_rearm:"auto",primary_mode:l.primary_mode||"name",secondary_mode:l.secondary_mode||"state"};if(type==="status")patch={...patch,always_on:false,eval_mode:"toggle",severity:"status",alert_style:"none",blink:false,pulse:false};if(type==="sensor")patch={...patch,always_on:true,severity:"status",alert_style:"none",blink:false,pulse:false,primary_mode:"name",secondary_mode:"state"};this._updateLamp(patch)}

    _renderPanel(){
      const host=this.shadowRoot.getElementById("panelBody");if(!host)return;host.innerHTML="";
      const tabs=document.createElement("div");tabs.className="tabs";
      ["layout","appearance","acknowledgement","groups","advanced"].forEach((p)=>{const b=document.createElement("button");b.className=`tab${this._panelPage===p?" active":""}`;b.textContent=p[0].toUpperCase()+p.slice(1);b.onclick=()=>{this._panelPage=p;this._renderPanel()};tabs.append(b)});
      host.append(tabs);const g=document.createElement("div");g.className="grid";host.append(g);const c=this._config;

      if(this._panelPage==="layout"){
        g.append(this._field("Title",this._text(c.title||"",v=>this._set("title",v)),"",true));
        g.append(this._field("Grid height",this._select(c.row_mode||"auto",[["auto","Auto — fit configured cells"],["fixed","Minimum row count"]],v=>{this._set("row_mode",v);this._renderPanel()}),"Auto preserves the compact panel. Minimum rows reserves panel depth without hiding extra lamps.",true));
        g.append(this._field("Panel sizing",this._select(c.panel_sizing||"auto_fit",[["auto_fit","Auto Fit — scale to card width"],["fixed","Fixed Size — no scaling"],["scroll","Horizontal Scroll"]],v=>this._set("panel_sizing",v)),"Auto Fit preserves lamp proportions and scales down only when needed. Fixed keeps configured pixel dimensions. Scroll keeps full size with horizontal scrolling.",true));
        const layoutFields=[
          ["Columns","columns","Grid columns.",1,100,1],
          ["Cell width","cell_width","Lamp cell width in pixels.",20,2000,1],
          ["Cell height","cell_height","Lamp cell height in pixels.",20,2000,1],
          ["Cell gap","cell_gap","Gap between grid cells.",0,200,1],
          ["Mullion","mullion","Frame thickness around each lamp window.",0,100,1],
          ["Outer frame","outer_frame","Outer panel frame thickness.",0,200,1],
          ["Cell padding","cell_padding","Text padding inside single and paired lamp windows.",0,200,1],
          ["Font size","font_size","Lamp text size.",4,200,1],
          ["Line height","line_height","Lamp text line height.",0.5,3,0.05]
        ];
        if((c.row_mode||"auto")==="fixed") layoutFields.splice(1,0,["Rows (minimum)","rows","Minimum panel depth; configured lamps can extend beyond it.",1,100,1]);
        layoutFields.forEach(([lab,key,tip,min,max,step])=>g.append(this._field(lab,this._number(c[key],v=>{const n=clampNum(v,c[key]??min);this._set(key,Math.max(min,Math.min(max,n)))},min,max,step),tip,false)));
        g.append(this._field("Font weight",this._select(String(c.font_weight||"700"),[["400","Regular"],["500","Medium"],["600","Semi-bold"],["700","Bold"],["800","Extra bold"],["900","Black"]],v=>this._set("font_weight",v)),"",false));
        g.append(this._field("Corner style",this._select(c.corner_style||"rounded",[["rounded","Rounded"],["sharp","Sharp"]],v=>{this._set("corner_style",v);this._renderPanel()}),"",false));
        if((c.corner_style||"rounded")==="rounded") g.append(this._field("Corner radius",this._number(c.corner_radius??12,v=>this._set("corner_radius",clampNum(v,12))),"",false));
      }

      if(this._panelPage==="appearance"){
        g.append(this._field("Panel theme",this._select(c.panel_theme||"classic",[["classic","Classic"],["avionics","Avionics"],["neon","Neon"]],v=>this._set("panel_theme",v)),"",false));
        g.append(this._field("Default lamp style",this._select(c.default_lamp_style||"modern",[["modern","Modern"],["retro","Retro"]],v=>this._set("default_lamp_style",v)),"",false));
        g.append(this._field("Default lens",this._select(c.default_lens_type||"plastic",[["plastic","Plastic"],["glass","Glass"],["frosted","Frosted"],["smoked","Smoked"]],v=>this._set("default_lens_type",v)),"",false));
        const styleOverride=document.createElement("div");styleOverride.className="switchLine";styleOverride.append(this._switch(c.allow_lamp_style_override!==false,v=>this._set("allow_lamp_style_override",v)),document.createTextNode("Allow per-lamp style override"));g.append(this._field("Lamp overrides",styleOverride,"",true));
        const lensOverride=document.createElement("div");lensOverride.className="switchLine";lensOverride.append(this._switch(c.allow_lens_override!==false,v=>this._set("allow_lens_override",v)),document.createTextNode("Allow per-lamp lens override"));g.append(this._field("Lens overrides",lensOverride,"",true));
        const imp=document.createElement("div");imp.className="switchLine";imp.append(this._switch(c.imperfections!==false,v=>this._set("imperfections",v)),document.createTextNode("Stable lens imperfections"));g.append(this._field("Lens realism",imp,"",false));
        const flick=document.createElement("div");flick.className="switchLine";flick.append(this._switch(!!c.flicker,v=>this._set("flicker",v)),document.createTextNode("Subtle retro flicker"));g.append(this._field("Flicker",flick,"",false));
        const enabled=document.createElement("div");enabled.className="switchLine";enabled.append(this._switch(c.severity_colors?.enabled!==false,v=>this._setNested("severity_colors","enabled",v)),document.createTextNode("Use global severity colors"));g.append(this._field("Severity colors",enabled,"",true));
        const sev=ensureObj(c.severity_colors,{});[["TRIP","trip"],["ALARM","alarm"],["WARN","warn"],["STATUS","status"],["OFF window","off"],["ON window","on_window"],["ON text","on_text"],["OFF text","off_text"],["Unavailable","unavailable"],["Unavailable text","unavailable_text"],["Blank spacer","blank"],["Frame","frame"],["Panel","panel"]].forEach(([lab,key])=>g.append(this._color(lab,sev[key]||"",v=>this._setNested("severity_colors",key,v))));
        const sevApp=ensureObj(c.severity_appearance,{});
        ["trip","alarm","warn","status"].forEach((sevName)=>{const cur=ensureObj(sevApp[sevName],{});g.append(this._field(`${sevName.toUpperCase()} style`,this._select(cur.style||"",[["","Inherit panel"],["modern","Modern"],["retro","Retro"]],v=>this._set("severity_appearance",{...sevApp,[sevName]:{...cur,style:v}})),"Optional severity-based appearance.",false));g.append(this._field(`${sevName.toUpperCase()} lens`,this._select(cur.lens||"",[["","Inherit panel"],["plastic","Plastic"],["glass","Glass"],["frosted","Frosted"],["smoked","Smoked"]],v=>this._set("severity_appearance",{...sevApp,[sevName]:{...cur,lens:v}})),"",false))});
      }

      if(this._panelPage==="acknowledgement"){
        g.append(this._field("ACK storage",this._select(c.ack_store?.type||"local",[["local","Local browser"],["input_text","Persistent input_text"]],v=>{this._set("ack_store",v==="input_text"?{type:"input_text",entity:c.ack_store?.entity||"input_text.annunciator_ack_map"}:{type:"local"});this._renderPanel()}),"",true));
        if(c.ack_store?.type==="input_text") g.append(this._field("ACK input_text",this._entity(c.ack_store?.entity||"",v=>this._set("ack_store",{type:"input_text",entity:v})),"Stores adaptive compact ACK state: dense bitsets or sparse base36 slots, whichever is shorter.",true));
        const show=document.createElement("div");show.className="switchLine";show.append(this._switch(c.show_reset_ack!==false,v=>this._set("show_reset_ack",v)),document.createTextNode("Show header ACK button"));g.append(this._field("Header button",show,"",true));
        g.append(this._field("Button action",this._select(c.reset_ack_action||"clear",[["clear","Clear ACKs"],["ack_all","ACK all"]],v=>this._set("reset_ack_action",v)),"",false));
        const autoAckLabel=(c.reset_ack_action||"clear")==="ack_all"?"ACK All":"Clear ACK";
        g.append(this._field("Button label",this._text(c.reset_ack_label||"",v=>this._set("reset_ack_label",v),autoAckLabel),"Leave blank to follow the selected button action automatically.",false));
        const pair=document.createElement("div");pair.className="switchLine";pair.append(this._switch(!!c.pair_ack_lock,v=>this._set("pair_ack_lock",v)),document.createTextNode("Linked ACK for paired lamps"));g.append(this._field("Pair ACK lock",pair,"ACKing either half also ACKs its partner.",true));
      }

      if(this._panelPage==="groups"){
        const sh=document.createElement("div");sh.className="switchLine";sh.append(this._switch(!!c.show_group_headers,v=>{this._set("show_group_headers",v);this._renderPanel()}),document.createTextNode("Show group headers"));g.append(this._field("Group headers",sh,"",true));
        const ga=ensureObj(c.group_ack,{});const gh=ensureObj(c.group_header,{});
        g.append(this._field("Group ACK scope",this._select(ga.ack_scope||"all",[["all","All lamps"],["alerting","Alerting lamps only"]],v=>this._set("group_ack",{...ga,ack_scope:v})),"Alerting-only uses the same evaluator as the renderer.",false));
        const inc=document.createElement("div");inc.className="switchLine";inc.append(this._switch(ga.include_change!==false,v=>this._set("group_ack",{...ga,include_change:v})),document.createTextNode("Include change alerts"));g.append(this._field("Change ACK",inc,"",false));
        if(c.show_group_headers){
          const btn=document.createElement("div");btn.className="switchLine";btn.append(this._switch(gh.show_buttons!==false,v=>this._set("group_header",{...gh,show_buttons:v})),document.createTextNode("Show group ACK/Clear buttons"));g.append(this._field("Header buttons",btn,"",true));
          g.append(this._field("Button style",this._select(gh.button_mode||"icons",[["icons","Compact icons"],["text","Text buttons"]],v=>this._set("group_header",{...gh,button_mode:v})),"",false));
          const aa=document.createElement("div");aa.className="switchLine";aa.append(this._switch(!!gh.show_ack_alerts_button,v=>this._set("group_header",{...gh,show_ack_alerts_button:v})),document.createTextNode("Show ACK Alerts button"));g.append(this._field("ACK Alerts button",aa,"",false));
          g.append(this._field("Header background",this._text(gh.background||"",v=>this._set("group_header",{...gh,background:v}),"#222222"),"Optional CSS color.",false));
          g.append(this._field("Header text color",this._text(gh.color||"",v=>this._set("group_header",{...gh,color:v}),"#ffffff"),"Optional CSS color.",false));
          const div=document.createElement("div");div.className="switchLine";div.append(this._switch(!!gh.divider,v=>this._set("group_header",{...gh,divider:v})),document.createTextNode("Bottom divider"));g.append(this._field("Divider",div,"",false));
        }
      }

      if(this._panelPage==="advanced"){
        g.append(this._field("Panel ID",this._text(c.panel_id||"annunciator_panel",v=>this._set("panel_id",v)),"Namespace for ACK storage.",true));
        g.append(this._field("Lamp test entity",this._entity(c.lamp_test_entity||"",v=>{this._set("lamp_test_entity",v);this._renderPanel()}),"When ON, tests every non-spacer lamp, including lamps whose source entity is unavailable.",true));
        if(c.lamp_test_entity)g.append(this._field("Lamp test behavior",this._select(c.lamp_test_mode||"steady",[["steady","Illuminate only — steady ON"],["full","Full alert test — configured effect"]],v=>this._set("lamp_test_mode",v)),"Illuminate only suppresses alert animation. Full alert test ignores stored ACKs while testing.",true));
        const schema=document.createElement("div");schema.className="schemaBadge";schema.textContent=`Card ${CARD_VERSION} · Config schema v${CONFIG_VERSION} · Next ACK slot ${c.next_ack_slot||1}`;g.append(this._field("Build / schema",schema,"ACK slots are monotonic and never intentionally reused.",true));
        g.append(this._field("Unavailable text",this._text(c.unavailable_text||"INOP",v=>this._set("unavailable_text",v)),"Displayed for missing/unknown/unavailable entities.",false));
        g.append(this._field("Panel mode",this._select(c.panel_mode||"operator",[["operator","Operator (interactive)"],["presentation","Presentation (read-only)"]],v=>{this._set("panel_mode",v);this._renderPanel()}),"",false));
        if((c.panel_mode||"operator")==="presentation"){
          const mi=document.createElement("div");mi.className="switchLine";mi.append(this._switch(c.presentation_allow_more_info!==false,v=>this._set("presentation_allow_more_info",v)),document.createTextNode("Allow More Info on tap"));g.append(this._field("Presentation interaction",mi,"ACK remains disabled.",true));
        }
        const hist=ensureObj(c.history_overlay,{});const hs=document.createElement("div");hs.className="switchLine";hs.append(this._switch(hist.enabled===true,v=>{this._set("history_overlay",{...hist,enabled:v});this._renderPanel()}),document.createTextNode("Lamp history/debug overlay"));g.append(this._field("Diagnostics overlay",hs,"",true));
        if(hist.enabled===true){const hi=document.createElement("div");hi.className="switchLine";hi.append(this._switch(hist.show_icon!==false,v=>this._set("history_overlay",{...hist,show_icon:v})),document.createTextNode("Show info icon on lamps"));g.append(this._field("Info icon",hi,"",true))}
        const warm=document.createElement("div");warm.className="switchLine";warm.append(this._switch(c.retro_warmup!==false,v=>this._set("retro_warmup",v)),document.createTextNode("Retro warm-up / cool-down"));g.append(this._field("Retro animation",warm,"",true));
      }
    }

    _addLamp(){this._pushUndo("Lamp added");const slot=this._allocateAckSlot();const arr=[...(this._config.entities||[]),normalizeLamp({uid:makeLampUid(),ack_slot:slot,lamp_type:"alarm",severity:"alarm",alert_style:"blink",blink:true,ack_rearm:"auto",primary_mode:"name",secondary_mode:"state"})];this._config={...this._config,entities:arr};this._selectedLamp=arr.length-1;this._navFollowSelection=true;this._dispatch(true);this._renderAll()}
    _addSpacer(){this._pushUndo("Spacer added");const slot=this._allocateAckSlot();const arr=[...(this._config.entities||[]),normalizeLamp({uid:makeLampUid(),ack_slot:slot,entity:""})];this._config={...this._config,entities:arr};this._selectedLamp=arr.length-1;this._navFollowSelection=true;this._dispatch(true);this._renderAll()}
    _remove(){const current=this._lamp();if(!current.uid)return;this._pushUndo(current.entity?"Lamp deleted":"Spacer deleted");let arr=(this._config.entities||[]).map(normalizeLamp);const pid=String(current.pair_id||"");arr=arr.filter((x)=>x.uid!==current.uid).map((x)=>pid&&String(x.pair_id||"")===pid?{...x,pair_id:"",pair_mode:"none"}:x);arr=canonicalizePairOrdering(arr);this._config={...this._config,entities:arr};this._selectedLamp=Math.max(0,Math.min(this._selectedLamp,arr.length-1));this._navFollowSelection=true;this._dispatch(true);this._renderAll()}
    _duplicate(){const current=this._lamp();this._pushUndo(current.entity?"Lamp duplicated":"Spacer duplicated");const slot=this._allocateAckSlot();let arr=[...(this._config.entities||[])];const cp={...current,uid:makeLampUid(),ack_slot:slot,pair_id:"",pair_mode:"none"};arr.splice(this._selectedLamp+1,0,cp);this._config={...this._config,entities:arr};this._selectedLamp=arr.findIndex((x)=>x.uid===cp.uid);this._navFollowSelection=true;this._dispatch(true);this._renderAll()}
    _move(delta){const selected=this._lamp(),uid=selected.uid;if(!uid)return;const blocks=physicalBlocksFor(this._config.entities||[]);const bi=blocks.findIndex((b)=>b.lamps.some((l)=>l.uid===uid)),to=bi+delta;if(bi<0||to<0||to>=blocks.length)return;this._pushUndo("Panel cell moved");[blocks[bi],blocks[to]]=[blocks[to],blocks[bi]];const arr=flattenPhysicalBlocks(blocks);this._config={...this._config,entities:arr};this._selectedLamp=arr.findIndex((x)=>x.uid===uid);this._navFollowSelection=true;this._dispatch(true);this._renderAll()}
  }

  // ============================================================
  // Register
  // ============================================================
  if (!customElements.get("annunciator-grid-card")) {
    customElements.define("annunciator-grid-card", AnnunciatorGridCard);
  }
  if (!customElements.get("annunciator-grid-card-editor")) {
    customElements.define("annunciator-grid-card-editor", AnnunciatorGridCardEditor);
  }

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "annunciator-grid-card",
    name: "Annunciator Grid Card",
    description: "Industrial-style annunciator panel with responsive sizing, ACKs, pairing, groups, conditional rules, and a visual editor.",
    preview: true,
  });

  if (typeof window !== "undefined" && window.__ANNUNCIATOR_TEST_MODE__) {
    window.__ANNUNCIATOR_TEST_API__ = {
      toNumber, applyValueTransform, resolveDisplayUnit, formatValueDisplay, matchesCondition, evalRuleThreshold,
      evaluateLampState, buildLampModel, inferLampType, AckManager, encodeCompactAckState,
      decodeCompactAckState, parseAckStateText, ackLayoutFingerprint, compactPanelToken, ackKeyHash, bitsetToHex, hexHasSlot, slotSetToAdaptive, adaptiveHasSlot, highestStoredAckSlot,
      validateAndRepairConfig, repairMalformedPairs, repairAllSafeConfig, validPairIdsFor, physicalBlocksFor, flattenPhysicalBlocks, canonicalizePairOrdering, computeOccupiedColumns, computePanelMetrics, migrateConfigV2, shouldTriggerChangeAlert, changeAlertDurationMs, shouldAutoRearm, normalizeLamp, normalizeEntities, AnnunciatorGridCard, AnnunciatorGridCardEditor
    };
  }

  console.info(`ANNUNCIATOR-GRID-CARD ${CARD_VERSION} Loaded`);
})()
