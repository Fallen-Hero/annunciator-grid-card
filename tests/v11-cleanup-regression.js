'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

let checks = 0;
const ok = (value, message) => {
  checks += 1;
  if (!value) throw new Error(message);
};
const eq = (actual, expected, message) => {
  checks += 1;
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

function loadTestApi() {
  class HTMLElement {}
  const registry = new Map();
  const document = {
    createElement: (name) => ({
      nodeName: name,
      style: { setProperty() {}, removeProperty() {} },
      classList: { add() {}, remove() {}, toggle() {} },
      setAttribute() {}, removeAttribute() {}, append() {}, addEventListener() {},
    }),
    createTextNode: (value) => ({ textContent: String(value) }),
  };
  const sandbox = {
    console, setTimeout, clearTimeout, queueMicrotask, HTMLElement, document,
    window: { __ANNUNCIATOR_TEST_MODE__: true, customCards: [] },
    customElements: { get: (name) => registry.get(name), define: (name, ctor) => registry.set(name, ctor) },
    CustomEvent: class {}, Event: class {}, ResizeObserver: undefined,
    requestAnimationFrame: (callback) => { callback(); return 1; }, cancelAnimationFrame() {},
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    navigator: {}, CSS: { escape: (value) => String(value) },
    Math, Date, Number, String, Boolean, Array, Object, Set, Map, JSON, RegExp,
  };
  sandbox.window.window = sandbox.window;
  sandbox.window.document = document;
  sandbox.window.customElements = sandbox.customElements;
  vm.createContext(sandbox);
  const source = fs.readFileSync(path.join(__dirname, '..', 'dist', 'annunciator-grid-card.js'), 'utf8');
  vm.runInContext(source, sandbox, { filename: 'annunciator-grid-card.js' });
  return sandbox.window.__ANNUNCIATOR_TEST_API__;
}

const A = loadTestApi();
const requiredExports = [
  'evaluateAutoStyleRule',
  'traceAutoStyles',
  'captureLampAppearancePreset',
  'normalizeLampAppearancePresets',
  'applyLampAppearancePreset',
  'normalizeHistoricalTallySource',
];
const missingExports = requiredExports.filter((name) => typeof A?.[name] !== 'function');
if (missingExports.length) {
  throw new Error(`Missing __ANNUNCIATOR_TEST_API__ exports: ${missingExports.join(', ')}`);
}

// The live debugger and runtime must use one evaluator and agree on the first match.
const numericRule = { name: 'Hot', kind: 'numeric', rule: { type: 'above', a: 70, inclusive: true }, severity: 'alarm' };
const numericResult = A.evaluateAutoStyleRule(numericRule, 2, '72.5', 72.5, {});
ok(numericResult.matched, 'numeric rule matches at the shared evaluator');
eq([numericResult.index, numericResult.reason, numericResult.style.__match_index, numericResult.style.__match_kind], [2, 'Matched', 2, 'numeric'], 'matched rule contains stable debugger metadata');
eq([numericResult.style.__match_source, numericResult.style.__match_raw_state, numericResult.style.__match_value], ['this lamp', '72.5', 72.5], 'matched rule records the evaluated source value');

const reasonCases = [
  [{ enabled: false, kind: 'state', state: 'on' }, 'on', 0, {}, 'Disabled'],
  [{}, 'on', 0, {}, 'Missing or unsupported condition'],
  [{ kind: 'bogus' }, 'on', 0, {}, 'Missing or unsupported condition'],
  [{ source: 'entity', kind: 'state', state: 'on' }, 'off', 0, {}, 'Missing source entity'],
  [{ source: 'entity', source_entity: 'sensor.missing', kind: 'state', state: 'on' }, 'off', 0, {}, 'Source entity not found'],
  [{ source: 'entity', source_entity: 'sensor.driver', kind: 'state', state: 'on' }, 'off', 0, { 'sensor.driver': { state: 'unavailable' } }, 'Source unavailable'],
  [{ source: 'entity', source_entity: 'sensor.driver', kind: 'state', state: 'on' }, 'off', 0, { 'sensor.driver': { state: 'unknown' } }, 'Source unknown'],
  [{ source: 'entity', source_entity: 'sensor.driver', kind: 'numeric', rule: { type: 'above', a: 1 } }, 'off', 0, { 'sensor.driver': { state: 'not-a-number' } }, 'Source is not numeric'],
  [{ kind: 'numeric', rule: { type: 'above', a: 100 } }, '50', 50, {}, 'Numeric threshold did not match'],
  [{ kind: 'state', state: 'on' }, 'off', 0, {}, 'State did not match'],
  [{ kind: 'string', match: 'contains', value: 'ALARM' }, 'NORMAL', NaN, {}, 'String comparison did not match'],
  [{ kind: 'string', match: 'contains', value: 'ALARM' }, 'HIGH ALARM', NaN, {}, 'Matched'],
];
reasonCases.forEach(([rule, rawState, valueNum, states, reason], index) => {
  const result = A.evaluateAutoStyleRule(rule, index, rawState, valueNum, states);
  eq(result.reason, reason, `rule reason ${index}`);
  eq(result.matched, reason === 'Matched', `rule match flag ${index}`);
});

const orderedRules = {
  auto_styles: [
    { name: 'Disabled first', enabled: false, kind: 'state', state: 'on' },
    { name: 'Winner', kind: 'state', state: 'on', force_state: 'on', severity: 'trip' },
    { name: 'Must not run', kind: 'state', state: 'on', force_state: 'off' },
  ],
};
const orderedBefore = JSON.stringify(orderedRules);
const orderedTrace = A.traceAutoStyles(orderedRules, 'on', 1, {});
eq([orderedTrace.winner, orderedTrace.trace.length, orderedTrace.trace[0].reason, orderedTrace.trace[1].reason, orderedTrace.trace[2].reason], [1, 3, 'Disabled', 'Matched', 'Not evaluated because an earlier rule matched'], 'trace explains rule ordering and first-match precedence');
eq(orderedTrace.style, A.pickAutoStyle(orderedRules, 'on', 1, {}), 'runtime selection and debugger trace select the same style');
eq(JSON.stringify(orderedRules), orderedBefore, 'rule tracing does not mutate configuration');
eq(A.traceAutoStyles({ auto_styles: 'bad' }, 'on', 1, {}), { winner: -1, trace: [], style: null }, 'malformed rule lists trace safely');

let seed = 0x11c1ea7;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (values) => values[Math.floor(random() * values.length)];
for (let index = 0; index < 2500; index += 1) {
  const rawState = pick(['on', 'off', 'ALARM', '12.5', 'unknown', 'unavailable', '']);
  const valueNum = Number(rawState);
  const sourceState = pick(['on', 'off', 'ALARM', '7', 'unknown', 'unavailable']);
  const rules = Array.from({ length: Math.floor(random() * 7) }, (_, ruleIndex) => {
    const kind = pick(['numeric', 'state', 'string', '', 'unsupported']);
    const useEntity = random() > 0.55;
    return {
      name: `Rule ${ruleIndex}`,
      enabled: random() > 0.15,
      kind,
      source: useEntity ? 'entity' : 'lamp',
      source_entity: useEntity && random() > 0.15 ? 'sensor.driver' : '',
      state: pick(['on', 'off', 'ALARM']),
      match: pick(['equals', 'contains', 'starts_with', 'ends_with']),
      value: pick(['on', 'A', 'ALARM', '7']),
      rule: { type: pick(['above', 'below', 'between', 'equal']), a: Math.floor(random() * 20), b: 20, inclusive: random() > 0.5 },
      severity: pick(['status', 'warn', 'alarm', 'trip']),
      force_state: pick(['inherit', 'on', 'off']),
    };
  });
  const item = { auto_styles: rules };
  const states = random() > 0.15 ? { 'sensor.driver': { state: sourceState, attributes: {} } } : {};
  const itemBefore = JSON.stringify(item);
  const statesBefore = JSON.stringify(states);
  const trace = A.traceAutoStyles(item, rawState, valueNum, states);
  const picked = A.pickAutoStyle(item, rawState, valueNum, states);
  eq(trace.style, picked, `trace/runtime parity ${index}`);
  eq(trace.winner, trace.trace.findIndex((entry) => entry.matched), `trace winner index ${index}`);
  eq(JSON.stringify(item), itemBefore, `trace leaves rules unchanged ${index}`);
  eq(JSON.stringify(states), statesBefore, `trace leaves states unchanged ${index}`);
}

// Per-lamp appearance presets must be a strict visual allowlist.
const appearanceSource = {
  uid: 'lamp-a', entity: 'binary_sensor.boiler', source_mode: 'entity', cell_type: 'lamp',
  derived_base_state: 'off', lamp_type: 'alarm', severity: 'trip', name: 'Boiler alarm', group: 'Boiler room',
  primary_mode: 'custom', primary_text: 'BOILER', secondary_mode: 'state', secondary_text: 'PRESSURE', tertiary_text: 'HIGH',
  content_mode: 'icon_text', icon: 'mdi:alert', icon_show_primary: false, icon_show_secondary: true, icon_show_tertiary: false,
  eval_mode: 'state_equals', state_value: 'fault', invert: true, always_on: true,
  enable_auto_styles: true, auto_styles: [{ kind: 'state', state: 'fault', severity: 'trip' }],
  alert_effect: 'flash', ack_rearm: 'manual', participates_in_alarm_output: true,
  tap_action: { action: 'call-service', service: 'switch.turn_off' },
  pair_id: 'pair-a', pair_mode: 'top', pair_orientation: 'vertical', row_span: 2, column_span: 3,
  color_behavior: 'custom', use_color_override: true,
  colors: { on: '#ff0000', nested: { future: '#123456' } },
  font_family: 'custom', font_custom: '"Lamp Face", sans-serif', icon_size: 54,
  icon_color_enabled: true, icon_color: '#abcdef', shape: 'circle', translucent_illumination: true,
  lamp_style: 'retro', lens_type: 'smoked', inactive_lamp_mode: 'dim',
  lamp_brightness: { profile: 'custom', dim_level: 38, off: 19, on: 67, alert: 94 },
};
const captured = A.captureLampAppearancePreset(appearanceSource);
const allowedAppearanceKeys = [
  'color_behavior', 'use_color_override', 'colors', 'font_family', 'font_custom', 'icon_size',
  'icon_color_enabled', 'icon_color_mode', 'icon_color', 'icon_color_on', 'icon_color_off', 'shape', 'translucent_illumination', 'lamp_style',
  'lens_type', 'inactive_lamp_mode', 'lamp_brightness',
];
eq(Object.keys(captured).sort(), allowedAppearanceKeys.sort(), 'lamp preset captures only the approved visual allowlist');
const excludedSemanticKeys = [
  'uid', 'entity', 'source_mode', 'cell_type', 'derived_base_state', 'lamp_type', 'severity', 'name', 'group',
  'primary_mode', 'primary_text', 'secondary_mode', 'secondary_text', 'tertiary_text', 'content_mode', 'icon',
  'icon_show_primary', 'icon_show_secondary', 'icon_show_tertiary', 'eval_mode', 'state_value', 'invert',
  'always_on', 'enable_auto_styles', 'auto_styles', 'alert_effect', 'ack_rearm', 'participates_in_alarm_output',
  'tap_action', 'pair_id', 'pair_mode', 'pair_orientation', 'row_span', 'column_span',
];
excludedSemanticKeys.forEach((key) => ok(!Object.prototype.hasOwnProperty.call(captured, key), `lamp preset excludes semantic field ${key}`));
eq([captured.color_behavior, captured.font_family, captured.icon_size, captured.shape, captured.lamp_style, captured.lens_type], ['custom', 'custom', 54, 'circle', 'retro', 'smoked'], 'lamp preset retains selected visual values');
eq(captured.lamp_brightness, { profile: 'custom', dim_level: 38, off: 19, on: 67, alert: 94 }, 'lamp preset retains canonical brightness as visual data');
appearanceSource.colors.on = '#000000';
appearanceSource.colors.nested.future = '#000000';
appearanceSource.lamp_brightness.off = 88;
eq([captured.colors.on, captured.colors.nested], ['#ff0000', { future: '#123456' }], 'captured lamp colors are deeply independent of the source lamp');
eq(captured.lamp_brightness.off, 19, 'captured lamp brightness is deeply independent of the source lamp');

const sharedPresetValues = { shape: 'pill', color_behavior: 'custom', colors: { on: '#00ff00', off: '#101010' }, severity: 'trip', entity: 'sensor.must_not_copy' };
const library = A.normalizeLampAppearancePresets([
  { id: 'look', name: ' First ', values: sharedPresetValues },
  { id: 'look', name: ' Second ', values: sharedPresetValues },
]);
eq(library.length, 2, 'lamp preset library normalizes valid entries');
ok(library[0].id !== library[1].id, 'duplicate lamp preset IDs are repaired');
eq([library[0].name, library[1].name], ['First', 'Second'], 'lamp preset names are trimmed');
ok(library[0].values !== library[1].values && library[0].values.colors !== library[1].values.colors, 'normalized lamp presets do not share value or color objects');
ok(library.every((preset) => preset.values.severity === undefined && preset.values.entity === undefined), 'normalization cannot smuggle semantic fields into a lamp preset');
library[0].values.colors.on = '#111111';
eq(library[1].values.colors.on, '#00ff00', 'editing one normalized preset cannot mutate another');
eq(A.normalizeLampAppearancePresets(null), [], 'malformed lamp preset library is safe');
eq(A.normalizeLampAppearancePresets(Array.from({ length: 30 }, (_, index) => ({ id: `p${index}`, name: `Preset ${index}`, values: {} }))).length, 24, 'lamp preset library has a portable size limit');
eq(A.normalizeLampAppearancePresets([{ id: 'long', name: 'x'.repeat(100), values: {} }])[0].name.length, 60, 'lamp preset names have a safe length limit');

const baselineLamp = A.normalizeLamp({ ...appearanceSource, colors: { on: '#aa0000', off: '#222222' } });
const semanticBefore = Object.fromEntries(excludedSemanticKeys.map((key) => [key, baselineLamp[key]]));
const presetBefore = JSON.stringify(library[1]);
const appliedLamp = A.applyLampAppearancePreset(baselineLamp, library[1]);
const semanticAfter = Object.fromEntries(excludedSemanticKeys.map((key) => [key, appliedLamp[key]]));
eq(semanticAfter, semanticBefore, 'applying a lamp preset preserves identity, behavior, content, rules, pairing, and layout');
eq([appliedLamp.shape, appliedLamp.colors.on], ['pill', '#00ff00'], 'applying a lamp preset changes its visual fields');
ok(appliedLamp !== baselineLamp && appliedLamp.colors !== baselineLamp.colors && appliedLamp.colors !== library[1].values.colors, 'applied lamp and colors are independent objects');
appliedLamp.colors.on = '#ffffff';
eq(JSON.stringify(library[1]), presetBefore, 'mutating an applied lamp cannot mutate its saved preset');
eq(baselineLamp.colors.on, '#aa0000', 'mutating an applied lamp cannot mutate its source lamp');

// Historical tally storage remains browser-local unless shared entities are explicitly selected.
eq([
  A.normalizeHistoricalTallySource(undefined),
  A.normalizeHistoricalTallySource(null),
  A.normalizeHistoricalTallySource('LOCAL'),
  A.normalizeHistoricalTallySource('ENTITIES'),
  A.normalizeHistoricalTallySource('invalid'),
], ['local', 'local', 'local', 'entities', 'local'], 'historical tally source normalizes to two safe modes');

const sharedTallies = A.normalizeHeaderV3({
  header_tallies: {
    history_source: 'ENTITIES', alarms_day: true, alarms_week: true, alarms_month: true, alarms_year: true,
    alarms_day_entity: ' sensor.alarms_day ', alarms_week_entity: 'sensor.alarms_week',
    alarms_month_entity: 42, alarms_year_entity: 'sensor.alarms_year',
  },
}).tallies;
eq([sharedTallies.history_source, sharedTallies.alarms_day_entity, sharedTallies.alarms_week_entity, sharedTallies.alarms_month_entity, sharedTallies.alarms_year_entity], ['entities', 'sensor.alarms_day', 'sensor.alarms_week', '', 'sensor.alarms_year'], 'shared historical tally entity fields normalize without coercing malformed IDs');

for (const legacy of [
  { config_version: 1, entities: [{ entity: 'binary_sensor.old' }] },
  { config_version: 2, header_tallies: { alarms_day: true, alarms_day_label: 'DAY' }, entities: [] },
  { header_tallies: { alarms_day_entity: 'sensor.legacy_hint' }, entities: [] },
]) {
  const migrated = A.migrateConfigV2(legacy);
  eq(migrated.header_tallies.history_source, 'local', 'legacy configuration keeps browser-local alarm history');
  ok(['alarms_day_entity', 'alarms_week_entity', 'alarms_month_entity', 'alarms_year_entity'].every((key) => typeof migrated.header_tallies[key] === 'string'), 'migrated historical entity fields are stable strings');
}
const explicitShared = A.migrateConfigV2({ config_version: 3, header_tallies: { history_source: 'entities', alarms_day_entity: 'sensor.day' }, entities: [] });
eq([explicitShared.header_tallies.history_source, explicitShared.header_tallies.alarms_day_entity], ['entities', 'sensor.day'], 'explicit shared historical tally settings survive migration');

// Centralized option metadata is checked opportunistically whenever it is part of the test API.
const optionArrayNames = ['LAMP_SOURCE_OPTIONS', 'LAMP_TYPE_OPTIONS', 'COLOR_BEHAVIOR_OPTIONS', 'SEVERITY_OPTIONS', 'ALERT_EFFECT_OPTIONS', 'LAMP_SHAPE_OPTIONS', 'FONT_FAMILY_OPTIONS'];
for (const name of optionArrayNames) {
  const options = A[name];
  if (!Array.isArray(options)) continue;
  const values = options.map((option) => option[0]);
  const labels = options.map((option) => option[1]);
  eq(new Set(values).size, values.length, `${name} has unique stored values`);
  ok(values.every((value) => typeof value === 'string' && value.length > 0), `${name} has nonempty stored values`);
  ok(labels.every((label) => typeof label === 'string' && label.trim().length > 0), `${name} has nonempty labels`);
}
if (Array.isArray(A.HEADER_TALLY_KEYS)) {
  eq(new Set(A.HEADER_TALLY_KEYS).size, A.HEADER_TALLY_KEYS.length, 'HEADER_TALLY_KEYS contains no duplicate keys');
}
if (Array.isArray(A.HISTORICAL_TALLY_SPECS)) {
  const keys = A.HISTORICAL_TALLY_SPECS.map((spec) => spec.key);
  const entityKeys = A.HISTORICAL_TALLY_SPECS.map((spec) => spec.entityKey);
  eq(new Set(keys).size, keys.length, 'historical tally specs contain unique tally keys');
  eq(new Set(entityKeys).size, entityKeys.length, 'historical tally specs contain unique entity keys');
  ok(A.HISTORICAL_TALLY_SPECS.every((spec) => spec.label && spec.window), 'historical tally specs have labels and window descriptions');
}

console.log(`v1.1 cleanup regression passed: ${checks} checks`);
