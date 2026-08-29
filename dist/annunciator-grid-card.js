// Annunciator Grid Card v1.1.0
// Backward-compatible with v1.83/v2.x configurations; persisted config schema is v3.

(() => {
  const CARD_VERSION = "1.1.0";
  const CONFIG_VERSION = 3;
  // Legacy keys remain accepted by normalization/runtime compatibility paths, but
  // canonical schema-v3 output does not expose them in the focused editor.
  // ============================================================
  // Helpers
  // ============================================================
  const clampNum = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const ensureObj = (v, fallback = {}) => (v && typeof v === "object" ? v : fallback);

  const HEADER_CONTROL_DEFAULTS = Object.freeze({
    acknowledge: "ACKNOWLEDGE",
    silence: "SILENCE",
    reset: "RESET",
    lamp_test: "LAMP TEST",
    clear_acknowledged: "CLEAR ACKNOWLEDGED",
  });
  const LAMP_SHAPES = Object.freeze(["rectangle", "round_rectangle", "pill", "square", "circle", "indicator_dot"]);
  const LAMP_CONTENT_MODES = Object.freeze(["text", "icon", "icon_text"]);
  const ALARM_OUTPUT_MODES = Object.freeze(["none", "media_player", "script", "advanced_action"]);
  const LAMP_SOURCE_OPTIONS = Object.freeze([["entity", "Home Assistant entity"], ["derived", "Derived — rules only"]]);
  const LAMP_TYPE_OPTIONS = Object.freeze([["alarm", "Alarm"], ["status", "Status"], ["sensor", "Sensor"], ["custom", "Custom"]]);
  const COLOR_BEHAVIOR_OPTIONS = Object.freeze([["standard", "Standard ON/OFF"], ["severity", "Severity"], ["custom", "Custom ON/OFF"]]);
  const SEVERITY_OPTIONS = Object.freeze([["status", "Status"], ["warn", "Warning"], ["alarm", "Alarm"], ["trip", "Trip"]]);
  const ALERT_EFFECT_OPTIONS = Object.freeze([["none", "None"], ["blink", "Blink"], ["pulse", "Pulse"], ["wave", "Wave"], ["throb", "Throb"], ["heartbeat", "Heartbeat"], ["flash", "Flash"]]);
  const LAMP_SHAPE_OPTIONS = Object.freeze([["inherit", "Panel default"], ["rectangle", "Rectangle"], ["round_rectangle", "Round rectangle"], ["pill", "Pill"], ["square", "Square"], ["circle", "Circle"], ["indicator_dot", "Indicator dot (compact)"]]);
  const LAMP_BRIGHTNESS_PROFILE_SPECS = Object.freeze([
    Object.freeze({key:"normal",label:"Full brightness"}),
    Object.freeze({key:"dim_off",label:"Dim when OFF"}),
    Object.freeze({key:"dim_on",label:"Dim when ON"}),
    Object.freeze({key:"dim_non_alert",label:"Dim while not alerting"}),
    Object.freeze({key:"dim_all",label:"Dim all states"}),
    Object.freeze({key:"custom",label:"Custom levels"}),
  ]);
  const LAMP_BRIGHTNESS_PROFILE_OPTIONS = Object.freeze(LAMP_BRIGHTNESS_PROFILE_SPECS.map(({key,label})=>Object.freeze([key,label])));
  const HEADER_TALLY_KEYS = Object.freeze(["active", "alarm", "unacknowledged", "total", "unavailable", "alarms_day", "alarms_week", "alarms_month", "alarms_year"]);
  const HISTORICAL_TALLY_DEFAULTS = Object.freeze({
    alarms_day: "ALARM DAY",
    alarms_week: "ALARM WEEK",
    alarms_month: "ALARM MONTH",
    alarms_year: "ALARM YEAR",
  });
  const HISTORICAL_TALLY_SPECS = Object.freeze([
    Object.freeze({ key:"alarms_day", label:HISTORICAL_TALLY_DEFAULTS.alarms_day, entityKey:"alarms_day_entity", window:"24 hours" }),
    Object.freeze({ key:"alarms_week", label:HISTORICAL_TALLY_DEFAULTS.alarms_week, entityKey:"alarms_week_entity", window:"7 days" }),
    Object.freeze({ key:"alarms_month", label:HISTORICAL_TALLY_DEFAULTS.alarms_month, entityKey:"alarms_month_entity", window:"30 days" }),
    Object.freeze({ key:"alarms_year", label:HISTORICAL_TALLY_DEFAULTS.alarms_year, entityKey:"alarms_year_entity", window:"365 days" }),
  ]);
  const LAMP_EDITOR_PAGE_SPECS = Object.freeze(["setup","display","behavior","appearance","interaction","rules","advanced"].map((key)=>Object.freeze({key,label:key[0].toUpperCase()+key.slice(1)})));
  const PANEL_EDITOR_PAGE_SPECS = Object.freeze([
    Object.freeze({key:"layout",label:"Layout"}),Object.freeze({key:"appearance",label:"Appearance"}),Object.freeze({key:"acknowledgement",label:"Acknowledgement"}),
    Object.freeze({key:"alarm_output",label:"Alarm output"}),Object.freeze({key:"groups",label:"Groups"}),Object.freeze({key:"advanced",label:"Advanced"}),
  ]);
  const LIVE_TALLY_SPECS = Object.freeze(["active","alarm","unacknowledged","total","unavailable"].map((key)=>Object.freeze({key,label:key.toUpperCase()})));
  const HEADER_CONTROL_SPECS = Object.freeze([
    Object.freeze({key:"acknowledge",label:"ACKNOWLEDGE",tip:"Acknowledges currently active alert channels."}),
    Object.freeze({key:"silence",label:"SILENCE",tip:"Stops audible output without acknowledging."}),
    Object.freeze({key:"reset",label:"RESET",tip:"Resets only cleared alarm state."}),
    Object.freeze({key:"lamp_test",label:"LAMP TEST",tip:"Toggles the configured lamp-test helper, or runs a three-second local test."}),
    Object.freeze({key:"clear_acknowledged",label:"CLEAR ACKNOWLEDGED",tip:"Clears stored acknowledgement state."}),
  ]);
  const HEADER_FONT_STACKS = Object.freeze({
    inherit: "",
    condensed: '"Arial Narrow","Roboto Condensed","Liberation Sans Narrow",Arial,sans-serif',
    system: 'system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif',
    monospace: 'ui-monospace,"Cascadia Mono","Segoe UI Mono",Consolas,monospace',
    serif: 'Georgia,"Times New Roman",serif',
    custom: "",
  });
  const FONT_FAMILY_OPTIONS = Object.freeze([
    ["inherit", "Panel / built-in default"],
    ["condensed", "Condensed sans-serif"],
    ["system", "System sans-serif"],
    ["monospace", "Monospace"],
    ["serif", "Serif"],
    ["custom", "Custom CSS font"],
  ]);
  const normalizeFontFamily = (value) => {
    const family = String(value || "inherit").toLowerCase();
    return Object.prototype.hasOwnProperty.call(HEADER_FONT_STACKS, family) ? family : "inherit";
  };
  const normalizeCustomFont = (value) => typeof value === "string"
    ? value.replace(/[;{}<>\u0000-\u001f]/g, "").trim().slice(0, 240)
    : "";
  const configuredFontStack = (family, custom) => {
    const normalized = normalizeFontFamily(family);
    return normalized === "custom" ? normalizeCustomFont(custom) : (HEADER_FONT_STACKS[normalized] || "");
  };
  const normalizeHeaderTallyLabel = (value, fallback) => {
    const cleaned = typeof value === "string" ? value.replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 80) : "";
    return cleaned || fallback;
  };
  const normalizeHistoricalTallySource = (value) => ["entity","entities"].includes(String(value || "local").toLowerCase()) ? "entities" : "local";
  const normalizeEntityId = (value) => typeof value === "string" ? value.trim().slice(0, 255) : "";
  const historicalTallyEntityValues = (tallies, states = {}) => {
    const normalized=ensureObj(tallies,{}),allStates=ensureObj(states,{}),values={};
    HISTORICAL_TALLY_SPECS.forEach(({key,entityKey})=>{
      const entityId=normalizeEntityId(normalized[entityKey]),raw=entityId?allStates[entityId]?.state:undefined;
      const normalizedRaw=typeof raw==="string"?raw.trim():raw;
      const numeric=normalizedRaw===undefined||normalizedRaw===null||normalizedRaw===""?NaN:Number(normalizedRaw);
      values[key]=Number.isFinite(numeric)&&numeric>=0?numeric:null;
    });
    return values;
  };
  const formatHeaderTallyValue = (value) => {
    const normalized=typeof value==="string"?value.trim():value;
    if(normalized===null||normalized===undefined||normalized==="")return "—";
    const numeric=Number(normalized);return Number.isFinite(numeric)&&numeric>=0?String(numeric):"—";
  };
  const resolveLampFontStack = (item, config = {}) => {
    const lamp = ensureObj(item, {}), cfg = ensureObj(config, {});
    const ownFamily = normalizeFontFamily(lamp.font_family);
    if (ownFamily !== "inherit") return configuredFontStack(ownFamily, lamp.font_custom);
    return configuredFontStack(cfg.lamp_font_family, cfg.lamp_font_custom);
  };
  const HEADER_APPEARANCE_COLOR_KEYS = Object.freeze(["background", "border", "title_color", "tally_color", "button_text", "button_background", "button_hover", "button_border"]);
  const HEADER_APPEARANCE_NONE_KEYS = Object.freeze(["background_none", "border_none", "button_background_none", "button_border_none"]);
  const normalizeHeaderAppearance = (value) => {
    const src = ensureObj(value, {}), out = { ...src };
    HEADER_APPEARANCE_COLOR_KEYS.forEach((key) => {
      out[`${key}_enabled`] = src[`${key}_enabled`] === true;
      out[key] = typeof src[key] === "string" ? src[key].trim() : "";
    });
    HEADER_APPEARANCE_NONE_KEYS.forEach((key) => { out[key] = src[key] === true; });
    out.font_family = normalizeFontFamily(src.font_family);
    out.font_custom = normalizeCustomFont(src.font_custom);
    const weight = String(src.font_weight || "inherit");
    out.font_weight = ["400", "500", "600", "700", "800", "900"].includes(weight) ? weight : "inherit";
    const numeric = (key, fallback, min, max) => Math.max(min, Math.min(max, clampNum(src[key], fallback)));
    out.border_width = numeric("border_width", 1, 0, 12);
    out.button_border_width = numeric("button_border_width", 1, 0, 12);
    out.title_font_size_enabled = src.title_font_size_enabled === true;
    out.title_font_size = numeric("title_font_size", 16, 8, 72);
    out.tally_font_size_enabled = src.tally_font_size_enabled === true;
    out.tally_font_size = numeric("tally_font_size", 12, 8, 48);
    out.button_font_size_enabled = src.button_font_size_enabled === true;
    out.button_font_size = numeric("button_font_size", 12, 8, 48);
    out.button_radius_enabled = src.button_radius_enabled === true;
    out.button_radius = numeric("button_radius", 8, 0, 40);
    out.radius_enabled = src.radius_enabled === true;
    out.radius = numeric("radius", 12, 0, 80);
    return out;
  };
  const normalizeLampContentMode = (value) => {
    const mode = String(value || "text").toLowerCase();
    return LAMP_CONTENT_MODES.includes(mode) ? mode : "text";
  };
  const normalizeLampIconSize = (value) => Math.max(12, Math.min(160, Math.round(clampNum(value, 40))));
  const normalizePairShapeMode = (value) => String(value || "independent").toLowerCase() === "split_pill" ? "split_pill" : "independent";
  const LAMP_ICON_COLOR_MODES = Object.freeze(["follow", "single", "state"]);
  const normalizeLampIconColorMode = (value, legacyEnabled=false) => {
    const mode = String(value || "").toLowerCase();
    return LAMP_ICON_COLOR_MODES.includes(mode) ? mode : legacyEnabled === true ? "single" : "follow";
  };
  const resolveLampIconColor = (item, resolved={}) => {
    if (resolved.available === false) return "";
    const mode = normalizeLampIconColorMode(item?.icon_color_mode, item?.icon_color_enabled === true);
    if (mode === "single") return String(item?.icon_color || "").trim().slice(0, 160);
    if (mode === "state") return String(resolved.isOn === true ? item?.icon_color_on || "" : item?.icon_color_off || "").trim().slice(0, 160);
    return "";
  };
  const defaultIconForEntity = (entityId) => ({
    alarm_control_panel:"mdi:shield-home", binary_sensor:"mdi:radiobox-marked", climate:"mdi:thermostat",
    cover:"mdi:window-shutter", fan:"mdi:fan", light:"mdi:lightbulb", lock:"mdi:lock",
    media_player:"mdi:speaker", sensor:"mdi:gauge", siren:"mdi:bullhorn", switch:"mdi:toggle-switch",
  })[String(entityId || "").split(".")[0]] || "mdi:circle";
  const resolveLampIcon = (item, stateObj) => String(item?.icon || stateObj?.attributes?.icon || defaultIconForEntity(item?.entity)).trim() || "mdi:circle";
  const normalizeCellType = (value) => {
    const src = ensureObj(value, {});
    if (String(src.entity || "").trim()) return "lamp";
    // A derived lamp intentionally has no entity. Treat source_mode as the
    // semantic signal so hand-written YAML does not also need editor-only
    // cell_type metadata to avoid being normalized into a spacer.
    if (String(src.source_mode || "").toLowerCase() === "derived") return "lamp";
    return String(src.cell_type || "").toLowerCase() === "lamp" ? "lamp" : "spacer";
  };
  const isSpacerItem = (value) => normalizeCellType(value) === "spacer";
  const normalizeLampSourceMode = (value) => String(value || "entity").toLowerCase() === "derived" ? "derived" : "entity";
  const normalizeDerivedBaseState = (value) => String(value || "off").toLowerCase() === "on" ? "on" : "off";
  const isDerivedLamp = (value) => !isSpacerItem(value) && normalizeLampSourceMode(value?.source_mode) === "derived";
  const isOperationalLamp = (value) => !isSpacerItem(value) && (isDerivedLamp(value) || !!String(value?.entity || "").trim());
  const lampStateObject = (value, states = {}) => {
    const item = ensureObj(value, {});
    if (!isDerivedLamp(item)) return ensureObj(states, {})[String(item.entity || "").trim()] || null;
    const label = String(item.name_override || item.primary_text || "Derived lamp").trim() || "Derived lamp";
    return {
      state: normalizeDerivedBaseState(item.derived_base_state),
      attributes: { friendly_name: label, ...(item.icon ? { icon: String(item.icon) } : {}) },
      last_changed: "",
      last_updated: "",
    };
  };
  const normalizeShape = (value) => LAMP_SHAPES.includes(String(value || "").toLowerCase()) ? String(value).toLowerCase() : "inherit";
  const computeShapeGeometry = (value, width, height, mullion = 6) => {
    const shape=normalizeShape(value),edge=Math.max(0,Math.min(100,clampNum(mullion,6)));
    const available=Math.max(20,Math.min(Math.max(0,clampNum(width,0)),Math.max(0,clampNum(height,0)))-(edge*2));
    const size=["square","circle","indicator_dot"].includes(shape)
      ? (shape==="indicator_dot"?Math.min(available,Math.max(72,available*.80)):available)
      : null;
    return { shape, floating:["pill","square","circle","indicator_dot"].includes(shape), size:size===null?null:Math.max(20,Math.round(size)) };
  };
  const normalizeSpan = (value) => Math.max(1, Math.min(24, Math.floor(clampNum(value, 1))));
  const normalizeAlarmOutput = (value) => {
    const src = ensureObj(value, {});
    const mode = ALARM_OUTPUT_MODES.includes(String(src.mode || "none").toLowerCase()) ? String(src.mode || "none").toLowerCase() : "none";
    const metadata = src.media_metadata && typeof src.media_metadata === "object" && !Array.isArray(src.media_metadata) ? src.media_metadata : {};
    return {
      ...src,
      mode,
      media_player: String(src.media_player || "").trim(),
      media_content_id: String(src.media_content_id || ""),
      media_content_type: String(src.media_content_type || "music"),
      media_metadata: metadata,
      script: String(src.script || "").trim(),
      silence_script: String(src.silence_script || "").trim(),
      action: ensureObj(src.action, {}),
      silence_action: ensureObj(src.silence_action, {}),
    };
  };
  const normalizeHeaderV3 = (src) => {
    const old = headerAckButtons(src);
    const tallies = ensureObj(src.header_tallies, {});
    const controls = ensureObj(src.header_controls, {});
    const hasV3Controls = src.header_controls && typeof src.header_controls === "object";
    const control = (key, legacyEnabled, legacyLabel = "") => {
      const value = ensureObj(controls[key], {});
      return { enabled: value.enabled === undefined ? legacyEnabled : value.enabled === true, label: String(value.label || (!hasV3Controls && legacyLabel ? legacyLabel : HEADER_CONTROL_DEFAULTS[key])) };
    };
    return {
      tallies: {
        active: tallies.active === true,
        alarm: tallies.alarm === true,
        unacknowledged: tallies.unacknowledged === true,
        total: tallies.total === true,
        unavailable: tallies.unavailable === true,
        alarms_day: tallies.alarms_day === true,
        alarms_week: tallies.alarms_week === true,
        alarms_month: tallies.alarms_month === true,
        alarms_year: tallies.alarms_year === true,
        alarms_day_label: normalizeHeaderTallyLabel(tallies.alarms_day_label, HISTORICAL_TALLY_DEFAULTS.alarms_day),
        alarms_week_label: normalizeHeaderTallyLabel(tallies.alarms_week_label, HISTORICAL_TALLY_DEFAULTS.alarms_week),
        alarms_month_label: normalizeHeaderTallyLabel(tallies.alarms_month_label, HISTORICAL_TALLY_DEFAULTS.alarms_month),
        alarms_year_label: normalizeHeaderTallyLabel(tallies.alarms_year_label, HISTORICAL_TALLY_DEFAULTS.alarms_year),
        history_source: normalizeHistoricalTallySource(tallies.history_source??tallies.historical_source),
        alarms_day_entity: normalizeEntityId(tallies.alarms_day_entity),
        alarms_week_entity: normalizeEntityId(tallies.alarms_week_entity),
        alarms_month_entity: normalizeEntityId(tallies.alarms_month_entity),
        alarms_year_entity: normalizeEntityId(tallies.alarms_year_entity),
      },
      controls: {
        acknowledge: control("acknowledge", old.ackAll, "ACK ALL"),
        silence: control("silence", false),
        reset: control("reset", false),
        lamp_test: control("lamp_test", false),
        clear_acknowledged: control("clear_acknowledged", old.clearAck, "CLEAR ACK"),
      },
    };
  };
  const PANEL_LAMP_FRAME_MODES = Object.freeze(["follow_panel", "theme", "custom"]);
  const SPACER_APPEARANCE_MODES = Object.freeze(["default", "blend", "custom"]);
  const SPACER_ITEM_APPEARANCE_MODES = Object.freeze(["inherit", ...SPACER_APPEARANCE_MODES]);
  const normalizePanelAppearance = (value) => {
    const src = ensureObj(value, {});
    const requested = String(src.lamp_frame_mode || "follow_panel").toLowerCase();
    return {
      ...src,
      background_none: src.background_none === true,
      border_none: src.border_none === true,
      frame_none: src.frame_none === true,
      lamp_frame_none: src.lamp_frame_none === true,
      lamp_border_none: src.lamp_border_none === true,
      lamp_frame_mode: PANEL_LAMP_FRAME_MODES.includes(requested) ? requested : "follow_panel",
      lamp_frame: typeof src.lamp_frame === "string" ? src.lamp_frame.trim() : "",
      radius_enabled: src.radius_enabled === true,
      radius: Math.max(0, Math.min(120, clampNum(src.radius, 12))),
      frame_radius_enabled: src.frame_radius_enabled === true,
      frame_radius: Math.max(0, Math.min(120, clampNum(src.frame_radius, 12))),
    };
  };
  const normalizeSpacerAppearance = (value, perItem = false) => {
    const src = ensureObj(value, {});
    const allowed = perItem ? SPACER_ITEM_APPEARANCE_MODES : SPACER_APPEARANCE_MODES;
    const fallback = perItem ? "inherit" : "default";
    const requested = String(src.mode || fallback).toLowerCase();
    const color = (key, alias = "") => {
      const raw = src[key] ?? (alias ? src[alias] : "");
      return typeof raw === "string" ? raw.trim() : "";
    };
    return {
      ...src,
      mode: allowed.includes(requested) ? requested : fallback,
      fill: color("fill"),
      bezel: color("bezel", "frame"),
      border: color("border"),
      fill_none: src.fill_none === true,
      bezel_none: src.bezel_none === true,
      border_none: src.border_none === true,
      border_width: Math.max(0, Math.min(24, clampNum(src.border_width, 2))),
    };
  };
  const resolveSpacerAppearance = (item, config, colors = {}) => {
    const local = normalizeSpacerAppearance(item?.spacer_appearance, true);
    const global = normalizeSpacerAppearance(config?.spacer_appearance, false);
    const selected = local.mode === "inherit" ? global : local;
    if (selected.mode === "blend") return { mode:"blend", fill:"transparent", bezel:"transparent", border:"transparent", borderWidth:0 };
    if (selected.mode !== "custom") return { mode:"default", fill:"", bezel:"", border:"", borderWidth:2 };
    return {
      mode:"custom",
      fill:selected.fill_none ? "transparent" : (selected.fill || globalColorValue(colors, "off", BUILTIN_COLORS.off)),
      bezel:selected.bezel_none ? "transparent" : (selected.bezel || globalColorValue(colors, "blank", BUILTIN_COLORS.blank)),
      border:selected.border_none ? "transparent" : (selected.border || "rgba(0,0,0,0.55)"),
      borderWidth:selected.border_none ? 0 : selected.border_width,
    };
  };
  const INACTIVE_LAMP_DEFAULTS = Object.freeze(["normal", "dim"]);
  const INACTIVE_LAMP_MODES = Object.freeze(["inherit", ...INACTIVE_LAMP_DEFAULTS]);
  const normalizeInactiveLampDefault = (value) => String(value || "normal").toLowerCase() === "dim" ? "dim" : "normal";
  const normalizeInactiveLampMode = (value) => {
    const mode = String(value || "inherit").toLowerCase();
    return INACTIVE_LAMP_MODES.includes(mode) ? mode : "inherit";
  };
  const normalizeInactiveBrightness = (value) => Math.max(10, Math.min(90, Math.round(clampNum(value, 32))));
  const resolveInactiveLampMode = (item, config) => {
    const local = normalizeInactiveLampMode(item?.inactive_lamp_mode);
    return local === "inherit" ? normalizeInactiveLampDefault(config?.inactive_lamp_default) : local;
  };
  const LAMP_BRIGHTNESS_PROFILES = Object.freeze(LAMP_BRIGHTNESS_PROFILE_SPECS.map(({key})=>key));
  const isLampBrightnessConfigObject = (value,allowInherit=false) => {
    if(!value||typeof value!=="object"||Array.isArray(value))return false;
    const profile=String(value.profile??"").toLowerCase();
    return LAMP_BRIGHTNESS_PROFILES.includes(profile)||(allowInherit&&profile==="inherit");
  };
  const normalizeLampBrightnessProfile = (value, allowInherit=false) => {
    const profile=String(value || (allowInherit?"inherit":"normal")).toLowerCase();
    if(allowInherit&&profile==="inherit")return "inherit";
    return LAMP_BRIGHTNESS_PROFILES.includes(profile)?profile:"normal";
  };
  const normalizeLampBrightnessLevel = (value, fallback=100) => {
    const numeric=typeof value==="number"?value:typeof value==="string"&&value.trim()?Number(value):NaN;
    const fallbackNumeric=typeof fallback==="number"?fallback:typeof fallback==="string"&&fallback.trim()?Number(fallback):100;
    const selected=Number.isFinite(numeric)?numeric:Number.isFinite(fallbackNumeric)?fallbackNumeric:100;
    return Math.max(10,Math.min(100,Math.round(selected)));
  };
  const lampBrightnessLevelsForProfile = (profile, dimLevel=32, custom={}) => {
    const normalizedProfile=normalizeLampBrightnessProfile(profile),dim=normalizeLampBrightnessLevel(dimLevel,32),src=ensureObj(custom,{});
    if(normalizedProfile==="dim_off")return {off:dim,on:100,alert:100};
    if(normalizedProfile==="dim_on")return {off:100,on:dim,alert:100};
    if(normalizedProfile==="dim_non_alert")return {off:dim,on:dim,alert:100};
    if(normalizedProfile==="dim_all")return {off:dim,on:dim,alert:dim};
    if(normalizedProfile==="custom")return {
      off:normalizeLampBrightnessLevel(src.off,dim),
      on:normalizeLampBrightnessLevel(src.on,100),
      alert:normalizeLampBrightnessLevel(src.alert,100),
    };
    return {off:100,on:100,alert:100};
  };
  const normalizeLampBrightnessConfig = (value,allowInherit=false) => {
    const src=ensureObj(value,{}),profile=normalizeLampBrightnessProfile(src.profile,allowInherit);
    if(allowInherit&&profile==="inherit")return {profile:"inherit"};
    const dimLevel=normalizeLampBrightnessLevel(src.dim_level,32);
    return {profile,dim_level:dimLevel,...lampBrightnessLevelsForProfile(profile,dimLevel,src)};
  };
  const normalizePanelLampBrightness = (config={}) => {
    const cfg=ensureObj(config,{}),hasCanonical=isLampBrightnessConfigObject(cfg.lamp_brightness,false),src=hasCanonical?ensureObj(cfg.lamp_brightness,{}):{};
    const profile=hasCanonical?normalizeLampBrightnessProfile(src.profile):normalizeInactiveLampDefault(cfg.inactive_lamp_default)==="dim"?"dim_off":"normal";
    const dimLevel=hasCanonical?normalizeLampBrightnessLevel(src.dim_level,32):normalizeInactiveBrightness(cfg.inactive_lamp_brightness);
    return {profile,dim_level:dimLevel,...lampBrightnessLevelsForProfile(profile,dimLevel,src)};
  };
  const normalizePerLampBrightness = (item={},config={}) => {
    const lamp=ensureObj(item,{}),panel=normalizePanelLampBrightness(config),hasCanonical=isLampBrightnessConfigObject(lamp.lamp_brightness,true),src=hasCanonical?ensureObj(lamp.lamp_brightness,{}):{};
    const legacy=normalizeInactiveLampMode(lamp.inactive_lamp_mode);
    const localProfile=hasCanonical?normalizeLampBrightnessProfile(src.profile,true):legacy==="dim"?"dim_off":legacy;
    if(localProfile==="inherit")return {...panel,local_profile:"inherit",source:"panel"};
    const dimLevel=hasCanonical&&src.dim_level!==undefined?normalizeLampBrightnessLevel(src.dim_level,32):panel.dim_level;
    const customFallback=localProfile==="custom"?{off:src.off??dimLevel,on:src.on??100,alert:src.alert??100}:src;
    return {profile:localProfile,dim_level:dimLevel,...lampBrightnessLevelsForProfile(localProfile,dimLevel,customFallback),local_profile:localProfile,source:"lamp"};
  };
  const lampBrightnessAttentionActive = (item,resolved) => {
    if(resolved?.alert?.changeActive||resolved?.alert?.active||resolved?.alert?.mainConditionMatched)return true;
    const severity=String(resolved?.severity||"").toLowerCase(),condition=typeof rearmConditionMatched==="function"?rearmConditionMatched(resolved):false;
    return condition&&(inferLampType(item)==="alarm"||severity==="alarm"||severity==="trip");
  };
  const resolveLampBrightness = (item,config,resolved,options={}) => {
    const levels=normalizePerLampBrightness(item,config);
    if(!resolved?.available)return {...levels,state:"unavailable",percent:100,opacity:1,dimmed:false};
    if(options.lampTest===true)return {...levels,state:"test",percent:100,opacity:1,dimmed:false};
    const attention=options.attentionActive===undefined?lampBrightnessAttentionActive(item,resolved):options.attentionActive===true;
    const state=attention?"alert":resolved?.isOn?"on":"off",percent=normalizeLampBrightnessLevel(levels[state],100);
    return {...levels,state,percent,opacity:percent/100,dimmed:percent<100};
  };
  const APPEARANCE_PRESET_LIMIT = 24;
  const clonePlainObject = (value) => {
    try {
      const cloned = JSON.parse(JSON.stringify(ensureObj(value, {})));
      return cloned && typeof cloned === "object" && !Array.isArray(cloned) ? cloned : {};
    } catch (_) { return {}; }
  };
  const captureAppearancePreset = (config) => {
    const cfg = ensureObj(config, {});
    const theme = String(cfg.panel_theme || "classic").toLowerCase();
    const style = String(cfg.default_lamp_style || "modern").toLowerCase();
    const lens = String(cfg.default_lens_type || "plastic").toLowerCase();
    return {
      panel_theme: ["classic", "avionics", "neon"].includes(theme) ? theme : "classic",
      default_lamp_style: ["modern", "retro"].includes(style) ? style : "modern",
      default_lens_type: ["plastic", "glass", "frosted", "smoked"].includes(lens) ? lens : "plastic",
      panel_appearance: normalizePanelAppearance(cfg.panel_appearance),
      header_appearance: normalizeHeaderAppearance(cfg.header_appearance),
      spacer_appearance: normalizeSpacerAppearance(cfg.spacer_appearance, false),
      severity_colors: clonePlainObject(cfg.severity_colors),
      severity_appearance: clonePlainObject(cfg.severity_appearance),
      allow_lamp_style_override: cfg.allow_lamp_style_override !== false,
      allow_lens_override: cfg.allow_lens_override !== false,
      imperfections: cfg.imperfections !== false,
      flicker: cfg.flicker === true,
      retro_warmup: cfg.retro_warmup !== false,
      inactive_lamp_default: normalizeInactiveLampDefault(cfg.inactive_lamp_default),
      inactive_lamp_brightness: normalizeInactiveBrightness(cfg.inactive_lamp_brightness),
      lamp_brightness: normalizePanelLampBrightness(cfg),
    };
  };
  const normalizeAppearancePresets = (value) => {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    return value.slice(0, APPEARANCE_PRESET_LIMIT).map((raw, index) => {
      const src = ensureObj(raw, {});
      let id = String(src.id || `preset_${index + 1}`).trim().slice(0, 80) || `preset_${index + 1}`;
      while (seen.has(id)) id = `${id}_${index + 1}`;
      seen.add(id);
      const name = String(src.name || `Preset ${index + 1}`).trim().slice(0, 60) || `Preset ${index + 1}`;
      return { id, name, values: captureAppearancePreset(src.values) };
    });
  };
  const applyAppearancePreset = (config, preset) => {
    const cfg = ensureObj(config, {}), normalized = normalizeAppearancePresets([preset])[0];
    if (!normalized) return { ...cfg };
    const values = captureAppearancePreset(normalized.values);
    return {
      ...cfg, ...values,
      panel_appearance: { ...values.panel_appearance },
      header_appearance: { ...values.header_appearance },
      spacer_appearance: { ...values.spacer_appearance },
      severity_colors: { ...values.severity_colors },
      severity_appearance: { ...values.severity_appearance },
      lamp_brightness: { ...values.lamp_brightness },
    };
  };
  const LAMP_APPEARANCE_PRESET_LIMIT = 24;
  const captureLampAppearancePreset = (value) => {
    const lamp = normalizeLamp(value),brightness=isLampBrightnessConfigObject(lamp.lamp_brightness,true)?normalizeLampBrightnessConfig(lamp.lamp_brightness,true):null;
    return {
      color_behavior: normalizeColorBehavior(lamp.color_behavior),
      use_color_override: lamp.use_color_override === true,
      colors: clonePlainObject(lamp.colors),
      font_family: normalizeFontFamily(lamp.font_family),
      font_custom: normalizeCustomFont(lamp.font_custom),
      icon_size: normalizeLampIconSize(lamp.icon_size),
      icon_color_enabled: lamp.icon_color_enabled === true,
      icon_color_mode: normalizeLampIconColorMode(lamp.icon_color_mode, lamp.icon_color_enabled === true),
      icon_color: String(lamp.icon_color || "").trim().slice(0, 160),
      icon_color_on: String(lamp.icon_color_on || "").trim().slice(0, 160),
      icon_color_off: String(lamp.icon_color_off || "").trim().slice(0, 160),
      shape: normalizeShape(lamp.shape),
      translucent_illumination: lamp.translucent_illumination === true,
      lamp_style: ["inherit", "modern", "retro"].includes(String(lamp.lamp_style)) ? String(lamp.lamp_style) : "inherit",
      lens_type: ["inherit", "plastic", "glass", "frosted", "smoked"].includes(String(lamp.lens_type)) ? String(lamp.lens_type) : "inherit",
      inactive_lamp_mode: normalizeInactiveLampMode(lamp.inactive_lamp_mode),
      ...(brightness?{lamp_brightness:brightness}:{}),
    };
  };
  const normalizeLampAppearancePresets = (value) => {
    if (!Array.isArray(value)) return [];
    const seen = new Set();
    return value.slice(0, LAMP_APPEARANCE_PRESET_LIMIT).map((raw, index) => {
      const src = ensureObj(raw, {});
      let id = String(src.id || `lamp_preset_${index + 1}`).trim().slice(0, 80) || `lamp_preset_${index + 1}`;
      while (seen.has(id)) id = `${id}_${index + 1}`;
      seen.add(id);
      const name = String(src.name || `Lamp preset ${index + 1}`).trim().slice(0, 60) || `Lamp preset ${index + 1}`;
      return { id, name, values:captureLampAppearancePreset(src.values) };
    });
  };
  const applyLampAppearancePreset = (lamp, preset) => {
    const normalized = normalizeLampAppearancePresets([preset])[0];
    if (!normalized) return normalizeLamp(lamp);
    const values = captureLampAppearancePreset(normalized.values);
    const next={...normalizeLamp(lamp),...values,colors:{...values.colors}};
    if(values.lamp_brightness!==undefined)next.lamp_brightness={...values.lamp_brightness};else delete next.lamp_brightness;
    return normalizeLamp(next);
  };
  const LAMP_DISPLAY_COPY_KEYS = Object.freeze([
    "content_mode", "icon", "icon_size", "icon_color_enabled", "icon_color_mode", "icon_color", "icon_color_on", "icon_color_off",
    "icon_show_primary", "icon_show_secondary", "icon_show_tertiary", "font_family", "font_custom", "use_templates", "label_template", "legend_template",
    "primary_mode", "primary_text", "secondary_mode", "secondary_text", "tertiary_mode", "tertiary_text", "dynamic_text", "value_format",
  ]);
  const cloneDisplayValue = (value) => {
    if (value === undefined) return undefined;
    if (value === null || typeof value !== "object") return value;
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return Array.isArray(value) ? [] : {}; }
  };
  const captureLampDisplaySettings = (value) => {
    const lamp=normalizeLamp(value),out={};
    LAMP_DISPLAY_COPY_KEYS.forEach((key)=>{
      if(key==="dynamic_text")out[key]=normalizeDynamicTextConfig(lamp.dynamic_text);
      else if(Object.prototype.hasOwnProperty.call(lamp,key))out[key]=cloneDisplayValue(lamp[key]);
    });
    return out;
  };
  const applyLampDisplaySettings = (lamp, source) => normalizeLamp({...normalizeLamp(lamp),...captureLampDisplaySettings(source)});
  const normalizeAckRearmDefault = (value) => {
    if (value === undefined || value === null || value === "") return "auto";
    const requested = String(value).toLowerCase();
    return requested === "auto" || requested === "manual" ? requested : "manual";
  };
  const resolveAckRearm = (item, config) => {
    const requested = String(item?.ack_rearm || "manual").toLowerCase();
    if (requested === "inherit") return normalizeAckRearmDefault(config?.ack_rearm_default);
    return requested === "auto" ? "auto" : "manual";
  };
  const alarmOutputTransition = (previous, activeIds, event = "update") => {
    const prior = ensureObj(previous, {}), before = new Set(Array.isArray(prior.activeIds) ? prior.activeIds : []), requested = event === "silence" && (!Array.isArray(activeIds) || !activeIds.length) ? [...before] : activeIds, now = [...new Set(Array.isArray(requested) ? requested.map(String).filter(Boolean) : [])].sort();
    const newlyArrived = now.filter(id => !before.has(id));
    let silenced = prior.silenced === true;
    if (event === "silence") silenced = true;
    if (newlyArrived.length) silenced = false;
    if (!now.length) silenced = false;
    return { activeIds: now, silenced, newlyArrived, shouldSound: now.length > 0 && !silenced && (newlyArrived.length > 0 || prior.sounding !== true), shouldStop: event === "silence" || (!now.length && prior.sounding === true), sounding: now.length > 0 && !silenced };
  };
  const ALARM_HISTORY_WINDOWS = Object.freeze({
    alarms_day: 24 * 60 * 60 * 1000,
    alarms_week: 7 * 24 * 60 * 60 * 1000,
    alarms_month: 30 * 24 * 60 * 60 * 1000,
    alarms_year: 365 * 24 * 60 * 60 * 1000,
  });
  const normalizeAlarmHistory = (value, now = Date.now()) => {
    const src = ensureObj(value, {}), timestamp = Number.isFinite(Number(now)) ? Number(now) : Date.now();
    const oldest = timestamp - ALARM_HISTORY_WINDOWS.alarms_year;
    const events = (Array.isArray(src.events) ? src.events : [])
      .map(Number)
      .filter((entry) => Number.isFinite(entry) && entry >= oldest && entry <= timestamp + 300000)
      .sort((a, b) => a - b)
      .slice(-50000);
    const activeIds = [...new Set((Array.isArray(src.activeIds) ? src.activeIds : []).map(String).map((id) => id.trim()).filter(Boolean))].slice(0, 5000).sort();
    return { version: 1, events, activeIds };
  };
  const sortedLowerBound = (values, target) => {
    let low=0,high=values.length;
    while(low<high){const middle=(low+high)>>1;if(values[middle]<target)low=middle+1;else high=middle}
    return low;
  };
  const alarmHistoryCountsNormalized = (history, timestamp) => {
    const counts={};
    Object.entries(ALARM_HISTORY_WINDOWS).forEach(([key,windowMs])=>{counts[key]=history.events.length-sortedLowerBound(history.events,timestamp-windowMs)});
    return counts;
  };
  const alarmHistoryCounts = (value, now = Date.now()) => {
    const timestamp = Number.isFinite(Number(now)) ? Number(now) : Date.now();
    return alarmHistoryCountsNormalized(normalizeAlarmHistory(value, timestamp),timestamp);
  };
  const alarmHistoryTransition = (previous, activeIds, now = Date.now(), previousIsNormalized = false) => {
    const timestamp = Number.isFinite(Number(now)) ? Number(now) : Date.now();
    const prior = previousIsNormalized ? previous : normalizeAlarmHistory(previous, timestamp), before = new Set(prior.activeIds);
    const current = [...new Set((Array.isArray(activeIds) ? activeIds : []).map(String).map((id) => id.trim()).filter(Boolean))].slice(0, 5000).sort();
    const newlyArrived = current.filter((id) => !before.has(id));
    let events=prior.events;
    if(newlyArrived.length){events=[...events,...newlyArrived.map(()=>timestamp)];if(events.length>1&&events[events.length-newlyArrived.length-1]>timestamp)events.sort((a,b)=>a-b);if(events.length>50000)events=events.slice(-50000)}
    const history={version:1,events,activeIds:current};
    return { ...history, counts: alarmHistoryCountsNormalized(history, timestamp), newlyArrived };
  };
  const alarmHistoryStorageKey = (panelId) => `annun_alarm_history::${String(panelId || "annunciator_panel")}`;

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
    const header = normalizeHeaderV3(src);
    src.header_tallies = header.tallies;
    src.header_controls = header.controls;
    src.alarm_output = normalizeAlarmOutput(src.alarm_output);
    src.ack_rearm_default = normalizeAckRearmDefault(src.ack_rearm_default);
    if (src.panel_appearance === undefined) src.panel_appearance = {};
    else src.panel_appearance = normalizePanelAppearance(src.panel_appearance);
    if (src.header_appearance === undefined) src.header_appearance = {};
    else src.header_appearance = normalizeHeaderAppearance(src.header_appearance);
    if (src.spacer_appearance === undefined) src.spacer_appearance = {};
    else src.spacer_appearance = normalizeSpacerAppearance(src.spacer_appearance, false);
    if (src.inactive_lamp_default !== undefined) src.inactive_lamp_default = normalizeInactiveLampDefault(src.inactive_lamp_default);
    if (src.inactive_lamp_brightness !== undefined) src.inactive_lamp_brightness = normalizeInactiveBrightness(src.inactive_lamp_brightness);
    if (src.lamp_brightness !== undefined) {
      if(isLampBrightnessConfigObject(src.lamp_brightness,false))src.lamp_brightness=normalizeLampBrightnessConfig(src.lamp_brightness,false);
      else delete src.lamp_brightness;
    }
    if (src.lamp_font_family !== undefined) src.lamp_font_family = normalizeFontFamily(src.lamp_font_family);
    if (src.lamp_font_custom !== undefined) src.lamp_font_custom = normalizeCustomFont(src.lamp_font_custom);
    if (src.appearance_presets !== undefined) src.appearance_presets = normalizeAppearancePresets(src.appearance_presets);
    if (src.lamp_appearance_presets !== undefined) src.lamp_appearance_presets = normalizeLampAppearancePresets(src.lamp_appearance_presets);
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

  // Header ACK controls were a single configurable button before v1.0.2.
  // New configurations use two independent buttons. Legacy configurations keep
  // their previous single-button visibility until the user changes the new toggles.
  const headerAckButtons = (cfg) => {
    const c = cfg || {};
    const own = (k) => Object.prototype.hasOwnProperty.call(c, k);
    const hasNew = own("show_ack_all") || own("show_clear_ack");
    if (hasNew) {
      return {
        ackAll: own("show_ack_all") ? c.show_ack_all !== false : true,
        clearAck: own("show_clear_ack") ? c.show_clear_ack !== false : true,
        legacy: false,
      };
    }
    const hasLegacy = own("show_reset_ack") || own("reset_ack_action") || own("reset_ack_label");
    if (hasLegacy) {
      if (c.show_reset_ack === false) return { ackAll: false, clearAck: false, legacy: true };
      const action = String(c.reset_ack_action || "clear").toLowerCase();
      return { ackAll: action === "ack_all", clearAck: action !== "ack_all", legacy: true };
    }
    // No header keys means a hand-written/minimal pre-v1.0.2 configuration.
    // v1.x showed its default CLEAR ACK button in this case. New cards created
    // by the visual editor explicitly store show_ack_all/show_clear_ack=true.
    return { ackAll: false, clearAck: true, legacy: true };
  };

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

  const autoRuleSourceEntity = (auto) => String(auto?.source_entity || "").trim();

  const autoRuleUsesExternalSource = (auto) => {
    const explicit = String(auto?.source || "").toLowerCase();
    return explicit === "entity" || !!autoRuleSourceEntity(auto);
  };

  const autoRuleForceState = (auto) => {
    const explicit = String(auto?.force_state || "").toLowerCase();
    if (explicit === "on" || explicit === "off") return explicit;
    // Backward compatibility with pre-v1.0.2 rule flags.
    if (auto?.force_off === true) return "off";
    if (auto?.force_on === true) return "on";
    return "inherit";
  };

  const describeAutoCondition = (auto) => {
    const kind = String(auto?.__match_kind || auto?.kind || "").toLowerCase();
    const configuredSource = autoRuleSourceEntity(auto);
    const source = String(auto?.__match_source || configuredSource || (autoRuleUsesExternalSource(auto) ? "[select source entity]" : "this lamp"));
    const prefix = source === "this lamp" ? "" : `${source}: `;
    if (kind === "numeric") return `${prefix}numeric ${describeThresholdRule(auto.rule)}`;
    if (kind === "state") return `${prefix}state == ${yamlQuote(auto.state ?? "")}`;
    if (kind === "string") return `${prefix}string ${String(auto.match || "contains")} ${yamlQuote(auto.value || "")}`;
    return `${prefix}${kind ? `${kind} match` : "match"}`;
  };

  const describeAutoEffects = (auto) => {
    if (!auto || typeof auto !== "object") return "-";
    const effects = [];
    if (auto.severity) effects.push(`severity=${auto.severity}`);
    const forced = autoRuleForceState(auto);
    if (forced === "on") effects.push("force_on");
    if (forced === "off") effects.push("force_off");
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

  // Canonical built-in fallbacks. Global settings are optional overrides; when an
  // override is disabled these values (or the selected panel theme for surfaces)
  // remain the safe baseline.
  const BUILTIN_COLORS = Object.freeze({
    on: "#8bd66a",
    off: "#f2f2f2",
    status: "#8bd66a",
    warn: "#ffd24a",
    alarm: "#ffb000",
    trip: "#ff3a2f",
    unavailable: "#bdbdbd",
    blank: "#111111",
    frame: "#111111",
    panel: "#2a2a2a",
    on_text: "rgba(0,0,0,0.85)",
    off_text: "#1c1c1c",
    unavailable_text: "#1c1c1c",
    text: "#1c1c1c",
  });
  const createSeverityColorDefaults = () => ({
    enabled:true,
    on:BUILTIN_COLORS.on,on_enabled:true,off:BUILTIN_COLORS.off,off_enabled:true,
    status:BUILTIN_COLORS.status,status_enabled:true,warn:BUILTIN_COLORS.warn,warn_enabled:true,
    alarm:BUILTIN_COLORS.alarm,alarm_enabled:true,trip:BUILTIN_COLORS.trip,trip_enabled:true,
    unavailable:BUILTIN_COLORS.unavailable,unavailable_enabled:true,blank:BUILTIN_COLORS.blank,blank_enabled:true,
    frame:BUILTIN_COLORS.frame,frame_enabled:false,panel:BUILTIN_COLORS.panel,panel_enabled:false,
    text:BUILTIN_COLORS.text,text_enabled:true,on_text:BUILTIN_COLORS.on_text,on_text_enabled:true,
    off_text:BUILTIN_COLORS.off_text,off_text_enabled:true,unavailable_text:BUILTIN_COLORS.unavailable_text,unavailable_text_enabled:true,
    on_window:"",on_window_enabled:true,
  });
  const mergeSeverityColors = (value) => {
    const incoming=ensureObj(value,{}),merged={...createSeverityColorDefaults(),...incoming};
    if(!Object.prototype.hasOwnProperty.call(incoming,"frame_enabled"))merged.frame_enabled=Object.prototype.hasOwnProperty.call(incoming,"frame");
    if(!Object.prototype.hasOwnProperty.call(incoming,"panel_enabled"))merged.panel_enabled=Object.prototype.hasOwnProperty.call(incoming,"panel");
    return merged;
  };
  const createHeaderTalliesDefaults = () => ({active:false,alarm:false,unacknowledged:false,total:false,unavailable:false,alarms_day:false,alarms_week:false,alarms_month:false,alarms_year:false,history_source:"local"});
  const createHeaderControlsDefaults = (showAck=true,showClear=true) => ({
    acknowledge:{enabled:showAck,label:HEADER_CONTROL_DEFAULTS.acknowledge},
    silence:{enabled:false,label:HEADER_CONTROL_DEFAULTS.silence},reset:{enabled:false,label:HEADER_CONTROL_DEFAULTS.reset},
    lamp_test:{enabled:false,label:HEADER_CONTROL_DEFAULTS.lamp_test},clear_acknowledged:{enabled:showClear,label:HEADER_CONTROL_DEFAULTS.clear_acknowledged},
  });

  const cleanColor = (value) => String(value ?? "").trim();
  const parseContrastColor = (value) => {
    const text=cleanColor(value).toLowerCase();
    let channels=null;
    if(/^#[0-9a-f]{3}$/.test(text))channels=[...text.slice(1)].map((part)=>parseInt(part+part,16));
    else if(/^#[0-9a-f]{6}$/.test(text))channels=[text.slice(1,3),text.slice(3,5),text.slice(5,7)].map((part)=>parseInt(part,16));
    else {
      const match=text.match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)\s*[, ]\s*(\d+(?:\.\d+)?)(?:\s*[,/]\s*(\d*(?:\.\d+)?))?\s*\)$/);
      if(match&&(!match[4]||Number(match[4])>=1))channels=match.slice(1,4).map((part)=>Math.max(0,Math.min(255,Number(part))));
    }
    return channels;
  };
  const relativeLuminance = (value) => {
    const channels=parseContrastColor(value);if(!channels)return null;
    const linear=channels.map((channel)=>{const normalized=channel/255;return normalized<=.04045?normalized/12.92:Math.pow((normalized+.055)/1.055,2.4)});
    return .2126*linear[0]+.7152*linear[1]+.0722*linear[2];
  };
  const colorContrastRatio = (foreground,background) => {
    const first=relativeLuminance(foreground),second=relativeLuminance(background);if(first===null||second===null)return null;
    return (Math.max(first,second)+.05)/(Math.min(first,second)+.05);
  };
  const contrastFinding = (label,foreground,background,minimum=4.5) => {
    if(!cleanColor(foreground)||!cleanColor(background))return "";
    const ratio=colorContrastRatio(foreground,background);return ratio!==null&&ratio<minimum?`${label}: ${ratio.toFixed(2)}:1; aim for at least ${minimum.toFixed(1)}:1.`:"";
  };
  const lampContrastWarnings = (value,config={}) => {
    const lamp=normalizeLamp(value),colors=ensureObj(lamp.colors,{}),warnings=[],resolved=resolveLampColors(lamp,{severity:lamp.severity||"status"},ensureObj(config.severity_colors,{}));
    const customText=normalizeColorBehavior(lamp.color_behavior)==="custom"||lamp.use_color_override===true;
    const onCustom=customText&&(!!cleanColor(colors.on)||!!cleanColor(colors.on_window)||!!cleanColor(colors.on_text)),offCustom=customText&&(!!cleanColor(colors.off)||!!cleanColor(colors.text)),unavailableCustom=customText&&(!!cleanColor(colors.unavailable)||!!cleanColor(colors.unavailable_text));
    if(onCustom){const warning=contrastFinding("ON text",resolved.onText,resolved.onWindowColor,4.5);if(warning)warnings.push(warning)}
    if(offCustom){const warning=contrastFinding("OFF text",resolved.offText,resolved.offColor,4.5);if(warning)warnings.push(warning)}
    if(unavailableCustom){const warning=contrastFinding("Unavailable text",resolved.unavailableText,resolved.unavailable,4.5);if(warning)warnings.push(warning)}
    const iconMode=normalizeLampIconColorMode(lamp.icon_color_mode,lamp.icon_color_enabled===true);
    if(iconMode==="single")[["Icon on ON",lamp.icon_color,resolved.onWindowColor],["Icon on OFF",lamp.icon_color,resolved.offColor]].forEach(([label,foreground,background])=>{const warning=contrastFinding(label,foreground,background,3);if(warning)warnings.push(warning)});
    if(iconMode==="state")[["ON icon",lamp.icon_color_on,resolved.onWindowColor],["OFF icon",lamp.icon_color_off,resolved.offColor]].forEach(([label,foreground,background])=>{const warning=contrastFinding(label,foreground,background,3);if(warning)warnings.push(warning)});
    return warnings;
  };
  const configContrastWarnings = (config) => {
    const cfg=ensureObj(config,{}),colors=ensureObj(cfg.severity_colors,{}),header=normalizeHeaderAppearance(cfg.header_appearance),warnings=[];
    const custom=(...keys)=>keys.some((key)=>colors[`${key}_enabled`]===true);
    [["Global ON text",globalColorValue(colors,"on_text",BUILTIN_COLORS.on_text),globalColorValue(colors,"on",BUILTIN_COLORS.on),4.5,custom("on_text","on")],["Global OFF text",globalColorValue(colors,"off_text",globalColorValue(colors,"text",BUILTIN_COLORS.off_text)),globalColorValue(colors,"off",BUILTIN_COLORS.off),4.5,custom("off_text","text","off")],["Global unavailable text",globalColorValue(colors,"unavailable_text",globalColorValue(colors,"text",BUILTIN_COLORS.unavailable_text)),globalColorValue(colors,"unavailable",BUILTIN_COLORS.unavailable),4.5,custom("unavailable_text","text","unavailable")]].forEach(([label,foreground,background,minimum,active])=>{if(!active)return;const warning=contrastFinding(label,foreground,background,minimum);if(warning)warnings.push(warning)});
    const headerColor=(key)=>header[`${key}_enabled`]===true?cleanColor(header[key]):"";
    const headerBackground=header.background_none?"":headerColor("background"),buttonBackground=header.button_background_none?"":headerColor("button_background"),buttonHover=header.button_background_none?"":headerColor("button_hover");
    [["Header title",headerColor("title_color"),headerBackground,4.5],["Header tallies",headerColor("tally_color"),headerBackground,4.5],["Header buttons",headerColor("button_text"),buttonBackground,4.5],["Header button hover",headerColor("button_text"),buttonHover,4.5]].forEach(([label,foreground,background,minimum])=>{const warning=contrastFinding(label,foreground,background,minimum);if(warning)warnings.push(warning)});
    return warnings;
  };

  const colorOverrideEnabled = (colors, key, defaultEnabled = true) => {
    const c = ensureObj(colors, {});
    if (c.enabled === false) return false;
    const flag = c[`${key}_enabled`];
    return flag === undefined ? !!defaultEnabled : flag !== false;
  };

  const globalColorValue = (colors, key, fallback, defaultEnabled = true) => {
    if (!colorOverrideEnabled(colors, key, defaultEnabled)) return fallback;
    return cleanColor(ensureObj(colors, {})[key]) || fallback;
  };

  // Legacy is retained for existing v1.x configurations. New lamps explicitly use
  // Standard, Severity or Custom so normal Home Assistant users only need ON/OFF.
  const normalizeColorBehavior = (value) => {
    const v = String(value || "legacy").toLowerCase();
    return ["legacy", "standard", "severity", "custom"].includes(v) ? v : "legacy";
  };

  const resolveLampColors = (itemInput, resolved, colorsInput) => {
    const item = normalizeLamp(itemInput || {});
    const colors = ensureObj(colorsInput, {});
    const eColors = ensureObj(item.colors, {});
    const behavior = normalizeColorBehavior(item.color_behavior);
    const severity = ["trip", "alarm", "warn", "status"].includes(String(resolved?.severity || "").toLowerCase())
      ? String(resolved.severity).toLowerCase() : "status";
    const autoColor = cleanColor(resolved?.autoOnColor);
    const useLegacyOverride = !!item.use_color_override;
    const legacyOn = useLegacyOverride ? cleanColor(eColors.on) : "";
    const legacyOff = useLegacyOverride ? cleanColor(eColors.off) : "";
    const legacyWindow = useLegacyOverride ? cleanColor(eColors.on_window) : "";

    const globalOn = globalColorValue(colors, "on", BUILTIN_COLORS.on);
    const globalOff = globalColorValue(colors, "off", BUILTIN_COLORS.off);
    const severityColor = colorOverrideEnabled(colors, severity)
      ? (cleanColor(colors[severity]) || BUILTIN_COLORS[severity] || BUILTIN_COLORS.status)
      : "";

    let onColor = globalOn;
    let offColor = globalOff;
    let onWindowColor = onColor;

    if (behavior === "legacy") {
      // Exact compatibility path: legacy lamps continue to resolve severity first,
      // with their old ON Window override still taking final visual precedence.
      let legacySeverity = "";
      if (colors.enabled !== false) {
        if (colorOverrideEnabled(colors, severity)) legacySeverity = cleanColor(colors[severity]);
        // v1.x fell back to STATUS when a specific severity color was absent.
        // Preserve that behavior for hand-written/partial legacy configurations.
        if (!legacySeverity && colorOverrideEnabled(colors, "status")) legacySeverity = cleanColor(colors.status);
      }
      legacySeverity = legacySeverity || globalOn;
      onColor = autoColor || legacyOn || legacySeverity;
      offColor = legacyOff || globalOff;
      const legacyGlobalWindow = colorOverrideEnabled(colors, "on_window") ? cleanColor(colors.on_window) : "";
      onWindowColor = legacyWindow || legacyGlobalWindow || onColor;
    } else if (behavior === "severity") {
      onColor = autoColor || severityColor || globalOn;
      onWindowColor = onColor;
    } else if (behavior === "custom") {
      onColor = autoColor || cleanColor(eColors.on) || globalOn;
      offColor = cleanColor(eColors.off) || globalOff;
      onWindowColor = onColor;
    } else {
      // Standard: intentionally ignores severity. This is the simple ON/OFF mode.
      onColor = autoColor || globalOn;
      offColor = globalOff;
      onWindowColor = onColor;
    }

    const customText = behavior === "custom" || useLegacyOverride;
    const onText = customText && cleanColor(eColors.on_text)
      ? cleanColor(eColors.on_text)
      : globalColorValue(colors, "on_text", BUILTIN_COLORS.on_text);
    const offText = customText && cleanColor(eColors.text)
      ? cleanColor(eColors.text)
      : globalColorValue(colors, "off_text", globalColorValue(colors, "text", BUILTIN_COLORS.off_text));
    const unavailable = customText && cleanColor(eColors.unavailable)
      ? cleanColor(eColors.unavailable)
      : globalColorValue(colors, "unavailable", BUILTIN_COLORS.unavailable);
    const unavailableText = customText && cleanColor(eColors.unavailable_text)
      ? cleanColor(eColors.unavailable_text)
      : globalColorValue(colors, "unavailable_text", globalColorValue(colors, "text", BUILTIN_COLORS.unavailable_text));

    return { behavior, severity, onColor, offColor, onWindowColor, onText, offText, unavailable, unavailableText };
  };

  const INTERACTION_ACTIONS = new Set(["none", "more_info", "toggle", "turn_on", "turn_off", "ack", "clear_ack", "perform_action", "navigate", "url"]);
  const normalizeInteractionAction = (value, fallback = "none") => {
    const v = String(value || fallback).toLowerCase();
    return INTERACTION_ACTIONS.has(v) ? v : fallback;
  };
  const safeInteractionUrl = (value) => {
    const requested=String(value||"").trim();
    return /^(?:javascript|data|vbscript):/i.test(requested) ? "" : requested;
  };
  const safeNavigationPath = (value) => {
    const requested=String(value||"").trim();
    if(!requested||/^(?:javascript|data|vbscript):/i.test(requested)||requested.startsWith("//"))return "";
    if(/^[a-z][a-z0-9+.-]*:/i.test(requested))return "";
    return requested;
  };
  const validServiceName = (value) => /^[a-z0-9_]+\.[a-z0-9_]+$/i.test(String(value||"").trim());
  const interactionNeedsEntity = (action) => ["more_info", "toggle", "turn_on", "turn_off"].includes(normalizeInteractionAction(action));
  const interactionTargetEntity = (item, gesture) => {
    const prefix = gesture === "double" ? "double_tap" : gesture === "hold" ? "hold" : "tap";
    const mode = String(item?.[`${prefix}_target`] || "self").toLowerCase();
    const alternate = String(item?.[`${prefix}_entity`] || "").trim();
    return mode === "entity" ? alternate : String(item?.entity || "").trim();
  };

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
    // The visual editor offers 0..3 decimals, but manual YAML can contain arbitrary
    // values. Clamp and integer-normalize here so malformed/out-of-range config can
    // never make Number#toFixed throw and take down the whole card render.
    const decimals = Math.max(0, Math.min(6, Math.trunc(clampNum(f.decimals, 0))));
    const rounding = String(f.rounding || "round").toLowerCase();

    let n = num;
    const pow = Math.pow(10, decimals);
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

  const DYNAMIC_TEXT_LINE_KEYS = Object.freeze(["primary", "secondary", "tertiary"]);
  const DYNAMIC_TEXT_RULE_LIMIT = 24;
  const DYNAMIC_TEXT_RULE_KINDS = Object.freeze([
    "lamp_on", "lamp_off", "unavailable", "unknown", "state_equals", "string", "numeric",
    "acknowledged", "unacknowledged", "alarm_active", "alarm_inactive",
  ]);
  const cleanDynamicText = (value, limit=240) => String(value ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").slice(0, limit);
  const finiteDynamicNumber = (value, fallback=0) => {
    const numeric = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
    return Number.isFinite(numeric) ? numeric : fallback;
  };
  const normalizeDynamicTextRule = (value, index=0) => {
    const src=ensureObj(value,{}),requested=String(src.kind||"lamp_on").toLowerCase(),kind=DYNAMIC_TEXT_RULE_KINDS.includes(requested)?requested:"lamp_on";
    const threshold=ensureObj(src.rule,{}),type=["above","below","between","equal"].includes(String(threshold.type||"").toLowerCase())?String(threshold.type).toLowerCase():"above";
    const match=["contains","equals","starts_with","ends_with"].includes(String(src.match||"").toLowerCase())?String(src.match).toLowerCase():"contains";
    return {
      name:cleanDynamicText(src.name||`Text rule ${index+1}`,80), enabled:src.enabled!==false, kind,
      text:cleanDynamicText(src.text), state:cleanDynamicText(src.state,160), match, value:cleanDynamicText(src.value,160),
      rule:{type,a:finiteDynamicNumber(threshold.a,0),b:finiteDynamicNumber(threshold.b,0),inclusive:threshold.inclusive!==false},
    };
  };
  const normalizeDynamicTextLine = (value) => {
    const src=ensureObj(value,{}),labels=ensureObj(src.labels,{}),defaults={on:"ON",off:"OFF",unavailable:"INOP",unknown:"UNKNOWN"};
    const normalizedLabels={};Object.keys(defaults).forEach((key)=>{normalizedLabels[key]=labels[key]===undefined?defaults[key]:cleanDynamicText(labels[key])});
    return {labels:normalizedLabels,fallback:cleanDynamicText(src.fallback),rules:(Array.isArray(src.rules)?src.rules:[]).slice(0,DYNAMIC_TEXT_RULE_LIMIT).map((rule,index)=>normalizeDynamicTextRule(rule,index))};
  };
  const normalizeDynamicTextConfig = (value) => {
    const src=ensureObj(value,{}),out={};DYNAMIC_TEXT_LINE_KEYS.forEach((line)=>{if(src[line]&&typeof src[line]==="object"&&!Array.isArray(src[line]))out[line]=normalizeDynamicTextLine(src[line],line)});return out;
  };
  const dynamicTextRuleMatches = (value, context={}) => {
    const rule=normalizeDynamicTextRule(value),kind=rule.kind,available=context.available!==false,availability=String(context.availability||"");
    if(kind==="unavailable")return availability==="unavailable"||availability==="missing";
    if(kind==="unknown")return availability==="unknown";
    if(!available)return false;
    if(kind==="lamp_on")return context.isOn===true;
    if(kind==="lamp_off")return context.isOn!==true;
    if(kind==="acknowledged")return context.acked===true;
    if(kind==="unacknowledged")return context.acked!==true;
    if(kind==="alarm_active")return context.alarmActive===true;
    if(kind==="alarm_inactive")return context.alarmActive!==true;
    if(kind==="state_equals")return String(context.rawState??"")===rule.state;
    if(kind==="string")return matchString(context.rawState,rule.match,rule.value);
    if(kind==="numeric")return evalRuleThreshold(rule.rule,context.valueNum);
    return false;
  };
  const resolveDynamicTextLine = (value, line, mode, context={}) => {
    const config=normalizeDynamicTextLine(value,line),requested=String(mode||"").toLowerCase();
    if(requested==="state_labels"){
      const key=context.available===false?(String(context.availability||"")==="unknown"?"unknown":"unavailable"):(context.isOn===true?"on":"off");
      return {text:config.labels[key],matched:true,kind:key,handlesUnavailable:key==="unavailable"||key==="unknown"};
    }
    if(requested==="dynamic"){
      for(let index=0;index<config.rules.length;index+=1){const rule=config.rules[index];if(rule.enabled!==false&&dynamicTextRuleMatches(rule,context))return {text:rule.text,matched:true,kind:rule.kind,index,handlesUnavailable:rule.kind==="unavailable"||rule.kind==="unknown"}}
      return {text:config.fallback,matched:false,kind:"fallback",index:-1,handlesUnavailable:false};
    }
    return {text:"",matched:false,kind:"",index:-1,handlesUnavailable:false};
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
    lamp.cell_type = normalizeCellType(lamp);
    lamp.source_mode = normalizeLampSourceMode(lamp.source_mode);
    lamp.derived_base_state = normalizeDerivedBaseState(lamp.derived_base_state);
    if (lamp.group === undefined) lamp.group = "";
    if (lamp.note === undefined) lamp.note = "";
    if (lamp.severity === undefined) lamp.severity = "status";
    lamp.content_mode = normalizeLampContentMode(lamp.content_mode);
    lamp.icon = typeof lamp.icon === "string" ? lamp.icon.trim().slice(0, 160) : "";
    lamp.icon_size = normalizeLampIconSize(lamp.icon_size);
    lamp.icon_color_mode = normalizeLampIconColorMode(lamp.icon_color_mode, lamp.icon_color_enabled === true);
    lamp.icon_color_enabled = lamp.icon_color_mode !== "follow";
    lamp.icon_color = typeof lamp.icon_color === "string" ? lamp.icon_color.trim().slice(0, 160) : "";
    lamp.icon_color_on = typeof lamp.icon_color_on === "string" ? lamp.icon_color_on.trim().slice(0, 160) : "";
    lamp.icon_color_off = typeof lamp.icon_color_off === "string" ? lamp.icon_color_off.trim().slice(0, 160) : "";
    lamp.icon_show_primary = lamp.icon_show_primary !== false;
    lamp.icon_show_secondary = lamp.icon_show_secondary !== false;
    lamp.icon_show_tertiary = lamp.icon_show_tertiary !== false;
    lamp.font_family = normalizeFontFamily(lamp.font_family);
    lamp.font_custom = normalizeCustomFont(lamp.font_custom);
    lamp.shape = normalizeShape(lamp.shape);
    lamp.row_span = normalizeSpan(lamp.row_span);
    lamp.column_span = normalizeSpan(lamp.column_span);
    lamp.translucent_illumination = lamp.translucent_illumination === true;
    lamp.inactive_lamp_mode = normalizeInactiveLampMode(lamp.inactive_lamp_mode);
    if (lamp.lamp_brightness !== undefined) {
      if(isLampBrightnessConfigObject(lamp.lamp_brightness,true))lamp.lamp_brightness=normalizeLampBrightnessConfig(lamp.lamp_brightness,true);
      else delete lamp.lamp_brightness;
    }
    lamp.participates_in_alarm_output = lamp.participates_in_alarm_output === true;
    lamp.pair_orientation = String(lamp.pair_orientation || "vertical").toLowerCase() === "horizontal" ? "horizontal" : "vertical";
    lamp.pair_shape_mode = normalizePairShapeMode(lamp.pair_shape_mode);
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
    // New editor-created lamps use "inherit" so the panel default can be changed
    // without rewriting every lamp. Invalid hand-written values fail safe to manual.
    if (lamp.ack_rearm === undefined) lamp.ack_rearm = "manual";
    else {
      const ackRearm = String(lamp.ack_rearm).toLowerCase();
      lamp.ack_rearm = ["inherit", "manual", "auto"].includes(ackRearm) ? ackRearm : "manual";
    }
    lamp.spacer_appearance = normalizeSpacerAppearance(lamp.spacer_appearance, true);
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

    // Colors. Existing configurations have no color_behavior and therefore stay
    // on the legacy resolver until the user explicitly chooses a simplified mode.
    if (lamp.color_behavior === undefined) lamp.color_behavior = "legacy";
    lamp.color_behavior = normalizeColorBehavior(lamp.color_behavior);
    if (lamp.use_color_override === undefined) lamp.use_color_override = false;
    if (lamp.colors.on === undefined) lamp.colors.on = "";
    if (lamp.colors.off === undefined) lamp.colors.off = "";
    if (lamp.colors.text === undefined) lamp.colors.text = "";
    if (lamp.colors.on_window === undefined) lamp.colors.on_window = "";

    // Extended per-lamp colors
    if (lamp.colors.on_text === undefined) lamp.colors.on_text = "";
    if (lamp.colors.unavailable === undefined) lamp.colors.unavailable = "";
    if (lamp.colors.unavailable_text === undefined) lamp.colors.unavailable_text = "";

    // Per-lamp interactions. Defaults reproduce v1.x behavior.
    if (lamp.tap_action === undefined) lamp.tap_action = "more_info";
    if (lamp.double_tap_action === undefined) lamp.double_tap_action = "ack";
    if (lamp.hold_action === undefined) lamp.hold_action = "ack";
    lamp.tap_action = normalizeInteractionAction(lamp.tap_action, "more_info");
    lamp.double_tap_action = normalizeInteractionAction(lamp.double_tap_action, "ack");
    lamp.hold_action = normalizeInteractionAction(lamp.hold_action, "ack");
    if (lamp.tap_target === undefined) lamp.tap_target = "self";
    if (lamp.double_tap_target === undefined) lamp.double_tap_target = "self";
    if (lamp.hold_target === undefined) lamp.hold_target = "self";
    lamp.tap_target = String(lamp.tap_target).toLowerCase() === "entity" ? "entity" : "self";
    lamp.double_tap_target = String(lamp.double_tap_target).toLowerCase() === "entity" ? "entity" : "self";
    lamp.hold_target = String(lamp.hold_target).toLowerCase() === "entity" ? "entity" : "self";
    if (lamp.tap_entity === undefined) lamp.tap_entity = "";
    if (lamp.double_tap_entity === undefined) lamp.double_tap_entity = "";
    if (lamp.hold_entity === undefined) lamp.hold_entity = "";
    lamp.tap_entity = String(lamp.tap_entity || "").trim();
    lamp.double_tap_entity = String(lamp.double_tap_entity || "").trim();
    lamp.hold_entity = String(lamp.hold_entity || "").trim();
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
    if (src.dynamic_text !== undefined) lamp.dynamic_text = normalizeDynamicTextConfig(src.dynamic_text);

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
  const lampNavigatorBadges = (value,{paired=false}={}) => {
    const lamp=normalizeLamp(value),badges=[];
    const dynamic=[lamp.primary_mode,lamp.secondary_mode,lamp.tertiary_mode].includes("dynamic")||lamp.enable_auto_styles===true||isDerivedLamp(lamp);
    const brightness=isLampBrightnessConfigObject(lamp.lamp_brightness,true)?normalizeLampBrightnessConfig(lamp.lamp_brightness,true):{profile:"inherit"};
    const visualOverride=normalizeShape(lamp.shape)!=="inherit"||String(lamp.lamp_style||"inherit")!=="inherit"||String(lamp.lens_type||"inherit")!=="inherit"||normalizeFontFamily(lamp.font_family)!=="inherit"||brightness.profile!=="inherit"||lamp.translucent_illumination===true||normalizeLampIconColorMode(lamp.icon_color_mode,lamp.icon_color_enabled===true)!=="follow"||normalizeLampIconSize(lamp.icon_size)!==40||lamp.use_color_override===true||normalizeColorBehavior(lamp.color_behavior)==="custom";
    if(paired)badges.push("Paired");
    if(paired&&normalizePairShapeMode(lamp.pair_shape_mode)==="split_pill")badges.push("Split pill");
    if(normalizeSpan(lamp.column_span)>1||normalizeSpan(lamp.row_span)>1)badges.push("Span");
    if(dynamic)badges.push("Dynamic");
    if(lamp.participates_in_alarm_output===true)badges.push("Audible");
    if(visualOverride)badges.push("Override");
    return badges;
  };
  const createNewLamp = ({uid="",ackSlot=0,kind="lamp",pairId="",pairMode="none",pairOrientation="vertical"}={}) => {
    const identity={uid,ack_slot:ackSlot};
    if(kind==="spacer")return normalizeLamp({...identity,entity:"",cell_type:"spacer",pair_id:"",pair_mode:"none"});
    const common={...identity,cell_type:"lamp",pair_id:"",pair_mode:"none",lamp_type:"status",color_behavior:"standard",severity:"status",alert_style:"none",blink:false,pulse:false,ack_rearm:"inherit",lamp_brightness:{profile:"inherit"},primary_mode:"name",secondary_mode:"state"};
    if(kind==="derived")return normalizeLamp({...common,source_mode:"derived",derived_base_state:"off",lamp_type:"custom",label_source:"custom",name_override:"Derived lamp",primary_mode:"custom",primary_text:"DERIVED LAMP",secondary_mode:"none",tertiary_mode:"none",tap_action:"none",double_tap_action:"ack",hold_action:"ack",enable_auto_styles:true,auto_styles:[]});
    return normalizeLamp({...common,...(pairId?{pair_id:pairId,pair_mode:pairMode,pair_orientation:pairOrientation}:{})});
  };
  const createNewPairMembers = ({topUid="",bottomUid="",topAckSlot=0,bottomAckSlot=0,pairId="",orientation="vertical"}={}) => [
    createNewLamp({uid:topUid,ackSlot:topAckSlot,pairId,pairMode:"top",pairOrientation:orientation}),
    createNewLamp({uid:bottomUid,ackSlot:bottomAckSlot,pairId,pairMode:"bottom",pairOrientation:orientation}),
  ];

  // ============================================================
  // Auto Style Evaluation
  // ============================================================
  const evaluateAutoStyleRule = (rule, index, rawState, valueNum, states = null) => {
    const sourceRule=ensureObj(rule,{}),kind=String(sourceRule.kind||"").toLowerCase(),sourceEntity=autoRuleSourceEntity(sourceRule),usesExternalSource=autoRuleUsesExternalSource(sourceRule);
    const result={index,rule:sourceRule,kind,sourceEntity,source:sourceEntity||"this lamp",sourceRawState:rawState,sourceValueNum:valueNum,matched:false,reason:"Condition did not match",style:null};
    if(sourceRule.enabled===false){result.reason="Disabled";return result}
    if(!["numeric","state","string"].includes(kind)){result.reason="Missing or unsupported condition";return result}
    if(usesExternalSource){
      if(!sourceEntity){result.reason="Missing source entity";return result}
      const sourceObj=states&&typeof states==="object"?states[sourceEntity]:null;if(!sourceObj){result.reason="Source entity not found";return result}
      if(sourceObj.state==="unavailable"){result.reason="Source unavailable";return result}if(sourceObj.state==="unknown"){result.reason="Source unknown";return result}
      result.sourceRawState=sourceObj.state;result.sourceValueNum=toNumber(result.sourceRawState);
    }
    if(kind==="numeric"){
      if(Number.isNaN(result.sourceValueNum)){result.reason="Source is not numeric";return result}
      result.matched=evalRuleThreshold(sourceRule.rule,result.sourceValueNum);result.reason=result.matched?"Matched":"Numeric threshold did not match";
    }else if(kind==="state"){
      result.matched=String(result.sourceRawState)===String(sourceRule.state??"");result.reason=result.matched?"Matched":"State did not match";
    }else{
      result.matched=matchString(result.sourceRawState,String(sourceRule.match||"contains"),String(sourceRule.value||""));result.reason=result.matched?"Matched":"String comparison did not match";
    }
    if(result.matched){const style={...sourceRule,__match_index:index,__match_kind:kind,__match_source:result.source,__match_raw_state:result.sourceRawState,__match_value:result.sourceValueNum};if(sourceRule.name!==undefined&&sourceRule.name!==null&&String(sourceRule.name).trim())style.__match_name=String(sourceRule.name).trim();result.style=style}
    return result;
  };
  const traceAutoStyles = (item, rawState, valueNum, states = null) => {
    const styles=Array.isArray(item?.auto_styles)?item.auto_styles:[],trace=[];let winner=-1;
    styles.forEach((rule,index)=>{if(winner>=0){trace.push({index,rule:ensureObj(rule,{}),kind:String(rule?.kind||"").toLowerCase(),sourceEntity:autoRuleSourceEntity(rule),source:autoRuleSourceEntity(rule)||"this lamp",sourceRawState:"",sourceValueNum:NaN,matched:false,reason:"Not evaluated because an earlier rule matched",style:null});return}const result=evaluateAutoStyleRule(rule,index,rawState,valueNum,states);trace.push(result);if(result.matched)winner=index});
    return { winner, trace, style:winner>=0?trace[winner].style:null };
  };
  const pickAutoStyle = (item, rawState, valueNum, states = null) => {
    const styles=Array.isArray(item?.auto_styles)?item.auto_styles:[];
    for(let index=0;index<styles.length;index+=1){
      const result=evaluateAutoStyleRule(styles[index],index,rawState,valueNum,states);
      if(result.matched)return result.style;
    }
    return null;
  };

  const lampRuleDependencies = (item) => {
    const deps = new Set();
    (Array.isArray(item?.auto_styles) ? item.auto_styles : []).forEach((rule) => {
      const source = autoRuleSourceEntity(rule);
      if (source) deps.add(source);
    });
    return deps;
  };

  const lampDependsOnAny = (item, changedEntities) => {
    if (!(changedEntities instanceof Set)) return true;
    const own = String(item?.entity || "").trim();
    if (own && changedEntities.has(own)) return true;
    for (const dep of lampRuleDependencies(item)) if (changedEntities.has(dep)) return true;
    return false;
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

  const resolveDisplayLines = (item, stateObj, rawState, rawValueNum, valueNum, severity, isOn, isAcked, displayOptions={}) => {
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
    const context={available:displayOptions.available!==false,availability:String(displayOptions.availability||"available"),rawState,valueNum,isOn:isOn===true,acked:isAcked===true,alarmActive:displayOptions.alarmActive===true};
    const specialModes=new Set(["state_labels","dynamic"]),meta={};
    const special=(line,mode)=>{if(!specialModes.has(mode))return null;const result=resolveDynamicTextLine(item?.dynamic_text?.[line],line,mode,context);meta[line]={mode,...result};return result.text};
    const primarySpecial=special("primary",pm),secondarySpecial=special("secondary",sm),tertiarySpecial=special("tertiary",tm);
    const primary=primarySpecial!==null?primarySpecial:pm === "name" ? name : pm === "state" ? String(vars.display_value || rawState || "") : String(item?.primary_text || name || "");
    const secondary=secondarySpecial!==null?secondarySpecial:sm === "custom" ? String(item?.secondary_text || "") : computeSecondary(sm, vars, stateObj) || "";
    const tertiary=tertiarySpecial!==null?tertiarySpecial:tm === "custom" ? String(item?.tertiary_text || "") : tm === "none" ? "" : computeSecondary(tm, vars, stateObj) || "";
    const handlesUnavailable=context.available===false&&Object.values(meta).some((entry)=>entry.handlesUnavailable===true);
    return Object.keys(meta).length ? { primary, secondary, tertiary, vars, dynamic:meta, handlesUnavailable } : { primary, secondary, tertiary, vars };
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
      appearance: { colorBehavior: normalizeColorBehavior(item.color_behavior), severity: String(item.severity || "status"), lampStyle: item.lamp_style || "inherit", lens: item.lens_type || "inherit", colors: { ...ensureObj(item.colors, {}) } },
      interaction: {
        tap: item.tap_action,
        doubleTap: item.double_tap_action,
        hold: item.hold_action,
        tapTarget: interactionTargetEntity(item, "tap"),
        doubleTapTarget: interactionTargetEntity(item, "double"),
        holdTarget: interactionTargetEntity(item, "hold"),
      },
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
    const availability = !exists ? "missing" : stateObj.state === "unknown" ? "unknown" : stateObj.state === "unavailable" ? "unavailable" : "available";
    const rawState = exists ? stateObj.state : "";
    const rawValueNum = toNumber(rawState);
    const valueNum = applyValueTransform(rawValueNum, item.value_format);

    if (unavailable && !options.lampTest) {
      const primaryMode=String(item.primary_mode||"custom").toLowerCase(),secondaryMode=String(item.secondary_mode||"state").toLowerCase(),tertiaryMode=String(item.tertiary_mode||"none").toLowerCase(),templates=!!item.use_templates;
      const specialModes=new Set(["state_labels","dynamic"]),hasSpecial=!templates&&[primaryMode,secondaryMode,tertiaryMode].some((mode)=>specialModes.has(mode));
      const candidate=hasSpecial?resolveDisplayLines(item,stateObj,rawState,rawValueNum,valueNum,String(item.severity||"status"),false,!!options.acked,{available:false,availability,alarmActive:false}):{vars:{}};
      const display={primary:!templates&&specialModes.has(primaryMode)?candidate.primary:String(item.primary_text||item.name_override||item.entity||(normalizeCellType(item)==="lamp"?"SELECT ENTITY":"")),secondary:!templates&&specialModes.has(secondaryMode)?candidate.secondary:"",tertiary:!templates&&specialModes.has(tertiaryMode)?candidate.tertiary:"",vars:candidate.vars};
      if(hasSpecial){display.dynamic=candidate.dynamic;display.handlesUnavailable=candidate.handlesUnavailable}
      return {
        model, available: false, rawState, rawValueNum, valueNum, changed: !!options.changed,
        isOn: false, severity: String(item.severity || "status"), auto: null,
        alert: { active: false, effect: "", reason: "unavailable", tuning: {} },
        display,
      };
    }

    const auto = item.enable_auto_styles ? pickAutoStyle(item, rawState, valueNum, options.states) : null;
    let isOn = matchesCondition(model.condition, rawState, valueNum);
    if (item.invert) isOn = !isOn;
    if (item.always_on) isOn = true;
    const forcedState = autoRuleForceState(auto);
    if (forcedState === "on") isOn = true;
    else if (forcedState === "off") isOn = false;
    // Lamp Test intentionally has final authority so every populated window can be tested.
    if (options.lampTest) isOn = true;

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

    const display = resolveDisplayLines(item, stateObj, rawState, rawValueNum, valueNum, severity, isOn, !!options.acked,{available:true,availability:"available",alarmActive:!!(mainEffect&&whenMatches)});
    return {
      model, available: true, rawState, rawValueNum, valueNum, changed: !!options.changed,
      isOn, severity, auto,
      autoOnColor: (auto?.color || auto?.on_color) ? String(auto.color || auto.on_color).trim() : "",
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
    if (ent && legacy !== key && Object.prototype.hasOwnProperty.call(map || {}, legacy)) return Boolean(map[legacy]);
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
    if (ent && legacy !== keys[0]) keys.push(legacy);
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
      if (!isOperationalLamp(item)) return;
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
      if (!isOperationalLamp(item)) return;
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
      if (!id || !["top", "bottom"].includes(mode) || isSpacerItem(lamp)) return;
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
  const buildRenderItems = (items, showGroupHeaders = false) => {
    const lamps=normalizeEntities(items),validPairIds=validPairIdsFor(lamps),bottomByPairId=new Map(),renderItems=[];let lastGroup="";
    lamps.forEach((lamp,index)=>{const pairId=String(lamp.pair_id||"").trim();if(validPairIds.has(pairId)&&String(lamp.pair_mode||"none")==="bottom")bottomByPairId.set(pairId,{idx:index,lamp})});
    lamps.forEach((lamp,index)=>{
      const group=String(lamp.group||"").trim(),pairMode=String(lamp.pair_mode||"none"),pairId=String(lamp.pair_id||"").trim();
      if(pairMode==="bottom"&&validPairIds.has(pairId))return;
      if(showGroupHeaders&&group&&group!==lastGroup){renderItems.push({__type:"group_header",group});lastGroup=group}else if(!group)lastGroup="";
      if(pairMode==="top"&&pairId&&validPairIds.has(pairId))renderItems.push({__type:"lamp_pair",top:{idx:index,lamp},bottom:bottomByPairId.get(pairId)||null});
      else renderItems.push({__type:"lamp",idx:index,lamp});
    });
    return {lamps,renderItems};
  };
  const buildPairEntityIndex = (renderItems) => {
    const index={};
    (Array.isArray(renderItems)?renderItems:[]).forEach((item)=>{if(item?.__type!=="lamp_pair"||!item.top||!item.bottom)return;const top=String(item.top.lamp?.entity||"").trim(),bottom=String(item.bottom.lamp?.entity||"").trim();if(top&&bottom){index[top]=bottom;index[bottom]=top}});
    return index;
  };
  const planGridLayout = (items, requestedColumns = 1) => {
    const columns=Math.max(1,Math.min(100,Math.floor(clampNum(requestedColumns,1)))),occupied=new Set(),placements=[];
    const blocks=physicalBlocksFor(items||[]);
    const free=(row,col,rs,cs)=>{if(col+cs>columns)return false;for(let r=row;r<row+rs;r++)for(let c=col;c<col+cs;c++)if(occupied.has(`${r}:${c}`))return false;return true};
    blocks.forEach((block,index)=>{const lamps=block.lamps.map(normalizeLamp),rowSpan=Math.max(...lamps.map(x=>normalizeSpan(x.row_span))),columnSpan=Math.min(columns,Math.max(...lamps.map(x=>normalizeSpan(x.column_span))));let row=0,col=0;while(!free(row,col,rowSpan,columnSpan)){col++;if(col>=columns){col=0;row++}}for(let r=row;r<row+rowSpan;r++)for(let c=col;c<col+columnSpan;c++)occupied.add(`${r}:${c}`);placements.push({index,row,col,rowSpan,columnSpan,paired:block.paired,lamps:block.lamps})});
    return {columns,placements,rows:placements.reduce((m,p)=>Math.max(m,p.row+p.rowSpan),0),occupied:[...occupied]};
  };

  // Use only the columns that are physically occupied. The configured Columns value
  // remains the maximum row width; users who intentionally want blank positions can
  // add Spacer cells. This prevents a one-lamp panel configured for 7 columns from
  // reserving six invisible columns and being unnecessarily shrunk by Auto Fit.
  const computeOccupiedColumns = (config) => {
    const cfg = config || {};
    const configured = Math.max(1, Math.min(100, Math.floor(clampNum(cfg.columns, 7))));
    const blocks = physicalBlocksFor(cfg.entities || []);
    if (!blocks.length) return 1;
    if (!cfg.show_group_headers) {
      const plan=planGridLayout(cfg.entities||[],configured);
      const maxUsed=plan.placements.reduce((maximum,placement)=>Math.max(maximum,placement.col+placement.columnSpan),0);
      return Math.max(1,Math.min(configured,maxUsed||1));
    }
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
      const columnSpan=Math.min(configured,Math.max(...block.lamps.map((value)=>normalizeSpan(value?.column_span))));
      if(col>0&&col+columnSpan>configured)col=0;
      col+=columnSpan;
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
    let lampRows = 0, groupRows = 0, lastGroup = "", segment=[];
    const showGroups = !!cfg.show_group_headers;
    const finishSegment=()=>{if(!segment.length)return;lampRows+=planGridLayout(flattenPhysicalBlocks(segment),renderColumns).rows;segment=[]};
    for (const block of blocks) {
      const lamp = normalizeLamp(block.lamps?.[0] || {});
      const group = String(lamp.group || "").trim();
      if (showGroups && group && group !== lastGroup) {
        finishSegment();
        groupRows++;
        lastGroup = group;
      } else if (!group) lastGroup = "";
      segment.push(block);
    }
    finishSegment();
    const configuredMin = String(cfg.row_mode || "auto") === "fixed" ? Math.max(0, Math.floor(clampNum(cfg.rows, 0))) : 0;
    lampRows = Math.max(lampRows, configuredMin, 1);
    const cellHeight = Math.max(20, Math.min(2000, clampNum(cfg.cell_height, 160)));
    const groupHeight = 44;
    const gap = Math.max(0, Math.min(200, clampNum(cfg.cell_gap, 0)));
    const outer = Math.max(0, Math.min(200, clampNum(cfg.outer_frame, 6)));
    const header = normalizeHeaderV3(cfg);
    const interactiveHeader = panelMode(cfg) !== "presentation" && (
      Object.values(header.controls).some((control) => control.enabled) ||
      (!!cfg.show_header_toggle && !!String(cfg.header_toggle_entity || "").trim())
    );
    const hasTallies = HEADER_TALLY_KEYS.some((key) => header.tallies[key] === true);
    const headerPx = String(cfg.title || "").trim() || interactiveHeader || hasTallies ? 48 : 0;
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
      if (isSpacerItem(lamp)) {
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

      if (isOperationalLamp(lamp)) {
        [["tap", "Tap"], ["double_tap", "Double tap"], ["hold", "Long press"]].forEach(([prefix, label]) => {
          const fallback = prefix === "tap" ? "more_info" : "ack";
          const action = normalizeInteractionAction(lamp[`${prefix}_action`], fallback);
          if (interactionNeedsEntity(action) && lamp[`${prefix}_target`] === "entity" && !String(lamp[`${prefix}_entity`] || "").trim()) {
            issues.push({ type: "interaction", index, message: `${label} uses Another entity but no target entity is selected.` });
          } else if (interactionNeedsEntity(action) && String(lamp[`${prefix}_target`] || "self") !== "entity" && !String(lamp.entity || "").trim()) {
            issues.push({ type: "interaction", index, message: `${label} needs a Home Assistant entity; choose Another entity or a non-entity action.` });
          } else if (action === "perform_action" && !validServiceName(lamp[`${prefix}_service`])) {
            issues.push({ type: "interaction", index, message: `${label} uses Perform action but no valid domain.service is configured.` });
          } else if (action === "navigate" && !safeNavigationPath(lamp[`${prefix}_navigation_path`])) {
            issues.push({ type: "interaction", index, message: `${label} uses Navigate but its path is missing or unsafe.` });
          } else if (action === "url" && !safeInteractionUrl(lamp[`${prefix}_url`])) {
            issues.push({ type: "interaction", index, message: `${label} uses Open URL but its URL is missing or unsafe.` });
          }
        });
        if (lamp.enable_auto_styles && Array.isArray(lamp.auto_styles)) {
          lamp.auto_styles.forEach((rule, ruleIndex) => {
            if (autoRuleUsesExternalSource(rule) && !autoRuleSourceEntity(rule)) {
              issues.push({ type: "rule", index, ruleIndex, message: `Rule ${ruleIndex + 1} uses Another entity but no source entity is selected.` });
            }
          });
        }
      }
    });

    const pairGroups = new Map();
    entities.forEach((lamp, index) => {
      const mode = String(lamp.pair_mode || "none").toLowerCase();
      const id = String(lamp.pair_id || "").trim();
      if (mode === "none" && !id) return;
      if (isSpacerItem(lamp)) {
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
      if (!id || !["top", "bottom"].includes(mode) || isSpacerItem(lamp)) {
        arr[index] = { ...lamp, pair_id: "", pair_mode: "none", pair_shape_mode:"independent" };
        return;
      }
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push({ index, lamp, mode });
    });
    groups.forEach((members, id) => {
      if (members.length === 1) {
        const m = members[0];
        arr[m.index] = { ...arr[m.index], pair_id: "", pair_mode: "none", pair_shape_mode:"independent" };
        return;
      }
      let top = members.find((m) => m.mode === "top") || members[0];
      let bottom = members.find((m) => m.mode === "bottom" && m.index !== top.index) || members.find((m) => m.index !== top.index);
      members.forEach((m) => {
        if (m.index === top.index) arr[m.index] = { ...arr[m.index], pair_id: id, pair_mode: "top" };
        else if (bottom && m.index === bottom.index) arr[m.index] = { ...arr[m.index], pair_id: id, pair_mode: "bottom" };
        else arr[m.index] = { ...arr[m.index], pair_id: "", pair_mode: "none", pair_shape_mode:"independent" };
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

  const rearmConditionMatched = (resolved) => {
    if (!resolved?.available) return false;
    const when = String(resolved?.alert?.when || "on").toLowerCase();
    return when === "both" ? true : when === "off" ? !resolved.isOn : !!resolved.isOn;
  };
  const shouldAutoRearm = (item, resolved, acked, config = {}) =>
    !!acked && resolveAckRearm(item, config) === "auto" &&
    !!resolved?.available && !rearmConditionMatched(resolved);

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
        // New cards show both panel-wide ACK controls. Legacy single-button
        // fields remain readable at runtime for existing saved configurations.
        show_ack_all: true,
        show_clear_ack: true,
        header_tallies: createHeaderTalliesDefaults(),
        header_controls: createHeaderControlsDefaults(true,true),
        header_appearance: {},
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
        ack_rearm_default: "auto",
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
        lamp_brightness: {profile:"normal",dim_level:32,off:100,on:100,alert:100},
        spacer_appearance: {},
        severity_colors: createSeverityColorDefaults(),
        entities: [],
      };
    }

    setConfig(config) {
      if (!config) throw new Error("Invalid configuration");
      this._runtimeEpoch=(this._runtimeEpoch||0)+1;
      const previousConfig = this._config || null;
      config = migrateConfigV2(config);

      // runtime caches
      this._lastSeen = this._lastSeen || {};
      this._blinkTimers = this._blinkTimers || {};
      this._changeActive = this._changeActive || {};
      this._changeLastTs = this._changeLastTs || {};
      this._ackShadow = this._ackShadow || null;
      this._alarmHistoryShadow = this._alarmHistoryShadow || null;
      this._headerTallyValues = null;
      const previousAckNamespace = previousConfig
        ? `${previousConfig.panel_id || "annunciator_panel"}::${previousConfig.ack_store?.type || "local"}::${previousConfig.ack_store?.entity || ""}`
        : "";

      const incomingSeverity = ensureObj(config.severity_colors || config.colors, {});
      const severity_colors = mergeSeverityColors(incomingSeverity);

      const normalizedHeaderAck = headerAckButtons(config);

      // Runtime validates but never invents ephemeral identity. The visual editor persists UID/ACK-slot repairs.
      const validation = validateAndRepairConfig({ ...config, entities: normalizeEntities(config.entities) }, false);
      const entities = validation.config.entities;
      this._validationIssues = validation.issues;
      this._validationRepairs = validation.repairs;

      this._config = {
        config_version: CONFIG_VERSION,
        title: "",
        // Normalize legacy single-button configs before defaults are merged.
        show_ack_all: normalizedHeaderAck.ackAll,
        show_clear_ack: normalizedHeaderAck.clearAck,
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
        ...config,
        entities,
        severity_colors,
      };

      const nextAckNamespace = `${this._config.panel_id || "annunciator_panel"}::${this._config.ack_store?.type || "local"}::${this._config.ack_store?.entity || ""}`;
      if (previousAckNamespace && previousAckNamespace !== nextAckNamespace) this._ackShadow = null;
      if (previousConfig && alarmHistoryStorageKey(previousConfig.panel_id) !== alarmHistoryStorageKey(this._config.panel_id)) this._alarmHistoryShadow = null;
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
        const sourceChanged=String(old.entity||"")!==String(item.entity||"")||isDerivedLamp(old)!==isDerivedLamp(item);
        if(sourceChanged){
          if(this._blinkTimers?.[rid])clearTimeout(this._blinkTimers[rid]);
          if(this._blinkTimers)delete this._blinkTimers[rid];
          if(this._changeActive)delete this._changeActive[rid];
          if(this._lastSeen)delete this._lastSeen[rid];
          if(this._changeLastTs)delete this._changeLastTs[rid];
        }else if(isDerivedLamp(item)&&JSON.stringify(old)!==JSON.stringify(item)){
          // A derived lamp observes its final rule-resolved ON/OFF state. Editing
          // the rule/base configuration is not a live source transition, so seed
          // the next render from the new model while preserving any alert that
          // was already active before the edit.
          if(this._lastSeen)delete this._lastSeen[rid];
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
      (Array.isArray(this._config?.entities) ? this._config.entities : []).forEach((raw) => {
        const item = normalizeLamp(raw || {});
        const e = String(item.entity || "").trim();
        if (e) deps.add(e);
        lampRuleDependencies(item).forEach((dep) => deps.add(dep));
      });
      const lampTest = String(this._config?.lamp_test_entity || "").trim(); if (lampTest) deps.add(lampTest);
      const toggle = String(this._config?.header_toggle_entity || "").trim(); if (toggle) deps.add(toggle);
      const ackEnt = this._config?.ack_store?.type === "input_text" ? String(this._config?.ack_store?.entity || "").trim() : ""; if (ackEnt) deps.add(ackEnt);
      const historical=normalizeHeaderV3(this._config||{}).tallies;
      if(historical.history_source==="entities")HISTORICAL_TALLY_SPECS.forEach(({key,entityKey})=>{if(historical[key]===true&&historical[entityKey])deps.add(historical[entityKey])});
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
        if (remoteText === this._ackShadow.encoded || (!this._ackShadow.pending&&remoteText!==previousText&&Date.now()-Number(this._ackShadow.created||0)>2000)) this._ackShadow = null;
      }
      if ((lampTest && changed.has(lampTest)) || (ackEnt && changed.has(ackEnt))) { this._renderDynamic(); return; }
      if (toggle && changed.has(toggle)) { this._applyHeader(); changed.delete(toggle); }
      if (changed.size) this._renderDynamic(changed);
    }

    connectedCallback() {
      this._runtimeConnected=true;
      this._startPanelResizeObserver();
      if (!this._alarmHistoryClearHandler) {
        this._alarmHistoryClearHandler = (event) => {
          if(!this._historicalTalliesUseLocal())return;
          const panelId = String(this._config?.panel_id || "annunciator_panel");
          if (String(event?.detail?.panelId || "") !== panelId) return;
          const now = Date.now(), key = alarmHistoryStorageKey(panelId);
          const history = normalizeAlarmHistory({ events: [], activeIds: this._currentHistoricalAlarmIds || [] }, now);
          this._alarmHistoryShadow = { key, history };
          try { localStorage.setItem(key, JSON.stringify(history)); } catch (_) {}
          this._headerTallyValues = { ...ensureObj(this._headerTallyValues, {}), alarms_day:0, alarms_week:0, alarms_month:0, alarms_year:0 };
          this._scheduleAlarmHistoryRefresh(history, now);
          this._applyHeader();
        };
      }
      if (!this._alarmHistoryListening) {
        window.addEventListener("annunciator-alarm-history-cleared", this._alarmHistoryClearHandler);
        this._alarmHistoryListening = true;
      }
      if(!this._alarmHistoryStorageHandler){
        this._alarmHistoryStorageHandler=(event)=>{const key=alarmHistoryStorageKey(this._config?.panel_id);if(event?.key!==key)return;this._alarmHistoryShadow=null;if(this._historicalTalliesUseLocal()&&this._hass)this._renderDynamic()};
      }
      if(!this._alarmHistoryStorageListening){window.addEventListener("storage",this._alarmHistoryStorageHandler);this._alarmHistoryStorageListening=true}
      this._restoreChangeAlertTimers();
      if(this._config&&this._hass)this._renderDynamic();
    }

    disconnectedCallback() {
      this._runtimeConnected=false;
      this._runtimeEpoch=(this._runtimeEpoch||0)+1;
      if (this._panelResizeObserver) { try { this._panelResizeObserver.disconnect(); } catch (_) {} this._panelResizeObserver = null; }
      Object.values(this._blinkTimers || {}).forEach((timer) => { if (timer) clearTimeout(timer); });
      this._blinkTimers = {};
      if (this._alarmHistoryTimer) clearTimeout(this._alarmHistoryTimer);
      this._alarmHistoryTimer = null;
      if (this._manualLampTestTimer) clearTimeout(this._manualLampTestTimer);
      this._manualLampTestTimer = null;
      if (this._alarmHistoryListening && this._alarmHistoryClearHandler) window.removeEventListener("annunciator-alarm-history-cleared", this._alarmHistoryClearHandler);
      this._alarmHistoryListening = false;
      if(this._alarmHistoryStorageListening&&this._alarmHistoryStorageHandler)window.removeEventListener("storage",this._alarmHistoryStorageHandler);
      this._alarmHistoryStorageListening=false;
      if(this._alarmOutputApplied?.sounding||this._alarmOutputState?.activeIds?.length)this._requestAlarmOutput([],"update");
    }

    _restoreChangeAlertTimers(){
      const now=Date.now();
      normalizeEntities(this._config?.entities).filter(isOperationalLamp).forEach((item)=>{
        const rid=lampRuntimeId(item);if(!rid||!this._changeActive?.[rid]||!item.blink_on_change||item.blink_on_change_until_ack)return;
        const expires=Number(this._changeLastTs?.[rid]||0)+changeAlertDurationMs(item);
        if(!Number.isFinite(expires)||expires<=now){this._changeActive[rid]=false;return}
        if(this._blinkTimers?.[rid])clearTimeout(this._blinkTimers[rid]);
        this._blinkTimers[rid]=setTimeout(()=>{this._changeActive[rid]=false;this._blinkTimers[rid]=null;this._renderDynamic(item.entity?new Set([item.entity]):null)},Math.max(1,expires-now));
      });
    }

    _historicalTalliesEnabled() {
      const tallies = normalizeHeaderV3(this._config || {}).tallies;
      return ["alarms_day", "alarms_week", "alarms_month", "alarms_year"].some((key) => tallies[key] === true);
    }

    _historicalTalliesUseLocal(){return normalizeHeaderV3(this._config||{}).tallies.history_source!=="entities"}

    _scheduleAlarmHistoryRefresh(value, now = Date.now()) {
      if (this._alarmHistoryTimer) clearTimeout(this._alarmHistoryTimer);
      this._alarmHistoryTimer = null;
      if (!this._historicalTalliesEnabled() || !this._historicalTalliesUseLocal() || !this.isConnected) return;
      const history = normalizeAlarmHistory(value, now);
      let nextAt = Infinity;
      Object.values(ALARM_HISTORY_WINDOWS).forEach((windowMs) => {
        for (const entry of history.events) {
          const expires = entry + windowMs;
          if (expires > now) { nextAt = Math.min(nextAt, expires); break; }
        }
      });
      if (!Number.isFinite(nextAt)) return;
      const delay = Math.min(2147483000, Math.max(1000, nextAt - now + 25));
      this._alarmHistoryTimer = setTimeout(() => { this._alarmHistoryTimer = null; this._renderDynamic(); }, delay);
    }

    _updateAlarmHistory(activeIds, now = Date.now()) {
      const empty = { alarms_day:0, alarms_week:0, alarms_month:0, alarms_year:0 };
      this._currentHistoricalAlarmIds = [...new Set((Array.isArray(activeIds) ? activeIds : []).map(String).filter(Boolean))].sort();
      if (!this._historicalTalliesEnabled()) {
        if (this._alarmHistoryTimer) clearTimeout(this._alarmHistoryTimer);
        this._alarmHistoryTimer = null;
        return empty;
      }
      if(!this._historicalTalliesUseLocal()){
        if(this._alarmHistoryTimer)clearTimeout(this._alarmHistoryTimer);
        this._alarmHistoryTimer=null;
        return historicalTallyEntityValues(normalizeHeaderV3(this._config||{}).tallies,this._hass?.states||{});
      }
      const key = alarmHistoryStorageKey(this._config?.panel_id), shadow = this._alarmHistoryShadow;
      let previous = shadow?.key === key ? shadow.history : {};
      if(shadow?.key!==key){try {const stored = localStorage.getItem(key);if (stored) previous = JSON.parse(stored)} catch (_) {}}
      const cachedEvents=Array.isArray(previous?.events)?previous.events:[],cacheFresh=shadow?.key===key&&cachedEvents.length<=50000&&(!cachedEvents.length||cachedEvents[0]>=now-ALARM_HISTORY_WINDOWS.alarms_year)&&(!cachedEvents.length||cachedEvents[cachedEvents.length-1]<=now+300000);
      const normalizedPrevious=cacheFresh?previous:normalizeAlarmHistory(previous,now);
      const transition = alarmHistoryTransition(normalizedPrevious, this._currentHistoricalAlarmIds, now, true);
      const history = { version:transition.version, events:transition.events, activeIds:transition.activeIds };
      this._alarmHistoryShadow = { key, history };
      if(JSON.stringify(normalizedPrevious)!==JSON.stringify(history)){try { localStorage.setItem(key, JSON.stringify(history)); } catch (_) {}}
      this._scheduleAlarmHistoryRefresh(history, now);
      return transition.counts;
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
  const glareOffset = ((((h >> 24) & 0xff) / 255) * 0.10) - 0.05; // -0.05..+0.05
  try {
    el.style.setProperty("--hotspot-x", (35 + ox).toFixed(1) + "%");
    el.style.setProperty("--hotspot-y", (28 + oy).toFixed(1) + "%");
    el.style.setProperty("--lens-grain", grain.toFixed(3));
    el.style.setProperty("--lens-glare-offset", glareOffset.toFixed(3));
  } catch(e) {}
}



    _ensureRoot() {
      if (this.shadowRoot) { this._startPanelResizeObserver(); return; }
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
        <style>
          :host { display:block; min-width:0; max-width:100%; }
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
            background:var(--annun-header-background,transparent);
            border:var(--annun-header-border-width,0px) solid var(--annun-header-border,currentColor);
            border-radius:var(--annun-header-radius,0px);
            font-family:var(--annun-header-font-family,inherit);
          }
          .title {
            color:var(--annun-header-title-color,inherit);
            font-size:var(--annun-header-title-font-size,16px);
            font-weight:var(--annun-header-font-weight,900);
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
            justify-content:flex-end;
            gap: 6px;
            flex-shrink:0;
          }
          .headerToggle {
            display:flex;
            gap: 10px;
            align-items:center;
            opacity: 0.95;
          }
          .headerToggleLabel { color:var(--annun-header-tally-color,inherit); font-size:var(--annun-header-tally-font-size,12px); font-weight:var(--annun-header-font-weight,inherit); opacity: 0.85; }

          .headerBtn {
            padding: 6px 10px;
            border-radius:var(--annun-header-button-radius,8px);
            border:var(--annun-header-button-border-width,1px) solid var(--annun-header-button-border,rgba(255,255,255,0.18));
            background:var(--annun-header-button-background,rgba(255,255,255,0.06));
            color:var(--annun-header-button-text,var(--primary-text-color,#fff));
            cursor: pointer;
            font-family:inherit;
            font-size:var(--annun-header-button-font-size,12px);
            font-weight:var(--annun-header-font-weight,800);
            letter-spacing: 0.02em;
            white-space: nowrap;
          }
          .headerBtn:hover { background:var(--annun-header-button-hover,var(--annun-header-button-background,rgba(255,255,255,0.11))); }
          .headerBtn:active { transform: translateY(1px); }
          @media(max-width:600px){.header{align-items:flex-start;flex-wrap:wrap;padding:8px}.title{width:100%}.headerTallies{width:100%;font-size:var(--annun-header-tally-font-size,11px)}.headerRight{width:100%;justify-content:flex-start;overflow-x:auto;padding-bottom:2px}.headerBtn{min-height:36px}}

          .panel {
            padding: 0;
            background: var(--annun-panel, var(--panel-surface, #2a2a2a));
            border: 2px solid var(--panel-edge, #0b0b0b);
            border-radius:var(--annun-panel-radius,0px);
            box-shadow:
              inset 0 0 0 1px var(--panel-border, rgba(255,255,255,0.06)),
              0 10px 30px var(--panel-shadow, rgba(0,0,0,0.45));
          }

          .grid {
            display: grid;
            gap: 0px;
            background:var(--annun-panel-frame,var(--annun-frame,var(--panel-frame,#111)));
            padding: var(--annun-outer, 6px);
            border-radius:var(--annun-frame-radius,0px);
          }

          .cell {
            position: relative;
            background:var(--annun-lamp-frame,var(--annun-frame,var(--panel-bezel,#111)));
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
            border: var(--annun-lamp-border-width, 2px) solid rgba(0,0,0,0.55);
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
          /* Spacer appearance is separate from lamp styling. Compatibility mode
             intentionally adds no visual override beyond the historical renderer. */
          .cell.spacer-custom {
            background:var(--annun-spacer-bezel) !important;
          }
          .cell.spacer-custom.spacer-bezel-none {
            border-color:transparent !important;
            box-shadow:none !important;
          }
          .cell.spacer-custom .window {
            background:var(--annun-spacer-fill) !important;
            border:var(--annun-spacer-border-width,2px) solid var(--annun-spacer-border,rgba(0,0,0,.55)) !important;
            box-shadow:none !important;
          }
          .cell.spacer-custom .window::before,
          .cell.spacer-custom .window::after { display:none !important; }
          .cell.spacer-blend {
            background:transparent !important;
            border-color:transparent !important;
            box-shadow:none !important;
            pointer-events:none;
          }
          .cell.spacer-blend .window {
            background:transparent !important;
            border-color:transparent !important;
            box-shadow:none !important;
          }
          .cell.spacer-blend .window::before,
          .cell.spacer-blend .window::after { display:none !important; }
          .cell:is(.spacer-custom,.spacer-blend) .text { display:none !important; }
          .headerTallies{display:flex;align-items:center;gap:8px;color:var(--annun-header-tally-color,inherit);font-size:var(--annun-header-tally-font-size,12px);font-weight:var(--annun-header-font-weight,800);letter-spacing:.04em;flex-wrap:wrap;}
          .headerTally+.headerTally::before{content:"|";opacity:.45;margin-right:8px;}
          @media(max-width:600px){.headerTallies{font-size:var(--annun-header-tally-font-size,11px)}}

          /* v1.1 shapes are opt-in. "inherit" adds no class and is byte-for-byte
             equivalent to the v1.0.2 rounded window geometry. */
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

            font-family: var(--lamp-font-family, var(--annun-lamp-font-family, "Arial Narrow", "Roboto Condensed", "Liberation Sans Narrow", Arial, sans-serif));
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
          .lampIcon{display:block;flex:0 0 auto;width:var(--annun-icon-size,40px);height:var(--annun-icon-size,40px);--mdc-icon-size:var(--annun-icon-size,40px);margin-bottom:8px;color:inherit;}
          .lampIcon[hidden]{display:none !important;margin:0 !important;}
          .primaryLine:empty,.secondaryLine:empty,.tertiaryLine:empty{display:none;}
          .content-icon-only .lampIcon{margin-bottom:0;}
          .shape-square .lampIcon,.shape-circle .lampIcon,.shape-indicator_dot .lampIcon{width:min(var(--annun-icon-size,40px),62%);height:min(var(--annun-icon-size,40px),62%);--mdc-icon-size:min(var(--annun-icon-size,40px),calc(var(--shape-size,96px) * .62));}
          
          /* Paired lamps (stacked) */
          .cell.paired { padding: var(--annun-mullion, 6px); border-radius: var(--annun-radius, 12px); }
          .pairWrap{ position:relative; display:flex; flex-direction:column; width:100%; height:100%; border-radius: var(--annun-radius, 12px); overflow:hidden; }
          .pairHalf{ position:relative; flex:1 1 0; display:flex; align-items:stretch; justify-content:center; overflow:hidden; }
          .pairHalf .window{ position:absolute; inset:0; }
          .pairHalf .text{ position:relative; width:100%; padding: var(--annun-cell-pad, 10px); display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; }
          .pairDivider{ height:2px; background:#0b0b0b; width:100%; flex:0 0 auto; }
          .pairHalf.top{ border-top-left-radius: var(--annun-radius, 12px); border-top-right-radius: var(--annun-radius, 12px); }
          .pairHalf.bottom{ border-bottom-left-radius: var(--annun-radius, 12px); border-bottom-right-radius: var(--annun-radius, 12px); }
          .cell.pair-horizontal .pairWrap{flex-direction:row;}
          .cell.pair-horizontal .pairDivider{height:100%;width:2px;}
          .cell.pair-horizontal .pairHalf.top{border-radius:var(--annun-radius,12px) 0 0 var(--annun-radius,12px);}
          .cell.pair-horizontal .pairHalf.bottom{border-radius:0 var(--annun-radius,12px) var(--annun-radius,12px) 0;}
          /* Optional shared capsule. The physical pair remains two independent
             lamps; only the bezel/lens silhouette and center seam are shared. */
          .cell.pair-split-pill{background:transparent !important;border-color:transparent !important;box-shadow:none !important;border-radius:999px;overflow:visible;}
          .cell.pair-split-pill::before{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;box-sizing:border-box;border-radius:999px;background:var(--annun-lamp-frame,var(--annun-frame,var(--panel-bezel,#1b1b1d)));border:1px solid var(--panel-border,rgba(255,255,255,.07));box-shadow:0 6px 18px var(--panel-shadow,rgba(0,0,0,.58));}
          .cell.pair-split-pill .pairWrap{z-index:1;border-radius:999px;overflow:hidden;}
          .cell.pair-split-pill .pairHalf.shape-pill::before{display:none;}
          .cell.pair-split-pill .pairHalf.shape-pill .window{inset:0;}
          .cell.pair-split-pill.pair-vertical .pairHalf.top,.cell.pair-split-pill.pair-vertical .pairHalf.top .window{border-radius:999px 999px 0 0;}
          .cell.pair-split-pill.pair-vertical .pairHalf.bottom,.cell.pair-split-pill.pair-vertical .pairHalf.bottom .window{border-radius:0 0 999px 999px;}
          .cell.pair-split-pill.pair-horizontal .pairHalf.top,.cell.pair-split-pill.pair-horizontal .pairHalf.top .window{border-radius:999px 0 0 999px;}
          .cell.pair-split-pill.pair-horizontal .pairHalf.bottom,.cell.pair-split-pill.pair-horizontal .pairHalf.bottom .window{border-radius:0 999px 999px 0;}
          .cell.pair-split-pill .pairDivider{position:relative;z-index:4;background:var(--annun-lamp-frame,var(--annun-frame,#0b0b0b));box-shadow:0 0 0 1px color-mix(in srgb,var(--annun-lamp-frame,var(--annun-frame,#0b0b0b)) 72%,transparent);}

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
          min-height:44px;
          align-self:start;
          overflow:hidden;
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


/* === Lens materials (appearance only; state/color logic is independent) === */
.cell .window::after,
.pairHalf .window::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: clamp(0, calc(var(--lens-glare, 0.18) + var(--lens-glare-offset, 0)), 1);
}
.lens-plastic { --lens-glare: 0.20; }
.lens-glass { --lens-glare: 0.54; }
.lens-frosted { --lens-glare: 0.22; }
.lens-smoked { --lens-glare: 0.16; }

.modern.lens-plastic .window::after {
  background: linear-gradient(135deg, transparent 0 25%, rgba(255,255,255,.14) 37%, transparent 52%), radial-gradient(circle at 18% 16%, rgba(255,255,255,.20), transparent 42%);
}
.modern.lens-plastic .window { box-shadow: inset 0 1px 2px rgba(255,255,255,.28), inset 0 -8px 15px rgba(0,0,0,.22); }

.modern.lens-glass .window::after {
  background: linear-gradient(150deg, rgba(255,255,255,.70) 0 9%, rgba(255,255,255,.20) 10% 24%, transparent 25% 56%, rgba(255,255,255,.22) 57% 67%, transparent 68%), linear-gradient(135deg, transparent 0 42%, rgba(255,255,255,.22) 43% 50%, transparent 51%);
}
.modern.lens-glass .window { box-shadow: inset 0 0 0 1px rgba(255,255,255,.26), inset 0 3px 12px rgba(255,255,255,.30), inset 0 -16px 24px rgba(0,0,0,.24), 0 1px 2px rgba(0,0,0,.45); }

.modern.lens-frosted .window::after {
  background: repeating-linear-gradient(96deg, rgba(255,255,255,.08) 0 1px, rgba(255,255,255,.015) 1px 3px), radial-gradient(circle at 45% 42%, rgba(255,255,255,.28), transparent 76%);
  mix-blend-mode: screen;
}
.modern.lens-frosted .window { box-shadow: inset 0 0 0 1px rgba(255,255,255,.12), inset 0 0 18px rgba(255,255,255,.18), inset 0 -9px 18px rgba(0,0,0,.18); filter: saturate(.88); }

.modern.lens-smoked .window::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background: linear-gradient(180deg, rgba(0,0,0,.28), rgba(0,0,0,.16));
  mix-blend-mode: multiply;
}
.modern.lens-smoked .window::after { background: linear-gradient(145deg, rgba(255,255,255,.16), transparent 32% 68%, rgba(255,255,255,.05)); }
.modern.lens-smoked .window { box-shadow: inset 0 0 0 999px rgba(0,0,0,.22), inset 0 2px 9px rgba(255,255,255,.08), inset 0 -16px 26px rgba(0,0,0,.42); filter: brightness(.78) saturate(.88); }

/* === Panel themes === */
#grid.theme-classic, .panel.theme-classic {
  --panel-frame: #101011; --panel-surface: #28282a; --panel-bezel: #1b1b1d;
  --panel-border: rgba(255,255,255,.07); --panel-shadow: rgba(0,0,0,.58); --panel-edge: #090909;
}
#grid.theme-avionics, .panel.theme-avionics {
  --panel-frame: #172027; --panel-surface: #202a31; --panel-bezel: #111a20;
  --panel-border: rgba(137,190,214,.28); --panel-shadow: rgba(0,0,0,.72); --panel-edge: #31434d;
}
#grid.theme-neon, .panel.theme-neon {
  --panel-frame: #0b0711; --panel-surface: #15101d; --panel-bezel: #100c17;
  --panel-border: rgba(186,117,255,.28); --panel-shadow: rgba(0,0,0,.86); --panel-edge: #39204d;
}
#grid { background:var(--annun-panel-frame,var(--annun-frame,var(--panel-frame,#101011))); }
.cell { background:var(--annun-lamp-frame,var(--annun-frame,var(--panel-bezel,#1b1b1d))); border: 1px solid var(--panel-border, rgba(255,255,255,.07)); box-shadow: 0 6px 18px var(--panel-shadow, rgba(0,0,0,.58)); }
#grid.theme-avionics .text { letter-spacing: .6px; }
#grid.theme-avionics .cell { border-width: 1px; }
#grid.theme-neon .cell { box-shadow: 0 0 0 1px var(--panel-border), 0 10px 28px var(--panel-shadow); }
#grid.theme-neon .cell.on { box-shadow: 0 0 0 1px rgba(204,144,255,.34), 0 0 16px rgba(177,94,255,.12), 0 14px 34px rgba(0,0,0,.80); }

@keyframes incFlicker {
  0%,100% { opacity:.70; filter:brightness(.94); }
  7% { opacity:.98; filter:brightness(1.14); }
  11% { opacity:.58; filter:brightness(.88); }
  16% { opacity:.91; filter:brightness(1.08); }
  31% { opacity:.76; filter:brightness(.97); }
  46% { opacity:1; filter:brightness(1.16); }
  49% { opacity:.64; filter:brightness(.91); }
  67% { opacity:.88; filter:brightness(1.05); }
  82% { opacity:.54; filter:brightness(.86); }
  86% { opacity:.94; filter:brightness(1.10); }
}
#grid.flicker .cell.retro.on:not(:is(.blink,.pulse,.wave,.throb,.heartbeat,.flash)) .window::before,
#grid.flicker .pairHalf.retro.on:not(:is(.blink,.pulse,.wave,.throb,.heartbeat,.flash)) .window::before {
  animation:incFlicker 1.65s steps(1,end) infinite;
  will-change:opacity,filter;
}

/* Retro keeps its incandescent hotspot but each material remains visibly distinct. */
.retro.lens-plastic .window { box-shadow: inset 0 1px 3px rgba(255,255,255,.20), inset 0 -14px 24px rgba(0,0,0,.25); }
.retro.lens-glass .window { box-shadow: inset 0 0 0 1px rgba(255,255,255,.20), inset 0 4px 13px rgba(255,255,255,.26), inset 0 -18px 30px rgba(0,0,0,.30); }
.retro.lens-glass .window::after { opacity: clamp(.30, calc(.50 + var(--lens-glare-offset,0)), .72) !important; background: linear-gradient(150deg, rgba(255,255,255,.58), transparent 24% 58%, rgba(255,255,255,.18) 59% 68%, transparent 69%), radial-gradient(circle at 50% 50%, rgba(255,255,255,.14), transparent 62%); }
.retro.lens-frosted .window { filter: saturate(.84); box-shadow: inset 0 0 0 1px rgba(255,255,255,.10), inset 0 0 22px rgba(255,255,255,.20), inset 0 -12px 24px rgba(0,0,0,.22); }
.retro.lens-frosted .window::after { opacity: .56 !important; background: repeating-linear-gradient(94deg, rgba(255,255,255,.075) 0 1px, transparent 1px 3px), radial-gradient(circle at 50% 50%, rgba(255,255,255,.20), transparent 68%) !important; }
.retro.lens-smoked .window { box-shadow: inset 0 0 0 999px rgba(0,0,0,.20), inset 0 3px 10px rgba(255,255,255,.08), inset 0 -20px 34px rgba(0,0,0,.44) !important; filter: brightness(.75) saturate(.82); }

/* === v1.1 complete shape assemblies ===
   This block deliberately follows the theme rules. A shaped lens must not sit
   inside a second rectangular theme bezel. The physical grid footprint stays
   unchanged, while the visible bezel/lens/text assembly follows the selected
   geometry. */
.cell.shape-rectangle { border-radius:0; }
.cell.shape-rectangle .window { border-radius:0; }
.cell.shape-round_rectangle .window { border-radius:var(--annun-radius,12px); }

.cell.shape-pill,
.cell.shape-square,
.cell.shape-circle,
.cell.shape-indicator_dot,
.cell.paired-floating-shape {
  background:transparent !important;
  border-color:transparent !important;
  box-shadow:none !important;
}
.cell.shape-pill::before,
.cell.shape-square::before,
.cell.shape-circle::before,
.cell.shape-indicator_dot::before,
.pairHalf.shape-pill::before,
.pairHalf.shape-square::before,
.pairHalf.shape-circle::before,
.pairHalf.shape-indicator_dot::before {
  content:"";
  position:absolute;
  z-index:0;
  pointer-events:none;
  box-sizing:border-box;
  background:var(--annun-lamp-frame,var(--annun-frame,var(--panel-bezel,#1b1b1d)));
  border:1px solid var(--panel-border,rgba(255,255,255,.07));
  box-shadow:0 6px 18px var(--panel-shadow,rgba(0,0,0,.58));
}
.cell.shape-pill::before,
.pairHalf.shape-pill::before { inset:0; border-radius:999px; }
.cell.shape-square::before,
.cell.shape-circle::before,
.cell.shape-indicator_dot::before,
.pairHalf.shape-square::before,
.pairHalf.shape-circle::before,
.pairHalf.shape-indicator_dot::before {
  inset:50% auto auto 50%;
  width:calc(var(--shape-size,96px) + (var(--annun-mullion,6px) * 2));
  height:calc(var(--shape-size,96px) + (var(--annun-mullion,6px) * 2));
  transform:translate(-50%,-50%);
}
.cell.shape-square::before,
.pairHalf.shape-square::before { border-radius:0; }
.cell.shape-circle::before,
.cell.shape-indicator_dot::before,
.pairHalf.shape-circle::before,
.pairHalf.shape-indicator_dot::before { border-radius:50%; }
.cell.shape-pill .window,
.pairHalf.shape-pill .window { border-radius:999px; }
.pairHalf.shape-pill .window { inset:var(--annun-mullion,6px); }

.cell.shape-square .window,
.cell.shape-square > .text,
.cell.shape-circle .window,
.cell.shape-circle > .text,
.cell.shape-indicator_dot .window,
.cell.shape-indicator_dot > .text,
.pairHalf.shape-square .window,
.pairHalf.shape-square .text,
.pairHalf.shape-circle .window,
.pairHalf.shape-circle .text,
.pairHalf.shape-indicator_dot .window,
.pairHalf.shape-indicator_dot .text {
  position:absolute;
  inset:50% auto auto 50%;
  width:var(--shape-size,96px);
  height:var(--shape-size,96px);
  transform:translate(-50%,-50%);
  box-sizing:border-box;
}
.shape-pill .window,
.shape-square .window,
.shape-circle .window,
.shape-indicator_dot .window { z-index:1; }
.shape-pill .text,
.shape-square .text,
.shape-circle .text,
.shape-indicator_dot .text { z-index:2; }
.cell.shape-square .window,
.pairHalf.shape-square .window { border-radius:0; }
.cell.shape-circle .window,
.cell.shape-indicator_dot .window,
.pairHalf.shape-circle .window,
.pairHalf.shape-indicator_dot .window { border-radius:50%; }
.cell.shape-square > .text,
.cell.shape-circle > .text,
.cell.shape-indicator_dot > .text,
.pairHalf.shape-square .text,
.pairHalf.shape-circle .text,
.pairHalf.shape-indicator_dot .text {
  overflow:hidden;
  padding:max(7px,calc(var(--shape-size,96px) * .10));
}
.shape-square .primaryLine,.shape-square .secondaryLine,.shape-square .tertiaryLine,
.shape-circle .primaryLine,.shape-circle .secondaryLine,.shape-circle .tertiaryLine,
.shape-indicator_dot .primaryLine,.shape-indicator_dot .secondaryLine,.shape-indicator_dot .tertiaryLine {
  width:100%;
  min-width:0;
  max-width:100%;
  overflow-wrap:anywhere;
  word-break:break-word;
  hyphens:auto;
}
.shape-indicator_dot .text {
  padding:max(6px,calc(var(--shape-size,96px) * .08)) !important;
  font-size:clamp(8px,calc(var(--annun-font,13px) * .82),11px);
  line-height:1.05;
  letter-spacing:.025em;
}
.shape-indicator_dot .primaryLine { margin-bottom:2px; }
.shape-pill .text { padding-left:10%; padding-right:10%; }
.cell.paired-floating-shape .pairWrap { overflow:visible; }
.cell.shape-pill.clickable:focus-visible,
.cell.shape-square.clickable:focus-visible,
.cell.shape-circle.clickable:focus-visible,
.cell.shape-indicator_dot.clickable:focus-visible { outline:none; }
.cell.shape-pill.clickable:focus-visible .window,
.cell.shape-square.clickable:focus-visible .window,
.cell.shape-circle.clickable:focus-visible .window,
.cell.shape-indicator_dot.clickable:focus-visible .window { outline:3px solid var(--primary-color,#03a9f4); outline-offset:2px; }

/* === Optional surface removal ===
   Every switch is opt-in so an existing v1.0.2 panel keeps the same box model,
   frame, shadows, and lens borders. Spacer surfaces remain independently owned. */
.panel.surface-background-none { background:transparent !important; }
.panel.surface-border-none { border:0 !important; box-shadow:none !important; }
.panel.surface-frame-none .grid { background:transparent !important; }
.panel.surface-lamp-frame-none .cell:not(.spacer) {
  background:transparent !important;
  border-color:transparent !important;
  box-shadow:none !important;
}
.panel.surface-lamp-frame-none .cell:not(.spacer)::before,
.panel.surface-lamp-frame-none .cell:not(.spacer) .pairHalf::before {
  background:transparent !important;
  border-color:transparent !important;
  box-shadow:none !important;
}
.panel.surface-lamp-frame-none .cell.pair-split-pill .pairDivider { background:transparent !important; box-shadow:none !important; }
.panel.surface-lamp-border-none .cell:not(.spacer) > .window,
.panel.surface-lamp-border-none .cell:not(.spacer) .pairHalf .window {
  border-width:0 !important;
}

/* === v1.1 translucent illumination ===
   This final compositing layer intentionally follows the material, theme, and
   shape rules. It must remain visibly distinct for every lens and geometry. */
.cell.translucent-illumination.on .window,
.pairHalf.translucent-illumination.on .window {
  opacity:.88;
  background-image:
    radial-gradient(circle at 50% 42%,rgba(255,255,255,.48) 0,rgba(255,255,255,.20) 27%,transparent 68%),
    linear-gradient(180deg,rgba(255,255,255,.15),rgba(255,255,255,.02) 46%,rgba(0,0,0,.12)) !important;
  border-color:color-mix(in srgb,currentColor 48%,rgba(255,255,255,.62)) !important;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,.68),
    inset 0 -9px 20px rgba(0,0,0,.16),
    inset 0 0 26px color-mix(in srgb,currentColor 34%,transparent),
    0 0 8px color-mix(in srgb,currentColor 68%,transparent),
    0 0 22px color-mix(in srgb,currentColor 46%,transparent) !important;
}
.cell.translucent-illumination.on .window::after,
.pairHalf.translucent-illumination.on .window::after {
  opacity:.82 !important;
  background:
    radial-gradient(circle at 48% 43%,rgba(255,255,255,.50),rgba(255,255,255,.13) 31%,transparent 70%),
    linear-gradient(132deg,rgba(255,255,255,.30),transparent 28% 72%,rgba(255,255,255,.10)) !important;
  mix-blend-mode:screen;
}

/* Retro translucent lamps need a colored incandescent lens, not the broad
   white center used by the modern diffuser. Alert animations take exclusive
   ownership of lens brightness while active; the subtle filament flicker
   resumes automatically after the alert class is removed. */
.cell.retro.translucent-illumination.on .window,
.pairHalf.retro.translucent-illumination.on .window {
  opacity:.96;
  background:
    radial-gradient(ellipse at 50% 44%,
      color-mix(in srgb,currentColor 76%,white 24%) 0%,
      color-mix(in srgb,currentColor 91%,white 9%) 42%,
      currentColor 72%,
      color-mix(in srgb,currentColor 84%,black 16%) 100%) !important;
  border-color:color-mix(in srgb,currentColor 70%,white 30%) !important;
  box-shadow:
    inset 0 1px 2px rgba(255,255,255,.42),
    inset 0 7px 15px rgba(255,255,255,.12),
    inset 0 -11px 21px rgba(0,0,0,.18),
    inset 0 0 16px color-mix(in srgb,currentColor 56%,transparent),
    0 0 7px color-mix(in srgb,currentColor 58%,transparent),
    0 0 17px color-mix(in srgb,currentColor 34%,transparent) !important;
}
.cell.retro.translucent-illumination.on .window::before,
.pairHalf.retro.translucent-illumination.on .window::before {
  background:radial-gradient(ellipse at 50% 43%,rgba(255,255,255,.30),rgba(255,255,255,.10) 34%,transparent 70%);
  opacity:.68;
  mix-blend-mode:screen;
}
.cell.retro.translucent-illumination.on .window::after,
.pairHalf.retro.translucent-illumination.on .window::after {
  opacity:.38 !important;
  background:
    linear-gradient(150deg,rgba(255,255,255,.40),rgba(255,255,255,.08) 20%,transparent 42% 76%,rgba(255,255,255,.10)),
    repeating-linear-gradient(135deg,rgba(255,244,226,.025) 0 2px,transparent 2px 7px) !important;
  mix-blend-mode:screen;
}
.cell.retro.translucent-illumination.lens-glass.on .window::after,
.pairHalf.retro.translucent-illumination.lens-glass.on .window::after {
  opacity:.58 !important;
  background:
    linear-gradient(150deg,rgba(255,255,255,.62) 0 9%,rgba(255,255,255,.20) 10% 25%,transparent 26% 58%,rgba(255,255,255,.16) 59% 68%,transparent 69%),
    radial-gradient(circle at 50% 48%,rgba(255,255,255,.08),transparent 64%) !important;
}
.cell.retro.translucent-illumination.lens-frosted.on .window::after,
.pairHalf.retro.translucent-illumination.lens-frosted.on .window::after {
  opacity:.54 !important;
  background:
    repeating-linear-gradient(96deg,rgba(255,255,255,.075) 0 1px,rgba(255,255,255,.012) 1px 3px),
    radial-gradient(circle at 47% 45%,rgba(255,255,255,.20),transparent 76%) !important;
}
.cell.retro.translucent-illumination.lens-smoked.on .window::after,
.pairHalf.retro.translucent-illumination.lens-smoked.on .window::after {
  opacity:.28 !important;
  background:linear-gradient(145deg,rgba(255,255,255,.24),transparent 31% 72%,rgba(255,255,255,.06)) !important;
}

/* Preserve Retro lens material filters while an alert owns brightness. Using
   drop-shadow for Wave keeps the constant translucent inset/halo composition
   instead of replacing the complete box-shadow every animation frame. */
.retro.translucent-illumination { --retro-translucent-filter:brightness(1); }
.retro.translucent-illumination.lens-frosted { --retro-translucent-filter:saturate(.84); }
.retro.translucent-illumination.lens-smoked { --retro-translucent-filter:brightness(.75) saturate(.82); }
@keyframes retroTransBlink { 0%,49% { filter:var(--retro-translucent-filter) brightness(1); } 50%,100% { filter:var(--retro-translucent-filter) brightness(var(--attn-dim,.55)); } }
@keyframes retroTransPulse { 0%,100% { filter:var(--retro-translucent-filter) brightness(.95); } 50% { filter:var(--retro-translucent-filter) brightness(var(--attn-boost,1.25)) drop-shadow(0 0 6px currentColor); } }
@keyframes retroTransWave { 0%,100% { filter:var(--retro-translucent-filter) brightness(.95) drop-shadow(0 0 0 transparent); } 50% { filter:var(--retro-translucent-filter) brightness(var(--attn-boost-soft,1.20)) drop-shadow(0 0 var(--attn-wave-radius,10px) rgba(255,255,255,.18)); } }
@keyframes retroTransThrob { 0%,100% { filter:var(--retro-translucent-filter) brightness(var(--attn-throb-min,.92)); } 50% { filter:var(--retro-translucent-filter) brightness(var(--attn-throb-max,1.08)); } }
@keyframes retroTransHeartbeat { 0% { filter:var(--retro-translucent-filter) brightness(.95); } 10% { filter:var(--retro-translucent-filter) brightness(var(--attn-boost,1.22)) drop-shadow(0 0 6px currentColor); } 20% { filter:var(--retro-translucent-filter) brightness(.98); } 35% { filter:var(--retro-translucent-filter) brightness(var(--attn-boost-soft,1.18)) drop-shadow(0 0 5px currentColor); } 50%,100% { filter:var(--retro-translucent-filter) brightness(.95); } }
@keyframes retroTransFlash { 0%,85%,93%,100% { filter:var(--retro-translucent-filter) brightness(.98); } 86%,92% { filter:var(--retro-translucent-filter) brightness(var(--attn-boost,1.35)) drop-shadow(0 0 7px currentColor); } }
.cell.retro.translucent-illumination.blink .window,.pairHalf.retro.translucent-illumination.blink .window{animation:retroTransBlink var(--attn-blink-dur,1s) steps(2,end) infinite;}
.cell.retro.translucent-illumination.pulse .window,.pairHalf.retro.translucent-illumination.pulse .window{animation:retroTransPulse var(--attn-pulse-dur,1.2s) ease-in-out infinite;}
.cell.retro.translucent-illumination.wave .window,.pairHalf.retro.translucent-illumination.wave .window{animation:retroTransWave var(--attn-wave-dur,1.4s) ease-in-out infinite;}
.cell.retro.translucent-illumination.throb .window,.pairHalf.retro.translucent-illumination.throb .window{animation:retroTransThrob var(--attn-throb-dur,1.6s) ease-in-out infinite;}
.cell.retro.translucent-illumination.heartbeat .window,.pairHalf.retro.translucent-illumination.heartbeat .window{animation:retroTransHeartbeat var(--attn-heartbeat-dur,1.8s) ease-in-out infinite;}
.cell.retro.translucent-illumination.flash .window,.pairHalf.retro.translucent-illumination.flash .window{animation:retroTransFlash var(--attn-flash-dur,1.2s) ease-in-out infinite;}

/* Optional state-based lamp brightness. Opacity owns the requested base level
   while material filters and alert animations continue to own their filters. */
#grid.inactiveDimming .cell.inactive-dim .window,
#grid.inactiveDimming .pairHalf.inactive-dim .window,
#grid.lampBrightness .cell.brightness-dim .window,
#grid.lampBrightness .pairHalf.brightness-dim .window {
  opacity:var(--annun-lamp-brightness,var(--annun-inactive-opacity,.32));
  transition:opacity 150ms ease-out;
}
#grid.inactiveDimming .cell.inactive-dim > .text,
#grid.inactiveDimming .pairHalf.inactive-dim > .text,
#grid.lampBrightness .cell.brightness-dim > .text,
#grid.lampBrightness .pairHalf.brightness-dim > .text {
  opacity:var(--annun-lamp-text-brightness,var(--annun-inactive-text-opacity,.62));
  transition:opacity 150ms ease-out;
}
@media (prefers-reduced-motion:reduce) {
  #grid.inactiveDimming .cell.inactive-dim .window,
  #grid.inactiveDimming .pairHalf.inactive-dim .window,
  #grid.inactiveDimming .cell.inactive-dim > .text,
  #grid.inactiveDimming .pairHalf.inactive-dim > .text,
  #grid.lampBrightness .cell.brightness-dim .window,
  #grid.lampBrightness .pairHalf.brightness-dim .window,
  #grid.lampBrightness .cell.brightness-dim > .text,
  #grid.lampBrightness .pairHalf.brightness-dim > .text { transition:none; }
}


</style>

        <ha-card>
          <div id="header" class="header" style="display:none;">
            <div id="title" class="title"></div>
            <div id="headerTallies" class="headerTallies"></div>
            <div class="headerRight">
              <button id="ackAllBtn" class="headerBtn" style="display:none;"></button>
              <button id="silenceBtn" class="headerBtn" style="display:none;"></button>
              <button id="resetBtn" class="headerBtn" style="display:none;"></button>
              <button id="lampTestBtn" class="headerBtn" style="display:none;"></button>
              <button id="clearAckBtn" class="headerBtn" style="display:none;"></button>
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
      this._startPanelResizeObserver();
    }

    _startPanelResizeObserver() {
      if (this._panelResizeObserver || !this.shadowRoot || typeof ResizeObserver === "undefined") return;
      this._panelResizeObserver = new ResizeObserver((entries) => {
        const width = entries?.[0]?.contentRect?.width || this.getBoundingClientRect?.().width || 0;
        if (Math.abs((this._lastPanelObservedWidth || 0) - width) < 0.5) return;
        this._lastPanelObservedWidth = width;
        this._applyResponsivePanel();
      });
      try { this._panelResizeObserver.observe(this); } catch (_) {}
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

    _interactionDescription(action) {
      return ({
        none: "None", more_info: "More info", toggle: "Toggle", turn_on: "Turn on",
        turn_off: "Turn off", ack: "Acknowledge", clear_ack: "Clear ACK",
        perform_action:"Perform action", navigate:"Navigate", url:"Open URL"
      })[normalizeInteractionAction(action)] || "None";
    }

    async _executeLampInteraction(lampItem, gesture, allowAck, allowMoreInfo) {
      const item = normalizeLamp(lampItem || {});
      if (!isOperationalLamp(item)) return;
      const prefix = gesture === "double" ? "double_tap" : gesture === "hold" ? "hold" : "tap";
      const fallback = gesture === "tap" ? "more_info" : "ack";
      const action = normalizeInteractionAction(item[`${prefix}_action`], fallback);
      if (action === "none") return;
      const presentation = isPresentation(this._config);
      const target = interactionTargetEntity(item, gesture);

      if (action === "more_info") {
        if (!allowMoreInfo || !target) return;
        this._showMoreInfo(target);
        return;
      }
      if (presentation) return;
      if (action === "ack") {
        if (allowAck) await this._toggleAck(item);
        return;
      }
      if (action === "clear_ack") {
        if (allowAck) await this._clearLampAck(item);
        return;
      }
      if(action==="navigate"){const path=safeNavigationPath(item[`${prefix}_navigation_path`]);if(path&&typeof history!=="undefined"){history.pushState(null,"",path);window.dispatchEvent?.(new Event("location-changed"))}return}
      if(action==="url"){const url=safeInteractionUrl(item[`${prefix}_url`]);if(url)window.open?.(url,"_blank","noopener");return}
      if(action==="perform_action"){await this._performConfiguredAction({service:item[`${prefix}_service`],data:ensureObj(item[`${prefix}_service_data`],{}),target:ensureObj(item[`${prefix}_service_target`],{})});return}
      if (!interactionNeedsEntity(action) || !target || !this._hass?.callService) return;
      const service = action === "turn_on" ? "turn_on" : action === "turn_off" ? "turn_off" : "toggle";
      try {
        await this._hass.callService("homeassistant", service, { entity_id: target });
      } catch (e) {
        console.warn(`Lamp ${gesture} action failed:`, e);
      }
    }

    _wireLampInteraction(el, lampItem, allowAck, allowMoreInfo) {
      const item = normalizeLamp(lampItem || {});
      const ent = String(item.entity || "").trim();
      if (!el || !isOperationalLamp(item)) return;
      const tapAction = normalizeInteractionAction(item.tap_action, "more_info");
      const doubleAction = normalizeInteractionAction(item.double_tap_action, "ack");
      const holdAction = normalizeInteractionAction(item.hold_action, "ack");
      const usable = [[tapAction,"tap"], [doubleAction,"double"], [holdAction,"hold"]].some(([action,gesture]) => {
        if (action === "none") return false;
        if (action === "more_info") return !!allowMoreInfo&&!!interactionTargetEntity(item,gesture);
        if (isPresentation(this._config)) return false;
        if (action === "ack" || action === "clear_ack") return !!allowAck;
        if (interactionNeedsEntity(action)) return !!interactionTargetEntity(item,gesture);
        const prefix=gesture==="double"?"double_tap":gesture==="hold"?"hold":"tap";
        if(action==="perform_action")return validServiceName(item[`${prefix}_service`]);
        if(action==="navigate")return !!safeNavigationPath(item[`${prefix}_navigation_path`]);
        if(action==="url")return !!safeInteractionUrl(item[`${prefix}_url`]);
        return true;
      });
      if (!usable) {
        el.classList.remove("clickable");
        el.removeAttribute("tabindex"); el.removeAttribute("role"); el.removeAttribute("aria-label");
        return;
      }
      if (el.dataset?.__wired === "1") return;
      if (el.dataset) { el.dataset.__wired = "1"; el.dataset.entity = ent; }
      el.classList.add("clickable");
      el.tabIndex = 0;
      el.setAttribute("role", "button");
      const label = String(item.name_override || item.primary_text || this._hass?.states?.[ent]?.attributes?.friendly_name || ent || "Derived lamp");
      el.setAttribute("aria-label", `${label}. Tap: ${this._interactionDescription(tapAction)}. Double tap: ${this._interactionDescription(doubleAction)}. Long press: ${this._interactionDescription(holdAction)}. Keyboard: Enter tap; Space double tap; Shift+Space long press.`);

      let tapTimer = null, pressTimer = null, suppressResetTimer = null;
      let startX = 0, startY = 0, pointerId = null, suppressNextClick = false;
      const TAP_DELAY = 285, HOLD_DELAY = 575, MOVE_TOLERANCE = 12;
      const clearTap = () => { if (tapTimer) clearTimeout(tapTimer); tapTimer = null; };
      const cancelPress = () => { if (pressTimer) clearTimeout(pressTimer); pressTimer = null; pointerId = null; };
      const run = (gesture) => {
        if (!el.isConnected) return;
        Promise.resolve(this._executeLampInteraction(item, gesture, allowAck, allowMoreInfo)).catch((e) => console.warn("Lamp interaction failed:", e));
      };
      const armSuppressionReset = () => {
        if (suppressResetTimer) clearTimeout(suppressResetTimer);
        suppressResetTimer = setTimeout(() => { suppressNextClick = false; suppressResetTimer = null; }, 1000);
      };

      el.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        if (suppressNextClick) {
          suppressNextClick = false;
          if (suppressResetTimer) clearTimeout(suppressResetTimer);
          suppressResetTimer = null;
          clearTap();
          return;
        }
        if (tapTimer) {
          clearTap();
          run("double");
          return;
        }
        tapTimer = setTimeout(() => { tapTimer = null; run("tap"); }, TAP_DELAY);
      });
      // The two click events above perform arbitration. Native dblclick is suppressed so
      // it can never cause a second action on browsers that emit it after click #2.
      el.addEventListener("dblclick", (e) => { e.preventDefault(); e.stopPropagation(); });
      el.addEventListener("pointerdown", (e) => {
        if (e.isPrimary === false || (e.pointerType === "mouse" && e.button !== 0)) return;
        cancelPress();
        startX = e.clientX; startY = e.clientY; pointerId = e.pointerId;
        pressTimer = setTimeout(() => {
          pressTimer = null;
          clearTap();
          suppressNextClick = true;
          run("hold");
        }, HOLD_DELAY);
      });
      el.addEventListener("pointermove", (e) => {
        if (pointerId !== e.pointerId || !pressTimer) return;
        if (Math.hypot(e.clientX - startX, e.clientY - startY) > MOVE_TOLERANCE) cancelPress();
      });
      const release = () => {
        cancelPress();
        // Some touch browsers synthesize a click, others do not. Keep suppression just
        // long enough for a synthesized click, then release it so the next real tap works.
        if (suppressNextClick) armSuppressionReset();
      };
      el.addEventListener("pointerup", release);
      el.addEventListener("pointercancel", release);
      if (holdAction !== "none") el.addEventListener("contextmenu", (e) => { e.preventDefault(); e.stopPropagation(); });
      el.addEventListener("keydown", (e) => {
        if (e.repeat) return;
        if (e.key === "Enter") { e.preventDefault(); run("tap"); return; }
        if (e.key === " " || e.code === "Space") { e.preventDefault(); run(e.shiftKey ? "hold" : "double"); }
      });
    }

    _applyHeader() {
      const cfg = this._config;
      const headerEl = this.shadowRoot.getElementById("header");
      const titleEl = this.shadowRoot.getElementById("title");
      const toggleWrap = this.shadowRoot.getElementById("headerToggle");
      const sw = this.shadowRoot.getElementById("toggleSwitch");
      const ackAllBtn = this.shadowRoot.getElementById("ackAllBtn");
      const silenceBtn = this.shadowRoot.getElementById("silenceBtn");
      const resetBtn = this.shadowRoot.getElementById("resetBtn");
      const lampTestBtn = this.shadowRoot.getElementById("lampTestBtn");
      const clearAckBtn = this.shadowRoot.getElementById("clearAckBtn");
      const talliesEl = this.shadowRoot.getElementById("headerTallies");

      const hasTitle = !!String(cfg.title || "").trim();
      const mode = panelMode(cfg);
      const wantsToggle = mode !== "presentation" && !!cfg.show_header_toggle && !!String(cfg.header_toggle_entity || "").trim();
      const header = normalizeHeaderV3(cfg), controls = header.controls;
      const wantsAckAll = mode !== "presentation" && controls.acknowledge.enabled;
      const wantsClearAck = mode !== "presentation" && controls.clear_acknowledged.enabled;
      const hasTallies = HEADER_TALLY_KEYS.some((key) => header.tallies[key] === true);

      headerEl.style.display = hasTitle || wantsToggle || wantsAckAll || wantsClearAck || hasTallies || (mode!=="presentation"&&[controls.silence,controls.reset,controls.lamp_test].some(x=>x.enabled)) ? "flex" : "none";
      titleEl.textContent = String(cfg.title || "");
      const fallbackValues={active:0,alarm:0,unacknowledged:0,total:0,unavailable:0,alarms_day:0,alarms_week:0,alarms_month:0,alarms_year:0};if(header.tallies.history_source==="entities")HISTORICAL_TALLY_SPECS.forEach(({key})=>{fallbackValues[key]=null});const values=this._headerTallyValues||fallbackValues;
      const tallyLabels={active:"ACTIVE",alarm:"ALARM",unacknowledged:"UNACKNOWLEDGED",total:"TOTAL",unavailable:"UNAVAILABLE",alarms_day:header.tallies.alarms_day_label,alarms_week:header.tallies.alarms_week_label,alarms_month:header.tallies.alarms_month_label,alarms_year:header.tallies.alarms_year_label};
      talliesEl.innerHTML=HEADER_TALLY_KEYS.filter(k=>header.tallies[k]).map(k=>`<span class="headerTally">${escapeHtml(tallyLabels[k])} ${escapeHtml(formatHeaderTallyValue(values[k]))}</span>`).join("");
      talliesEl.style.display=hasTallies?"flex":"none";

      // Fixed labels keep the two panel-wide actions visually and verbally consistent.
      // Legacy reset_ack_label is still accepted/stored for downgrade compatibility,
      // but v1.0.2 deliberately standardizes the visible labels.
      ackAllBtn.style.display = wantsAckAll ? "inline-flex" : "none";
      ackAllBtn.textContent = controls.acknowledge.label;
      ackAllBtn.setAttribute("aria-label", controls.acknowledge.label);
      ackAllBtn.title = "Acknowledge all currently active alerts";
      ackAllBtn.onclick = () => { if (panelMode(this._config) !== "presentation") this._ackAll(); };

      clearAckBtn.style.display = wantsClearAck ? "inline-flex" : "none";
      const wire=(button,control,title,handler)=>{button.style.display=mode!=="presentation"&&control.enabled?"inline-flex":"none";button.textContent=control.label;button.setAttribute("aria-label",control.label);button.title=title;button.onclick=handler};
      wire(silenceBtn,controls.silence,"Silence the current alarm output",()=>this._silenceAlarmOutput());
      wire(resetBtn,controls.reset,"Reset cleared latched alarm state",()=>this._resetClearedAlarms());
      wire(lampTestBtn,controls.lamp_test,"Run lamp test",()=>this._runLampTest());
      clearAckBtn.textContent = controls.clear_acknowledged.label;
      clearAckBtn.setAttribute("aria-label", controls.clear_acknowledged.label);
      clearAckBtn.title = "Clear stored acknowledgements";
      clearAckBtn.onclick = () => { if (panelMode(this._config) !== "presentation") this._clearAcks(); };

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
      const grid = this.shadowRoot.getElementById("grid");
      const panel = this.shadowRoot.getElementById("panelScale");
      const headerEl = this.shadowRoot.getElementById("header");
      const setOptional = (el, cssName, key, fallback, defaultEnabled = true) => {
        if (!el) return;
        if (colorOverrideEnabled(colors, key, defaultEnabled)) el.style.setProperty(cssName, cleanColor(colors[key]) || fallback);
        else el.style.removeProperty(cssName);
      };
      setOptional(grid, "--annun-frame", "frame", BUILTIN_COLORS.frame, false);
      setOptional(panel, "--annun-panel", "panel", BUILTIN_COLORS.panel, false);
      const appearance = normalizePanelAppearance(cfg.panel_appearance);
      const setAppearance = (cssName, key) => {
        if (!panel) return;
        const value = String(appearance[key] || "").trim();
        if (appearance[`${key}_enabled`] === true && value) panel.style.setProperty(cssName, value);
        else panel.style.removeProperty(cssName);
      };
      setAppearance("--annun-panel", "background");
      setAppearance("--panel-edge", "border");
      setAppearance("--annun-panel-frame", "frame");
      if (panel) {
        const panelFrame = appearance.frame_enabled === true ? String(appearance.frame || "").trim() : "";
        if (appearance.lamp_frame_none) {
          panel.style.setProperty("--annun-lamp-frame", "transparent");
        } else if (appearance.lamp_frame_mode === "follow_panel") {
          if (panelFrame) panel.style.setProperty("--annun-lamp-frame", panelFrame);
          else panel.style.removeProperty("--annun-lamp-frame");
        } else if (appearance.lamp_frame_mode === "custom") {
          panel.style.setProperty("--annun-lamp-frame", appearance.lamp_frame || "var(--panel-bezel,#1b1b1d)");
        } else {
          panel.style.setProperty("--annun-lamp-frame", "var(--panel-bezel,#1b1b1d)");
        }
        panel.style.removeProperty("--annun-lamp-frame-source");
        panel.classList.toggle("surface-background-none", appearance.background_none);
        panel.classList.toggle("surface-border-none", appearance.border_none);
        panel.classList.toggle("surface-frame-none", appearance.frame_none);
        panel.classList.toggle("surface-lamp-frame-none", appearance.lamp_frame_none);
        panel.classList.toggle("surface-lamp-border-none", appearance.lamp_border_none);
        if(appearance.radius_enabled){panel.style.setProperty("--annun-panel-radius",`${appearance.radius}px`);panel.style.overflow="hidden"}else{panel.style.removeProperty("--annun-panel-radius");panel.style.removeProperty("overflow")}
      }
      if(appearance.frame_radius_enabled)grid?.style.setProperty("--annun-frame-radius",`${appearance.frame_radius}px`);else grid?.style.removeProperty("--annun-frame-radius");
      const headerAppearance = normalizeHeaderAppearance(cfg.header_appearance);
      const setHeaderColor = (cssName, key, forceNone = false) => {
        if (!headerEl) return;
        const value = headerAppearance[key];
        if (forceNone || headerAppearance[`${key}_none`] === true) headerEl.style.setProperty(cssName, "transparent");
        else if (headerAppearance[`${key}_enabled`] === true && value) headerEl.style.setProperty(cssName, value);
        else headerEl.style.removeProperty(cssName);
      };
      setHeaderColor("--annun-header-background", "background");
      setHeaderColor("--annun-header-border", "border");
      setHeaderColor("--annun-header-title-color", "title_color");
      setHeaderColor("--annun-header-tally-color", "tally_color");
      setHeaderColor("--annun-header-button-text", "button_text");
      setHeaderColor("--annun-header-button-background", "button_background");
      setHeaderColor("--annun-header-button-hover", "button_hover", headerAppearance.button_background_none);
      setHeaderColor("--annun-header-button-border", "button_border");
      if (headerAppearance.border_none) headerEl?.style.setProperty("--annun-header-border-width", "0px");
      else if (headerAppearance.border_enabled && headerAppearance.border) headerEl?.style.setProperty("--annun-header-border-width", `${headerAppearance.border_width}px`);
      else headerEl?.style.removeProperty("--annun-header-border-width");
      if (headerAppearance.button_border_none) headerEl?.style.setProperty("--annun-header-button-border-width", "0px");
      else if (headerAppearance.button_border_enabled && headerAppearance.button_border) headerEl?.style.setProperty("--annun-header-button-border-width", `${headerAppearance.button_border_width}px`);
      else headerEl?.style.removeProperty("--annun-header-button-border-width");
      const fontStack = configuredFontStack(headerAppearance.font_family, headerAppearance.font_custom);
      if (fontStack) headerEl?.style.setProperty("--annun-header-font-family", fontStack);
      else headerEl?.style.removeProperty("--annun-header-font-family");
      if (headerAppearance.font_weight !== "inherit") headerEl?.style.setProperty("--annun-header-font-weight", headerAppearance.font_weight);
      else headerEl?.style.removeProperty("--annun-header-font-weight");
      const setHeaderSize = (cssName, key) => {
        if (headerAppearance[`${key}_enabled`] === true) headerEl?.style.setProperty(cssName, `${headerAppearance[key]}px`);
        else headerEl?.style.removeProperty(cssName);
      };
      setHeaderSize("--annun-header-title-font-size", "title_font_size");
      setHeaderSize("--annun-header-tally-font-size", "tally_font_size");
      setHeaderSize("--annun-header-button-font-size", "button_font_size");
      setHeaderSize("--annun-header-button-radius", "button_radius");
      if(headerAppearance.radius_enabled)headerEl?.style.setProperty("--annun-header-radius",`${headerAppearance.radius}px`);else headerEl?.style.removeProperty("--annun-header-radius");
      setOptional(grid, "--annun-text", "text", BUILTIN_COLORS.text);
      setOptional(grid, "--annun-unavailable", "unavailable", BUILTIN_COLORS.unavailable);
      setOptional(grid, "--annun-off", "off", BUILTIN_COLORS.off);

      grid.style.setProperty("--annun-mullion", `${Math.max(0, Math.min(100, clampNum(cfg.mullion, 6)))}px`);
      grid.style.setProperty("--annun-outer", `${Math.max(0, Math.min(200, clampNum(cfg.outer_frame, 6)))}px`);
      grid.style.setProperty("--annun-cell-pad", `${Math.max(0, Math.min(200, clampNum(cfg.cell_padding, 10)))}px`);
      const panelBrightness=normalizePanelLampBrightness(cfg),brightnessProfiles=[panelBrightness,...normalizeEntities(cfg.entities).filter(isOperationalLamp).map((item)=>normalizePerLampBrightness(item,cfg))];
      const hasLampBrightness=brightnessProfiles.some((levels)=>[levels.off,levels.on,levels.alert].some((level)=>Number(level)<100));
      grid.classList.toggle("inactiveDimming",hasLampBrightness);
      grid.classList.toggle("lampBrightness",hasLampBrightness);
      grid.style.setProperty("--annun-inactive-opacity",(panelBrightness.dim_level/100).toFixed(2));
      grid.style.setProperty("--annun-inactive-text-opacity",Math.max(.62,panelBrightness.dim_level/100).toFixed(2));
      const radius = String(cfg.corner_style || "rounded").toLowerCase() === "sharp" ? 0 : Math.max(0, clampNum(cfg.corner_radius, 12));
      grid.style.setProperty("--annun-radius", `${radius}px`);
      grid.style.setProperty("--annun-font", `${Math.max(4, Math.min(200, clampNum(cfg.font_size, 13)))}px`);
      grid.style.setProperty("--annun-weight", String(cfg.font_weight || "700"));
      grid.style.setProperty("--annun-line-height", String(Math.max(0.5, Math.min(3, clampNum(cfg.line_height, 1.15)))));
      const lampFontStack = configuredFontStack(cfg.lamp_font_family, cfg.lamp_font_custom);
      if (lampFontStack) grid.style.setProperty("--annun-lamp-font-family", lampFontStack);
      else grid.style.removeProperty("--annun-lamp-font-family");
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
        const panel = this.shadowRoot?.getElementById("panelScale");
        [g, panel].filter(Boolean).forEach((node) => {
          node.classList.toggle("theme-classic", th === "classic");
          node.classList.toggle("theme-avionics", th === "avionics");
          node.classList.toggle("theme-neon", th === "neon");
        });
        g?.classList.toggle("flicker", !!cfg.flicker);
      } catch(e) {}

      const __configuredColumns = Math.max(1, Math.min(100, Math.floor(clampNum(cfg.columns, 7))));
      const __columns = computeOccupiedColumns(cfg);
      const __cellW = Math.max(20, Math.min(2000, clampNum(cfg.cell_width, 225)));
      const __cellHNum = Math.max(20, Math.min(2000, clampNum(cfg.cell_height, 160)));
      const __gap = Math.max(0, Math.min(200, clampNum(cfg.cell_gap, 0)));
      const __rows = Math.max(0, Math.min(100, Math.floor(clampNum(cfg.rows, 0))));
      const __cellH = `${__cellHNum}px`;
      const __showGroups = !!cfg.show_group_headers;
      grid.style.gridTemplateColumns = `repeat(${__columns}, ${__cellW}px)`;
      grid.dataset.configuredColumns = String(__configuredColumns);
      grid.dataset.renderColumns = String(__columns);
      // Group headers are compact structural rows while lamp tracks retain the
      // configured cell height. Auto-sized tracks are required only in group
      // mode; the no-group layout keeps the legacy fixed-row contract.
      grid.style.gridAutoRows = __showGroups ? "auto" : __cellH;
      grid.style.gap = `${__gap}px`;
      // Rows is a minimum panel depth. Content may grow beyond it; reducing Rows
      // never hides configured lamps. This gives the old Rows control real, safe behavior.
      const __outer = Math.max(0, clampNum(cfg.outer_frame, 6));
      grid.style.minHeight = (String(cfg.row_mode || "auto") === "fixed" && __rows > 0) ? `${(__rows * __cellHNum) + (Math.max(0, __rows - 1) * __gap)}px` : "";
      grid.innerHTML = "";

      const showGroups = __showGroups;
      const gh = ensureObj(cfg.group_header, {});
      const ghShowBtns = gh.show_buttons !== false;
      const ghBg = (gh.background || "").trim();
      const ghFg = (gh.color || "").trim();
      const ghDivider = !!gh.divider;
      const ghBtnMode = String(gh.button_mode || "icons").toLowerCase(); // icons | text
      const ghShowAckAlerts = !!gh.show_ack_alerts_button;
      const {lamps:normBase,renderItems}=buildRenderItems(cfg.entities,showGroups);
      this._derived=renderItems;
      this._pairByEntity=buildPairEntityIndex(renderItems);

      const layoutPlan=planGridLayout(normBase,__columns);let layoutIndex=0;
      const __mullion=Math.max(0,Math.min(100,clampNum(cfg.mullion,6)));
      const floatingShapes=new Set(["pill","square","circle","indicator_dot"]);
      const applyShapeGeometry=(element,raw,width,height)=>{
        if(!element)return;
        const geometry=computeShapeGeometry(raw?.shape,width,height,__mullion),shape=geometry.shape;
        if(shape!=="inherit")element.classList.add(`shape-${shape}`);
        element.classList.toggle("translucent-illumination",raw?.translucent_illumination===true);
        if(geometry.size!==null)element.style.setProperty("--shape-size",`${geometry.size}px`);
      };
      renderItems.forEach((wrap, dIdx) => {
        const cell = document.createElement("div");
        cell.className = "cell off";
        const item = wrap.__type === "lamp" ? wrap.lamp : null;
        const idx = wrap.__type === "lamp" ? wrap.idx : -1;

        // Group header rows (optional)
if (wrap.__type === "group_header") {
  cell.className = "groupHeader";
  cell.style.gridColumn = "1 / -1";
  cell.style.height = "44px";
  if (ghBg) cell.style.background = ghBg;
  if (ghFg) cell.style.color = ghFg;
  if (ghDivider) cell.style.boxShadow = "inset 0 -1px 0 rgba(255,255,255,0.18)";

  const iconMode = ghBtnMode !== "text";
  const ackBtn = iconMode
    ? `<ha-icon-button class="gAck" title="ACK group" aria-label="ACK group"><ha-icon icon="mdi:check-circle-outline"></ha-icon></ha-icon-button>`
    : `<button class="gAck" title="ACK group">ACK</button>`;
  const ackAlertsBtn = iconMode
    ? `<ha-icon-button class="gAckAlerts" title="ACK alerting only" aria-label="ACK alerting only"><ha-icon icon="mdi:bell-check-outline"></ha-icon></ha-icon-button>`
    : `<button class="gAckAlerts" title="ACK alerting only">ACK alerts</button>`;
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
        const placement=layoutPlan.placements[layoutIndex++];
        const footprintWidth=((placement?.columnSpan||1)*__cellW)+(Math.max(0,(placement?.columnSpan||1)-1)*__gap);
        const footprintHeight=((placement?.rowSpan||1)*__cellHNum)+(Math.max(0,(placement?.rowSpan||1)-1)*__gap);
        cell.dataset.index = String(dIdx);
        cell.style.height = showGroups ? `${footprintHeight}px` : "100%";
        if(placement){cell.style.gridColumn=showGroups?`span ${placement.columnSpan}`:`${placement.col+1} / span ${placement.columnSpan}`;cell.style.gridRow=showGroups?`span ${placement.rowSpan}`:`${placement.row+1} / span ${placement.rowSpan}`;cell.dataset.gridRow=String(placement.row+1);cell.dataset.gridColumn=String(placement.col+1);cell.dataset.rowSpan=String(placement.rowSpan);cell.dataset.columnSpan=String(placement.columnSpan)}
        if (idx >= 0) cell.dataset.originalIndex = String(idx);

        if (wrap.__type === "lamp_pair") {
          cell.classList.add("paired");
          const pairOrientation = String(wrap.top?.lamp?.pair_orientation || wrap.bottom?.lamp?.pair_orientation || "vertical").toLowerCase() === "horizontal" ? "horizontal" : "vertical";
          const pairShapeMode = [wrap.top?.lamp?.pair_shape_mode,wrap.bottom?.lamp?.pair_shape_mode].some((value)=>normalizePairShapeMode(value)==="split_pill") ? "split_pill" : "independent";
          cell.classList.add(`pair-${pairOrientation}`);
          cell.classList.toggle("pair-split-pill",pairShapeMode==="split_pill");
          cell.innerHTML = `
            <div class="pairWrap">
              <div class="pairHalf top" data-half="top">
                <div class="window"></div>
                <div class="text">
                  <ha-icon class="lampIcon" hidden aria-hidden="true"></ha-icon>
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
                  <ha-icon class="lampIcon" hidden aria-hidden="true"></ha-icon>
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
          if ((t && isOperationalLamp(t)) || (b && isOperationalLamp(b))) cell.classList.add("clickable");
          const __modeP = panelMode(cfg);
          const __allowAckP = __modeP !== "presentation";
          const __allowMoreInfoP = __modeP !== "presentation" ? true : (cfg.presentation_allow_more_info !== false);
          const topHalfEl = cell.querySelector('.pairHalf[data-half="top"]');
          const botHalfEl = cell.querySelector('.pairHalf[data-half="bottom"]');
          const halfWidth=pairOrientation==="horizontal"?Math.max(20,(footprintWidth-2)/2):footprintWidth;
          const halfHeight=pairOrientation==="vertical"?Math.max(20,(footprintHeight-2)/2):footprintHeight;
          if(t)applyShapeGeometry(topHalfEl,pairShapeMode==="split_pill"?{...t,shape:"pill"}:t,halfWidth,halfHeight);
          if(b)applyShapeGeometry(botHalfEl,pairShapeMode==="split_pill"?{...b,shape:"pill"}:b,halfWidth,halfHeight);
          cell.classList.toggle("paired-floating-shape",pairShapeMode==="split_pill"||[t,b].filter(Boolean).some(x=>floatingShapes.has(normalizeShape(x.shape))));
          if (t && isOperationalLamp(t)) this._wireLampInteraction(topHalfEl, t, __allowAckP, __allowMoreInfoP);
          if (b && isOperationalLamp(b)) this._wireLampInteraction(botHalfEl, b, __allowAckP, __allowMoreInfoP);

        } else {
          cell.innerHTML = `
            <div class="window"></div>
            <div class="text">
              <ha-icon class="lampIcon" hidden aria-hidden="true"></ha-icon>
              <div class="primaryLine"></div>
              <div class="secondaryLine"></div>
              <div class="tertiaryLine"></div>
              <div class="inopLine" hidden></div>
            </div>
          `;
          if(item)applyShapeGeometry(cell,item,footprintWidth,footprintHeight);
        }

        if (item && isOperationalLamp(item)) {
          const __mode = panelMode(cfg);
          const __allowAck = __mode !== "presentation";
          const __allowMoreInfo = __mode !== "presentation" ? true : (cfg.presentation_allow_more_info !== false);
          this._wireLampInteraction(cell, item, __allowAck, __allowMoreInfo);
        }

        grid.appendChild(cell);
      });
      requestAnimationFrame(() => this._applyResponsivePanel());
    }

    _renderDynamic(onlyEntities = null) {
      const request={epoch:this._runtimeEpoch||0,cfg:this._config,hass:this._hass,grid:this.shadowRoot?.getElementById("grid"),onlyEntities:onlyEntities?new Set(onlyEntities):null};
      if(!request.cfg||!request.hass||!request.grid)return Promise.resolve();
      const run=()=>this._renderDynamicPass(request);
      this._runtimeRenderQueue=(this._runtimeRenderQueue||Promise.resolve()).then(run,run);
      return this._runtimeRenderQueue;
    }

    async _renderDynamicPass(request) {
      const {cfg,hass,grid,onlyEntities,epoch}=request;
      if(epoch!==(this._runtimeEpoch||0)||cfg!==this._config||grid!==this.shadowRoot?.getElementById("grid"))return;
      this._applyCssVars();
      this._applyHeader();

      const colors = ensureObj(cfg.severity_colors, {});

      const ackMap = await this._getAckMap(cfg,hass);
      if(epoch!==(this._runtimeEpoch||0)||cfg!==this._config||grid!==this.shadowRoot?.getElementById("grid"))return;
      const ackBase={...ensureObj(ackMap,{})},ack = new AckManager(cfg.panel_id, ackMap);
      const lampTestState=cfg.lamp_test_entity?hass?.states?.[cfg.lamp_test_entity]?.state:undefined;
      const lampTest = (cfg.lamp_test_entity ? isTruthyState(lampTestState) : false) || Date.now() < Number(this._manualLampTestUntil || 0);
      const lampTestMode = String(cfg.lamp_test_mode || "steady").toLowerCase();
      const lampTestFull = lampTest && lampTestMode === "full";
      const tally={active:0,alarm:0,unacknowledged:0,total:0,unavailable:0,alarms_day:0,alarms_week:0,alarms_month:0,alarms_year:0},audible=[],historicalAlarmIds=[];
      normalizeEntities(cfg.entities).filter(isOperationalLamp).forEach(item=>{tally.total++;const state=lampStateObject(item,hass?.states||{});const isAcked=ack.isAcked(item,"main"),resolved=evaluateLampState(item,state,{acked:isAcked,changeActive:!!this._changeActive?.[lampRuntimeId(item)],changeAcked:ack.isAcked(item,"change"),states:hass?.states||{}});if(!resolved.available)tally.unavailable++;if(resolved.isOn)tally.active++;if(resolved.isOn&&["alarm","trip"].includes(String(resolved.severity))){tally.alarm++;historicalAlarmIds.push(lampRuntimeId(item)||item.entity)}if(resolved.alert?.mainActive&&!isAcked){tally.unacknowledged++;if(item.participates_in_alarm_output===true)audible.push(lampRuntimeId(item)||item.entity)}});
      Object.assign(tally,this._updateAlarmHistory(historicalAlarmIds));
      this._headerTallyValues=tally;this._applyHeader();
      this._updateAlarmOutput(audible);

      const updateLamp = (cell, rawItem) => {
        const item = normalizeLamp(rawItem || {});
        const primaryEl = cell.querySelector(".primaryLine");
        const secondaryEl = cell.querySelector(".secondaryLine");
        const tertiaryEl = cell.querySelector(".tertiaryLine");
        const inopEl = cell.querySelector(".inopLine");
        const textEl = cell.querySelector(".text");
        const iconEl = cell.querySelector(".lampIcon");
        if (!primaryEl || !secondaryEl || !inopEl) return;

        cell.classList.remove("spacer", "spacer-default", "spacer-custom", "spacer-blend", "spacer-fill-none", "spacer-bezel-none", "spacer-border-none");
        cell.style.removeProperty("--lamp-font-family");
        cell.style.removeProperty("--annun-lamp-brightness");
        cell.style.removeProperty("--annun-lamp-text-brightness");
        delete cell.dataset.brightnessState;delete cell.dataset.brightnessPercent;
        ["--annun-spacer-fill", "--annun-spacer-bezel", "--annun-spacer-border", "--annun-spacer-border-width"].forEach((name) => cell.style.removeProperty(name));
        if (isSpacerItem(item)) {
          cell.className = cell.className.replace(/\b(on|blink|pulse|wave|throb|heartbeat|flash|unavailable|acked|blinkchg)\b/g, "");
          cell.classList.add("off");
          const blankColor = globalColorValue(colors, "blank", BUILTIN_COLORS.blank);
          const spacer = resolveSpacerAppearance(item, cfg, colors);
          cell.classList.add("spacer", `spacer-${spacer.mode}`);
          if (spacer.mode === "custom") {
            cell.classList.toggle("spacer-fill-none", spacer.fill === "transparent");
            cell.classList.toggle("spacer-bezel-none", spacer.bezel === "transparent");
            cell.classList.toggle("spacer-border-none", spacer.borderWidth === 0 || spacer.border === "transparent");
            cell.style.setProperty("--annun-spacer-fill", spacer.fill);
            cell.style.setProperty("--annun-spacer-bezel", spacer.bezel);
            cell.style.setProperty("--annun-spacer-border", spacer.border);
            cell.style.setProperty("--annun-spacer-border-width", `${spacer.borderWidth}px`);
            cell.style.background = spacer.bezel;
          } else if (spacer.mode === "blend") cell.style.background = "transparent";
          else cell.style.background = blankColor;
          cell.style.color = blankColor;
          primaryEl.textContent = ""; secondaryEl.textContent = "";
          primaryEl.style.removeProperty("display");secondaryEl.style.removeProperty("display");
          if (tertiaryEl) { tertiaryEl.textContent = ""; tertiaryEl.style.display = "none"; }
          if(iconEl){iconEl.hidden=true;iconEl.style.display="none";iconEl.removeAttribute("icon");iconEl.style.removeProperty("color");iconEl.style.removeProperty("--annun-icon-size")}
          cell.classList.remove("content-icon-only","content-icon-text");
          inopEl.hidden = true;
          if (textEl) textEl.style.color = globalColorValue(colors, "off_text", BUILTIN_COLORS.off_text);
          return;
        }

        cell.style.removeProperty("background");
        const ownFontStack = normalizeFontFamily(item.font_family) === "inherit" ? "" : configuredFontStack(item.font_family, item.font_custom);
        if (ownFontStack) cell.style.setProperty("--lamp-font-family", ownFontStack);
        ack.migrate(item);
        const stateObj = lampStateObject(item, hass?.states || {});
        const runtimeId = lampRuntimeId(item);
        const applyLampContent=(resolvedState)=>{
          const contentMode=normalizeLampContentMode(item.content_mode),showIcon=contentMode!=="text",showText=contentMode!=="icon",selectLines=contentMode==="icon_text";
          cell.classList.toggle("content-icon-only",contentMode==="icon");cell.classList.toggle("content-icon-text",contentMode==="icon_text");
          const showPrimary=showText&&(!selectLines||item.icon_show_primary!==false)&&!!primaryEl.textContent;
          const showSecondary=showText&&(!selectLines||item.icon_show_secondary!==false)&&!!secondaryEl.textContent;
          const showTertiary=showText&&(!selectLines||item.icon_show_tertiary!==false)&&!!tertiaryEl?.textContent;
          primaryEl.style.display=showPrimary?"":"none";secondaryEl.style.display=showSecondary?"":"none";
          if(tertiaryEl)tertiaryEl.style.display=showTertiary?"":"none";
          if(iconEl){iconEl.hidden=!showIcon;if(showIcon){iconEl.style.removeProperty("display");iconEl.setAttribute("icon",resolveLampIcon(item,stateObj));iconEl.style.setProperty("--annun-icon-size",`${normalizeLampIconSize(item.icon_size)}px`);const iconColor=resolveLampIconColor(item,resolvedState);if(iconColor)iconEl.style.color=iconColor;else iconEl.style.removeProperty("color")}else{iconEl.style.display="none";iconEl.removeAttribute("icon");iconEl.style.removeProperty("color");iconEl.style.removeProperty("--annun-icon-size")}}
        };

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
          const derivedResolved=isDerivedLamp(item)?evaluateLampState(item,stateObj,{acked:true,suppressAlerts:true,states:hass?.states||{}}):null;
          const observedState=derivedResolved?(derivedResolved.isOn?"on":"off"):rawState;
          const transformed = applyValueTransform(toNumber(observedState), item.value_format);
          // Change alerts track the source entity state only. Editing scale/offset,
          // rounding, units or other card configuration must never create a fake alarm.
          // Derived lamps instead track their final rule-resolved ON/OFF result.
          const snapshot = String(observedState);
          const last = this._lastSeen?.[runtimeId];
          changed = last !== undefined && last !== snapshot;
          this._lastSeen[runtimeId] = snapshot;

          const trigger = shouldTriggerChangeAlert(item, observedState, transformed, changed);
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
                if (item.entity) this._renderDynamic(new Set([item.entity]));
                else this._renderDynamic();
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
          states: hass?.states || {},
        });

        // Automatic rearm clears only after the alert condition has genuinely
        // returned to normal. Legacy lamps default to manual rearm.
        if (!lampTest && shouldAutoRearm(item, resolved, mainAcked, cfg)) {
          ack.clear(item, "main");
          mainAcked = false;
          resolved = evaluateLampState(item, stateObj, {
            lampTest, acked: false, changeActive: lampTest ? false : changeActive, changeAcked, changed,
            suppressAlerts: lampTest && !lampTestFull, forceAlert: lampTestFull, states: hass?.states || {},
          });
        }

        const visual = resolveLampColors(item, resolved, colors);

        cell.classList.remove("on", "off", "blink", "pulse", "wave", "throb", "heartbeat", "flash", "unavailable", "acked", "blinkchg", "inactive-dim", "brightness-dim");

        if (!resolved.available) {
          cell.classList.add("off", "unavailable");
          cell.style.color = visual.unavailable;
          cell.style.setProperty("--lamp-unavailable", visual.unavailable);
          cell.querySelectorAll(".window").forEach((w) => { w.style.backgroundColor = visual.unavailable; });
          inopEl.hidden = resolved.display.handlesUnavailable === true;
          inopEl.textContent = cfg.unavailable_text || "INOP";
          primaryEl.textContent = resolved.display.primary || item.entity;
          secondaryEl.textContent = String(resolved.display.secondary || "");
          if (tertiaryEl) { tertiaryEl.textContent = String(resolved.display.tertiary || ""); tertiaryEl.style.display = resolved.display.tertiary ? "" : "none"; }
          if (textEl) textEl.style.color = visual.unavailableText;
          applyLampContent(resolved);
          return;
        }

        inopEl.hidden = true;
        const severity = resolved.severity;
        const onColor = visual.onColor;
        const offColor = visual.offColor;
        const onWindowColor = visual.onWindowColor;

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
        const brightness=resolveLampBrightness(item,cfg,resolved,{lampTest});
        cell.classList.toggle("brightness-dim",brightness.dimmed);
        cell.classList.toggle("inactive-dim",brightness.dimmed);
        cell.dataset.brightnessState=brightness.state;cell.dataset.brightnessPercent=String(brightness.percent);
        if(brightness.dimmed){cell.style.setProperty("--annun-lamp-brightness",brightness.opacity.toFixed(2));cell.style.setProperty("--annun-lamp-text-brightness",Math.max(.62,brightness.opacity).toFixed(2))}
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
        if (textEl) textEl.style.color = resolved.isOn ? visual.onText : visual.offText;
        applyLampContent(resolved);

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
          info.onpointerdown = (e) => e.stopPropagation();
          info.onpointerup = (e) => e.stopPropagation();
          info.onpointercancel = (e) => e.stopPropagation();
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
          if (!filter || lampDependsOnAny(topItem, filter)) updateLamp(topCell, topItem);
          if (!filter || lampDependsOnAny(botItem, filter)) updateLamp(botCell, botItem);
        } else {
          const lampItem = normalizeLamp(wrap.lamp || {});
          if (!filter || lampDependsOnAny(lampItem, filter)) updateLamp(cell, lampItem);
        }
      });

      if (ack.dirty&&epoch===(this._runtimeEpoch||0)&&cfg===this._config) this._queueAckDelta(ackBase,ack.map,cfg,hass);
    }
    _showMoreInfo(entityId) {
      const ev = new CustomEvent("hass-more-info", { bubbles: true, composed: true, detail: { entityId } });
      this.dispatchEvent(ev);
    }

    _isOn(entityId) {
      const s = this._hass?.states?.[entityId]?.state;
      return isTruthyState(s);
    }

    _ackNamespace(config=this._config){const cfg=ensureObj(config,{}),store=ensureObj(cfg.ack_store,{type:"local"});return `${cfg.panel_id||"annunciator_panel"}::${store.type||"local"}::${store.entity||""}`}
    async _getAckMap(config=this._activeAckContext?.config||this._config,hass=this._activeAckContext?.hass||this._hass) {
      const cfg=ensureObj(config,{}),store = ensureObj(cfg.ack_store, { type: "local" });
      const panelId = String(cfg.panel_id || "annunciator_panel");
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
        const stateObj = hass?.states?.[store.entity];
        const shadow = this._ackShadow;
        if (shadow && shadow.panelId === panelId && shadow.entity === store.entity) {
          const remoteText = String(stateObj?.state || "");
          if (stateObj && remoteText === shadow.encoded) this._ackShadow = null;
          else return { ...ensureObj(shadow.map, {}) };
        }
        if (!stateObj) return local;
        const parsed = parseAckStateText(stateObj.state || "", cfg.entities, panelId);
        // A compact fingerprint mismatch means the config identity/slot layout changed.
        // Never apply bits to the wrong lamp; local fallback is safer than mis-ACKing.
        if (parsed === null) return local;
        return parsed || {};
      }
      return local;
    }

    async _setAckMap(map,config=this._activeAckContext?.config||this._config,hass=this._activeAckContext?.hass||this._hass) {
      const cfg=ensureObj(config,{}),store = ensureObj(cfg.ack_store, { type: "local" });
      const panelId = String(cfg.panel_id || "annunciator_panel"),namespace=this._ackNamespace(cfg);
      const key = `annun_ack_map::${panelId}`;
      const fallbackKey = `annun_ack_fallback::${panelId}`;

      if (store.type === "input_text" && store.entity) {
        const stateObj = hass?.states?.[store.entity];
        const maxLenRaw = stateObj?.attributes?.max ?? stateObj?.attributes?.max_length ?? stateObj?.attributes?.maxLen;
        const maxLen = (typeof maxLenRaw === "number" && Number.isFinite(maxLenRaw)) ? maxLenRaw : 255;
        const compact = encodeCompactAckState(map || {}, cfg.entities, panelId, stateObj?.state || "");

        const writeLocalFallback = () => {
          try {
            localStorage.setItem(key, JSON.stringify(map || {}));
            localStorage.setItem(fallbackKey, "1");
          } catch (e) { console.warn("Failed to write ACK fallback:", e); }
        };

        if (compact.length > maxLen) {
          console.warn(`Compact ACK state (${compact.length} chars) exceeds input_text max (${maxLen}); using local fallback.`);
          if(this._ackNamespace()===namespace)this._ackShadow = null;
          writeLocalFallback();
          return;
        }
        try {
          const revision=(this._ackWriteRevision||0)+1;this._ackWriteRevision=revision;
          if(this._ackNamespace()===namespace)this._ackShadow = { panelId, entity:store.entity, encoded:compact, map:{ ...ensureObj(map,{}) },revision,pending:true,created:Date.now() };
          await hass.callService("input_text", "set_value", { entity_id: store.entity, value: compact });
          if(this._ackShadow?.revision===revision)this._ackShadow={...this._ackShadow,pending:false};
          try { localStorage.removeItem(key); localStorage.removeItem(fallbackKey); } catch (_) {}
        } catch (e) {
          console.warn("Failed to write compact ACK state; using local fallback:", e);
          if(this._ackShadow?.revision===this._ackWriteRevision&&this._ackNamespace()===namespace)this._ackShadow = null;
          writeLocalFallback();
        }
        return;
      }

      if(this._ackNamespace()===namespace)this._ackShadow = null;
      try { localStorage.setItem(key, JSON.stringify(map || {})); }
      catch (e) { console.warn("Failed to write local ACK state:", e); }
    }

    _queueAckMutation(mutator,{config=this._config,hass=this._hass,render=true}={}){
      const cfg=config,namespace=this._ackNamespace(cfg);
      const run=async()=>{
        const current=await this._getAckMap(cfg,hass),working={...ensureObj(current,{})};
        const result=await mutator(working,cfg,hass),next=result===undefined?working:result;
        if(next!==null)await this._setAckMap(ensureObj(next,{}),cfg,hass);
        if(render&&this._ackNamespace()===namespace&&this._hass)this._renderDynamic();
        return next;
      };
      this._ackMutationQueue=(this._ackMutationQueue||Promise.resolve()).then(run,run);return this._ackMutationQueue;
    }
    _queueAckOperation(operation){
      const context={config:this._config,hass:this._hass,epoch:this._runtimeEpoch||0,namespace:this._ackNamespace()};
      const run=async()=>{if(context.epoch!==(this._runtimeEpoch||0)||context.namespace!==this._ackNamespace())return;this._activeAckContext=context;try{return await operation()}finally{if(this._activeAckContext===context)this._activeAckContext=null}};
      this._ackMutationQueue=(this._ackMutationQueue||Promise.resolve()).then(run,run);return this._ackMutationQueue;
    }
    _queueAckDelta(before,after,config=this._config,hass=this._hass){
      const prior=ensureObj(before,{}),next=ensureObj(after,{}),changes=[];
      new Set([...Object.keys(prior),...Object.keys(next)]).forEach((key)=>{if(prior[key]!==next[key])changes.push([key,Object.prototype.hasOwnProperty.call(next,key),next[key]])});
      if(!changes.length)return Promise.resolve();
      return this._queueAckMutation((latest)=>{changes.forEach(([key,present,value])=>{if(present)latest[key]=value;else delete latest[key]});return latest},{config,hass,render:false});
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
          <div class="histActions"><button class="histBtn histCopy" type="button" title="Copy entity ID">Copy entity</button><button class="histBtn histCopyYaml" type="button" title="Copy this lamp YAML">Copy YAML</button><button class="histBtn histCopyJson" type="button" title="Copy full lamp config JSON">Copy JSON</button><button class="histBtn histCopyDiag" type="button" title="Copy diagnostic package">Copy diagnostics</button><button class="histBtn histBtnClose" type="button">Close</button></div>
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
      const ent = lampStateObject(lamp, this._hass?.states || {});
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
        states: this._hass?.states || {},
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
        copyBtn.onclick = () => entId && copyText(entId, copyBtn, "Copy entity");
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
          copyText(JSON.stringify(diagnostic,null,2), copyDiagBtn, "Copy diagnostics");
        };
      }

      const rows = [];
      const add = (k, v) => rows.push({ k, v: (v === undefined || v === null || v === "") ? "-" : String(v) });
      add("Source", isDerivedLamp(lamp) ? `Derived base ${normalizeDerivedBaseState(lamp.derived_base_state).toUpperCase()}` : (entId || "-"));
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
        const peers = (Array.isArray(this._config.entities) ? this._config.entities : []).map((x) => normalizeLamp(x || {})).filter((x) => isOperationalLamp(x) && String(x.group || "").trim() === grp);
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

    async _resetAck(actionOverride = null){return this._queueAckOperation(()=>this._resetAckUnlocked(actionOverride))}
    async _resetAckUnlocked(actionOverride = null) {
      if (isPresentation(this._config)) return;
      if (this._config.lamp_test_entity && this._isOn(this._config.lamp_test_entity)) return;
      const action = String(actionOverride || this._config.reset_ack_action || "clear").toLowerCase();
      if (action === "clear") {
        const store = ensureObj(this._config.ack_store, { type: "local" });
        if (store.type === "input_text" && store.entity) {
          const current = await this._getAckMap();
          const next = {};
          const prefix = `${this._config.panel_id}::`;
          Object.keys(current || {}).forEach((k) => { if (!k.startsWith(prefix)) next[k] = current[k]; });
          await this._setAckMap(next);
        } else {
          // Route local clear through the same storage abstraction as every other
          // ACK write. This keeps optimistic/test storage and browser storage aligned.
          await this._setAckMap({});
        }
        // CLEAR ACK is a rearm operation. Active change events remain active;
        // ACK (not Clear) is what dismisses an until-ACK change event.
      } else {
        // ACK ALL mirrors per-lamp ACK semantics: acknowledge only alert channels
        // that are actually active. It never changes source entities and it does not
        // pre-acknowledge inactive lamps.
        const map = await this._getAckMap();
        const ack = new AckManager(this._config.panel_id, map);
        const lampTest = this._config.lamp_test_entity ? this._isOn(this._config.lamp_test_entity) : false;
        (Array.isArray(this._config.entities) ? this._config.entities : []).forEach((raw) => {
          const item = normalizeLamp(raw || {});
          if (!isOperationalLamp(item)) return;
          ack.migrate(item);
          const rid = lampRuntimeId(item);
          const resolved = evaluateLampState(item, lampStateObject(item, this._hass?.states || {}), {
            lampTest,
            acked: ack.isAcked(item, "main"),
            changeActive: !!this._changeActive?.[rid],
            changeAcked: ack.isAcked(item, "change"),
            states: this._hass?.states || {},
          });
          const ackMain = !!resolved.alert.mainActive;
          const ackChange = !!resolved.alert.changeActive;
          if (ackMain) ack.acknowledge(item, "main");
          if (ackChange) {
            ack.acknowledge(item, "change");
            this._changeActive[rid] = false;
          }
          if (this._config.pair_ack_lock && (ackMain || ackChange)) {
            const partner = this._pairedPartner(item);
            if (partner) {
              if (ackMain) ack.acknowledge(partner, "main");
              if (ackChange) {
                ack.acknowledge(partner, "change");
                this._changeActive[lampRuntimeId(partner)] = false;
              }
            }
          }
        });
        await this._setAckMap(ack.map);
      }
      this._renderDynamic();
    }

    async _ackAll() {
      await this._resetAck("ack_all");
    }

    async _clearAcks() {
      await this._resetAck("clear");
    }

    async _resetClearedAlarms(){return this._queueAckOperation(()=>this._resetClearedAlarmsUnlocked())}
    async _resetClearedAlarmsUnlocked() {
      if (isPresentation(this._config)) return;
      const map=await this._getAckMap(),ack=new AckManager(this._config.panel_id,map);
      normalizeEntities(this._config.entities).forEach(item=>{if(!isOperationalLamp(item))return;const resolved=evaluateLampState(item,lampStateObject(item,this._hass?.states||{}),{acked:ack.isAcked(item,"main"),changeActive:!!this._changeActive?.[lampRuntimeId(item)],changeAcked:ack.isAcked(item,"change"),states:this._hass?.states||{}});if(!resolved.alert?.mainActive&&!resolved.isOn)ack.clear(item,"main")});
      await this._setAckMap(ack.map);this._renderDynamic();
    }

    async _runLampTest() {
      if (isPresentation(this._config)) return;
      const entity=String(this._config.lamp_test_entity||"").trim();
      if(entity&&this._hass?.callService){await this._hass.callService("homeassistant","toggle",{entity_id:entity});return;}
      this._manualLampTestUntil=Date.now()+3000;this._renderDynamic();if(this._manualLampTestTimer)clearTimeout(this._manualLampTestTimer);this._manualLampTestTimer=setTimeout(()=>{this._manualLampTestTimer=null;if(this.isConnected)this._renderDynamic()},3050);
    }

    _alarmOutputSpecKey(spec){
      const o=normalizeAlarmOutput(spec);return JSON.stringify({mode:o.mode,media_player:o.media_player,media_content_id:o.media_content_id,media_content_type:o.media_content_type,script:o.script,silence_script:o.silence_script,action:o.action,silence_action:o.silence_action});
    }
    async _silenceAlarmOutput(){
      const active=[...(this._alarmOutputState?.activeIds||[])];return this._requestAlarmOutput(active,"silence");
    }
    async _performConfiguredAction(action,hass=this._hass){
      const a=ensureObj(action,{}),raw=String(a.service||a.action||"").trim();if(!validServiceName(raw)||!hass?.callService)return false;const [domain,service]=raw.split(".");const data={...ensureObj(a.data||a.service_data,{}),...(a.entity_id?{entity_id:a.entity_id}:{})},target=ensureObj(a.target,{});if(Object.keys(target).length)await hass.callService(domain,service,data,target);else await hass.callService(domain,service,data);return true;
    }
    async _startAlarmOutput(spec=this._config.alarm_output,hass=this._hass){
      const o=normalizeAlarmOutput(spec);if(o.mode==="none"||!hass?.callService)return false;
      if(o.mode==="media_player"&&o.media_player&&o.media_content_id){await hass.callService("media_player","play_media",{entity_id:o.media_player,media_content_id:o.media_content_id,media_content_type:o.media_content_type||"music"});return true}
      if(o.mode==="script"&&o.script){await hass.callService("script","turn_on",{entity_id:o.script});return true}
      if(o.mode==="advanced_action"&&Object.keys(o.action).length)return await this._performConfiguredAction(o.action,hass);
      return false;
    }
    async _stopAlarmOutput(spec=this._config.alarm_output,hass=this._hass){
      const o=normalizeAlarmOutput(spec);if(!hass?.callService)return;
      if(o.mode==="media_player"&&o.media_player)await hass.callService("media_player","media_stop",{entity_id:o.media_player});
      else if(o.mode==="script"&&o.silence_script)await hass.callService("script","turn_on",{entity_id:o.silence_script});
      else if(Object.keys(o.silence_action).length)await this._performConfiguredAction(o.silence_action,hass);
    }
    _requestAlarmOutput(activeIds,event="update"){
      const next=alarmOutputTransition(this._alarmOutputState,activeIds,event),revision=(this._alarmOutputRevision||0)+1;
      this._alarmOutputRevision=revision;this._alarmOutputState=next;
      this._alarmOutputDesired={revision,activeIds:[...next.activeIds],silenced:next.silenced===true,spec:normalizeAlarmOutput(this._config?.alarm_output),hass:this._hass};
      const run=async()=>{try{await this._reconcileAlarmOutput()}catch(error){console.warn("Alarm output action failed:",error)}};
      this._alarmOutputQueue=(this._alarmOutputQueue||Promise.resolve()).then(run,run);return this._alarmOutputQueue;
    }
    async _reconcileAlarmOutput(){
      const desired=this._alarmOutputDesired;if(!desired)return;
      const applied=this._alarmOutputApplied||{sounding:false,spec:null,hass:null};
      const desiredCanSound=desired.activeIds.length>0&&!desired.silenced&&desired.spec.mode!=="none";
      const specChanged=applied.sounding&&this._alarmOutputSpecKey(applied.spec)!==this._alarmOutputSpecKey(desired.spec);
      if(applied.sounding&&(!desiredCanSound||specChanged)){
        await this._stopAlarmOutput(applied.spec,applied.hass||desired.hass);
        this._alarmOutputApplied={sounding:false,spec:null,hass:null};
      }
      if(!desiredCanSound||this._alarmOutputApplied?.sounding)return;
      if(this._alarmOutputDesired?.revision!==desired.revision)return;
      const started=await this._startAlarmOutput(desired.spec,desired.hass);
      if(started)this._alarmOutputApplied={sounding:true,spec:desired.spec,hass:desired.hass};
    }
    _updateAlarmOutput(activeIds){return this._requestAlarmOutput(this._runtimeConnected===false?[]:activeIds,"update")}

    async _ackGroup(groupName,acked,scopeOverride=null){return this._queueAckOperation(()=>this._ackGroupUnlocked(groupName,acked,scopeOverride))}
    async _ackGroupUnlocked(groupName, acked, scopeOverride = null) {
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
        if (!isOperationalLamp(item) || String(item.group || "").trim() !== group) return;
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

        const stateObj = lampStateObject(item, this._hass?.states || {});
        const changeActive = !!this._changeActive?.[rid];
        const resolved = evaluateLampState(item, stateObj, {
          lampTest,
          acked: ack.isAcked(item, "main"),
          changeActive,
          changeAcked: ack.isAcked(item, "change"),
          states: this._hass?.states || {},
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
      return all.find((x) => isOperationalLamp(x) && x.uid !== item.uid && String(x.pair_id || "") === id && String(x.pair_mode || "none") !== "none") || null;
    }

    async _toggleAck(itemOrEntity){return this._queueAckOperation(()=>this._toggleAckUnlocked(itemOrEntity))}
    async _toggleAckUnlocked(itemOrEntity) {
      if (isPresentation(this._config)) return;
      if (this._config.lamp_test_entity && this._isOn(this._config.lamp_test_entity)) return;
      const item = typeof itemOrEntity === "string" ? this._findLampByEntity(itemOrEntity) : normalizeLamp(itemOrEntity || {});
      if (!isOperationalLamp(item)) return;
      const map = await this._getAckMap();
      const ack = new AckManager(this._config.panel_id, map);
      ack.migrate(item);
      const rid = lampRuntimeId(item);
      const changeIsActive = !!this._changeActive?.[rid];
      const lampTest = this._config.lamp_test_entity ? this._isOn(this._config.lamp_test_entity) : false;
      const resolved = evaluateLampState(item, lampStateObject(item, this._hass?.states || {}), {
        lampTest,
        acked: ack.isAcked(item, "main"),
        changeActive: changeIsActive,
        changeAcked: ack.isAcked(item, "change"),
        states: this._hass?.states || {},
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

    async _clearLampAck(itemOrEntity){return this._queueAckOperation(()=>this._clearLampAckUnlocked(itemOrEntity))}
    async _clearLampAckUnlocked(itemOrEntity) {
      if (isPresentation(this._config)) return;
      if (this._config.lamp_test_entity && this._isOn(this._config.lamp_test_entity)) return;
      const item = typeof itemOrEntity === "string" ? this._findLampByEntity(itemOrEntity) : normalizeLamp(itemOrEntity || {});
      if (!isOperationalLamp(item)) return;
      const map = await this._getAckMap();
      const ack = new AckManager(this._config.panel_id, map);
      ack.migrate(item);
      ack.clear(item, "main");
      ack.clear(item, "change");
      this._changeActive[lampRuntimeId(item)] = false;
      if (this._config.pair_ack_lock) {
        const partner = this._pairedPartner(item);
        if (partner) {
          ack.clear(partner, "main");
          ack.clear(partner, "change");
          this._changeActive[lampRuntimeId(partner)] = false;
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
      this._nativeDispatchTimer = null;
      // Native text/number fields are edited as a small transaction. Home Assistant
      // re-calls setConfig() after config-changed; dispatching while a field has
      // focus would rebuild that field and drop the caret after every keystroke.
      this._nativeEditDepth = 0;
      this._pendingEditorDispatch = false;
      this._undoState = null;
      this._undoTimer = null;
      this._editorDisclosureState = {};
      this._selectedAppearancePreset = "";
      this._appearancePresetDraft = "";
      this._appearancePresetDraftForId = "";
      this._selectedLampAppearancePreset = "";
      this._lampAppearancePresetDraft = "";
      this._lampAppearancePresetDraftForId = "";
      this._displayCopySourceUid = "";
      this._editorMode = "basic";
      this._page = "basic";
      this._bulkMode = false;
      this._bulkSelection = new Set();
      this._bulkDraft = { group:"", font_family:"inherit", font_custom:"", shape:"inherit", lamp_style:"inherit", lens_type:"inherit", color_behavior:"standard", icon_size:40, brightness_profile:"inherit", ack_rearm:"inherit", audible:"on" };
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
      const rawEntities = Array.isArray(cfg.entities) ? cfg.entities : [];
      const beforeIdentity = rawEntities.map((l) => `${l?.uid || l?.lamp_uid || ""}|${l?.ack_slot || ""}`).join("||");
      const validated = validateAndRepairConfig({ ...cfg, entities: rawEntities }, true);
      const vcfg = validated.config;
      const entities = vcfg.entities;
      const incomingSev = ensureObj(vcfg.severity_colors || vcfg.colors, {});
      const mergedSev = mergeSeverityColors(incomingSev);
      const normalizedHeaderAck = headerAckButtons(vcfg);
      const afterIdentity = entities.map((l) => `${l?.uid || ""}|${l?.ack_slot || ""}`).join("||");
      const identityChanged = beforeIdentity !== afterIdentity;
      const migrationChanged = Number(original.config_version) !== CONFIG_VERSION || Number(original.next_ack_slot) !== Number(vcfg.next_ack_slot) || original.panel_sizing === undefined || original.lamp_test_mode === undefined || original.ack_rearm_default === undefined || original.spacer_appearance === undefined;
      this._configIssues = validated.issues;
      this._configRepairs = validated.repairs;
      this._config = {
        title:"", panel_id:"annunciator_panel", panel_mode:"operator", columns:7, rows:3,
        cell_width:225, cell_height:160, cell_gap:0, mullion:6, outer_frame:6, cell_padding:10, row_mode:"auto", panel_sizing:"auto_fit",
        font_size:13, font_weight:"700", line_height:1.15, unavailable_text:"INOP",
        show_ack_all:normalizedHeaderAck.ackAll, show_clear_ack:normalizedHeaderAck.clearAck,
        show_reset_ack:true, reset_ack_label:"", reset_ack_action:"clear",
        ack_store:{type:"local"}, ack_rearm_default:"auto", lamp_test_entity:"", lamp_test_mode:"steady", pair_ack_lock:false, next_ack_slot:1,
        default_lamp_style:"modern", default_lens_type:"plastic", allow_lamp_style_override:true,
        allow_lens_override:true, retro_warmup:true, panel_theme:"classic", corner_style:"rounded", corner_radius:12,
        // Resolve legacy inactive-lamp aliases into the editor's canonical model.
        // Merely opening the editor still emits no config change; the mapping only
        // ensures the visible profile and level match the card's current runtime.
        lamp_brightness:normalizePanelLampBrightness(vcfg),
        spacer_appearance:{},
        ...vcfg, entities, severity_colors:mergedSev, config_version:CONFIG_VERSION,
      };
      if (this._selectedLamp >= entities.length) this._selectedLamp = Math.max(0, entities.length - 1);
      this._ensure();
      this._renderAll();
      if ((identityChanged || migrationChanged) && !this._uidPersistScheduled) {
        this._uidPersistScheduled = true;
        queueMicrotask(() => { this._uidPersistScheduled = false; this._dispatch(true); });
      }
    }

    connectedCallback() {
      if (this.shadowRoot) this._startResponsiveObserver();
      else if (this._config || this._hass) this._ensure();
    }

    disconnectedCallback() {
      if (this._commitTimer) clearTimeout(this._commitTimer);
      this._commitTimer = null;
      if (this._nativeDispatchTimer) clearTimeout(this._nativeDispatchTimer);
      this._nativeDispatchTimer = null;
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
          .toolbar,.row,.actions,.presetActions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
          .toolbar{justify-content:space-between}
          .presetActions button{flex:1 1 132px}
          .title{font-weight:900;line-height:1.25;overflow-wrap:anywhere}
          .muted,.hint{font-size:12px;opacity:.74;line-height:1.4;overflow-wrap:anywhere}
          .workspace{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;align-items:start;min-width:0}
          .card{border:1px solid rgba(127,127,127,.22);border-radius:14px;background:rgba(127,127,127,.055);padding:14px;min-width:0}
          .lampListCard{padding:13px}
          .navHead{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,42%);gap:12px;align-items:center;margin-bottom:11px}
          .navTitleLine{display:flex;align-items:center;gap:8px;justify-content:space-between;flex-wrap:wrap}.navTitleLine button{min-height:30px;padding:5px 9px;font-size:11px}
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
          .chips{display:flex;gap:5px;flex-wrap:wrap;margin-top:3px}.chip{font-size:9px;font-weight:800;padding:2px 6px;border:1px solid rgba(127,127,127,.2);border-radius:99px;opacity:.88}.chip.feature{border-color:color-mix(in srgb,var(--primary-color) 42%,rgba(127,127,127,.2));background:color-mix(in srgb,var(--primary-color) 10%,transparent);opacity:1}
          .navPager{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;gap:8px;margin-top:11px;padding-top:10px;border-top:1px solid rgba(127,127,127,.12)}
          .bulkCheck{flex:0 0 auto;width:18px;height:18px;accent-color:var(--primary-color);cursor:pointer}.bulkPanel{display:none;margin-top:11px;padding:12px;border:1px solid color-mix(in srgb,var(--primary-color) 34%,transparent);border-radius:11px;background:color-mix(in srgb,var(--primary-color) 7%,transparent)}.bulkPanel.show{display:block}.bulkPanel .grid{margin-top:10px}.bulkPanel .fieldAction{display:flex;gap:7px;align-items:flex-end}.bulkPanel .fieldAction>*:first-child{flex:1;min-width:0}.bulkPanel .fieldAction>button{flex:0 0 auto}
          .navPager .prev{justify-self:start}.navPager .next{justify-self:end}.pageInfo{font-size:12px;font-weight:850;white-space:nowrap;text-align:center}
          .rangeInfo{font-size:11px;opacity:.68;text-align:center;margin-top:4px}
          .spacerPane{display:grid;grid-template-columns:1fr;gap:15px}.spacerNotice{padding:14px;border:1px dashed rgba(127,127,127,.28);border-radius:12px;background:rgba(127,127,127,.035);line-height:1.45}
          .validationBox{display:none;border:1px solid rgba(255,193,7,.45);background:rgba(255,193,7,.10);border-radius:12px;padding:11px 12px;font-size:12px;line-height:1.45}
          .validationBox.show{display:block}.validationTitle{font-weight:900;margin-bottom:5px}.validationList{margin:0;padding-left:18px}.validationActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
          button:disabled{opacity:.38;cursor:not-allowed}
          .editorIdentity{min-width:0;flex:1}.editorActions{flex:0 0 auto}
          .editorMode{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:13px 0 4px;padding:4px;border:1px solid rgba(127,127,127,.18);border-radius:12px;background:rgba(127,127,127,.04)}
          .modeButton{border-radius:9px;background:transparent}.modeButton.active{border-color:var(--primary-color);background:color-mix(in srgb,var(--primary-color) 16%,transparent)}
          .tabs{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:8px;margin:12px 0}
          .panelTabs{grid-template-columns:repeat(3,minmax(0,1fr))}
          .tab{width:100%;min-width:0;border:1px solid rgba(127,127,127,.22);background:transparent;color:var(--primary-text-color);border-radius:99px;padding:8px 8px;cursor:pointer;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
          .tab.active{background:color-mix(in srgb,var(--primary-color) 18%,transparent);border-color:var(--primary-color)}
          .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px 14px;min-width:0}.full{grid-column:1/-1}
          .field{min-width:0;padding:1px 0 3px}.label{font-size:13px;font-weight:850;margin:0 0 7px;line-height:1.3}.tip{font-size:12px;opacity:.68;margin-top:6px;line-height:1.38}
          .fontPreview{min-height:56px;display:flex;align-items:center;padding:10px 14px;border:1px solid rgba(127,127,127,.24);border-radius:9px;background:rgba(127,127,127,.06);font-size:20px;line-height:1.2;letter-spacing:normal;overflow-wrap:anywhere}
          .brightnessPreview{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:10px;border:1px solid rgba(127,127,127,.22);border-radius:10px;background:rgba(127,127,127,.04)}
          .brightnessSample{min-width:0;display:grid;justify-items:center;gap:6px;font-size:10px;font-weight:900;letter-spacing:.04em;text-align:center}.brightnessLens{display:block;width:min(64px,100%);aspect-ratio:1.5;border:2px solid rgba(127,127,127,.5);border-radius:8px;background:radial-gradient(circle at 45% 38%,#d9ffb8,#63c532 72%);box-shadow:inset 0 0 12px rgba(255,255,255,.42),0 0 7px rgba(99,197,50,.28)}.brightnessALERT .brightnessLens{background:radial-gradient(circle at 45% 38%,#ffd8d8,#ff3838 72%);box-shadow:inset 0 0 12px rgba(255,255,255,.42),0 0 7px rgba(255,56,56,.3)}
          ha-textfield,ha-form,ha-selector{width:100%;min-width:0}
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
          .pageSummary{grid-column:1/-1;display:flex;gap:7px;align-items:flex-start;padding:10px 12px;border-radius:10px;background:rgba(127,127,127,.065);border:1px solid rgba(127,127,127,.13);font-size:12px;line-height:1.45}.pageSummary strong{flex:0 0 auto}.pageSummary span{min-width:0;overflow-wrap:anywhere}.controlWithReset{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:stretch}.controlWithReset>button{white-space:nowrap;align-self:stretch}.contrastWarning{grid-column:1/-1;padding:10px 12px;border:1px solid rgba(255,193,7,.48);border-radius:10px;background:rgba(255,193,7,.10);font-size:12px;line-height:1.45}.contrastWarning strong{display:block;margin-bottom:3px}.contrastWarning ul{margin:0;padding-left:18px}
          .editorDisclosure{grid-column:1/-1;border:1px solid rgba(127,127,127,.20);border-radius:12px;background:rgba(127,127,127,.035);overflow:hidden}.editorDisclosure>summary{cursor:pointer;padding:12px 13px;line-height:1.35}.editorDisclosure[open]>summary{border-bottom:1px solid rgba(127,127,127,.14)}.editorDisclosureTitle{font-weight:900}.editorDisclosureHint{font-size:12px;font-weight:500;opacity:.68;margin-top:3px;max-width:72ch}.editorDisclosureGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:15px 14px;padding:13px}.mediaSelection{padding:10px 11px;border-radius:10px;background:color-mix(in srgb,var(--primary-color) 8%,transparent);border:1px solid color-mix(in srgb,var(--primary-color) 22%,transparent);font-size:12px;line-height:1.45;overflow-wrap:anywhere}.mediaSelection strong{display:block;margin-bottom:2px}.mediaSelection code{font-size:11px;word-break:break-all}
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
          .shell.compact .grid,.shell.compact .editorDisclosureGrid{grid-template-columns:1fr}
          .shell.compact .full,.shell.compact .sectionHead{grid-column:1}
          .shell.compact .colorRow{grid-template-columns:110px 44px minmax(0,1fr)}
          .shell.compact .tabs{grid-template-columns:repeat(3,minmax(0,1fr))}
          .shell.compact .panelTabs{grid-template-columns:repeat(2,minmax(0,1fr))}
          .shell.compact .tab{padding:9px 6px}
          .shell.compact .navHead{grid-template-columns:1fr}
          .shell.compact .searchInput{height:44px}
          .shell.compact .lampRow{min-height:74px}

          @media(max-width:760px){
            .workspace{grid-template-columns:1fr}
            .grid,.editorDisclosureGrid{grid-template-columns:1fr}
            .full,.sectionHead{grid-column:1}
            .tabs{grid-template-columns:repeat(3,minmax(0,1fr))}
            .colorRow{grid-template-columns:105px 44px minmax(0,1fr)}
          }
          @media(max-width:390px){
            .list,.shell.narrow .list{grid-template-columns:1fr}
          }
        </style>
        <div class="shell">
          <div class="toolbar"><div><div class="title">Annunciator Grid</div><div class="hint">v${CARD_VERSION}</div></div><div class="actions"><button id="addLamp">+ Add lamp</button><button id="addDerived">+ Add derived lamp</button><button id="addPair">+ Add paired lamp</button><button id="addSpacer">+ Add spacer</button></div></div>
          <div id="configWarnings" class="validationBox"></div>
          <div class="workspace">
            <div class="card lampListCard">
              <div class="navHead">
                <div><div class="navTitleLine"><div class="navTitle">Lamp navigator</div><button id="bulkToggle" type="button">Bulk edit</button></div><div id="navCount" class="navCount"></div></div>
                <input id="search" class="nativeInput searchInput" type="text" placeholder="Search lamps, entities, groups, or cell #" autocomplete="off">
              </div>
              <div id="lampList" class="list"></div>
              <div id="bulkPanel" class="bulkPanel"></div>
              <div id="navPager" class="navPager"></div>
            </div>
            <div id="editor" class="card"></div>
          </div>
          <details class="panelSettings" id="panelSettings"><summary>Panel settings</summary><div id="panelBody" class="panelBody"></div></details>
          <div id="undoBar" class="undoBar" role="status" aria-live="polite"><span id="undoText"></span><button id="undoBtn" type="button">Undo</button></div>
        </div>`;
      this.shadowRoot.getElementById("addLamp").onclick = () => this._addLamp();
      this.shadowRoot.getElementById("addDerived").onclick = () => this._addDerivedLamp();
      this.shadowRoot.getElementById("addPair").onclick = () => this._addPairedLamp();
      this.shadowRoot.getElementById("addSpacer").onclick = () => this._addSpacer();
      this.shadowRoot.getElementById("bulkToggle").onclick = () => {this._bulkMode=!this._bulkMode;if(this._bulkMode&&!this._bulkSelection.size){const lamp=this._lamp();if(isOperationalLamp(lamp))this._bulkSelection.add(lamp.uid)}this._renderList()};
      this.shadowRoot.getElementById("undoBtn").onclick = () => this._undo();
      const search = this.shadowRoot.getElementById("search");
      search.value = this._filter || "";
      search.addEventListener("input", () => {
        this._filter = search.value || "";
        this._navPage = 0;
        this._navFollowSelection = false;
        this._renderList();
      });

      this._startResponsiveObserver();
    }

    _applyResponsiveWidth(width) {
      const shell = this.shadowRoot?.querySelector(".shell");
      if (!shell) return;
      const w = Number(width) || this.getBoundingClientRect().width || 0;
      shell.classList.toggle("narrow", w > 0 && w < 780);
      shell.classList.toggle("compact", w > 0 && w < 620);
    }

    _startResponsiveObserver() {
      if (!this.shadowRoot) return;
      if (!this._resizeObserver && typeof ResizeObserver !== "undefined") {
        this._resizeObserver = new ResizeObserver((entries) => {
          const entry = entries && entries[0];
          this._applyResponsiveWidth(entry?.contentRect?.width);
        });
        this._resizeObserver.observe(this);
      }
      requestAnimationFrame(() => this._applyResponsiveWidth(this.getBoundingClientRect().width));
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

      // Native text/number/color controls can emit dozens of events while typing or
      // dragging. Keep the local draft current, but rate-limit the expensive migrate,
      // validate, preview, and Home Assistant reflection work. The final value is
      // flushed synchronously when the edit session closes.
      if (this._nativeEditDepth > 0) {
        this._pendingEditorDispatch = true;
        if (!this._nativeDispatchTimer) {
          this._nativeDispatchTimer = setTimeout(() => {
            this._nativeDispatchTimer = null;
            if (this._nativeEditDepth > 0 && this._pendingEditorDispatch) send();
            else if (this._pendingEditorDispatch) this._dispatch(true);
          }, 90);
        }
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
        if (this._nativeDispatchTimer) clearTimeout(this._nativeDispatchTimer);
        this._nativeDispatchTimer = null;
        // Publish the final draft before a following Save click can run. setConfig()
        // may now accept Home Assistant's reflected copy because focus has ended.
        this._dispatch(true);
      }
    }

    _finishNativeEditsBeforeRender() {
      if (this._nativeEditDepth <= 0) return;
      // A structural choice may replace the focused input before the browser emits
      // blur. Close that transaction explicitly so a removed control cannot leave
      // the editor permanently suppressing Home Assistant's reflected config.
      this._nativeEditDepth = 0;
      if (this._nativeDispatchTimer) clearTimeout(this._nativeDispatchTimer);
      this._nativeDispatchTimer = null;
      if (this._pendingEditorDispatch) this._dispatch(true);
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
    _setHeaderAckButtons(ackAll,clearAck){
      const a=!!ackAll,c=!!clearAck;
      this._config={...this._config,show_ack_all:a,show_clear_ack:c,
        // Keep a sensible legacy representation for users who temporarily downgrade.
        show_reset_ack:a||c,reset_ack_action:c?"clear":"ack_all",reset_ack_label:""};
      this._dispatch();
    }
    _setNested(key,sub,val){this._config={...this._config,[key]:{...ensureObj(this._config[key],{}),[sub]:val}};this._dispatch()}
    _appearancePresets(){return normalizeAppearancePresets(this._config?.appearance_presets)}
    _selectedAppearancePresetObject(){
      const presets=this._appearancePresets();
      return presets.find((preset)=>preset.id===this._selectedAppearancePreset)||presets[0]||null;
    }
    _saveAppearancePreset(){
      const presets=this._appearancePresets();if(presets.length>=APPEARANCE_PRESET_LIMIT)return;
      this._pushUndo("Appearance preset saved");
      const used=new Set(presets.map((preset)=>preset.id));let id="";
      do{id=`appearance_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`}while(used.has(id));
      const name=String(this._appearancePresetDraft||`Preset ${presets.length+1}`).trim().slice(0,60)||`Preset ${presets.length+1}`;
      const next={id,name,values:captureAppearancePreset(this._config)};
      this._config={...this._config,appearance_presets:[...presets,next]};
      this._selectedAppearancePreset=id;this._appearancePresetDraft=name;this._appearancePresetDraftForId=id;
      this._dispatch(true);this._renderPanel();
    }
    _applySelectedAppearancePreset(){
      const preset=this._selectedAppearancePresetObject();if(!preset)return;
      this._pushUndo("Appearance preset applied");
      const presets=this._appearancePresets();
      this._config={...applyAppearancePreset(this._config,preset),appearance_presets:presets};
      this._dispatch(true);this._renderPanel();
    }
    _updateSelectedAppearancePreset(){
      const current=this._selectedAppearancePresetObject();if(!current)return;
      this._pushUndo("Appearance preset updated");
      const name=String(this._appearancePresetDraft||current.name).trim().slice(0,60)||current.name;
      const presets=this._appearancePresets().map((preset)=>preset.id===current.id?{...preset,name,values:captureAppearancePreset(this._config)}:preset);
      this._config={...this._config,appearance_presets:presets};
      this._selectedAppearancePreset=current.id;this._appearancePresetDraft=name;this._appearancePresetDraftForId=current.id;
      this._dispatch(true);this._renderPanel();
    }
    _deleteSelectedAppearancePreset(){
      const current=this._selectedAppearancePresetObject();if(!current)return;
      this._pushUndo("Appearance preset deleted");
      const presets=this._appearancePresets().filter((preset)=>preset.id!==current.id);
      this._config={...this._config,appearance_presets:presets};
      this._selectedAppearancePreset=presets[0]?.id||"";this._appearancePresetDraft=presets[0]?.name||"";this._appearancePresetDraftForId=this._selectedAppearancePreset;
      this._dispatch(true);this._renderPanel();
    }
    _lampAppearancePresets(){return normalizeLampAppearancePresets(this._config?.lamp_appearance_presets)}
    _selectedLampAppearancePresetObject(){return this._lampAppearancePresets().find((preset)=>preset.id===this._selectedLampAppearancePreset)||null}
    _saveLampAppearancePreset(){
      const name=String(this._lampAppearancePresetDraft||"").trim().slice(0,60);if(!name)return;this._pushUndo("Lamp appearance preset saved");const presets=this._lampAppearancePresets(),id=`lamp_preset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`,preset={id,name,values:captureLampAppearancePreset(this._lamp())};presets.push(preset);this._config={...this._config,lamp_appearance_presets:normalizeLampAppearancePresets(presets)};this._selectedLampAppearancePreset=id;this._lampAppearancePresetDraft=name;this._lampAppearancePresetDraftForId=id;this._dispatch(true);this._renderEditor();
    }
    _applySelectedLampAppearancePreset(){
      const preset=this._selectedLampAppearancePresetObject();if(!preset)return;this._pushUndo("Lamp appearance preset applied");const arr=[...(this._config.entities||[])];arr[this._selectedLamp]=applyLampAppearancePreset(this._lamp(),preset);this._config={...this._config,entities:arr};this._dispatch(true);this._renderAll();
    }
    _updateSelectedLampAppearancePreset(){
      const current=this._selectedLampAppearancePresetObject();if(!current)return;const name=String(this._lampAppearancePresetDraft||current.name).trim().slice(0,60)||current.name;this._pushUndo("Lamp appearance preset updated");const presets=this._lampAppearancePresets().map((preset)=>preset.id===current.id?{...preset,name,values:captureLampAppearancePreset(this._lamp())}:preset);this._config={...this._config,lamp_appearance_presets:normalizeLampAppearancePresets(presets)};this._lampAppearancePresetDraft=name;this._lampAppearancePresetDraftForId=current.id;this._dispatch(true);this._renderEditor();
    }
    _deleteSelectedLampAppearancePreset(){
      const current=this._selectedLampAppearancePresetObject();if(!current)return;this._pushUndo("Lamp appearance preset deleted");const presets=this._lampAppearancePresets().filter((preset)=>preset.id!==current.id);this._config={...this._config,lamp_appearance_presets:presets};this._selectedLampAppearancePreset=presets[0]?.id||"";this._lampAppearancePresetDraft=presets[0]?.name||"";this._lampAppearancePresetDraftForId=this._selectedLampAppearancePreset;this._dispatch(true);this._renderEditor();
    }
    _lamp(i=this._selectedLamp){return normalizeLamp((this._config.entities||[])[i]||{})}
    _indexByUid(uid){return (this._config.entities||[]).findIndex((x)=>String(x?.uid||x?.lamp_uid||"")===String(uid||""))}
    _updateLamp(patch, immediate=false){
      const arr=[...(this._config.entities||[])]; const cur={...this._lamp(),...patch}; cur.uid=cur.uid||makeLampUid(); arr[this._selectedLamp]=cur; this._config={...this._config,entities:arr}; this._dispatch(immediate);
    }
    _updateLampNested(key,patch){const cur=this._lamp();this._updateLamp({[key]:{...ensureObj(cur[key],{}),...patch}})}
    _setLampGroup(value){
      const current=this._lamp(),name=String(value||"").trim().slice(0,120),pairId=String(current.pair_id||""),validPair=pairId&&validPairIdsFor(this._config.entities||[]).has(pairId);
      const arr=(this._config.entities||[]).map((raw)=>{const lamp=normalizeLamp(raw);return lamp.uid===current.uid||(validPair&&String(lamp.pair_id||"")===pairId)?{...lamp,group:name}:lamp});
      this._config={...this._config,entities:arr};this._dispatch();this._renderList();
    }

    _field(label,el,tip="",full=false){const w=document.createElement("div");w.className=`field${full?" full":""}`;const l=document.createElement("div");l.className="label";l.textContent=label;w.append(l,el);if(label&&el?.setAttribute&&!el.getAttribute?.("aria-label"))el.setAttribute("aria-label",label);if(tip){const t=document.createElement("div");t.className="tip";t.textContent=tip;w.append(t)}return w}
    _withInheritedReset(control,enabled,onReset,label="Use panel default"){
      const wrap=document.createElement("div");wrap.className="controlWithReset";const reset=document.createElement("button");reset.type="button";reset.textContent=label;reset.disabled=!enabled;reset.setAttribute("aria-label",`${label} for this lamp`);reset.onclick=onReset;wrap.append(control,reset);return wrap;
    }
    _resetLampOverride(patch,label="Lamp override reset"){
      this._pushUndo(label);this._updateLamp(patch,true);this._renderList();this._renderEditor();
    }
    _pageSummary(label,text){const box=document.createElement("div");box.className="pageSummary";box.setAttribute("role","status");const title=document.createElement("strong");title.textContent=`${label}:`;const value=document.createElement("span");value.textContent=text;box.append(title,value);return box}
    _appendContrastWarnings(host,warnings){const items=[...new Set((warnings||[]).filter(Boolean))];if(!items.length)return;const box=document.createElement("div");box.className="contrastWarning";box.setAttribute("role","status");const title=document.createElement("strong");title.textContent="Low contrast warning";const list=document.createElement("ul");items.forEach((message)=>{const item=document.createElement("li");item.textContent=message;list.append(item)});box.append(title,list);host.append(box)}
    _displaySummary(l){
      const content={text:"Text",icon:"Icon only",icon_text:"Icon + selected lines"}[normalizeLampContentMode(l.content_mode)]||"Text";
      const modeLabel={custom:"Custom",name:"Name",state:"State",none:"Hidden",entity_id:"Entity ID",last_changed:"Last changed",last_updated:"Last updated",state_labels:"ON/OFF labels",dynamic:"Dynamic rules"};
      const lines=[["Primary",l.primary_mode||"custom"],["Secondary",l.secondary_mode||"state"],["Tertiary",l.tertiary_mode||"none"]].filter(([,mode])=>mode!=="none").map(([name,mode])=>`${name} ${modeLabel[mode]||mode}`);
      const dynamicCount=["primary","secondary","tertiary"].reduce((total,line)=>total+normalizeDynamicTextLine(ensureObj(l.dynamic_text,{})[line]).rules.length,0);
      const font=normalizeFontFamily(l.font_family)==="inherit"?"panel font":normalizeFontFamily(l.font_family).replace("_"," ");
      return `${content} · ${lines.join(" · ")||"No text lines"} · ${font}${dynamicCount?` · ${dynamicCount} dynamic rule${dynamicCount===1?"":"s"}`:""}`;
    }
    _behaviorSummary(l){
      const effect=(resolveBaseAlertEffect(l)||"none").replace("_"," "),when={on:"ON",off:"OFF",both:"ON or OFF"}[String(l.alert_when||l.blink_mode||"on")]||"ON";
      const rearm=resolveAckRearm(l,this._config)==="auto"?"Automatic":"Manual",source=String(l.ack_rearm||"manual")==="inherit"?"panel default":"lamp override";
      return `Main alert ${effect} when ${when} · ACK rearm ${rearm} (${source}) · Audible ${l.participates_in_alarm_output===true?"on":"off"} · Change alert ${l.blink_on_change?"on":"off"}`;
    }
    _fontPreview(family,custom,fallback=""){
      const e=document.createElement("div");e.className="fontPreview";e.textContent="ANNUNCIATOR 0123 · Aa Bb";
      const apply=(nextFamily=family,nextCustom=custom)=>{const stack=configuredFontStack(nextFamily,nextCustom)||fallback||HEADER_FONT_STACKS.condensed;e.style.fontFamily=stack;e.title=`Rendered with: ${stack}`;e.dataset.fontStack=stack};
      apply();e.applyFont=apply;return e;
    }
    _brightnessProfileOptions(includeInherit=false){
      return [...(includeInherit?[["inherit","Panel default"]]:[]),...LAMP_BRIGHTNESS_PROFILE_OPTIONS];
    }
    _storedLampBrightness(lamp){
      const item=ensureObj(lamp,{});if(isLampBrightnessConfigObject(item.lamp_brightness,true))return normalizeLampBrightnessConfig(item.lamp_brightness,true);
      const legacy=normalizeInactiveLampMode(item.inactive_lamp_mode),profile=legacy==="dim"?"dim_off":legacy;
      return profile==="inherit"?{profile:"inherit"}:normalizeLampBrightnessConfig({profile,dim_level:normalizePanelLampBrightness(this._config).dim_level},true);
    }
    _brightnessForProfile(current,profile,includeInherit=false){
      const panel=normalizePanelLampBrightness(this._config);if(includeInherit&&profile==="inherit")return {profile:"inherit"};
      const src=ensureObj(current,{});return normalizeLampBrightnessConfig({profile,dim_level:src.dim_level??panel.dim_level,off:src.off??panel.off,on:src.on??panel.on,alert:src.alert??panel.alert},includeInherit);
    }
    _brightnessPreview(levels){
      const normalized=ensureObj(levels,{}),wrap=document.createElement("div");wrap.className="brightnessPreview";wrap.setAttribute("aria-label","OFF ON ALERT brightness preview");
      [["OFF",normalized.off],["ON",normalized.on],["ALERT",normalized.alert]].forEach(([label,value])=>{const sample=document.createElement("div");sample.className=`brightnessSample brightness${label}`;const lens=document.createElement("span");lens.className="brightnessLens";const percent=normalizeLampBrightnessLevel(value,100);lens.style.opacity=(percent/100).toFixed(2);const caption=document.createElement("span");caption.textContent=`${label} ${percent}%`;sample.append(lens,caption);wrap.append(sample)});return wrap;
    }
    _appendBrightnessEditor(host,lamp=null){
      const isLamp=!!lamp,panel=normalizePanelLampBrightness(this._config),stored=isLamp?this._storedLampBrightness(lamp):(isLampBrightnessConfigObject(this._config.lamp_brightness,false)?normalizeLampBrightnessConfig(this._config.lamp_brightness,false):panel),profile=stored.profile;
      const options=isLamp?this._brightnessProfileOptions(true):LAMP_BRIGHTNESS_PROFILE_OPTIONS;
      let working={...stored},preview=null;
      const effectiveForPreview=()=>isLamp?normalizePerLampBrightness({...lamp,lamp_brightness:working},this._config):normalizeLampBrightnessConfig(working,false);
      const refreshPreview=()=>{if(!preview)return;const replacement=this._brightnessPreview(effectiveForPreview());preview.replaceWith(replacement);preview=replacement};
      const update=(next,rerender=false)=>{const normalized=next.profile==="inherit"?{profile:"inherit"}:normalizeLampBrightnessConfig(next,isLamp);working={...normalized};if(isLamp)this._updateLamp({lamp_brightness:normalized},rerender);else this._set("lamp_brightness",normalized);if(rerender){if(isLamp)this._renderEditor();else this._renderPanel()}else refreshPreview()};
      const undoLabel=isLamp?"Lamp brightness changed":"Panel brightness changed";
      const nativeBrightnessChange=(apply)=>{let undoPushed=false;return(value,committed=false)=>{if(!undoPushed){this._pushUndo(undoLabel);undoPushed=true}else if(this._undoState?.label===undoLabel){if(this._undoTimer)clearTimeout(this._undoTimer);this._undoTimer=setTimeout(()=>this._clearUndo(),8000)}apply(value);if(committed)queueMicrotask(()=>{undoPushed=false})}};
      const brightnessSelect=this._select(profile,options,(value)=>{this._pushUndo(undoLabel);update(this._brightnessForProfile(working,normalizeLampBrightnessProfile(value,isLamp),isLamp),true)});
      const brightnessControl=isLamp?this._withInheritedReset(brightnessSelect,profile!=="inherit",()=>this._resetLampOverride({lamp_brightness:{profile:"inherit"},inactive_lamp_mode:"inherit"},"Lamp brightness reset to panel default")):brightnessSelect;
      host.append(this._field(isLamp?"Brightness":"Brightness profile",brightnessControl,isLamp?"Use the panel default or override only this lamp. Lamp Test and INOP always remain fully visible.":"Controls ordinary OFF, ordinary ON, and alert-state lens intensity without changing lamp logic.",true));
      if(profile!=="inherit"&&profile!=="normal"&&profile!=="custom")host.append(this._field("Dim level",this._number(working.dim_level??panel.dim_level,nativeBrightnessChange((value)=>update({...working,dim_level:normalizeLampBrightnessLevel(value,32)})),10,100,1),profile==="dim_all"?"Dim all states also applies this level to active alerts. Lamp Test and INOP remain at 100%.":"Shared level used by this brightness profile.",false));
      if(profile==="custom"){
        [["OFF brightness","off"],["ON brightness","on"],["Alert brightness","alert"]].forEach(([label,key])=>host.append(this._field(label,this._number(working[key],nativeBrightnessChange((value)=>update({...working,[key]:normalizeLampBrightnessLevel(value,working[key]??100)})),10,100,1),key==="alert"?"Applies to active and acknowledged alarm conditions plus change alerts. Lamp Test and INOP remain at 100%.":"Percent brightness.",false)));
      }
      preview=this._brightnessPreview(effectiveForPreview());
      host.append(this._field("OFF · ON · ALERT preview",preview,"Read-only preview; it never changes Home Assistant entities, ACK state, or alarm output.",true));
    }
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
      const f=document.createElement("ha-form");f.hass=this._hass;const EMPTY="__annun_empty__";const normalized=(Array.isArray(options)?options:[]).map((o)=>{const raw=Array.isArray(o)?o[0]:o?.value;const label=Array.isArray(o)?o[1]:(o?.label??raw);return {value:String(raw??"")===""?EMPTY:String(raw??""),label:String(label??raw??"")}});const current=String(value??"");let last=current;f.schema=[{name:"v",selector:{select:{mode:"dropdown",options:normalized}}}];f.data={v:current===""?EMPTY:current};f.computeLabel=()=>"";f.addEventListener("value-changed",(ev)=>{if(!f.isConnected)return;const raw=ev.detail?.value?.v;if(raw===undefined)return;const next=raw===EMPTY?"":String(raw);if(next===last)return;last=next;onChange(next)});return f;
    }
    _entity(value,onChange){const f=document.createElement("ha-form");f.hass=this._hass;const current=String(value||"");let last=current;f.schema=[{name:"v",selector:{entity:{}}}];f.data={v:current};f.computeLabel=()=>"";f.addEventListener("value-changed",ev=>{if(!f.isConnected)return;const raw=ev.detail?.value?.v;if(raw===undefined)return;const next=String(raw||"");if(next===last)return;last=next;onChange(next)});return f}
    _icon(value,onChange){const f=document.createElement("ha-form");f.hass=this._hass;const current=String(value||"");let last=current;f.schema=[{name:"v",selector:{icon:{}}}];f.data={v:current};f.computeLabel=()=>"";f.addEventListener("value-changed",ev=>{if(!f.isConnected)return;const raw=ev.detail?.value?.v;if(raw===undefined)return;const next=String(raw||"");if(next===last)return;last=next;onChange(next)});return f}
    _groupInput(value,onChange){
      const wrap=document.createElement("div"),input=this._text(value||"",onChange,"Select or type a group"),list=document.createElement("datalist");
      const id=`annun-groups-${Math.random().toString(36).slice(2,9)}`;list.id=id;input.setAttribute("list",id);
      [...new Set((this._config.entities||[]).map((item)=>String(item?.group||"").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b)).forEach((name)=>{const option=document.createElement("option");option.value=name;list.append(option)});
      wrap.append(input,list);return wrap;
    }
    _bulkExpandedSelection(){
      const selected=new Set(this._bulkSelection||[]),all=normalizeEntities(this._config.entities),pairIds=new Set(all.filter((lamp)=>selected.has(lamp.uid)&&String(lamp.pair_id||"")).map((lamp)=>String(lamp.pair_id)));
      all.forEach((lamp)=>{if(pairIds.has(String(lamp.pair_id||""))&&isOperationalLamp(lamp))selected.add(lamp.uid)});return selected;
    }
    _bulkToggle(uids,checked){(Array.isArray(uids)?uids:[uids]).filter(Boolean).forEach((uid)=>checked?this._bulkSelection.add(uid):this._bulkSelection.delete(uid));this._renderList()}
    _bulkApplyPatch(patch,label){
      const selected=this._bulkExpandedSelection();if(!selected.size)return;this._pushUndo(label);const arr=normalizeEntities(this._config.entities).map((lamp)=>selected.has(lamp.uid)&&isOperationalLamp(lamp)?normalizeLamp({...lamp,...patch}):lamp);this._config={...this._config,entities:arr};this._dispatch(true);this._renderAll();
    }
    _bulkApplyLampPreset(id){
      const preset=normalizeLampAppearancePresets(this._config.lamp_appearance_presets).find((entry)=>entry.id===id),selected=this._bulkExpandedSelection();if(!preset||!selected.size)return;this._pushUndo("Lamp appearance preset applied to selected lamps");const arr=normalizeEntities(this._config.entities).map((lamp)=>selected.has(lamp.uid)&&isOperationalLamp(lamp)?applyLampAppearancePreset(lamp,preset):lamp);this._config={...this._config,entities:arr};this._dispatch(true);this._renderAll();
    }
    _renderBulkPanel(){
      const panel=this.shadowRoot?.getElementById("bulkPanel"),toggle=this.shadowRoot?.getElementById("bulkToggle");if(!panel||!toggle)return;panel.textContent="";panel.classList.toggle("show",this._bulkMode);toggle.textContent=this._bulkMode?"Done bulk editing":"Bulk edit";toggle.setAttribute("aria-pressed",String(this._bulkMode));if(!this._bulkMode)return;
      const valid=new Set(normalizeEntities(this._config.entities).filter(isOperationalLamp).map((lamp)=>lamp.uid));this._bulkSelection=new Set([...this._bulkSelection].filter((uid)=>valid.has(uid)));const selected=this._bulkExpandedSelection();
      const head=document.createElement("div");head.className="toolbar";const count=document.createElement("strong");count.textContent=`${selected.size} lamp${selected.size===1?"":"s"} selected`;const actions=document.createElement("div");actions.className="actions";const page=document.createElement("button");page.type="button";page.textContent="Select this page";page.disabled=!(this._bulkShownUids?.size);page.onclick=()=>{this._bulkShownUids.forEach((uid)=>this._bulkSelection.add(uid));this._renderList()};const all=document.createElement("button");all.type="button";all.textContent="Select all lamps";all.onclick=()=>{this._bulkSelection=new Set(valid);this._renderList()};const clear=document.createElement("button");clear.type="button";clear.textContent="Clear";clear.disabled=!selected.size;clear.onclick=()=>{this._bulkSelection.clear();this._renderList()};actions.append(page,all,clear);head.append(count,actions);panel.append(head);
      const grid=document.createElement("div");grid.className="grid";const actionField=(label,control,buttonLabel,onApply,tip="")=>{const wrap=document.createElement("div");wrap.className="fieldAction";const button=document.createElement("button");button.type="button";button.textContent=buttonLabel;button.disabled=!selected.size;button.onclick=onApply;wrap.append(control,button);grid.append(this._field(label,wrap,tip,true))};
      actionField("Group",this._groupInput(this._bulkDraft.group,v=>{this._bulkDraft.group=v}),"Apply",()=>this._bulkApplyPatch({group:String(this._bulkDraft.group||"").trim().slice(0,120)},"Bulk group changed"),"Blank removes the selected lamps from their group. Paired halves are included together.");
      const font=this._select(this._bulkDraft.font_family,FONT_FAMILY_OPTIONS,v=>{this._bulkDraft.font_family=v;this._renderBulkPanel()});actionField("Lamp font",font,"Apply",()=>this._bulkApplyPatch({font_family:normalizeFontFamily(this._bulkDraft.font_family),font_custom:normalizeCustomFont(this._bulkDraft.font_custom)},"Bulk lamp font changed"));if(this._bulkDraft.font_family==="custom")actionField("Custom font",this._text(this._bulkDraft.font_custom,v=>{this._bulkDraft.font_custom=v},'"DIN Condensed", sans-serif'),"Apply",()=>this._bulkApplyPatch({font_family:"custom",font_custom:normalizeCustomFont(this._bulkDraft.font_custom)},"Bulk custom font changed"));
      actionField("Shape",this._select(this._bulkDraft.shape,LAMP_SHAPE_OPTIONS,v=>{this._bulkDraft.shape=v}),"Apply",()=>this._bulkApplyPatch({shape:normalizeShape(this._bulkDraft.shape)},"Bulk lamp shape changed"));
      actionField("Lamp style",this._select(this._bulkDraft.lamp_style,[["inherit","Use panel default"],["modern","Modern"],["retro","Retro"]],v=>{this._bulkDraft.lamp_style=v}),"Apply",()=>this._bulkApplyPatch({lamp_style:["inherit","modern","retro"].includes(this._bulkDraft.lamp_style)?this._bulkDraft.lamp_style:"inherit"},"Bulk lamp style changed"));
      actionField("Lens",this._select(this._bulkDraft.lens_type,[["inherit","Use panel default"],["plastic","Plastic"],["glass","Glass"],["frosted","Frosted"],["smoked","Smoked"]],v=>{this._bulkDraft.lens_type=v}),"Apply",()=>this._bulkApplyPatch({lens_type:["inherit","plastic","glass","frosted","smoked"].includes(this._bulkDraft.lens_type)?this._bulkDraft.lens_type:"inherit"},"Bulk lamp lens changed"));
      actionField("Color behavior",this._select(this._bulkDraft.color_behavior,COLOR_BEHAVIOR_OPTIONS,v=>{this._bulkDraft.color_behavior=v}),"Apply",()=>this._bulkApplyPatch({color_behavior:normalizeColorBehavior(this._bulkDraft.color_behavior)},"Bulk color behavior changed"),"Changes only how existing colors are resolved; it does not alter severity or rules.");
      actionField("Icon size",this._number(this._bulkDraft.icon_size,v=>{this._bulkDraft.icon_size=normalizeLampIconSize(v)},12,160,1),"Apply",()=>this._bulkApplyPatch({icon_size:normalizeLampIconSize(this._bulkDraft.icon_size)},"Bulk icon size changed"));
      actionField("Brightness",this._select(this._bulkDraft.brightness_profile,this._brightnessProfileOptions(true),v=>{this._bulkDraft.brightness_profile=v}),"Apply",()=>this._bulkApplyPatch({lamp_brightness:this._brightnessForProfile({},normalizeLampBrightnessProfile(this._bulkDraft.brightness_profile,true),true)},"Bulk brightness profile changed"),"Applies only the brightness profile. Custom percentages can be saved as a lamp appearance preset and applied here.");
      actionField("ACK rearm",this._select(this._bulkDraft.ack_rearm,[["inherit","Use panel default"],["manual","Manual"],["auto","Automatic"]],v=>{this._bulkDraft.ack_rearm=v}),"Apply",()=>this._bulkApplyPatch({ack_rearm:["inherit","manual","auto"].includes(this._bulkDraft.ack_rearm)?this._bulkDraft.ack_rearm:"inherit"},"Bulk ACK rearm changed"));
      actionField("Alarm output",this._select(this._bulkDraft.audible,[["on","Participate"],["off","Do not participate"]],v=>{this._bulkDraft.audible=v}),"Apply",()=>this._bulkApplyPatch({participates_in_alarm_output:this._bulkDraft.audible==="on"},"Bulk alarm-output participation changed"),"Participating active, unacknowledged lamps can sound after saving.");
      const presets=normalizeLampAppearancePresets(this._config.lamp_appearance_presets);if(presets.length){if(!presets.some((preset)=>preset.id===this._selectedLampAppearancePreset))this._selectedLampAppearancePreset=presets[0].id;actionField("Lamp appearance preset",this._select(this._selectedLampAppearancePreset,presets.map((preset)=>[preset.id,preset.name]),v=>{this._selectedLampAppearancePreset=v}),"Apply",()=>this._bulkApplyLampPreset(this._selectedLampAppearancePreset),"Applies visual fields only; alarm severity, rules, text, pairing, spans, and actions are preserved.")}
      panel.append(grid);
    }
    _mediaSelector(value,onChange){
      const current=normalizeAlarmOutput(value);
      const e=document.createElement("ha-selector");
      e.hass=this._hass;
      e.selector={media:{clearable:true}};
      e.label="Choose media";
      e.required=false;
      e.disabled=false;
      e.context=current.media_player?{filter_entity:current.media_player}:{};
      e.value={
        ...(current.media_player?{entity_id:current.media_player}:{}),
        ...(current.media_content_id?{media_content_id:current.media_content_id,media_content_type:current.media_content_type||"music",metadata:{...current.media_metadata}}:{}),
      };
      e.addEventListener("value-changed",(ev)=>{
        const selected=ensureObj(ev.detail?.value,{});
        onChange({
          ...current,
          media_player:String(selected.entity_id||current.media_player||"").trim(),
          media_content_id:String(selected.media_content_id||""),
          media_content_type:String(selected.media_content_type||"music"),
          media_metadata:selected.metadata&&typeof selected.metadata==="object"&&!Array.isArray(selected.metadata)?{...selected.metadata}:{},
        });
      });
      // ha-form lazy-loads selector components in some Home Assistant builds. If
      // this element was created before ha-selector upgraded, reapply the public
      // properties after definition so pre-upgrade own properties cannot shadow
      // Lit's reactive accessors and leave the media control blank.
      if(customElements?.whenDefined)customElements.whenDefined("ha-selector").then(()=>{
        ["hass","selector","label","required","disabled","context","value"].forEach((key)=>{const saved=e[key];if(Object.prototype.hasOwnProperty.call(e,key))delete e[key];e[key]=saved});
      }).catch(()=>{});
      return e;
    }
    _color(label,value,onChange){
      const row=document.createElement("div");row.className="colorRow";
      const l=document.createElement("div");l.className="label";l.textContent=label;
      const p=document.createElement("input");p.type="color";p.setAttribute("aria-label",`${label} color picker`);p.value=/^#[0-9a-f]{6}$/i.test(value||"")?value:"#000000";
      const t=this._text(value||"",v=>onChange(v),"#RRGGBB");t.setAttribute("aria-label",`${label} color value`);
      let pickerEditing=false,pickerFrame=null,pendingPickerValue=p.value;
      let lastPickerValue=/^#[0-9a-f]{6}$/i.test(value||"")?String(value).toLowerCase():"";
      const beginPickerEdit=()=>{if(pickerEditing)return;pickerEditing=true;this._beginNativeEdit()};
      const endPickerEdit=()=>{if(!pickerEditing)return;pickerEditing=false;this._endNativeEdit()};
      const emitPickerValue=()=>{pickerFrame=null;const next=String(pendingPickerValue||p.value).toLowerCase();t.value=next;if(next===lastPickerValue)return;lastPickerValue=next;onChange(next)};
      const queuePickerValue=()=>{beginPickerEdit();pendingPickerValue=p.value;t.value=p.value;if(pickerFrame===null)pickerFrame=requestAnimationFrame(emitPickerValue)};
      const flushPickerValue=()=>{pendingPickerValue=p.value;if(pickerFrame!==null){cancelAnimationFrame(pickerFrame);pickerFrame=null}emitPickerValue()};
      p.addEventListener("pointerdown",beginPickerEdit);
      p.addEventListener("focus",beginPickerEdit);
      p.addEventListener("input",queuePickerValue);
      p.addEventListener("change",()=>{flushPickerValue();queueMicrotask(endPickerEdit)});
      p.addEventListener("blur",()=>{if(pickerFrame!==null)flushPickerValue();queueMicrotask(endPickerEdit)});
      row.append(l,p,t);return row;
    }
    _heading(title,sub){const w=document.createElement("div");w.className="sectionHead full";const a=document.createElement("div");a.className="sectionTitle";a.textContent=title;const b=document.createElement("div");b.className="sectionSub";b.textContent=sub;w.append(a,b);return w}
    _disclosure(host,key,title,sub="",defaultOpen=false){
      this._editorDisclosureState=this._editorDisclosureState||{};
      const details=document.createElement("details");details.className="editorDisclosure full";
      details.open=Object.prototype.hasOwnProperty.call(this._editorDisclosureState,key)?this._editorDisclosureState[key]:defaultOpen;
      const summary=document.createElement("summary"),heading=document.createElement("div");heading.className="editorDisclosureTitle";heading.textContent=title;summary.append(heading);
      if(sub){const hint=document.createElement("div");hint.className="editorDisclosureHint";hint.textContent=sub;summary.append(hint)}
      const fields=document.createElement("div");fields.className="editorDisclosureGrid";details.append(summary,fields);details.addEventListener("toggle",()=>{this._editorDisclosureState[key]=details.open});host.append(details);return fields;
    }

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
        const entries=block.indices.map((idx,k)=>{const l=normalizeLamp(block.lamps[k]||arr[idx]||{}),derived=isDerivedLamp(l);const friendly=this._hass?.states?.[l.entity]?.attributes?.friendly_name||"";const title=isSpacerItem(l)?"SPACER":(l.name_override||friendly||l.primary_text||l.entity||(derived?"DERIVED LAMP":"SELECT ENTITY"));return {idx,l,friendly,title}});
        const firstIdx=block.indices[0],cellNo=nav.meta[firstIdx]?.cellNo||1,digits=Math.max(2,String(Math.max(1,nav.totalCells)).length),label=`#${String(cellNo).padStart(digits,"0")}`;
        const hay=[label,...entries.flatMap((e)=>[e.title,e.l.entity,e.friendly,e.l.group,e.l.pair_mode])].join(" ").toLowerCase();
        return {block,entries,label,hay};
      }).filter((x)=>!q||x.hay.includes(q));
      const pageSize=Math.max(1,Number(this._navPageSize)||8),pageCount=Math.max(1,Math.ceil(cells.length/pageSize));
      if(this._navFollowSelection){const pos=cells.findIndex((x)=>x.entries.some((e)=>e.idx===this._selectedLamp));if(pos>=0)this._navPage=Math.floor(pos/pageSize);this._navFollowSelection=false}
      this._navPage=Math.max(0,Math.min(this._navPage,pageCount-1));const start=this._navPage*pageSize,shown=cells.slice(start,start+pageSize);
      this._bulkShownUids=new Set(shown.flatMap((cell)=>cell.entries.map((entry)=>entry.l)).filter(isOperationalLamp).map((lamp)=>lamp.uid).filter(Boolean));
      if(count){const base=`${arr.length} config item${arr.length===1?"":"s"} · ${nav.totalCells} panel cell${nav.totalCells===1?"":"s"}`;count.textContent=q?`${cells.length} matching cells · ${base}`:base}
      shown.forEach((cellData)=>{
        const selected=cellData.entries.some((e)=>e.idx===this._selectedLamp);
        if(cellData.block.paired){
          const wrap=document.createElement("div");wrap.className=`lampRow pairNav${selected?" sel":""}`;wrap.setAttribute("role","group");wrap.setAttribute("aria-label",`${cellData.label} paired annunciator cell`);
          const head=document.createElement("div");head.className="pairNavHead";head.innerHTML=`<span class="cellNo">${escapeHtml(cellData.label)}</span><span>PAIRED CELL</span>`;if(this._bulkMode){const uids=cellData.entries.map((entry)=>entry.l.uid),check=document.createElement("input");check.type="checkbox";check.className="bulkCheck";check.checked=uids.every((uid)=>this._bulkSelection.has(uid));check.setAttribute("aria-label",`Select ${cellData.label} paired cell for bulk editing`);check.onclick=(event)=>event.stopPropagation();check.onchange=()=>this._bulkToggle(uids,check.checked);head.prepend(check)}wrap.append(head);const pairBadges=[...new Set(cellData.entries.flatMap((entry)=>lampNavigatorBadges(entry.l,{paired:true})))];if(pairBadges.length){const chips=document.createElement("div");chips.className="chips";pairBadges.forEach((value)=>{const chip=document.createElement("span");chip.className="chip feature";chip.textContent=value;chips.append(chip)});wrap.append(chips)}
          const halves=document.createElement("div");halves.className="pairNavHalves";
          cellData.entries.sort((a,b)=>String(a.l.pair_mode)==="top"?-1:String(b.l.pair_mode)==="top"?1:0).forEach((e)=>{const b=document.createElement("button");b.type="button";b.className=`pairNavHalf${e.idx===this._selectedLamp?" sel":""}`;const tag=String(e.l.pair_mode||"").toUpperCase(),source=isDerivedLamp(e.l)?"Derived · rules":(e.l.entity||"Select entity");b.innerHTML=`<span class="pairHalfName"><span class="pairHalfTag">${escapeHtml(tag)}</span>${escapeHtml(e.title)}</span><span class="pairHalfEntity">${escapeHtml(source)}</span>`;b.onclick=()=>{this._selectedLamp=e.idx;this._navFollowSelection=true;this._renderList();this._renderEditor()};halves.append(b)});wrap.append(halves);list.append(wrap);return;
        }
        const e=cellData.entries[0],l=e.l,isSpacer=isSpacerItem(l),derived=isDerivedLamp(l),type=isSpacer?"spacer":inferLampType(l),severity=String(l.severity||"status").toLowerCase(),chipVals=[];if(!isSpacer){if(derived)chipVals.push("derived");chipVals.push(type);if(severity!==String(type).toLowerCase())chipVals.push(severity)}const featureBadges=isSpacer?[]:lampNavigatorBadges(l);
        const bulkSelectable=this._bulkMode&&!isSpacer,b=document.createElement(bulkSelectable?"div":"button");if(!bulkSelectable)b.type="button";b.className=`lampRow${selected?" sel":""}`;b.setAttribute("aria-label",`${cellData.label} ${e.title}${featureBadges.length?` · ${featureBadges.join(", ")}`:""}`);const allChips=[...chipVals.map((value)=>({value,feature:false})),...featureBadges.map((value)=>({value,feature:true}))],chips=allChips.length?`<div class="chips">${allChips.map((entry)=>`<span class="chip${entry.feature?" feature":""}">${escapeHtml(entry.value)}</span>`).join("")}</div>`:"";b.innerHTML=`<div class="lampRowTop"><span class="cellNo">${escapeHtml(cellData.label)}</span><span class="lampName">${escapeHtml(e.title)}</span></div><div class="lampEntity">${escapeHtml(isSpacer?"Empty grid position":derived?"Rule-driven · no primary entity":(l.entity||"Select an entity"))}</div>${chips}`;if(bulkSelectable){b.setAttribute("role","button");b.tabIndex=0;const check=document.createElement("input");check.type="checkbox";check.className="bulkCheck";check.checked=this._bulkSelection.has(l.uid);check.setAttribute("aria-label",`Select ${cellData.label} for bulk editing`);check.onclick=(event)=>event.stopPropagation();check.onchange=()=>this._bulkToggle(l.uid,check.checked);b.querySelector(".lampRowTop")?.prepend(check);b.onkeydown=(event)=>{if(event.key==="Enter"){event.preventDefault();this._selectedLamp=e.idx;this._renderEditor()}else if(event.key===" "||event.code==="Space"){event.preventDefault();this._bulkToggle(l.uid,!this._bulkSelection.has(l.uid))}}}b.onclick=()=>{this._selectedLamp=e.idx;this._navFollowSelection=true;this._renderList();this._renderEditor()};list.append(b)
      });
      if(!shown.length){const e=document.createElement("div");e.className="empty full";e.textContent=q?"No panel cells match your search.":"No lamps yet.";list.append(e)}
      const prev=document.createElement("button");prev.type="button";prev.className="prev";prev.textContent="‹ Previous";prev.disabled=this._navPage<=0||!cells.length;prev.onclick=()=>{this._navPage--;this._navFollowSelection=false;this._renderList()};const info=document.createElement("div");info.className="pageInfo";info.textContent=`${cells.length?this._navPage+1:0} / ${cells.length?pageCount:0}`;const next=document.createElement("button");next.type="button";next.className="next";next.textContent="Next ›";next.disabled=this._navPage>=pageCount-1||!cells.length;next.onclick=()=>{this._navPage++;this._navFollowSelection=false;this._renderList()};pager.append(prev,info,next);const range=document.createElement("div");range.className="rangeInfo";range.style.gridColumn="1 / -1";const end=Math.min(start+pageSize,cells.length);range.textContent=cells.length?`Showing panel cells ${start+1}–${end} of ${cells.length}`:"No cells to show";pager.append(range);this._renderBulkPanel()
    }

    _renderEditor(){
      const host=this.shadowRoot.getElementById("editor");if(!host)return;this._finishNativeEditsBeforeRender();host.innerHTML="";const arr=this._config.entities||[];
      if(!arr.length){host.append(this._heading("No lamp selected","Add a lamp or spacer to begin."));return}
      if(this._selectedLamp>=arr.length)this._selectedLamp=Math.max(0,arr.length-1);
      const l=this._lamp();
      const navMeta=this._selectedNavMeta();
      const isSpacer=isSpacerItem(l);
      const friendly=l.entity?(this._hass?.states?.[l.entity]?.attributes?.friendly_name||""):"";
      const derived=isDerivedLamp(l),displayName=l.name_override||friendly||l.primary_text||l.entity||(isSpacer?"SPACER":derived?"DERIVED LAMP":"SELECT ENTITY");
      const top=document.createElement("div");top.className="toolbar editorHeader";
      const name=document.createElement("div");name.className="editorIdentity";
      name.innerHTML=isSpacer
        ?`<div class="title">CELL ${escapeHtml(navMeta.label)} — SPACER</div><div class="muted">Empty grid position</div>`
        :`<div class="title">LAMP ${escapeHtml(navMeta.label)} — ${escapeHtml(displayName)}</div><div class="muted">${escapeHtml(derived?"Derived · rule-driven · no primary entity":(l.entity||"Choose an entity to finish this lamp"))}</div>`;
      const acts=document.createElement("div");acts.className="actions editorActions";
      const blocks=physicalBlocksFor(arr),selectedUid=l.uid,blockIndex=blocks.findIndex((b)=>b.lamps.some((x)=>x.uid===selectedUid));
      const up=document.createElement("button");up.textContent="↑";up.title="Move physical cell up";up.setAttribute("aria-label","Move physical cell up");up.disabled=blockIndex<=0;up.onclick=()=>this._move(-1);
      const down=document.createElement("button");down.textContent="↓";down.title="Move physical cell down";down.setAttribute("aria-label","Move physical cell down");down.disabled=blockIndex<0||blockIndex>=blocks.length-1;down.onclick=()=>this._move(1);
      const dup=document.createElement("button");dup.textContent="⧉";dup.title=isSpacer?"Duplicate spacer":"Duplicate lamp";dup.onclick=()=>this._duplicate();
      const del=document.createElement("button");del.textContent="Delete";del.className="danger";del.onclick=()=>this._remove();
      acts.append(up,down,dup,del);top.append(name,acts);host.append(top);

      // Spacer cells have a focused appearance editor. Selecting an entity converts
      // the spacer into a normal status lamp and reveals the full lamp editor.
      if(isSpacer){
        const pane=document.createElement("div");pane.className="spacerPane";
        pane.append(this._heading("Spacer cell","This position intentionally contains no entity. It still counts as a physical annunciator grid cell."));
        const notice=document.createElement("div");notice.className="spacerNotice";notice.innerHTML=`<strong>${escapeHtml(navMeta.label)}</strong> is currently an empty grid position.<br><span class="muted">Choose an entity below to convert it into a normal lamp. Move, duplicate, or delete it with the buttons above.</span>`;pane.append(notice);
        const localSpacer=normalizeSpacerAppearance(l.spacer_appearance,true),globalSpacer=normalizeSpacerAppearance(this._config.spacer_appearance,false);
        const updateSpacer=(patch,rerender=false)=>{this._updateLamp({spacer_appearance:{...normalizeSpacerAppearance(this._lamp().spacer_appearance,true),...patch}});if(rerender)this._renderEditor()};
        const spacerAppearanceSelect=this._select(localSpacer.mode,[
          ["inherit",`Use panel default (${globalSpacer.mode === "blend" ? "Blend" : globalSpacer.mode === "custom" ? "Custom" : "Compatibility"})`],
          ["default","Compatibility appearance"],["blend","Blend into panel (transparent gap)"],["custom","Custom fill / frame / border"]
        ],v=>updateSpacer({mode:v},true));pane.append(this._field("Appearance",this._withInheritedReset(spacerAppearanceSelect,localSpacer.mode!=="inherit",()=>this._resetLampOverride({spacer_appearance:{mode:"inherit"}},"Spacer appearance reset to panel default")),"Blend removes the visible lens, frame, border, glare, and shadow so the cell reads as an intentional gap.",true));
        if(localSpacer.mode==="custom"){
          const spacerNone=(label,key,tip)=>{const line=document.createElement("div");line.className="switchLine";line.append(this._switch(localSpacer[key]===true,v=>updateSpacer({[key]:v},true)),document.createTextNode(label));pane.append(this._field(label,line,tip,true))};
          spacerNone("No spacer fill","fill_none","Leaves the spacer lens area transparent while retaining any selected frame and border.");
          if(!localSpacer.fill_none)pane.append(this._color("Spacer fill",localSpacer.fill||globalColorValue(this._config.severity_colors||{},"off",BUILTIN_COLORS.off),v=>updateSpacer({fill:v})));
          spacerNone("No spacer frame / bezel","bezel_none","Removes the spacer's outer frame without changing its fill.");
          if(!localSpacer.bezel_none)pane.append(this._color("Spacer frame / bezel",localSpacer.bezel||globalColorValue(this._config.severity_colors||{},"blank",BUILTIN_COLORS.blank),v=>updateSpacer({bezel:v})));
          spacerNone("No spacer border","border_none","Removes the line around the spacer lens.");
          if(!localSpacer.border_none){pane.append(this._color("Spacer border",localSpacer.border||"#000000",v=>updateSpacer({border:v})));pane.append(this._field("Spacer border width",this._number(localSpacer.border_width??2,v=>updateSpacer({border_width:Math.max(0,Math.min(24,clampNum(v,2)))}),0,24,1),"Pixels. Use 0 for no border.",true));}
        }
        pane.append(this._field("Convert to lamp",this._entity("",v=>{if(!v)return;const base={...normalizeLamp({uid:l.uid||makeLampUid(),ack_slot:l.ack_slot,entity:v,cell_type:"lamp",lamp_type:"status",color_behavior:"standard",severity:"status",alert_style:"none",blink:false,pulse:false,ack_rearm:"inherit",primary_mode:"name",secondary_mode:"state"})};const current=this._lamp();this._updateLamp({...base,uid:current.uid||base.uid,entity:v,cell_type:"lamp",spacer_appearance:undefined},true);this._page="setup";this._navFollowSelection=true;this._renderList();this._renderEditor()}),"Select an entity. New lamps use simple Standard ON/OFF colors with no alert by default.",true));
        host.append(pane);
        return;
      }

      const advanced=this._editorMode==="advanced"||this._page!=="basic",modeBar=document.createElement("div");modeBar.className="editorMode";
      [["basic","Quick setup"],["advanced","Full editor"]].forEach(([mode,label])=>{const button=document.createElement("button");button.type="button";button.className=`modeButton${(mode==="advanced")===advanced?" active":""}`;button.textContent=label;button.onclick=()=>{this._editorMode=mode;this._page=mode==="basic"?"basic":"setup";this._renderEditor()};modeBar.append(button)});host.append(modeBar);
      const body=document.createElement("div");body.className="grid";
      if(!advanced){host.append(body);this._pageBasic(body,l);return}
      const tabs=document.createElement("div");tabs.className="tabs";LAMP_EDITOR_PAGE_SPECS.forEach(({key,label})=>{const b=document.createElement("button");b.className=`tab${this._page===key?" active":""}`;b.textContent=label;b.onclick=()=>{this._editorMode="advanced";this._page=key;this._renderEditor()};tabs.append(b)});host.append(tabs,body);
      ({setup:()=>this._pageSetup(body,l),display:()=>this._pageDisplay(body,l),behavior:()=>this._pageBehavior(body,l),appearance:()=>this._pageAppearance(body,l),interaction:()=>this._pageInteraction(body,l),rules:()=>this._pageRules(body,l),advanced:()=>this._pageAdvanced(body,l)})[this._page]?.();
    }

    _appendLampSourceFields(body,l){
      const derived=isDerivedLamp(l);
      body.append(this._field("Data source",this._select(derived?"derived":"entity",LAMP_SOURCE_OPTIONS,v=>{this._pushUndo("Lamp data source changed");if(v==="derived")this._updateLamp({source_mode:"derived",entity:"",cell_type:"lamp",derived_base_state:normalizeDerivedBaseState(l.derived_base_state),tap_action:interactionNeedsEntity(l.tap_action)&&String(l.tap_target||"self")!=="entity"?"none":l.tap_action},true);else this._updateLamp({source_mode:"entity",entity:"",cell_type:"lamp"},true);this._navFollowSelection=true;this._renderList();this._renderEditor()}),"Use a Derived lamp for a text/icon annunciator controlled by rules that watch other Home Assistant entities.",true));
      if(!derived){
        body.append(this._field("Entity",this._entity(l.entity,v=>{if(!v){this._pushUndo("Lamp converted to spacer");this._breakPairForUid(l.uid,false);const idx=this._indexByUid(l.uid);if(idx>=0)this._selectedLamp=idx;this._updateLamp({entity:"",source_mode:"entity",cell_type:"spacer",pair_id:"",pair_mode:"none"},true)}else this._updateLamp({entity:v,source_mode:"entity",cell_type:"lamp"},true);this._navFollowSelection=true;this._renderList();this._renderEditor()}),"Blank creates a spacer and safely breaks any pair.",true));
        return !!l.entity;
      }
      const note=document.createElement("div");note.className="summaryBox full";note.textContent="Derived lamps stay available without a primary entity. Rules watch Home Assistant entities and can Force ON or Force OFF without creating lamp-to-lamp dependency loops.";body.append(note);
      body.append(this._field("Base state",this._select(normalizeDerivedBaseState(l.derived_base_state),[["off","OFF until a rule turns it on"],["on","ON until a rule turns it off"]],v=>this._updateLamp({derived_base_state:v})),"Fallback when no rule matches. First matching rule wins.",true));
      return true;
    }
    _appendLampIdentityFields(body,l){
      const derived=isDerivedLamp(l),type=inferLampType(l);
      body.append(this._field("Lamp type",this._select(type,LAMP_TYPE_OPTIONS,v=>{this._applyLampType(v);this._renderEditor();this._renderList()}),"Applies sensible defaults without removing advanced capability.",true));
      body.append(this._field("Lamp name",this._text(l.name_override,(v)=>{this._updateLamp({name_override:v,label_source:v?"custom":"entity"});this._renderList()},derived?"Derived lamp":"Entity friendly name"),derived?"Used as the navigator name and template {{name}} value.":"Leave blank to use the entity friendly name.",true));
      body.append(this._field("Group",this._groupInput(l.group,v=>this._setLampGroup(v)),"Select an existing group or type a new name. Paired halves are kept in the same group automatically.",true));
      if(!derived&&(type!=="sensor"||!l.always_on))this._conditionBuilder(body,l,"Lamp turns ON when",false);
    }
    _pageSetup(body,l){
      body.append(this._heading("Essential settings","Source, lamp intent, name, group, and the normal ON condition. Visual and alert controls have one home under Appearance and Behavior."));
      if(!this._appendLampSourceFields(body,l))return;
      this._appendLampIdentityFields(body,l);
    }
    _pageBasic(body,l){
      body.append(this._heading("Quick setup","The common controls for a straightforward lamp. Choose Full editor for line formatting, alert tuning, interactions, rules, pairing, spans, and diagnostics."));
      if(!this._appendLampSourceFields(body,l))return;
      this._appendLampIdentityFields(body,l);
      const contentMode=normalizeLampContentMode(l.content_mode);
      body.append(this._field("Content",this._select(contentMode,[["text","Text"],["icon","Icon only"],["icon_text","Icon + text"]],v=>{this._updateLamp({content_mode:v});this._renderEditor()}),"Use Full editor to choose individual text lines.",true));
      if(contentMode!=="text"){body.append(this._field("Icon",this._icon(l.icon||"",v=>this._updateLamp({icon:v})),"Blank uses the entity/domain icon when available.",true));body.append(this._field("Icon size",this._number(normalizeLampIconSize(l.icon_size),v=>this._updateLamp({icon_size:normalizeLampIconSize(v)}),12,160,1),"Pixels.",false))}
      if(isDerivedLamp(l)||(l.primary_mode||"custom")==="custom")body.append(this._field("Primary text",this._text(l.primary_text||"",v=>this._updateLamp({primary_mode:"custom",primary_text:v})),"Main annunciator text.",true));
      const behavior=normalizeColorBehavior(l.color_behavior),behaviorOptions=[...COLOR_BEHAVIOR_OPTIONS,...(behavior==="legacy"?[["legacy","Legacy compatibility"]]:[])];
      body.append(this._field("Color behavior",this._select(behavior,behaviorOptions,v=>{this._setLampColorBehavior(v);this._renderEditor()}),"Standard is simplest. Appearance contains individual colors.",true));
      if(behavior==="severity"||behavior==="legacy")body.append(this._field("Severity",this._select(l.severity||"status",SEVERITY_OPTIONS,v=>{this._updateLamp({severity:v});this._renderList()}),"Controls active severity color and Alarm/Trip classification.",false));
      const effect=resolveBaseAlertEffect(l)||"none";body.append(this._field("Alert effect",this._select(effect,ALERT_EFFECT_OPTIONS,v=>{this._updateLamp({alert_style:v,blink:v==="blink",pulse:v==="pulse"});this._renderList()}),"Behavior contains ACK policy, alert condition, and effect tuning.",false));
      this._appendBrightnessEditor(body,l,true);
      const more=document.createElement("button");more.type="button";more.textContent="Open full editor";more.onclick=()=>{this._editorMode="advanced";this._page="setup";this._renderEditor()};body.append(this._field("More options",more,"No settings are lost when switching views.",true));
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

    _dynamicTextLineConfig(l,line){return normalizeDynamicTextLine(ensureObj(l?.dynamic_text,{})[line],line)}
    _setDisplayLineMode(line,mode){
      const l=this._lamp(),modeKey=`${line}_mode`,dynamic={...ensureObj(l.dynamic_text,{})};
      if((mode==="state_labels"||mode==="dynamic")&&!dynamic[line]){
        const fallback=line==="primary"?String(l.primary_text||l.name_override||""):String(l[`${line}_text`]||"");
        dynamic[line]=normalizeDynamicTextLine({fallback},line);
      }
      this._updateLamp({[modeKey]:mode,dynamic_text:dynamic},true);this._renderEditor();
    }
    _patchDynamicTextLine(line,patch,immediate=false){
      const l=this._lamp(),dynamic={...ensureObj(l.dynamic_text,{})},current=this._dynamicTextLineConfig(l,line);
      const next={...current,...patch,labels:patch.labels?{...current.labels,...patch.labels}:current.labels,rules:patch.rules||current.rules};
      dynamic[line]=normalizeDynamicTextLine(next,line);this._updateLamp({dynamic_text:dynamic},immediate);
    }
    _dynamicTextRulePatch(line,index,patch){const current=this._dynamicTextLineConfig(this._lamp(),line),rules=[...current.rules];rules[index]=normalizeDynamicTextRule({...ensureObj(rules[index],{}),...patch},index);this._patchDynamicTextLine(line,{rules})}
    _dynamicTextRuleNested(line,index,patch){const current=this._dynamicTextLineConfig(this._lamp(),line),rules=[...current.rules],rule=ensureObj(rules[index],{});rules[index]=normalizeDynamicTextRule({...rule,rule:{...ensureObj(rule.rule,{}),...patch}},index);this._patchDynamicTextLine(line,{rules})}
    _dynamicTextRuleMove(line,index,delta){const current=this._dynamicTextLineConfig(this._lamp(),line),rules=[...current.rules],to=index+delta;if(to<0||to>=rules.length)return;this._pushUndo(`${line} text rule moved`);[rules[index],rules[to]]=[rules[to],rules[index]];if(this._dynamicTextRuleOpenKey===`${line}:${index}`)this._dynamicTextRuleOpenKey=`${line}:${to}`;this._patchDynamicTextLine(line,{rules},true);this._renderEditor()}
    _dynamicTextRuleDuplicate(line,index){const current=this._dynamicTextLineConfig(this._lamp(),line),rules=[...current.rules];if(rules.length>=DYNAMIC_TEXT_RULE_LIMIT)return;this._pushUndo(`${line} text rule duplicated`);const copy=JSON.parse(JSON.stringify(rules[index]||{}));copy.name=copy.name?`${copy.name} Copy`:"Text rule copy";rules.splice(index+1,0,copy);this._dynamicTextRuleOpenKey=`${line}:${index+1}`;this._patchDynamicTextLine(line,{rules},true);this._renderEditor()}
    _dynamicTextRuleDelete(line,index){const current=this._dynamicTextLineConfig(this._lamp(),line);this._pushUndo(`${line} text rule deleted`);const open=String(this._dynamicTextRuleOpenKey||""),prefix=`${line}:`,openIndex=open.startsWith(prefix)?Number(open.slice(prefix.length)):null;if(openIndex===index)this._dynamicTextRuleOpenKey="";else if(Number.isInteger(openIndex)&&openIndex>index)this._dynamicTextRuleOpenKey=`${line}:${openIndex-1}`;this._patchDynamicTextLine(line,{rules:current.rules.filter((_,ruleIndex)=>ruleIndex!==index)},true);this._renderEditor()}
    _dynamicTextRuleSummary(value,index){
      const rule=normalizeDynamicTextRule(value,index),threshold=rule.rule,kindLabels={lamp_on:"lamp ON",lamp_off:"lamp OFF",unavailable:"unavailable or missing",unknown:"unknown",acknowledged:"acknowledged",unacknowledged:"unacknowledged",alarm_active:"alarm active",alarm_inactive:"alarm inactive",state_equals:`state = ${rule.state}`,string:`${rule.match} ${rule.value}`,numeric:threshold.type==="above"?`${threshold.inclusive?"≥":">"} ${threshold.a}`:threshold.type==="below"?`${threshold.inclusive?"≤":"<"} ${threshold.a}`:threshold.type==="between"?`${threshold.inclusive?"between incl.":"between"} ${threshold.a}–${threshold.b}`:`= ${threshold.a}`};
      return `${rule.name||`Text rule ${index+1}`}: ${kindLabels[rule.kind]||rule.kind} → ${rule.text||"[blank]"}`;
    }
    _appendDynamicTextLineEditor(body,l,line,mode){
      const label=line[0].toUpperCase()+line.slice(1),config=this._dynamicTextLineConfig(l,line);
      if(mode==="state_labels"){
        const section=this._disclosure(body,`display.${line}.stateLabels`,`${label} state labels`,`Final logical ON/OFF follows invert, rules, and Lamp Test. Unavailable and Unknown remain independently editable.`,true);
        [["ON text","on"],["OFF text","off"],["Unavailable text","unavailable"],["Unknown text","unknown"]].forEach(([field,key])=>section.append(this._field(field,this._text(config.labels[key],value=>this._patchDynamicTextLine(line,{labels:{[key]:value}})),"",false)));return;
      }
      if(mode!=="dynamic")return;
      const section=this._disclosure(body,`display.${line}.dynamic`,`${label} dynamic text`,`First enabled match wins. These rules read this lamp's source/final state and change text only.`,true);
      section.append(this._field("Fallback text",this._text(config.fallback,value=>this._patchDynamicTextLine(line,{fallback:value}),line==="primary"?"No rule matched":"Optional"),"Used when no enabled rule matches.",true));
      const add=document.createElement("button");add.type="button";add.textContent="+ Add text rule";add.disabled=config.rules.length>=DYNAMIC_TEXT_RULE_LIMIT;add.onclick=()=>{this._pushUndo(`${line} text rule added`);const rules=[...config.rules,{enabled:true,name:`Text rule ${config.rules.length+1}`,kind:"lamp_on",text:"ACTIVE",rule:{type:"above",a:0,b:0,inclusive:true}}];this._dynamicTextRuleOpenKey=`${line}:${config.rules.length}`;this._patchDynamicTextLine(line,{rules},true);this._renderEditor()};section.append(this._field("",add,`Maximum ${DYNAMIC_TEXT_RULE_LIMIT} rules per line.`,true));
      config.rules.forEach((raw,index)=>{const rule=normalizeDynamicTextRule(raw,index),box=document.createElement("details"),openKey=`${line}:${index}`;box.className="rule full";box.open=this._dynamicTextRuleOpenKey===openKey||(!this._dynamicTextRuleOpenKey&&config.rules.length===1);box.addEventListener("toggle",()=>{if(box.open)this._dynamicTextRuleOpenKey=openKey;else if(this._dynamicTextRuleOpenKey===openKey)this._dynamicTextRuleOpenKey=""});const summary=document.createElement("summary");summary.textContent=this._dynamicTextRuleSummary(rule,index);box.append(summary);const wrap=document.createElement("div");wrap.className="ruleBody";const actions=document.createElement("div");actions.className="ruleActions";[["↑","Move rule up",()=>this._dynamicTextRuleMove(line,index,-1),index<=0],["↓","Move rule down",()=>this._dynamicTextRuleMove(line,index,1),index>=config.rules.length-1],["⧉","Duplicate rule",()=>this._dynamicTextRuleDuplicate(line,index),config.rules.length>=DYNAMIC_TEXT_RULE_LIMIT],["Delete","Delete rule",()=>this._dynamicTextRuleDelete(line,index),false]].forEach(([textValue,title,handler,disabled])=>{const button=document.createElement("button");button.type="button";button.textContent=textValue;button.title=title;button.disabled=disabled;if(textValue==="Delete")button.className="danger";button.onclick=(event)=>{event.preventDefault();handler()};actions.append(button)});wrap.append(actions);const grid=document.createElement("div");grid.className="grid";wrap.append(grid);
        grid.append(this._field("Rule name",this._text(rule.name,value=>this._dynamicTextRulePatch(line,index,{name:value}),"Optional name"),"Shown in the rule summary.",true));const enabled=document.createElement("div");enabled.className="switchLine";enabled.append(this._switch(rule.enabled!==false,value=>{this._dynamicTextRulePatch(line,index,{enabled:value});this._renderEditor()}),document.createTextNode("Rule enabled"));grid.append(this._field("Enabled",enabled,"Disabled rules remain saved but are skipped.",true));
        const conditions=[["lamp_on","Lamp ON"],["lamp_off","Lamp OFF"],["unavailable","Unavailable / missing"],["unknown","Unknown"],["state_equals","State equals"],["string","String match"],["numeric","Numeric threshold"],["acknowledged","ACK stored"],["unacknowledged","No ACK stored"],["alarm_active","Main alert active"],["alarm_inactive","Main alert inactive"]];grid.append(this._field("When",this._select(rule.kind,conditions,value=>{this._dynamicTextRuleOpenKey=openKey;this._dynamicTextRulePatch(line,index,{kind:value});this._renderEditor()}),"ON/OFF uses the final logical lamp state. ACK means this lamp has a stored acknowledgment. Main alert requires a configured visual Alert effect and a matching Alert when condition. State/string use the current source state; numeric uses its transformed value.",true));
        if(rule.kind==="state_equals")grid.append(this._field("State equals",this._text(rule.state,value=>this._dynamicTextRulePatch(line,index,{state:value}),"on"),"Exact source state.",true));
        if(rule.kind==="string"){grid.append(this._field("Match",this._select(rule.match,[["contains","Contains"],["equals","Equals"],["starts_with","Starts with"],["ends_with","Ends with"]],value=>this._dynamicTextRulePatch(line,index,{match:value})),"",false));grid.append(this._field("Text to match",this._text(rule.value,value=>this._dynamicTextRulePatch(line,index,{value}),"FAULT"),"",false))}
        if(rule.kind==="numeric"){const threshold=rule.rule;grid.append(this._field("Comparison",this._select(threshold.type,[["above","Above"],["below","Below"],["between","Between"],["equal","Equal"]],value=>{this._dynamicTextRuleNested(line,index,{type:value});this._renderEditor()}),"Uses the transformed numeric value.",false));grid.append(this._field("Threshold",this._number(threshold.a,value=>this._dynamicTextRuleNested(line,index,{a:finiteDynamicNumber(value,0)}),null,null,"any"),"",false));if(threshold.type==="between")grid.append(this._field("Upper threshold",this._number(threshold.b,value=>this._dynamicTextRuleNested(line,index,{b:finiteDynamicNumber(value,0)}),null,null,"any"),"",false));if(threshold.type!=="equal"){const inclusive=document.createElement("div");inclusive.className="switchLine";inclusive.append(this._switch(threshold.inclusive!==false,value=>this._dynamicTextRuleNested(line,index,{inclusive:value})),document.createTextNode("Include threshold boundary"));grid.append(this._field("Boundary",inclusive,"Controls ≥/≤ versus >/<.",true))}}
        grid.append(this._field("Display text",this._text(rule.text,value=>this._dynamicTextRulePatch(line,index,{text:value}),"ACTIVE"),"This rule changes only this display line.",true));box.append(wrap);section.append(box)});
    }

    _copyDisplaySettingsFrom(sourceUid){
      const arr=(this._config.entities||[]).map((item)=>normalizeLamp(item)),source=arr.find((item)=>item.uid===sourceUid&&isOperationalLamp(item));if(!source)return;
      const target=arr[this._selectedLamp];if(!target||!isOperationalLamp(target)||target.uid===source.uid)return;
      this._pushUndo("Display settings copied");arr[this._selectedLamp]=applyLampDisplaySettings(target,source);this._config={...this._config,entities:arr};this._dispatch(true);this._renderList();this._renderEditor();
    }
    _appendDisplayCopyEditor(body,l){
      const all=(this._config.entities||[]).map((item,index)=>({item:normalizeLamp(item),index})).filter(({item})=>isOperationalLamp(item)&&item.uid!==l.uid);if(!all.length)return;
      if(!all.some(({item})=>item.uid===this._displayCopySourceUid))this._displayCopySourceUid=all[0].item.uid;
      const nav=this._navMeta(this._config.entities||[]),options=all.map(({item,index})=>{const friendly=this._hass?.states?.[item.entity]?.attributes?.friendly_name||"",name=item.name_override||friendly||item.primary_text||item.entity||(isDerivedLamp(item)?"Derived lamp":"Lamp");return [item.uid,`${nav.meta[index]?.label||`#${index+1}`} — ${name}`]});
      const section=this._disclosure(body,"display.copy","Copy display settings","Copies content, icon, font, text modes, dynamic text rules, templates, and value formatting. Entity, name, behavior, appearance, pairing, spans, actions, and ACK settings stay unchanged.",false);
      section.append(this._field("Source lamp",this._select(this._displayCopySourceUid,options,value=>{this._displayCopySourceUid=value}),"Choose the lamp whose Display page should be copied.",true));const copy=document.createElement("button");copy.type="button";copy.textContent="Copy to this lamp";copy.onclick=()=>this._copyDisplaySettingsFrom(this._displayCopySourceUid);section.append(this._field("Copy",copy,"One undo step is created. This action never changes either lamp's entity or alarm behavior.",true));
    }
    _pageDisplay(body,l){
      body.append(this._heading("Display","Choose what each line shows. Transform the value first; format it second."));
      body.append(this._pageSummary("Current display",this._displaySummary(l)));
      this._appendDisplayCopyEditor(body,l);
      const contentMode=normalizeLampContentMode(l.content_mode);body.append(this._field("Content",this._select(contentMode,[["text","Text"],["icon","Icon only"],["icon_text","Icon + selected lines"]],v=>{this._updateLamp({content_mode:v});this._renderEditor()}),"Text preserves the normal annunciator lines. Icon + selected lines lets you independently include Primary, Secondary, and Tertiary.",true));
      if(contentMode!=="text"){
        body.append(this._field("Icon",this._icon(l.icon||"",v=>this._updateLamp({icon:v})),"Leave blank to use the entity icon when available, with a safe domain fallback.",true));
        body.append(this._field("Icon size",this._number(normalizeLampIconSize(l.icon_size),v=>this._updateLamp({icon_size:normalizeLampIconSize(v)}),12,160,1),"Pixels. Shaped lamps constrain oversized icons to the lens.",false));
        const iconColorMode=normalizeLampIconColorMode(l.icon_color_mode,l.icon_color_enabled===true);
        const iconColorSelect=this._select(iconColorMode,[["follow","Follow lamp text"],["single","One custom color"],["state","Separate ON / OFF colors"]],v=>{this._updateLamp({icon_color_mode:v,icon_color_enabled:v!=="follow"});this._renderEditor()});body.append(this._field("Icon color",this._withInheritedReset(iconColorSelect,iconColorMode!=="follow",()=>this._resetLampOverride({icon_color_mode:"follow",icon_color_enabled:false,icon_color:"",icon_color_on:"",icon_color_off:""},"Lamp icon colors reset"),"Follow lamp text"),"Unavailable icons always follow the unavailable text color.",true));
        if(iconColorMode==="single")body.append(this._color("Custom icon color",l.icon_color||"#ffffff",v=>this._updateLamp({icon_color:v})));
        if(iconColorMode==="state"){body.append(this._color("ON icon color",l.icon_color_on||"#ffffff",v=>this._updateLamp({icon_color_on:v})));body.append(this._color("OFF icon color",l.icon_color_off||"#777777",v=>this._updateLamp({icon_color_off:v})))}
        if(contentMode==="icon_text"){
          const lineChoices=document.createElement("div");lineChoices.className="full";
          [["Primary","icon_show_primary"],["Secondary","icon_show_secondary"],["Tertiary","icon_show_tertiary"]].forEach(([label,key])=>{const line=document.createElement("div");line.className="switchLine";line.append(this._switch(l[key]!==false,v=>this._updateLamp({[key]:v})),document.createTextNode(`Show ${label.toLowerCase()}`));lineChoices.append(line)});
          body.append(this._field("Text with icon",lineChoices,"Choose any combination. A selected line that resolves to blank takes no space.",true));
        }
      }
      const fontFamily=normalizeFontFamily(l.font_family),fontPreview=this._fontPreview(fontFamily,l.font_custom||"",configuredFontStack(this._config.lamp_font_family,this._config.lamp_font_custom)||HEADER_FONT_STACKS.condensed),fontSelect=this._select(fontFamily,FONT_FAMILY_OPTIONS,v=>{this._updateLamp({font_family:v});this._renderEditor()});body.append(this._field("Lamp font",this._withInheritedReset(fontSelect,fontFamily!=="inherit",()=>this._resetLampOverride({font_family:"inherit",font_custom:""},"Lamp font reset to panel default")),"Panel / built-in default inherits the panel lamp font. Theme/default and System may intentionally look alike; the specimen below shows the actual browser result.",true));if(fontFamily==="custom")body.append(this._field("Custom font",this._text(l.font_custom||"",v=>{const clean=normalizeCustomFont(v);this._updateLamp({font_custom:clean});fontPreview.applyFont("custom",clean)},'"DIN Condensed", sans-serif'),"Enter an installed font name or CSS font stack. If it is unavailable, the browser uses the next family in your stack.",true));body.append(this._field("Font preview",fontPreview,"This specimen uses the same resolved font stack as the lamp. Hover it to see the exact CSS stack.",true));
      if(contentMode!=="icon"){
        const useTpl=this._switch(!!l.use_templates,v=>{this._updateLamp({use_templates:v});this._renderEditor()});const sw=document.createElement("div");sw.className="switchLine";sw.append(useTpl,document.createTextNode("Use templates"));body.append(this._field("Templates",sw,"Templates replace normal primary/secondary controls.",true));
        if(l.use_templates){body.append(this._field("Primary template",this._text(l.label_template||"{{name}}",v=>this._updateLamp({label_template:v})),"Vars: {{name}} {{state}} {{value}} {{unit}} {{acked}} {{severity}} {{attributes.xxx}}",true));body.append(this._field("Secondary template",this._text(l.legend_template||"{{value}} {{unit}}",v=>this._updateLamp({legend_template:v})),"",true));return}
      }
      const lineOpts=[["custom","Custom text"],["name","Label"],["state","State / value"],["state_labels","ON / OFF labels"],["dynamic","Dynamic text rules"]];const infoOpts=[["none","None"],["custom","Custom text"],["state","State / value"],["state_labels","ON / OFF labels"],["dynamic","Dynamic text rules"],["entity_id","Entity ID"],["last_changed","Last changed"],["last_updated","Last updated"]];
      if(contentMode!=="icon"){
        const primaryMode=l.primary_mode||"custom";body.append(this._field("Primary",this._select(primaryMode,lineOpts,v=>this._setDisplayLineMode("primary",v)),"",false));if(primaryMode==="custom")body.append(this._field("Primary text",this._text(l.primary_text,v=>this._updateLamp({primary_text:v})),"",false));this._appendDynamicTextLineEditor(body,l,"primary",primaryMode);
        const secondaryMode=l.secondary_mode||"state";body.append(this._field("Secondary",this._select(secondaryMode,infoOpts,v=>this._setDisplayLineMode("secondary",v)),"",false));if(secondaryMode==="custom")body.append(this._field("Secondary text",this._text(l.secondary_text,v=>this._updateLamp({secondary_text:v})),"",false));this._appendDynamicTextLineEditor(body,l,"secondary",secondaryMode);
        const tertiaryMode=l.tertiary_mode||"none";body.append(this._field("Tertiary",this._select(tertiaryMode,infoOpts,v=>this._setDisplayLineMode("tertiary",v)),"Optional third line.",false));if(tertiaryMode==="custom")body.append(this._field("Tertiary text",this._text(l.tertiary_text,v=>this._updateLamp({tertiary_text:v})),"",false));this._appendDynamicTextLineEditor(body,l,"tertiary",tertiaryMode);
      }
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
      body.append(this._pageSummary("Current behavior",this._behaviorSummary(l)));
      const audible=document.createElement("div");audible.className="switchLine";audible.append(this._switch(l.participates_in_alarm_output===true,v=>this._updateLamp({participates_in_alarm_output:v})),document.createTextNode("Participate in panel alarm output"));body.append(this._field("Audible alarm",audible,"Opt-in per lamp. Existing lamps never produce output after upgrade unless enabled.",true));
      const base=resolveBaseAlertEffect(l)||"none";
      body.append(this._field("Alert effect",this._select(base,ALERT_EFFECT_OPTIONS,v=>{this._updateLamp({alert_style:v,blink:v==="blink",pulse:v==="pulse"});this._renderEditor()}),"",false));
      body.append(this._field("Alert when",this._select(l.alert_when||l.blink_mode||"on",[["on","Lamp ON"],["off","Lamp OFF"],["both","ON or OFF"]],v=>this._updateLamp({alert_when:v,blink_mode:v})),"ACK suppresses the condition alert.",false));
      const effectiveRearm=resolveAckRearm(l,this._config),autoBoth=effectiveRearm==="auto"&&String(l.alert_when||l.blink_mode||"on")==="both";
      const ackRearmValue=l.ack_rearm||"manual",ackRearmSelect=this._select(ackRearmValue,[["inherit",`Use panel default (${effectiveRearm === "auto" ? "Automatic" : "Manual"})`],["manual","Manual — Clear acknowledged required"],["auto","Automatic — rearm when normal"]],v=>this._updateLamp({ack_rearm:v}));body.append(this._field("ACK rearm",this._withInheritedReset(ackRearmSelect,ackRearmValue!=="inherit",()=>this._resetLampOverride({ack_rearm:"inherit"},"Lamp ACK rearm reset to panel default")),autoBoth?"Automatic rearm needs a normal state; Alert when = ON or OFF is always active, so it cannot auto-rearm.":`Effective mode: ${effectiveRearm === "auto" ? "Automatic" : "Manual"}. Automatic clears the stored ACK only after this lamp's configured alert condition returns to normal.`,true));
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

    _setLampColorBehavior(value) {
      const l = this._lamp();
      const next = normalizeColorBehavior(value);
      if (next === "custom") {
        const current = resolveLampColors(l, { severity:l.severity || "status", autoOnColor:"" }, this._config.severity_colors || {});
        const colors = { ...ensureObj(l.colors, {}) };
        if (normalizeColorBehavior(l.color_behavior) === "legacy") {
          colors.on = cleanColor(colors.on_window) || cleanColor(colors.on) || current.onWindowColor;
          colors.off = cleanColor(colors.off) || current.offColor;
        } else if (cleanColor(colors.on_window)) colors.on = cleanColor(colors.on_window);
        colors.on_window = "";
        this._updateLamp({ color_behavior:"custom", use_color_override:true, colors });
        return;
      }
      this._updateLamp({ color_behavior:next, use_color_override:next === "legacy" ? !!l.use_color_override : false });
    }

    _pageAppearance(body,l){
      body.append(this._heading("Appearance","Simple ON/OFF colors by default; severity and custom modes stay available when you need them."));
      const presetBox=this._disclosure(body,"lampAppearance.presets",`Lamp appearance presets · ${this._lampAppearancePresets().length} saved`,"Reusable visual styles only. Entity, text, icon identity, severity, alerts, ACK, groups, rules, pairs, spans, and actions are never included.",this._lampAppearancePresets().length>0),lampPresets=this._lampAppearancePresets();
      if(lampPresets.length){if(!lampPresets.some((preset)=>preset.id===this._selectedLampAppearancePreset))this._selectedLampAppearancePreset=lampPresets[0].id;const selectedPreset=lampPresets.find((preset)=>preset.id===this._selectedLampAppearancePreset)||lampPresets[0];if(this._lampAppearancePresetDraftForId!==selectedPreset.id){this._lampAppearancePresetDraft=selectedPreset.name;this._lampAppearancePresetDraftForId=selectedPreset.id}presetBox.append(this._field("Saved style",this._select(selectedPreset.id,lampPresets.map((preset)=>[preset.id,preset.name]),v=>{this._selectedLampAppearancePreset=v;const next=this._lampAppearancePresets().find((preset)=>preset.id===v);this._lampAppearancePresetDraft=next?.name||"";this._lampAppearancePresetDraftForId=v;this._renderEditor()}),"Select a saved lamp appearance.",true))}
      presetBox.append(this._field("Style name",this._text(this._lampAppearancePresetDraft||"",v=>{this._lampAppearancePresetDraft=String(v||"").slice(0,60)},"e.g. Green retro"),"Stored in this card configuration. Maximum 24.",true));const presetActions=document.createElement("div");presetActions.className="presetActions full";const savePreset=document.createElement("button");savePreset.type="button";savePreset.textContent="Save as new";savePreset.disabled=!String(this._lampAppearancePresetDraft||"").trim()||lampPresets.length>=LAMP_APPEARANCE_PRESET_LIMIT;savePreset.onclick=()=>this._saveLampAppearancePreset();const applyPreset=document.createElement("button");applyPreset.type="button";applyPreset.textContent="Apply";applyPreset.disabled=!this._selectedLampAppearancePresetObject();applyPreset.onclick=()=>this._applySelectedLampAppearancePreset();const updatePreset=document.createElement("button");updatePreset.type="button";updatePreset.textContent="Update";updatePreset.disabled=!this._selectedLampAppearancePresetObject();updatePreset.onclick=()=>this._updateSelectedLampAppearancePreset();const deletePreset=document.createElement("button");deletePreset.type="button";deletePreset.className="danger";deletePreset.textContent="Delete";deletePreset.disabled=!this._selectedLampAppearancePresetObject();deletePreset.onclick=()=>this._deleteSelectedLampAppearancePreset();presetActions.append(savePreset,applyPreset,updatePreset,deletePreset);if(this._bulkMode&&this._bulkExpandedSelection().size){const applyBulk=document.createElement("button");applyBulk.type="button";applyBulk.textContent=`Apply to ${this._bulkExpandedSelection().size} selected`;applyBulk.disabled=!this._selectedLampAppearancePresetObject();applyBulk.onclick=()=>this._bulkApplyLampPreset(this._selectedLampAppearancePreset);presetActions.append(applyBulk)}presetBox.append(presetActions);
      const behavior=normalizeColorBehavior(l.color_behavior);
      const behaviorOpts=[...COLOR_BEHAVIOR_OPTIONS];
      if(behavior==="legacy")behaviorOpts.push(["legacy","Legacy compatibility"]);
      body.append(this._field("Color behavior",this._select(behavior,behaviorOpts,v=>{this._setLampColorBehavior(v);this._renderEditor()}),behavior==="legacy"?"This lamp preserves v1.x color precedence. Choose another mode when you are ready to simplify it.":"Standard uses global ON/OFF. Severity uses Status/Warning/Alarm/Trip while ON. Custom gives this lamp its own ON/OFF colors.",true));
      if(behavior==="legacy"){const badge=document.createElement("div");badge.className="schemaBadge";badge.textContent="Legacy color compatibility is active";body.append(this._field("Compatibility",badge,"Existing ON Window / severity precedence is preserved until you choose Standard, Severity or Custom.",true))}
      if(behavior==="severity"||behavior==="legacy") body.append(this._field("Severity",this._select(l.severity||"status",SEVERITY_OPTIONS,v=>this._updateLamp({severity:v})),"Controls the active color in Severity mode.",false));
      if(behavior==="custom"){
        const colors=this._disclosure(body,"lampAppearance.colors","Colors","Only this lamp uses these ON/OFF and text colors.",true);
        const c=ensureObj(l.colors,{});
        [["ON color","on"],["OFF color","off"],["ON text","on_text"],["OFF text","text"],["Unavailable","unavailable"],["Unavailable text","unavailable_text"]].forEach(([lab,key])=>colors.append(this._color(lab,c[key]||"",v=>this._updateLampNested("colors",{[key]:v}))));
        this._appendContrastWarnings(colors,lampContrastWarnings(l,this._config));
      }
      const geometry=this._disclosure(body,"lampAppearance.geometry","Shape & size","Geometry and multi-cell sizing. These remain inherited unless explicitly changed.",true);
      const shapeValue=normalizeShape(l.shape),shapeSelect=this._select(shapeValue,LAMP_SHAPE_OPTIONS,v=>this._updateLamp({shape:v}));geometry.append(this._field("Lamp shape",this._withInheritedReset(shapeSelect,shapeValue!=="inherit",()=>this._resetLampOverride({shape:"inherit"},"Lamp shape reset to panel default")),"The visible bezel, lens, icon, and text follow the selected geometry. Circle and Square use the full short side; Indicator dot uses about 80% so compact content remains readable. State, ACK, and actions are unchanged.",true));
      geometry.append(this._field("Column span",this._number(normalizeSpan(l.column_span),v=>this._updateLamp({column_span:normalizeSpan(v)}),1,24,1),"Occupies multiple grid columns. Placement advances to the next collision-free position.",false));geometry.append(this._field("Row span",this._number(normalizeSpan(l.row_span),v=>this._updateLamp({row_span:normalizeSpan(v)}),1,24,1),"Occupies multiple grid rows. Paired halves share the larger span safely.",false));
      const optics=this._disclosure(body,"lampAppearance.optics","Lens & light","Material, modern/retro styling, dimming, and translucent illumination.",false);
      const translucent=document.createElement("div");translucent.className="switchLine";translucent.append(this._switch(l.translucent_illumination===true,v=>this._updateLamp({translucent_illumination:v})),document.createTextNode("Translucent illuminated lens"));
      optics.append(this._field("Illumination",translucent,"Adds controlled glow and lens transmission while ON.",true));
      const styleValue=l.lamp_style||"inherit",styleCtl=this._select(styleValue,[["inherit","Panel default"],["modern","Modern"],["retro","Retro"]],v=>this._updateLamp({lamp_style:v}));const styleLocked=this._config.allow_lamp_style_override===false;if(styleLocked){styleCtl.style.pointerEvents="none";styleCtl.style.opacity=".5";styleCtl.setAttribute("aria-disabled","true")}optics.append(this._field("Lamp style",this._withInheritedReset(styleCtl,styleValue!=="inherit",()=>this._resetLampOverride({lamp_style:"inherit"},"Lamp style reset to panel default")),styleLocked?"Locked to Panel settings → Appearance default.":"",false));
      const lensValue=l.lens_type||"inherit",lensCtl=this._select(lensValue,[["inherit","Panel default"],["plastic","Plastic"],["glass","Glass"],["frosted","Frosted"],["smoked","Smoked"]],v=>this._updateLamp({lens_type:v}));const lensLocked=this._config.allow_lens_override===false;if(lensLocked){lensCtl.style.pointerEvents="none";lensCtl.style.opacity=".5";lensCtl.setAttribute("aria-disabled","true")}optics.append(this._field("Lens material",this._withInheritedReset(lensCtl,lensValue!=="inherit",()=>this._resetLampOverride({lens_type:"inherit"},"Lamp lens reset to panel default")),lensLocked?"Locked to Panel settings → Appearance default.":"Changes material/finish only; it does not change ON/OFF logic or severity.",false));
      this._appendBrightnessEditor(optics,l,false);
      const pairing=this._disclosure(body,"lampAppearance.pairing","Pairing","Create or edit a paired lamp only when needed.",String(l.pair_mode||"none")!=="none");
      pairing.append(this._field("Pair with lamp",this._pairSelector(l),"Paired halves are managed as one physical panel cell and kept adjacent automatically.",true));
      if(String(l.pair_mode||"none")!=="none"){pairing.append(this._field("Pair orientation",this._select(l.pair_orientation||"vertical",[["vertical","Vertical (top / bottom)"],["horizontal","Horizontal (left / right)"]],v=>{const pid=String(l.pair_id||"");const arr=(this._config.entities||[]).map(x=>String(x.pair_id||"")===pid?{...x,pair_orientation:v}:x);this._config={...this._config,entities:arr};this._dispatch(true);this._renderAll()}),"Old TOP/BOTTOM pair metadata remains valid; horizontal orientation displays those halves left/right.",true));pairing.append(this._field("Pair shape",this._select(normalizePairShapeMode(l.pair_shape_mode),[["independent","Independent lamps"],["split_pill","Split pill"]],v=>{const pid=String(l.pair_id||"");const arr=(this._config.entities||[]).map(x=>String(x.pair_id||"")===pid?{...x,pair_shape_mode:normalizePairShapeMode(v)}:x);this._config={...this._config,entities:arr};this._dispatch(true);this._renderAll()}),"Split pill gives the pair one continuous capsule bezel with a center divider. Each half keeps independent state, color, text, icon, ACK, alarm, and actions. Individual Lamp shape settings are preserved and return when Independent lamps is selected.",true));pairing.append(this._field("This half",this._select(l.pair_mode,[["top","Top / left"],["bottom","Bottom / right"]],v=>this._setPairPosition(l.uid,v)),"Changing one half automatically swaps its partner.",false));}
    }

    _breakPairForUid(uid,dispatch=true){
      const arr=(this._config.entities||[]).map((x)=>normalizeLamp(x));const idx=arr.findIndex((x)=>x.uid===uid);if(idx<0)return;const lamp=arr[idx],pid=String(lamp.pair_id||"");if(pid){arr.forEach((x,i)=>{if(String(x.pair_id||"")===pid)arr[i]={...x,pair_id:"",pair_mode:"none",pair_shape_mode:"independent"}})}else arr[idx]={...lamp,pair_id:"",pair_mode:"none",pair_shape_mode:"independent"};this._config={...this._config,entities:arr};if(dispatch)this._dispatch(true)
    }
    _setPairPosition(uid,pos){const lamp=(this._config.entities||[]).map(normalizeLamp).find((x)=>x.uid===uid);const partner=this._findPairPartner(lamp);if(!lamp||!partner)return;this._pushUndo("Pair position changed");let arr=(this._config.entities||[]).map((x)=>normalizeLamp(x));arr=arr.map((x)=>x.uid===uid?{...x,pair_mode:pos}:x.uid===partner.uid?{...x,pair_mode:pos==="top"?"bottom":"top"}:x);arr=canonicalizePairOrdering(arr);this._config={...this._config,entities:arr};this._selectedLamp=arr.findIndex((x)=>x.uid===uid);this._dispatch(true);this._renderAll()}
    _pairSelector(l){
      const current=this._findPairPartner(l);const opts=[{value:"",label:"None"},...(this._config.entities||[]).map((x)=>normalizeLamp(x)).filter((x)=>isOperationalLamp(x)&&x.uid!==l.uid).map((x)=>({value:x.uid,label:x.name_override||x.primary_text||x.entity||"Derived lamp"}))];
      return this._select(current?.uid||"",opts,(uid)=>{const selectedUid=l.uid;this._pushUndo(uid?"Pair relationship changed":"Pair removed");let arr=(this._config.entities||[]).map((x)=>normalizeLamp(x));const clearPair=(targetUid)=>{const t=arr.find((x)=>x.uid===targetUid);const pid=String(t?.pair_id||"");if(pid)arr=arr.map((x)=>String(x.pair_id||"")===pid?{...x,pair_id:"",pair_mode:"none",pair_shape_mode:"independent"}:x)};clearPair(selectedUid);if(!uid){arr=canonicalizePairOrdering(arr);this._config={...this._config,entities:arr};this._selectedLamp=arr.findIndex((x)=>x.uid===selectedUid);this._dispatch(true);this._renderAll();return}clearPair(uid);const selected=arr.find((x)=>x.uid===selectedUid),partner=arr.find((x)=>x.uid===uid);if(!selected||!partner)return;const pid=`pair_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;const pos=(l.pair_mode&&l.pair_mode!=="none")?l.pair_mode:"top";const commonGroup=String(selected.group||partner.group||"");arr=arr.map((x)=>x.uid===selectedUid?{...x,pair_id:pid,pair_mode:pos,pair_shape_mode:"independent",group:commonGroup}:x.uid===uid?{...x,pair_id:pid,pair_mode:pos==="top"?"bottom":"top",pair_shape_mode:"independent",group:commonGroup}:x);arr=canonicalizePairOrdering(arr);this._config={...this._config,entities:arr};this._selectedLamp=arr.findIndex((x)=>x.uid===selectedUid);this._dispatch(true);this._renderAll()})
    }
    _findPairPartner(l){const all=(this._config.entities||[]).map(normalizeLamp);const id=String(l?.pair_id||"");if(!id||!validPairIdsFor(all).has(id))return null;return all.find(x=>x.uid!==l.uid&&x.pair_id===id&&x.pair_mode!=="none")||null}
    _patchLampByUid(uid,patch,dispatch=true){const arr=(this._config.entities||[]).map(x=>{const l=normalizeLamp(x);return l.uid===uid?{...l,...patch}:l});this._config={...this._config,entities:arr};if(dispatch)this._dispatch()}

    _interactionActionOptions(){return [["more_info","More info"],["toggle","Toggle entity"],["turn_on","Turn on"],["turn_off","Turn off"],["ack","Acknowledge"],["clear_ack","Clear ACK"],["perform_action","Perform action / service"],["navigate","Navigate"],["url","Open URL"],["none","None"]]}
    _interactionEditor(body,l,prefix,label,tip){
      const fallback=prefix==="tap"?"more_info":"ack";
      const action=normalizeInteractionAction(l[`${prefix}_action`],fallback);
      const derived=isDerivedLamp(l);body.append(this._field(label,this._select(action,this._interactionActionOptions(),v=>{const patch={[`${prefix}_action`]:v};if(derived&&interactionNeedsEntity(v))patch[`${prefix}_target`]="entity";this._updateLamp(patch);this._renderEditor()}),tip,true));
      if(interactionNeedsEntity(action)){
        const target=derived?"entity":(String(l[`${prefix}_target`]||"self")==="entity"?"entity":"self");
        body.append(this._field(`${label} target`,this._select(target,derived?[["entity","Another entity"]]:[["self","This lamp entity"],["entity","Another entity"]],v=>{this._updateLamp({[`${prefix}_target`]:v});this._renderEditor()}),derived?"Derived lamps have no primary entity, so entity actions require an explicit target.":"More info and control actions can operate a different entity than the one displayed by this lamp.",false));
        if(target==="entity") body.append(this._field(`${label} entity`,this._entity(l[`${prefix}_entity`]||"",v=>this._updateLamp({[`${prefix}_target`]:"entity",[`${prefix}_entity`]:v})),"Required when Another entity is selected. Leaving it blank is a safe no-op.",true));
      }
      if(action==="perform_action")body.append(this._field(`${label} service`,this._text(l[`${prefix}_service`]||"",v=>this._updateLamp({[`${prefix}_service`]:v}),"light.toggle"),"Use domain.service. Optional service data remains available in YAML.",true));
      if(action==="navigate")body.append(this._field(`${label} path`,this._text(l[`${prefix}_navigation_path`]||"",v=>this._updateLamp({[`${prefix}_navigation_path`]:v}),"/lovelace/alarms"),"Home Assistant navigation path.",true));
      if(action==="url")body.append(this._field(`${label} URL`,this._text(l[`${prefix}_url`]||"",v=>this._updateLamp({[`${prefix}_url`]:v}),"https://example.com"),"Opens in a new tab.",true));
    }
    _pageInteraction(body,l){
      body.append(this._heading("Interaction","Choose exactly what each gesture does. Gesture arbitration ensures one physical gesture executes one action."));
      this._interactionEditor(body,l,"tap","Tap / short press","Default: More info. Tap waits briefly so a double tap cannot accidentally execute both actions.");
      this._interactionEditor(body,l,"double_tap","Double tap","Default: Acknowledge.");
      this._interactionEditor(body,l,"hold","Long press","Default: Acknowledge. Works with touch, pen, and primary mouse press.");
      const badge=document.createElement("div");badge.className="schemaBadge";badge.textContent="Keyboard: Enter = Tap · Space = Double tap · Shift+Space = Long press";body.append(this._field("Keyboard",badge,"With default actions, Space continues to ACK as before.",true));
    }

    _ruleTrace(l){
      const states=this._hass?.states||{},stateObj=lampStateObject(l,states),rawState=stateObj?.state??"unavailable";
      const valueNum=applyValueTransform(toNumber(rawState),l.value_format);
      const rules=l.enable_auto_styles?traceAutoStyles(l,rawState,valueNum,states):{winner:-1,trace:[],style:null};
      const resolved=evaluateLampState(l,stateObj,{acked:false,changeActive:false,changeAcked:false,states});
      return {rawState,valueNum,rules,resolved};
    }
    _renderRuleTrace(body,l){
      const details=document.createElement("details");details.className="full summaryBox";details.open=this._editorDisclosureState["lampRules.trace"]===true;
      const summary=document.createElement("summary");summary.textContent="Live rule trace";details.append(summary);
      details.addEventListener("toggle",()=>{this._editorDisclosureState["lampRules.trace"]=details.open});
      const trace=this._ruleTrace(l),status=document.createElement("div");status.className="hint";
      const numeric=Number.isFinite(trace.valueNum)?` · numeric ${trace.valueNum}`:"";
      status.textContent=`Base state: ${trace.rawState}${numeric} · final ${trace.resolved.isOn?"ON":"OFF"} · ${String(trace.resolved.severity||"status").toUpperCase()} · ${String(trace.resolved.alert?.effect||"none").toUpperCase()}`;
      details.append(status);
      const winner=document.createElement("div");winner.className="schemaBadge";
      winner.textContent=!l.enable_auto_styles?"Conditional rules are disabled.":trace.rules.winner<0?"No rule matched; base behavior is used.":`Winner: ${this._ruleSummary(trace.rules.trace[trace.rules.winner].rule,trace.rules.winner)}`;
      details.append(winner);
      trace.rules.trace.forEach((entry)=>{const row=document.createElement("div");row.className="hint";const name=String(entry.rule?.name||`Rule ${entry.index+1}`);row.textContent=`${entry.index+1}. ${name}: ${entry.reason}${entry.source&&entry.source!=="this lamp"?` · ${entry.source} = ${entry.sourceRawState}`:""}`;details.append(row)});
      const note=document.createElement("div");note.className="hint";note.textContent="This preview evaluates current entity states and rule priority. ACK, Lamp Test, and temporary change-alert timers are intentionally not simulated.";details.append(note);
      const refresh=document.createElement("button");refresh.type="button";refresh.textContent="Refresh trace";refresh.onclick=()=>this._renderEditor();details.append(refresh);
      body.append(details);
    }

    _pageRules(body,l){
      const derived=isDerivedLamp(l);body.append(this._heading("Conditional rules",derived?"First matching rule wins. For a Derived lamp, select a Home Assistant source entity and normally use Force ON or Force OFF.":"First matching rule wins. Reorder rules to make priority explicit."));const sw=document.createElement("div");sw.className="switchLine";sw.append(this._switch(!!l.enable_auto_styles,v=>{this._updateLamp({enable_auto_styles:v});this._renderEditor()}),document.createTextNode("Enable conditional rules"));body.append(this._field("Rules",sw,"",true));this._renderRuleTrace(body,l);if(!l.enable_auto_styles)return;
      const rules=Array.isArray(l.auto_styles)?l.auto_styles:[];const add=document.createElement("button");add.textContent="+ Add rule";add.onclick=()=>{this._pushUndo("Conditional rule added");const next=derived?{enabled:true,name:"Active",source:"entity",source_entity:"",kind:"state",state:"on",force_state:"on"}:{enabled:true,kind:"numeric",rule:{type:"above",a:0,b:0,inclusive:true}};this._updateLamp({auto_styles:[...rules,next]},true);this._renderEditor()};body.append(this._field("",add,derived?"Starter rule: Another entity equals on → Force ON. Select its source entity after adding it.":"",true));
      rules.forEach((r,ri)=>{const box=document.createElement("details");box.className="rule full";box.open=true;const summary=document.createElement("summary");summary.textContent=this._ruleSummary(r,ri);box.append(summary);const bodyWrap=document.createElement("div");bodyWrap.className="ruleBody";const acts=document.createElement("div");acts.className="ruleActions";[["↑","Move rule up",()=>this._ruleMove(ri,-1),ri<=0],["↓","Move rule down",()=>this._ruleMove(ri,1),ri>=rules.length-1],["⧉","Duplicate rule",()=>this._ruleDuplicate(ri),false],["Delete","Delete rule",()=>this._ruleDelete(ri),false]].forEach(([txt,title,fn,disabled])=>{const b=document.createElement("button");b.type="button";b.textContent=txt;b.title=title;b.disabled=disabled;if(txt==="Delete")b.className="danger";b.onclick=(e)=>{e.preventDefault();fn()};acts.append(b)});bodyWrap.append(acts);const g=document.createElement("div");g.className="grid";bodyWrap.append(g);
        g.append(this._field("Rule name",this._text(r.name||"",v=>this._rulePatch(ri,{name:v}),"Optional name"),"Shown in diagnostics.",true));
        const ruleEnabled=document.createElement("div");ruleEnabled.className="switchLine";ruleEnabled.append(this._switch(r.enabled!==false,v=>{this._rulePatch(ri,{enabled:v});this._renderEditor()}),document.createTextNode("Rule enabled"));g.append(this._field("Enabled",ruleEnabled,"Disabled rules remain configured but are skipped by evaluation.",true));
        const sourceEntity=autoRuleSourceEntity(r);const sourceMode=(String(r.source||"").toLowerCase()==="entity"||sourceEntity)?"entity":"self";
        g.append(this._field("Rule source",this._select(sourceMode,[["self",derived?"Derived base state":"This lamp entity"],["entity","Another entity"]],v=>{this._rulePatch(ri,{source:v,source_entity:v==="self"?"":sourceEntity});this._renderEditor()}),derived?"Another entity is the normal choice. Base state evaluates the internal ON/OFF fallback selected in Setup.":"Rules can evaluate this lamp or any other Home Assistant entity.",true));
        if(sourceMode==="entity")g.append(this._field("Source entity",this._entity(sourceEntity,v=>this._rulePatch(ri,{source:"entity",source_entity:v})),"State/numeric value used only for this rule. Numeric cross-entity rules use the source entity's raw numeric state.",true));
        g.append(this._field("When",this._select(r.kind||"numeric",[["numeric","Numeric threshold"],["state","State equals"],["string","String match"]],v=>{this._rulePatch(ri,{kind:v});this._renderEditor()}),"",true));
        if((r.kind||"numeric")==="numeric"){const rr=ensureObj(r.rule,{type:"above",a:0,b:0,inclusive:true});g.append(this._field("Comparison",this._select(rr.type||"above",[["above","Above"],["below","Below"],["between","Between"],["equal","Equal"]],v=>{this._ruleNested(ri,{type:v});this._renderEditor()}),"",false));g.append(this._field("Threshold",this._number(rr.a??0,v=>this._ruleNested(ri,{a:clampNum(v,0)})),"",false));if(rr.type==="between")g.append(this._field("Upper threshold",this._number(rr.b??0,v=>this._ruleNested(ri,{b:clampNum(v,0)})),"",false));if((rr.type||"above")!=="equal"){const inc=document.createElement("div");inc.className="switchLine";inc.append(this._switch(rr.inclusive!==false,v=>this._ruleNested(ri,{inclusive:v})),document.createTextNode("Include boundary"));g.append(this._field("Boundary",inc,"Controls ≥/≤ versus >/< behavior.",true))}}
        if(r.kind==="state")g.append(this._field("State equals",this._text(r.state||"",v=>this._rulePatch(ri,{state:v}),"on"),"",true));if(r.kind==="string"){g.append(this._field("Match",this._select(r.match||"contains",[["contains","Contains"],["equals","Equals"],["starts_with","Starts with"],["ends_with","Ends with"]],v=>this._rulePatch(ri,{match:v})),"",false));g.append(this._field("Text",this._text(r.value||"",v=>this._rulePatch(ri,{value:v}),"FAULT"),"",false))}
        g.append(this._field("Then severity",this._select(r.severity||"",[["","Inherit"],["status","Status"],["warn","Warning"],["alarm","Alarm"],["trip","Trip"]],v=>this._rulePatch(ri,{severity:v})),"Severity changes the lamp color only when its Color behavior is Severity or Legacy. Use ON color below for a direct rule color override.",false));g.append(this._field("Then alert",this._select(typeof r.alert==="string"?r.alert:"inherit",[["inherit","Inherit"],["off","Off"],["blink","Blink"],["pulse","Pulse"],["wave","Wave"],["throb","Throb"],["heartbeat","Heartbeat"],["flash","Flash"]],v=>this._rulePatch(ri,{alert:v==="inherit"?undefined:v,blink:undefined,pulse:undefined})),"",false));
        const forceState=autoRuleForceState(r);
        g.append(this._field("Lamp state",this._select(forceState,[["inherit","Inherit"],["on","Force ON"],["off","Force OFF"]],v=>this._rulePatch(ri,{force_state:v==="inherit"?undefined:v,force_on:undefined,force_off:undefined})),"Applied after the lamp's normal condition/invert/Always ON. Lamp Test still has final authority.",true));
        g.append(this._color("ON color",r.color||r.on_color||"",v=>this._rulePatch(ri,{color:v,on_color:undefined})));box.append(bodyWrap);body.append(box)
      })
    }
    _ruleSummary(r,i){const kind=r.kind||"numeric";let when=kind;if(kind==="numeric"){const rr=ensureObj(r.rule,{}),inc=rr.inclusive!==false;when=rr.type==="above"?`${inc?"≥":">"} ${rr.a??0}`:rr.type==="below"?`${inc?"≤":"<"} ${rr.a??0}`:rr.type==="between"?`${inc?"between incl.":"between"} ${rr.a??0}–${rr.b??0}`:`= ${rr.a??0}`}if(kind==="state")when=`state = ${r.state||""}`;if(kind==="string")when=`${r.match||"contains"} ${r.value||""}`;const source=autoRuleSourceEntity(r);const sourceMode=String(r.source||"").toLowerCase();if(source)when=`${source}: ${when}`;else if(sourceMode==="entity")when=`[select source entity]: ${when}`;const forced=autoRuleForceState(r);const then=[r.severity&&`severity ${r.severity}`,forced==="on"&&"force ON",forced==="off"&&"force OFF",r.alert&&`alert ${r.alert}`,(r.color||r.on_color)&&"custom color"].filter(Boolean).join(" · ")||"inherit appearance";return `${r.name||`Rule ${i+1}`}: ${when} → ${then}`}
    _rulePatch(i,patch){const rules=[...(this._lamp().auto_styles||[])];rules[i]={...ensureObj(rules[i],{}),...patch};this._updateLamp({auto_styles:rules})}
    _ruleNested(i,patch){const rules=[...(this._lamp().auto_styles||[])];const r=ensureObj(rules[i],{});rules[i]={...r,rule:{...ensureObj(r.rule,{}),...patch}};this._updateLamp({auto_styles:rules})}
    _ruleMove(i,delta){const rules=[...(this._lamp().auto_styles||[])],to=i+delta;if(to<0||to>=rules.length)return;this._pushUndo("Conditional rule moved");[rules[i],rules[to]]=[rules[to],rules[i]];this._updateLamp({auto_styles:rules},true);this._renderEditor()}
    _ruleDuplicate(i){const rules=[...(this._lamp().auto_styles||[])];this._pushUndo("Conditional rule duplicated");const cp=JSON.parse(JSON.stringify(rules[i]||{}));if(cp.name)cp.name=`${cp.name} Copy`;rules.splice(i+1,0,cp);this._updateLamp({auto_styles:rules},true);this._renderEditor()}
    _ruleDelete(i){this._pushUndo("Conditional rule deleted");const rules=(this._lamp().auto_styles||[]).filter((_,x)=>x!==i);this._updateLamp({auto_styles:rules},true);this._renderEditor()}

    _pageAdvanced(body,l){
      body.append(this._heading("Advanced","Rare controls, diagnostics and maintenance options."));const always=document.createElement("div");always.className="switchLine";always.append(this._switch(!!l.always_on,v=>{this._updateLamp({always_on:v});this._renderList()}),document.createTextNode("Always ON"));body.append(this._field("Always ON",always,"Overrides the normal condition; useful for sensor windows.",true));const inv=document.createElement("div");inv.className="switchLine";inv.append(this._switch(!!l.invert,v=>this._updateLamp({invert:v})),document.createTextNode("Invert ON/OFF result"));body.append(this._field("Invert",inv,"Applied after condition evaluation.",true));body.append(this._field("Maintainer note",this._text(l.note||"",v=>this._updateLamp({note:v}),"Optional note"),"Never displayed on the panel.",true));
      const model=buildLampModel(l);const dbg=document.createElement("div");dbg.className="summaryBox full";dbg.textContent=`Schema v${CONFIG_VERSION} · Card ${CARD_VERSION} · UID: ${model.uid} · ACK slot: ${l.ack_slot || "-"} · Type: ${inferLampType(l)} · Rearm: ${l.ack_rearm || "manual"} (${resolveAckRearm(l,this._config)} effective) · Condition: ${JSON.stringify(model.condition)}`;body.append(dbg);
      const copy=document.createElement("button");copy.textContent="Copy lamp config JSON";copy.onclick=()=>this._copyText(JSON.stringify(stripInternalKeys(l),null,2),copy,"Copy lamp config JSON");body.append(this._field("Lamp config",copy,"Useful for support or manual YAML work.",true));
      const pkg=document.createElement("button");pkg.textContent="Copy diagnostic package";pkg.onclick=()=>{const state=lampStateObject(l,this._hass?.states||{});const resolved=evaluateLampState(l,state,{acked:false,changeActive:false,changeAcked:false,states:this._hass?.states||{}});const diagnostic={card_version:CARD_VERSION,config_version:CONFIG_VERSION,panel:{panel_id:this._config.panel_id,panel_mode:this._config.panel_mode,panel_sizing:this._config.panel_sizing,columns:this._config.columns},lamp:stripInternalKeys(l),state,resolved:{available:resolved.available,rawState:resolved.rawState,rawValueNum:resolved.rawValueNum,valueNum:resolved.valueNum,isOn:resolved.isOn,severity:resolved.severity,alert:resolved.alert,display:resolved.display}};this._copyText(JSON.stringify(diagnostic,null,2),pkg,"Copy diagnostic package")};body.append(this._field("Support package",pkg,"Copies card version, panel context, lamp config, source/base state and resolved evaluation.",true));
    }
    async _copyText(text,button,label){try{await navigator.clipboard.writeText(text);button.textContent="Copied";setTimeout(()=>button.textContent=label,1000)}catch(_){window.prompt("Copy:",text)}}

    _applyLampType(type){const l=this._lamp();const behavior=normalizeColorBehavior(l.color_behavior);let patch={lamp_type:type};if(type==="alarm")patch={...patch,always_on:false,eval_mode:"toggle",color_behavior:behavior==="legacy"?"legacy":"severity",severity:l.severity==="status"?"alarm":l.severity,alert_style:resolveBaseAlertEffect(l)||"blink",blink:!resolveBaseAlertEffect(l)||resolveBaseAlertEffect(l)==="blink",ack_rearm:l.ack_rearm||"inherit",primary_mode:l.primary_mode||"name",secondary_mode:l.secondary_mode||"state"};if(type==="status")patch={...patch,always_on:false,eval_mode:"toggle",color_behavior:behavior==="legacy"?"legacy":"standard",severity:"status",alert_style:"none",blink:false,pulse:false};if(type==="sensor")patch={...patch,always_on:true,color_behavior:behavior==="legacy"?"legacy":"standard",severity:"status",alert_style:"none",blink:false,pulse:false,primary_mode:"name",secondary_mode:"state"};this._updateLamp(patch)}

    _renderPanel(){
      const host=this.shadowRoot.getElementById("panelBody");if(!host)return;this._finishNativeEditsBeforeRender();host.innerHTML="";
      const tabs=document.createElement("div");tabs.className="tabs panelTabs";
      PANEL_EDITOR_PAGE_SPECS.forEach(({key,label})=>{const b=document.createElement("button");b.className=`tab${this._panelPage===key?" active":""}`;b.textContent=label;b.onclick=()=>{this._panelPage=key;this._renderPanel()};tabs.append(b)});
      host.append(tabs);const g=document.createElement("div");g.className="grid";host.append(g);const c=this._config;

      if(this._panelPage==="layout"){
        g.append(this._heading("Panel layout","Set the card title, grid dimensions, spacing, and responsive sizing behavior."));
        g.append(this._field("Title",this._text(c.title||"",v=>this._set("title",v)),"",true));
        g.append(this._field("Grid height",this._select(c.row_mode||"auto",[["auto","Auto — fit configured cells"],["fixed","Minimum row count"]],v=>{this._set("row_mode",v);this._renderPanel()}),"Auto preserves the compact panel. Minimum rows reserves panel depth without hiding extra lamps.",true));
        g.append(this._field("Panel sizing",this._select(c.panel_sizing||"auto_fit",[["auto_fit","Auto fit — scale to card width"],["fixed","Fixed size — no scaling"],["scroll","Horizontal scroll"]],v=>this._set("panel_sizing",v)),"Auto fit preserves lamp proportions and scales down only when needed. Fixed size keeps configured pixel dimensions. Horizontal scroll keeps the full size available.",true));
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
        const panelLampFont=normalizeFontFamily(c.lamp_font_family),panelFontPreview=this._fontPreview(panelLampFont,c.lamp_font_custom||"",HEADER_FONT_STACKS.condensed);
        g.append(this._field(
          "Lamp font",
          this._select(panelLampFont,FONT_FAMILY_OPTIONS.map(([value,label])=>[value,value==="inherit"?"Built-in default":label]),v=>{this._set("lamp_font_family",v);this._renderPanel()}),
          "Sets the panel default. Individual lamps can inherit or override it.",
          true
        ));
        if(panelLampFont==="custom")g.append(this._field(
          "Custom lamp font",
          this._text(c.lamp_font_custom||"",v=>{const clean=normalizeCustomFont(v);this._set("lamp_font_custom",clean);panelFontPreview.applyFont("custom",clean)},'"DIN Condensed", sans-serif'),
          "Enter an installed font name or CSS font stack. The browser must already have the font available.",
          true
        ));
        g.append(this._field("Font preview",panelFontPreview,"Theme/default and System can match by design. Condensed, Monospace, and Serif should be visibly distinct when available; hover for the resolved stack.",true));
      }

      if(this._panelPage==="appearance"){
        g.append(this._heading("Panel appearance","Common choices are grouped first. Open only the detailed section you need; each section remembers whether it was open."));
        const pa=normalizePanelAppearance(c.panel_appearance),ha=normalizeHeaderAppearance(c.header_appearance),spacer=normalizeSpacerAppearance(c.spacer_appearance,false),sev=ensureObj(c.severity_colors,{});
        const updatePanelAppearance=(patch,rerender=false)=>{this._set("panel_appearance",{...normalizePanelAppearance(this._config.panel_appearance),...patch});if(rerender)this._renderPanel()};
        const updateHeader=(patch,rerender=false)=>{this._set("header_appearance",{...normalizeHeaderAppearance(this._config.header_appearance),...patch});if(rerender)this._renderPanel()};
        const updateSpacer=(patch,rerender=false)=>{this._set("spacer_appearance",{...normalizeSpacerAppearance(this._config.spacer_appearance,false),...patch});if(rerender)this._renderPanel()};
        const addSwitch=(host,label,checked,onChange,tip="")=>{const line=document.createElement("div");line.className="switchLine";line.append(this._switch(checked,onChange),document.createTextNode(label));host.append(this._field(label,line,tip,true))};

        const presets=this._appearancePresets();let selectedPreset=presets.find((preset)=>preset.id===this._selectedAppearancePreset)||presets[0]||null;
        this._selectedAppearancePreset=selectedPreset?.id||"";
        if(this._appearancePresetDraftForId!==this._selectedAppearancePreset){this._appearancePresetDraft=selectedPreset?.name||"";this._appearancePresetDraftForId=this._selectedAppearancePreset}
        const presetFields=this._disclosure(g,"panelAppearance.presets",`Appearance presets${presets.length?` · ${presets.length} saved`:""}`,"Portable panel-wide looks. Lamp overrides, entities, behavior, and layout are untouched.",presets.length>0);
        if(presets.length){presetFields.append(this._field("Saved preset",this._select(this._selectedAppearancePreset,presets.map((preset)=>[preset.id,preset.name]),id=>{this._selectedAppearancePreset=id;const selected=presets.find((preset)=>preset.id===id);this._appearancePresetDraft=selected?.name||"";this._appearancePresetDraftForId=id;this._renderPanel()}),"Select a saved look to apply, rename, update, or delete.",true))}
        presetFields.append(this._field("Preset name",this._text(this._appearancePresetDraft,v=>{this._appearancePresetDraft=v},`Preset ${presets.length+1}`),`Stored in this card configuration. Maximum ${APPEARANCE_PRESET_LIMIT}.`,true));
        const presetActions=document.createElement("div");presetActions.className="presetActions full";
        const presetButton=(label,handler,disabled=false,danger=false)=>{const button=document.createElement("button");button.type="button";button.textContent=label;button.disabled=disabled;if(danger)button.classList.add("danger");button.onclick=handler;return button};
        presetActions.append(presetButton("Save as new",()=>this._saveAppearancePreset(),presets.length>=APPEARANCE_PRESET_LIMIT));
        if(selectedPreset)presetActions.append(presetButton("Apply",()=>this._applySelectedAppearancePreset()),presetButton("Update",()=>this._updateSelectedAppearancePreset()),presetButton("Delete",()=>this._deleteSelectedAppearancePreset(),false,true));
        presetFields.append(presetActions);

        const quick=this._disclosure(g,"panelAppearance.quick","Quick appearance","Themes and true None switches. None removes the visual layer rather than storing a transparent color.",true);
        quick.append(this._field("Panel theme",this._select(c.panel_theme||"classic",[["classic","Classic"],["avionics","Avionics"],["neon","Neon"]],v=>this._set("panel_theme",v)),"",false));
        quick.append(this._field("Default lamp style",this._select(c.default_lamp_style||"modern",[["modern","Modern"],["retro","Retro"]],v=>this._set("default_lamp_style",v)),"",false));
        quick.append(this._field("Default lens",this._select(c.default_lens_type||"plastic",[["plastic","Plastic"],["glass","Glass"],["frosted","Frosted"],["smoked","Smoked"]],v=>this._set("default_lens_type",v)),"",false));
        addSwitch(quick,"No panel background",pa.background_none,v=>updatePanelAppearance({background_none:v},true),"Makes the panel face transparent; the grid and lamps remain independently configurable.");
        addSwitch(quick,"No panel border",pa.border_none,v=>updatePanelAppearance({border_none:v},true),"Removes the outside edge and panel shadow.");
        addSwitch(quick,"No panel frame",pa.frame_none,v=>updatePanelAppearance({frame_none:v},true),"Removes the grid surround while retaining its spacing.");
        addSwitch(quick,"No lamp bezels",pa.lamp_frame_none,v=>updatePanelAppearance({lamp_frame_none:v},true),"Leaves the shaped lenses visible without rectangular or shaped bezels.");
        addSwitch(quick,"No lens borders",pa.lamp_border_none,v=>updatePanelAppearance({lamp_border_none:v},true),"Removes the line directly around every lamp lens.");
        addSwitch(quick,"No header background",ha.background_none,v=>updateHeader({background_none:v},true),"Makes the title, tallies, and controls float over the dashboard.");
        addSwitch(quick,"No header border",ha.border_none,v=>updateHeader({border_none:v},true),"Removes the border around the complete header.");
        addSwitch(quick,"No button backgrounds",ha.button_background_none,v=>updateHeader({button_background_none:v},true),"Keeps header control labels clickable with transparent normal and hover fills.");
        addSwitch(quick,"No button borders",ha.button_border_none,v=>updateHeader({button_border_none:v},true),"Removes the outline around every header control.");

        const surfaces=this._disclosure(g,"panelAppearance.surfaces","Panel & frames","Optional panel colors and the source used by lamp bezels.",false);
        const hiddenSurfaces=[[pa.background_none,"panel background"],[pa.border_none,"panel border"],[pa.frame_none,"panel frame"],[pa.lamp_frame_none,"lamp bezels"]].filter(([hidden])=>hidden).map(([,label])=>label);
        if(hiddenSurfaces.length){const notice=document.createElement("div");notice.className="summaryBox full";const message=document.createElement("div");message.textContent=hiddenSurfaces.length===4?"All panel and frame surfaces are disabled in Quick appearance.":`Disabled in Quick appearance: ${hiddenSurfaces.join(", ")}.`;const edit=document.createElement("button");edit.type="button";edit.textContent="Edit visibility";edit.style.marginTop="8px";edit.onclick=()=>{this._editorDisclosureState["panelAppearance.quick"]=true;this._editorDisclosureState["panelAppearance.surfaces"]=false;this._renderPanel()};notice.append(message,edit);surfaces.append(notice)}
        const panelColor=(host,label,key,tip)=>{const wrap=document.createElement("div");wrap.className="full";const line=document.createElement("div");line.className="switchLine";const phrase=label[0].toLowerCase()+label.slice(1);line.append(this._switch(pa[`${key}_enabled`]===true,v=>updatePanelAppearance({[`${key}_enabled`]:v},true)),document.createTextNode(`Override ${phrase}`));wrap.append(this._field(label,line,tip,true));if(pa[`${key}_enabled`]===true)wrap.append(this._color(`${label} color`,pa[key]||"",v=>updatePanelAppearance({[key]:v})));host.append(wrap)};
        const panelRadius=(host,label,enabledKey,valueKey,tip)=>{const wrap=document.createElement("div");wrap.className="full";const line=document.createElement("div");line.className="switchLine";line.append(this._switch(pa[enabledKey]===true,v=>updatePanelAppearance({[enabledKey]:v},true)),document.createTextNode(`Round ${label.toLowerCase()}`));wrap.append(this._field(label,line,tip,true));if(pa[enabledKey]===true)wrap.append(this._field(`${label} radius`,this._number(pa[valueKey]??12,v=>updatePanelAppearance({[valueKey]:Math.max(0,Math.min(120,clampNum(v,12)))}),0,120,1),"Pixels. 0 creates square corners.",true));host.append(wrap)};
        if(!pa.background_none)panelColor(surfaces,"Background","background","Panel face behind the grid.");
        if(!pa.border_none)panelColor(surfaces,"Border","border","Outer panel edge.");
        if(!pa.frame_none)panelColor(surfaces,"Outer frame","frame","Outer grid surround only.");
        if(!pa.background_none||!pa.border_none)panelRadius(surfaces,"Panel corners","radius_enabled","radius","Rounds the complete panel background and outside border together.");
        if(!pa.frame_none)panelRadius(surfaces,"Outer frame corners","frame_radius_enabled","frame_radius","Rounds the grid-surround surface independently.");
        if(!pa.lamp_frame_none){surfaces.append(this._field("Lamp frame source",this._select(pa.lamp_frame_mode||"follow_panel",[["follow_panel","Follow outer frame (compatibility)"],["theme","Theme / default bezel"],["custom","Custom lamp frame color"]],v=>{updatePanelAppearance({lamp_frame_mode:v},true)}),"Follow outer frame preserves prior saved behavior. Theme/default keeps lamp bezels independent; Custom applies one dedicated bezel color.",true));if(pa.lamp_frame_mode==="custom")surfaces.append(this._color("Lamp frame / bezel",pa.lamp_frame||"#1b1b1d",v=>updatePanelAppearance({lamp_frame:v})));surfaces.append(this._field("Lamp bezel corners",this._select(c.corner_style||"rounded",[["rounded","Rounded"],["sharp","Square"]],v=>{this._set("corner_style",v);this._renderPanel()}),"Applies to inherited and Round rectangle lamps. Explicit Rectangle, Pill, Square, Circle, and Indicator dot shapes retain their geometry.",true));if((c.corner_style||"rounded")==="rounded")surfaces.append(this._field("Lamp corner radius",this._number(c.corner_radius??12,v=>this._set("corner_radius",Math.max(0,Math.min(120,clampNum(v,12)))),0,120,1),"Pixels.",false))}

        const spacerFields=this._disclosure(g,"panelAppearance.spacers","Spacers","A panel default plus independent per-spacer inheritance, Blend, or Custom layers.",false);
        spacerFields.append(this._field("Spacer default",this._select(spacer.mode,[["default","Compatibility appearance"],["blend","Blend into panel (all surfaces off)"],["custom","Custom fill / frame / border"]],v=>updateSpacer({mode:v},true)),"Compatibility preserves existing rendering. Blend is a one-click transparent gap; Custom exposes independent None switches.",true));
        if(spacer.mode==="custom"){
          addSwitch(spacerFields,"No spacer fill",spacer.fill_none,v=>updateSpacer({fill_none:v},true));if(!spacer.fill_none)spacerFields.append(this._color("Spacer fill",spacer.fill||globalColorValue(c.severity_colors||{},"off",BUILTIN_COLORS.off),v=>updateSpacer({fill:v})));
          addSwitch(spacerFields,"No spacer frame / bezel",spacer.bezel_none,v=>updateSpacer({bezel_none:v},true));if(!spacer.bezel_none)spacerFields.append(this._color("Spacer frame / bezel",spacer.bezel||globalColorValue(c.severity_colors||{},"blank",BUILTIN_COLORS.blank),v=>updateSpacer({bezel:v})));
          addSwitch(spacerFields,"No spacer border",spacer.border_none,v=>updateSpacer({border_none:v},true));if(!spacer.border_none){spacerFields.append(this._color("Spacer border",spacer.border||"#000000",v=>updateSpacer({border:v})));spacerFields.append(this._field("Spacer border width",this._number(spacer.border_width??2,v=>updateSpacer({border_width:Math.max(0,Math.min(24,clampNum(v,2)))}),0,24,1),"Pixels.",true))}
        }

        const headerFields=this._disclosure(g,"panelAppearance.header","Header","Every override is optional. Title, tallies, and buttons can be styled independently without changing header behavior.",false);
        const headerColor=(label,key,tip)=>{const wrap=document.createElement("div");wrap.className="full";const line=document.createElement("div");line.className="switchLine";const phrase=label[0].toLowerCase()+label.slice(1);line.append(this._switch(ha[`${key}_enabled`]===true,v=>updateHeader({[`${key}_enabled`]:v},true)),document.createTextNode(`Override ${phrase}`));wrap.append(this._field(label,line,tip,true));if(ha[`${key}_enabled`]===true)wrap.append(this._color(`${label} color`,ha[key]||"",v=>updateHeader({[key]:v})));headerFields.append(wrap)};
        const headerNumber=(label,key,fallback,min,max,tip)=>{const wrap=document.createElement("div");wrap.className="full";const line=document.createElement("div");line.className="switchLine";const phrase=label[0].toLowerCase()+label.slice(1);line.append(this._switch(ha[`${key}_enabled`]===true,v=>updateHeader({[`${key}_enabled`]:v},true)),document.createTextNode(`Override ${phrase}`));wrap.append(this._field(label,line,tip,true));if(ha[`${key}_enabled`]===true)wrap.append(this._field(`${label} (px)`,this._number(ha[key]??fallback,v=>updateHeader({[key]:Math.max(min,Math.min(max,clampNum(v,fallback)))}),min,max,1),"",true));headerFields.append(wrap)};
        if(!ha.background_none)headerColor("Header background","background","Background behind the title, tallies, and controls.");if(!ha.border_none){headerColor("Header border","border","Border surrounding the complete header.");if(ha.border_enabled===true)headerFields.append(this._field("Header border width",this._number(ha.border_width??1,v=>updateHeader({border_width:Math.max(0,Math.min(12,clampNum(v,1)))}),0,12,1),"Pixels.",false))}
        headerColor("Title text","title_color","Font color for the panel title only.");headerColor("Tally text","tally_color","Font color for every live and historical tally.");headerColor("Button text","button_text","Font color for all five header controls.");
        if(!ha.button_background_none){headerColor("Button background","button_background","Normal button fill color.");headerColor("Button hover background","button_hover","Button fill while the pointer is over it.")}
        if(!ha.button_border_none){headerColor("Button border","button_border","Border color for all header controls.");if(ha.button_border_enabled===true)headerFields.append(this._field("Button border width",this._number(ha.button_border_width??1,v=>updateHeader({button_border_width:Math.max(0,Math.min(12,clampNum(v,1)))}),0,12,1),"Pixels.",false))}
        const headerFontPreview=this._fontPreview(ha.font_family||"inherit",ha.font_custom||"",(typeof window.getComputedStyle==="function"?window.getComputedStyle(this).fontFamily:"")||HEADER_FONT_STACKS.system);
        headerFields.append(this._field("Header font",this._select(ha.font_family||"inherit",[["inherit","Theme / default"],["condensed","Condensed sans-serif"],["system","System sans-serif"],["monospace","Monospace"],["serif","Serif"],["custom","Custom CSS font"]],v=>updateHeader({font_family:v},true)),"Applies to the title, tallies, toggle label, and buttons. Theme/default and System may intentionally resolve to the same face.",true));
        if(ha.font_family==="custom")headerFields.append(this._field("Custom header font",this._text(ha.font_custom||"",v=>{const clean=normalizeCustomFont(v);updateHeader({font_custom:clean});headerFontPreview.applyFont("custom",clean)}),'Enter an installed font name or CSS font stack, for example "DIN Condensed", sans-serif.',true));
        headerFields.append(this._field("Font preview",headerFontPreview,"This specimen uses the header's resolved font stack. Hover it to inspect the stack.",true));
        headerFields.append(this._field("Header font weight",this._select(ha.font_weight||"inherit",[["inherit","Component defaults"],["400","Regular"],["500","Medium"],["600","Semi-bold"],["700","Bold"],["800","Extra bold"],["900","Black"]],v=>updateHeader({font_weight:v})),"Optional shared weight.",true));
        headerNumber("Title font size","title_font_size",16,8,72,"Panel title size.");headerNumber("Tally font size","tally_font_size",12,8,48,"Counter label/value size, including mobile.");headerNumber("Button font size","button_font_size",12,8,48,"Header control label size.");headerNumber("Button corner radius","button_radius",8,0,40,"0 creates square corners.");
        if(!ha.background_none||!ha.border_none)headerNumber("Header corner radius","radius",12,0,80,"Rounds the complete header background and border. 0 creates square corners.");

        const optics=this._disclosure(g,"panelAppearance.optics","Lamp lighting","State-based brightness, per-lamp inheritance, lens realism, and Retro flicker.",false);
        this._appendBrightnessEditor(optics,null,false);
        const styleOverride=document.createElement("div");styleOverride.className="switchLine";styleOverride.append(this._switch(c.allow_lamp_style_override!==false,v=>this._set("allow_lamp_style_override",v)),document.createTextNode("Allow per-lamp style override"));optics.append(this._field("Lamp overrides",styleOverride,"",true));
        const lensOverride=document.createElement("div");lensOverride.className="switchLine";lensOverride.append(this._switch(c.allow_lens_override!==false,v=>this._set("allow_lens_override",v)),document.createTextNode("Allow per-lamp lens override"));optics.append(this._field("Lens overrides",lensOverride,"",true));
        const imp=document.createElement("div");imp.className="switchLine";imp.append(this._switch(c.imperfections!==false,v=>this._set("imperfections",v)),document.createTextNode("Stable lens imperfections"));optics.append(this._field("Lens realism",imp,"",false));
        const flick=document.createElement("div");flick.className="switchLine";flick.append(this._switch(!!c.flicker,v=>this._set("flicker",v)),document.createTextNode("Retro incandescent flicker"));optics.append(this._field("Flicker",flick,"Visible irregular brightness variation on active Retro lamps. An active alert effect temporarily takes visual priority; flicker resumes afterward. Modern and OFF lamps do not flicker, and reduced-motion preferences disable animation.",false));

        const standardColors=this._disclosure(g,"panelAppearance.standardColors","ON/OFF colors","The ordinary palette used by new lamps.",false);
        const enabled=document.createElement("div");enabled.className="switchLine";enabled.append(this._switch(sev.enabled!==false,v=>{this._setNested("severity_colors","enabled",v);this._renderPanel()}),document.createTextNode("Enable global color overrides"));standardColors.append(this._field("Global colors",enabled,"Individual choices are retained when the master switch is off.",true));
        const addGlobalColor=(host,label,key,fallback,tip="")=>{const wrap=document.createElement("div");wrap.className="full";const line=document.createElement("div");line.className="switchLine";line.append(this._switch(sev[`${key}_enabled`]!==false,v=>{this._setNested("severity_colors",`${key}_enabled`,v);this._renderPanel()}),document.createTextNode(`Override ${label}`));wrap.append(this._field(label,line,tip,false));if(sev[`${key}_enabled`]!==false)wrap.append(this._color(label,sev[key]||fallback,v=>this._setNested("severity_colors",key,v)));host.append(wrap)};
        addGlobalColor(standardColors,"ON / Active","on",BUILTIN_COLORS.on,"Normal ON color. Severity-mode lamps use their severity color instead.");addGlobalColor(standardColors,"OFF / Inactive","off",BUILTIN_COLORS.off,"Normal OFF color unless a Custom lamp overrides it.");addGlobalColor(standardColors,"Unavailable","unavailable",BUILTIN_COLORS.unavailable);

        const advancedColors=this._disclosure(g,"panelAppearance.advancedColors","Advanced colors","Severity/Legacy palettes, text colors, compatibility fallbacks, and material mapping.",false);
        [["STATUS","status",BUILTIN_COLORS.status],["WARN","warn",BUILTIN_COLORS.warn],["ALARM","alarm",BUILTIN_COLORS.alarm],["TRIP","trip",BUILTIN_COLORS.trip]].forEach(([lab,key,fallback])=>addGlobalColor(advancedColors,lab,key,fallback));
        addGlobalColor(advancedColors,"ON text","on_text",BUILTIN_COLORS.on_text);addGlobalColor(advancedColors,"OFF text","off_text",BUILTIN_COLORS.off_text);addGlobalColor(advancedColors,"Unavailable text","unavailable_text",BUILTIN_COLORS.unavailable_text);addGlobalColor(advancedColors,"Blank spacer","blank",BUILTIN_COLORS.blank);addGlobalColor(advancedColors,"Frame fallback","frame",BUILTIN_COLORS.frame);addGlobalColor(advancedColors,"Panel","panel",BUILTIN_COLORS.panel);
        const sevApp=ensureObj(c.severity_appearance,{});["trip","alarm","warn","status"].forEach((sevName)=>{const cur=ensureObj(sevApp[sevName],{});advancedColors.append(this._field(`${sevName.toUpperCase()} style`,this._select(cur.style||"",[["","Inherit panel"],["modern","Modern"],["retro","Retro"]],v=>this._set("severity_appearance",{...sevApp,[sevName]:{...cur,style:v}})),"Optional severity-based appearance.",false));advancedColors.append(this._field(`${sevName.toUpperCase()} lens`,this._select(cur.lens||"",[["","Inherit panel"],["plastic","Plastic"],["glass","Glass"],["frosted","Frosted"],["smoked","Smoked"]],v=>this._set("severity_appearance",{...sevApp,[sevName]:{...cur,lens:v}})),"",false))});
        this._appendContrastWarnings(g,configContrastWarnings(c));
      }

      if(this._panelPage==="acknowledgement"){
        g.append(this._heading("Acknowledgement and header","Configure ACK storage, optional header tallies and controls, and paired-lamp acknowledgement behavior."));
        g.append(this._field("Default ACK rearm",this._select(normalizeAckRearmDefault(c.ack_rearm_default),[["auto","Automatic — rearm when normal"],["manual","Manual — Clear acknowledged required"]],v=>this._set("ack_rearm_default",v)),"New lamps inherit this panel setting. Existing lamps keep their saved Manual or Automatic choice until changed to Use panel default.",true));
        g.append(this._field("ACK storage",this._select(c.ack_store?.type||"local",[["local","Local browser"],["input_text","Persistent input_text"]],v=>{this._set("ack_store",v==="input_text"?{type:"input_text",entity:c.ack_store?.entity||"input_text.annunciator_ack_map"}:{type:"local"});this._renderPanel()}),"",true));
        if(c.ack_store?.type==="input_text") g.append(this._field("ACK input_text",this._entity(c.ack_store?.entity||"",v=>this._set("ack_store",{type:"input_text",entity:v})),"Stores adaptive compact ACK state: dense bitsets or sparse base36 slots, whichever is shorter.",true));
        const hv3=normalizeHeaderV3(c),hc=hv3.controls,ht=hv3.tallies;g.append(this._heading("Live tallies","Each live counter is optional; no tally is added to an existing panel unless enabled."));LIVE_TALLY_SPECS.forEach(({key,label})=>{const line=document.createElement("div");line.className="switchLine";line.append(this._switch(ht[key]===true,v=>this._set("header_tallies",{...ht,[key]:v})),document.createTextNode(`Show ${label}`));g.append(this._field(label,line,"",false))});
        g.append(this._heading("Historical alarm tallies","Choose browser-local rolling observations or shared Home Assistant sensor values. Existing configurations remain Local browser."));
        g.append(this._field("Tally source",this._select(ht.history_source,[ ["local","Local browser"],["entities","Home Assistant entities"] ],v=>{this._set("header_tallies",{...normalizeHeaderV3(this._config).tallies,history_source:v});this._renderPanel()}),ht.history_source==="entities"?"Shared values come from sensors you maintain in Home Assistant. The card does not query Recorder or reconstruct past derived rules.":"Counts new Alarm/Trip activations observed while this browser has the card open, using rolling 24-hour, 7-day, 30-day, and 365-day windows.",true));
        HISTORICAL_TALLY_SPECS.forEach(({key,label,entityKey,window})=>{const wrap=document.createElement("div");wrap.className="full";const line=document.createElement("div");line.className="switchLine";line.append(this._switch(ht[key]===true,v=>{this._set("header_tallies",{...normalizeHeaderV3(this._config).tallies,[key]:v});this._renderPanel()}),document.createTextNode(`Show ${label}`));wrap.append(this._field(label,line,ht.history_source==="entities"?`Reads a nonnegative numeric value from a Home Assistant entity for the ${window} tally.`:"Counts each lamp once when it newly enters an active Alarm or Trip condition.",true));if(ht[key]===true){const labelKey=`${key}_label`;wrap.append(this._field("Custom label",this._text(ht[labelKey]||label,v=>this._set("header_tallies",{...normalizeHeaderV3(this._config).tallies,[labelKey]:normalizeHeaderTallyLabel(v,label)}),label),"Leave blank to restore the default label.",true));if(ht.history_source==="entities")wrap.append(this._field("Value entity",this._entity(ht[entityKey]||"",v=>this._set("header_tallies",{...normalizeHeaderV3(this._config).tallies,[entityKey]:normalizeEntityId(v)})),"Missing, unavailable, nonnumeric, or negative values display —.",true))}g.append(wrap)});
        if(ht.history_source!=="entities"){const clearHistory=document.createElement("button");clearHistory.type="button";clearHistory.textContent="Clear saved alarm totals";clearHistory.onclick=()=>{if(typeof window.confirm==="function"&&!window.confirm(`Clear saved alarm totals for panel '${String(this._config.panel_id||"annunciator_panel")}' in this browser?`))return;const panelId=String(this._config.panel_id||"annunciator_panel");try{localStorage.removeItem(alarmHistoryStorageKey(panelId))}catch(_){}window.dispatchEvent(new CustomEvent("annunciator-alarm-history-cleared",{detail:{panelId}}));clearHistory.textContent="Alarm totals cleared"};g.append(this._field("Reset alarm history",clearHistory,"Clears only these four local historical totals. It does not clear ACK state or change any entity.",true))}
        g.append(this._heading("Header controls","Controls always render in professional annunciator order. Labels may be customized independently."));HEADER_CONTROL_SPECS.forEach(({key,label,tip})=>{const current=ensureObj(hc[key],{enabled:false,label});const wrap=document.createElement("div");wrap.className="full";const line=document.createElement("div");line.className="switchLine";line.append(this._switch(current.enabled===true,v=>this._set("header_controls",{...hc,[key]:{...current,enabled:v}})),document.createTextNode(`Show ${label}`));wrap.append(this._field(`${label} button`,line,tip,true));if(current.enabled===true)wrap.append(this._field("Custom label",this._text(current.label||label,v=>this._set("header_controls",{...normalizeHeaderV3(this._config).controls,[key]:{...current,label:v||label}}),label),"Leave blank to restore the default label.",true));g.append(wrap)});
        const pair=document.createElement("div");pair.className="switchLine";pair.append(this._switch(!!c.pair_ack_lock,v=>this._set("pair_ack_lock",v)),document.createTextNode("Linked ACK for paired lamps"));g.append(this._field("Pair ACK lock",pair,"ACKing either half also ACKs its partner.",true));
      }

      if(this._panelPage==="groups"){
        g.append(this._heading("Group settings","Configure optional group headers, group acknowledgement scope, and group-header appearance."));
        const groupCounts=new Map();normalizeEntities(c.entities).filter(isOperationalLamp).forEach((lamp)=>{const name=String(lamp.group||"").trim();if(name)groupCounts.set(name,(groupCounts.get(name)||0)+1)});const groupSummary=document.createElement("div");groupSummary.className="summaryBox full";groupSummary.textContent=groupCounts.size?[...groupCounts.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([name,count])=>`${name} (${count})`).join(" · "):"No groups yet. In a lamp's Setup or Quick setup, select an existing group or type a new group name.";g.append(this._field("Existing groups",groupSummary,"Group names are case-sensitive. Paired lamps normally share one group.",true));
        const sh=document.createElement("div");sh.className="switchLine";sh.append(this._switch(!!c.show_group_headers,v=>{this._set("show_group_headers",v);this._renderPanel()}),document.createTextNode("Show group headers"));g.append(this._field("Group headers",sh,"",true));
        const ga=ensureObj(c.group_ack,{});const gh=ensureObj(c.group_header,{});
        g.append(this._field("Group ACK scope",this._select(ga.ack_scope||"all",[["all","All lamps"],["alerting","Alerting lamps only"]],v=>this._set("group_ack",{...ga,ack_scope:v})),"Alerting-only uses the same evaluator as the renderer.",false));
        const inc=document.createElement("div");inc.className="switchLine";inc.append(this._switch(ga.include_change!==false,v=>this._set("group_ack",{...ga,include_change:v})),document.createTextNode("Include change alerts"));g.append(this._field("Change ACK",inc,"",false));
        if(c.show_group_headers){
          const btn=document.createElement("div");btn.className="switchLine";btn.append(this._switch(gh.show_buttons!==false,v=>this._set("group_header",{...gh,show_buttons:v})),document.createTextNode("Show group ACK/Clear buttons"));g.append(this._field("Header buttons",btn,"",true));
          g.append(this._field("Button style",this._select(gh.button_mode||"icons",[["icons","Compact icons"],["text","Text buttons"]],v=>this._set("group_header",{...gh,button_mode:v})),"",false));
          const aa=document.createElement("div");aa.className="switchLine";aa.append(this._switch(!!gh.show_ack_alerts_button,v=>this._set("group_header",{...gh,show_ack_alerts_button:v})),document.createTextNode("Show ACK alerts button"));g.append(this._field("ACK alerts button",aa,"",false));
          g.append(this._color("Header background",gh.background||"#222222",v=>this._set("group_header",{...gh,background:v})));
          g.append(this._color("Header text color",gh.color||"#ffffff",v=>this._set("group_header",{...gh,color:v})));
          const div=document.createElement("div");div.className="switchLine";div.append(this._switch(!!gh.divider,v=>this._set("group_header",{...gh,divider:v})),document.createTextNode("Bottom divider"));g.append(this._field("Divider",div,"",false));
        }
      }
      if(this._panelPage==="alarm_output"){
        const output=normalizeAlarmOutput(c.alarm_output);g.append(this._heading("Alarm output","Output is opt-in and sounds only for participating, active, unacknowledged lamps. SILENCE stops the current output; a newly arriving alarm re-sounds it."));
        g.append(this._field("Mode",this._select(output.mode,[["none","None"],["media_player","Media player"],["script","Script"],["advanced_action","Advanced action"]],v=>{this._set("alarm_output",{...output,mode:v});this._renderPanel()}),"None is the migration default.",true));
        if(output.mode==="media_player"){
          g.append(this._field("Media player",this._entity(output.media_player,v=>{this._set("alarm_output",{...output,media_player:v});this._renderPanel()}),"Select the speaker or media player that should sound the alarm. The media browser can also supply it.",true));
          const chooseMedia=this._mediaSelector(output,(selected)=>{this._set("alarm_output",selected,true);this._renderPanel()});
          g.append(this._field("Home Assistant media browser",chooseMedia,"Choose an item from My media or another Home Assistant media source. The selected media ID, type, and display metadata are saved in the card configuration.",true));
          if(output.media_content_id){
            const selected=document.createElement("div");selected.className="mediaSelection full";
            const title=document.createElement("strong");title.textContent=String(output.media_metadata?.title||"Selected alarm media");
            const id=document.createElement("code");id.textContent=output.media_content_id;
            selected.append(title,id);g.append(selected);
          }
          const manual=document.createElement("details");manual.className="editorDisclosure full";
          const summary=document.createElement("summary");summary.textContent="Manual media settings";
          const fields=document.createElement("div");fields.className="editorDisclosureGrid";
          fields.append(this._field("Media content ID or URL",this._text(output.media_content_id,v=>this._set("alarm_output",{...output,media_content_id:v,media_metadata:{}}),"media-source://… or https://…"),"Use this fallback for a media-source URI or direct URL. Choosing media above fills this automatically.",true));
          fields.append(this._field("Media content type",this._text(output.media_content_type,v=>this._set("alarm_output",{...output,media_content_type:v}),"music"),"Most My media items provide this automatically.",true));
          manual.append(summary,fields);g.append(manual);
        }
        if(output.mode==="script"){
          g.append(this._field("Start script",this._entity(output.script,v=>this._set("alarm_output",{...output,script:v})),"Choose a script entity that starts the horn/output.",true));
          g.append(this._field("Silence script",this._entity(output.silence_script,v=>this._set("alarm_output",{...output,silence_script:v})),"Optional reversible script used by SILENCE and when the last alarm clears. The card does not use script.turn_off because that cannot undo devices a script already changed.",true));
          if(normalizeHeaderV3(c).controls.silence.enabled&&!output.silence_script&&!Object.keys(output.silence_action).length){const warning=document.createElement("div");warning.className="summaryBox full";warning.textContent="SILENCE is enabled, but Script mode has no Silence script. Add one if the started output must be actively stopped.";g.append(warning)}
        }
        if(output.mode==="advanced_action"){const a=ensureObj(output.action,{}),s=ensureObj(output.silence_action,{});g.append(this._field("Start service",this._text(a.service||a.action||"",v=>this._set("alarm_output",{...output,action:{...a,service:v}}),"siren.turn_on"),"Domain.service. Data may be supplied in YAML under alarm_output.action.data.",true));g.append(this._field("Silence service",this._text(s.service||s.action||"",v=>this._set("alarm_output",{...output,silence_action:{...s,service:v}}),"siren.turn_off"),"Optional corresponding stop action.",true))}
      }

      if(this._panelPage==="advanced"){
        g.append(this._heading("Advanced panel settings","Rare panel-wide controls for identity, testing, presentation mode, diagnostics, and Retro animation."));
        g.append(this._field("Panel ID",this._text(c.panel_id||"annunciator_panel",v=>this._set("panel_id",v)),"Namespace for ACK storage.",true));
        g.append(this._field("Lamp test entity",this._entity(c.lamp_test_entity||"",v=>{this._set("lamp_test_entity",v);this._renderPanel()}),"When ON, tests every non-spacer lamp, including lamps whose source entity is unavailable.",true));
        if(c.lamp_test_entity)g.append(this._field("Lamp test behavior",this._select(c.lamp_test_mode||"steady",[["steady","Illuminate only — steady ON"],["full","Full alert test — configured effect"]],v=>this._set("lamp_test_mode",v)),"Illuminate only suppresses alert animation. Full alert test ignores stored ACKs while testing.",true));
        const schema=document.createElement("div");schema.className="schemaBadge";schema.textContent=`Card ${CARD_VERSION} · Config schema v${CONFIG_VERSION} · Next ACK slot ${c.next_ack_slot||1}`;g.append(this._field("Build / schema",schema,"ACK slots are monotonic and never intentionally reused.",true));
        g.append(this._field("Unavailable text",this._text(c.unavailable_text||"INOP",v=>this._set("unavailable_text",v)),"Displayed for missing/unknown/unavailable entities.",false));
        g.append(this._field("Panel mode",this._select(c.panel_mode||"operator",[["operator","Operator (interactive)"],["presentation","Presentation (read-only)"]],v=>{this._set("panel_mode",v);this._renderPanel()}),"",false));
        if((c.panel_mode||"operator")==="presentation"){
          const mi=document.createElement("div");mi.className="switchLine";mi.append(this._switch(c.presentation_allow_more_info!==false,v=>this._set("presentation_allow_more_info",v)),document.createTextNode("Allow more info on tap"));g.append(this._field("Presentation interaction",mi,"ACK remains disabled.",true));
        }
        const hist=ensureObj(c.history_overlay,{});const hs=document.createElement("div");hs.className="switchLine";hs.append(this._switch(hist.enabled===true,v=>{this._set("history_overlay",{...hist,enabled:v});this._renderPanel()}),document.createTextNode("Lamp history/debug overlay"));g.append(this._field("Diagnostics overlay",hs,"",true));
        if(hist.enabled===true){const hi=document.createElement("div");hi.className="switchLine";hi.append(this._switch(hist.show_icon!==false,v=>this._set("history_overlay",{...hist,show_icon:v})),document.createTextNode("Show info icon on lamps"));g.append(this._field("Info icon",hi,"",true))}
        const warm=document.createElement("div");warm.className="switchLine";warm.append(this._switch(c.retro_warmup!==false,v=>this._set("retro_warmup",v)),document.createTextNode("Retro warm-up / cool-down"));g.append(this._field("Retro animation",warm,"",true));
      }
    }

    _addLamp(){this._pushUndo("Lamp added");const arr=[...(this._config.entities||[]),createNewLamp({uid:makeLampUid(),ackSlot:this._allocateAckSlot()})];this._config={...this._config,entities:arr};this._selectedLamp=arr.length-1;this._editorMode="basic";this._page="basic";this._navFollowSelection=true;this._dispatch(true);this._renderAll()}
    _addDerivedLamp(){this._pushUndo("Derived lamp added");const arr=[...(this._config.entities||[]),createNewLamp({uid:makeLampUid(),ackSlot:this._allocateAckSlot(),kind:"derived"})];this._config={...this._config,entities:arr};this._selectedLamp=arr.length-1;this._editorMode="basic";this._page="basic";this._navFollowSelection=true;this._dispatch(true);this._renderAll()}
    _addPairedLamp(){this._pushUndo("Paired lamp added");const firstSlot=this._allocateAckSlot(),secondSlot=this._allocateAckSlot(),pairId=`pair_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;const [top,bottom]=createNewPairMembers({topUid:makeLampUid(),bottomUid:makeLampUid(),topAckSlot:firstSlot,bottomAckSlot:secondSlot,pairId,orientation:"vertical"});const arr=canonicalizePairOrdering([...(this._config.entities||[]),top,bottom]);this._config={...this._config,entities:arr};this._selectedLamp=arr.findIndex((x)=>x.uid===top.uid);this._editorMode="basic";this._page="basic";this._navFollowSelection=true;this._dispatch(true);this._renderAll()}
    _addSpacer(){this._pushUndo("Spacer added");const arr=[...(this._config.entities||[]),createNewLamp({uid:makeLampUid(),ackSlot:this._allocateAckSlot(),kind:"spacer"})];this._config={...this._config,entities:arr};this._selectedLamp=arr.length-1;this._navFollowSelection=true;this._dispatch(true);this._renderAll()}
    _remove(){const current=this._lamp();if(!current.uid)return;this._pushUndo(isSpacerItem(current)?"Spacer deleted":"Lamp deleted");let arr=(this._config.entities||[]).map(normalizeLamp);const pid=String(current.pair_id||"");arr=arr.filter((x)=>x.uid!==current.uid).map((x)=>pid&&String(x.pair_id||"")===pid?{...x,pair_id:"",pair_mode:"none",pair_shape_mode:"independent"}:x);arr=canonicalizePairOrdering(arr);this._config={...this._config,entities:arr};this._selectedLamp=Math.max(0,Math.min(this._selectedLamp,arr.length-1));this._navFollowSelection=true;this._dispatch(true);this._renderAll()}
    _duplicate(){const current=this._lamp();this._pushUndo(isSpacerItem(current)?"Spacer duplicated":"Lamp duplicated");const slot=this._allocateAckSlot();let arr=[...(this._config.entities||[])];const cp={...current,uid:makeLampUid(),ack_slot:slot,pair_id:"",pair_mode:"none",pair_shape_mode:"independent"};arr.splice(this._selectedLamp+1,0,cp);this._config={...this._config,entities:arr};this._selectedLamp=arr.findIndex((x)=>x.uid===cp.uid);this._navFollowSelection=true;this._dispatch(true);this._renderAll()}
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
  if (!window.customCards.some((entry)=>entry?.type==="annunciator-grid-card")) {
    window.customCards.push({
      type: "annunciator-grid-card",
      name: "Annunciator Grid Card",
      description: "Industrial-style annunciator panel with responsive sizing, ACKs, pairing, groups, conditional rules, and a visual editor.",
      preview: true,
    });
  }

  if (typeof window !== "undefined" && window.__ANNUNCIATOR_TEST_MODE__) {
    window.__ANNUNCIATOR_TEST_API__ = {
      safeNavigationPath, validServiceName,
      toNumber, applyValueTransform, resolveDisplayUnit, formatValueDisplay, matchesCondition, evalRuleThreshold,
      evaluateAutoStyleRule, traceAutoStyles, pickAutoStyle, autoRuleSourceEntity, autoRuleUsesExternalSource, autoRuleForceState, lampRuleDependencies, lampDependsOnAny,
      normalizeColorBehavior, colorOverrideEnabled, globalColorValue, resolveLampColors,
      normalizeInteractionAction, safeInteractionUrl, interactionNeedsEntity, interactionTargetEntity, headerAckButtons, normalizeHeaderV3, normalizeHistoricalTallySource, historicalTallyEntityValues, formatHeaderTallyValue, normalizeHeaderAppearance, normalizePanelAppearance, normalizeSpacerAppearance, resolveSpacerAppearance, normalizeInactiveLampDefault, normalizeInactiveLampMode, normalizeInactiveBrightness, resolveInactiveLampMode, normalizeLampContentMode, normalizeLampIconSize, normalizeLampIconColorMode, resolveLampIconColor, defaultIconForEntity, resolveLampIcon, normalizeFontFamily, normalizeCustomFont, configuredFontStack, resolveLampFontStack, normalizeCellType, isSpacerItem, normalizeLampSourceMode, normalizeDerivedBaseState, isDerivedLamp, isOperationalLamp, lampStateObject, captureAppearancePreset, normalizeAppearancePresets, applyAppearancePreset, captureLampAppearancePreset, normalizeLampAppearancePresets, applyLampAppearancePreset, captureLampDisplaySettings, applyLampDisplaySettings, lampNavigatorBadges, parseContrastColor, colorContrastRatio, contrastFinding, lampContrastWarnings, configContrastWarnings, normalizeAckRearmDefault, resolveAckRearm, normalizeAlarmOutput, alarmOutputTransition, normalizeAlarmHistory, alarmHistoryCounts, alarmHistoryTransition, alarmHistoryStorageKey, normalizeShape, normalizePairShapeMode, computeShapeGeometry, normalizeSpan,
      normalizeDynamicTextRule, normalizeDynamicTextLine, normalizeDynamicTextConfig, dynamicTextRuleMatches, resolveDynamicTextLine, resolveDisplayLines,
      LAMP_SOURCE_OPTIONS, LAMP_TYPE_OPTIONS, COLOR_BEHAVIOR_OPTIONS, SEVERITY_OPTIONS, ALERT_EFFECT_OPTIONS, LAMP_SHAPE_OPTIONS, HISTORICAL_TALLY_SPECS, LAMP_ICON_COLOR_MODES, DYNAMIC_TEXT_RULE_KINDS, DYNAMIC_TEXT_RULE_LIMIT,
      LAMP_EDITOR_PAGE_SPECS, PANEL_EDITOR_PAGE_SPECS, LIVE_TALLY_SPECS, HEADER_CONTROL_SPECS,
      LAMP_BRIGHTNESS_PROFILE_SPECS, LAMP_BRIGHTNESS_PROFILE_OPTIONS,
      createSeverityColorDefaults, mergeSeverityColors, createHeaderTalliesDefaults, createHeaderControlsDefaults, createNewLamp, createNewPairMembers,
      evaluateLampState, buildLampModel, inferLampType, AckManager, encodeCompactAckState,
      decodeCompactAckState, parseAckStateText, ackLayoutFingerprint, compactPanelToken, ackKeyHash, bitsetToHex, hexHasSlot, slotSetToAdaptive, adaptiveHasSlot, highestStoredAckSlot,
      isLampBrightnessConfigObject, normalizeLampBrightnessProfile, normalizeLampBrightnessLevel, normalizeLampBrightnessConfig, lampBrightnessLevelsForProfile, normalizePanelLampBrightness, normalizePerLampBrightness, lampBrightnessAttentionActive, resolveLampBrightness,
      validateAndRepairConfig, repairMalformedPairs, repairAllSafeConfig, validPairIdsFor, physicalBlocksFor, flattenPhysicalBlocks, canonicalizePairOrdering, buildRenderItems, buildPairEntityIndex, planGridLayout, computeOccupiedColumns, computePanelMetrics, migrateConfigV2, shouldTriggerChangeAlert, changeAlertDurationMs, rearmConditionMatched, shouldAutoRearm, normalizeLamp, normalizeEntities, AnnunciatorGridCard, AnnunciatorGridCardEditor
    };
  }

  console.info(`ANNUNCIATOR-GRID-CARD ${CARD_VERSION} Loaded`);
})()
