![Annunciator Grid Card — Alarm, Status, Control](../images/annunciator-grid-card-logo.png)

# Annunciator Grid Card v1.1.0 — Validation Notes

The project uses several layers of validation. No automated suite can reproduce every Home Assistant/browser/theme/device combination, so real Home Assistant smoke testing remains part of the release gate.

## Repository test command

```bash
pnpm install --frozen-lockfile
pnpm test
```

The v1.1.0 test command performs the original v1.0.2 layers plus:

1. JavaScript syntax validation (`node --check`).
2. Static feature/invariant checks.
3. Deterministic runtime regression tests.
4. Dedicated dual-header ACK compatibility/stress tests.
5. Documentation validation, including a check that every literal visual-editor field label is covered by the Complete User Guide.
6. Schema-v3 migration and malformed-configuration fuzzing.
7. Shape/pair/span/layout stress and v1.0.2 differential comparison.
8. Mounted visual-editor mutation/lifecycle tests.
9. Spacer and ACK/manual/automatic-rearm state-machine stress.
10. Browser rendering at desktop and compact editor widths.

## Extended validation layers

The release is also exercised with broader suites covering:

- color behavior and precedence;
- standalone/paired parity;
- global color enable/disable combinations;
- legacy v1.x differential behavior;
- cross-entity rules and Force OFF;
- malformed configuration fuzzing;
- ACK encoding/decoding and layout stress;
- configurable interactions and gesture arbitration;
- alternate entity target safety;
- panel themes and lens materials;
- editor controls;
- explicit None states for panel/header/lamp/spacer layers, including mixed independent layers;
- remembered collapsible editor sections and conditional advanced controls;
- appearance-preset capture/normalize/apply/update/delete behavior, library limits, malformed entries, and proof that behavior/entities/layout remain untouched;
- lamp-appearance-preset visual allowlisting, one-lamp and bulk application, malformed entries/limits, and proof that identity, meaning, alarm/ACK, rules/actions, groups/pairs, and spans remain untouched;
- Quick setup/Full editor parity, transient mode state, exact group suggestions, pair group synchronization, bulk selection across search/pagination, pair expansion, one-change/one-undo dispatch, and mixed-value no-op behavior;
- canonical global/per-lamp brightness-profile normalization, exact inactive-lamp alias mapping, legacy 10–90 versus canonical 10–100 boundaries, inheritance, custom OFF/ON/ALERT levels, and paired-half independence;
- text-only compatibility plus Icon only/Icon + selected lines, configured/entity/domain fallbacks, independent Primary/Secondary/Tertiary visibility, single and state-based icon colors, unavailable and paired-half rendering;
- per-line ON/OFF/Unavailable/Unknown labels, ordered first-match dynamic text rules, transformed numeric thresholds, ACK/alarm conditions, fallback/INOP precedence, 24-rule limits, malformed-input fuzzing, and template priority;
- opt-in local rolling Day/Week/Month/Year alarm-arrival persistence, duplicate-render/reload suppression, clear/reactivate counting, explicit reset, timer expiry, and malformed-history bounds;
- custom historical tally-label normalization, sanitization, editor mutation, and runtime rendering;
- local/entity historical source migration, dependency tracking, valid zero/fractional values, trimmed numeric rendering, `—` handling for blank/missing, unknown, unavailable, nonnumeric, non-finite, and negative entity states, local-work suppression in entity mode, and reset-control isolation;
- Add lamp/Add paired lamp unfinished-lamp identity, automatic Pair IDs, canonical adjacency, two-step entity selection, spacer separation, and mounted pair rendering;
- Add derived lamp lifecycle, synthetic base state, external rule dependency updates, rule/source fuzzing, pairing with entity-backed lamps, ACK persistence, group/tally/history/alarm participation, and no-INOP runtime rendering;
- panel/per-lamp/header live font specimens, custom-stack mutation, condensed fallback resolution, and computed runtime font families;
- opt-in independent panel/header/frame/lamp-bezel radii, malformed-value clamping, and unchanged legacy square outer surfaces;
- live rule-trace/runtime-evaluator parity, first-match priority, every exact runtime reason string including `Not evaluated because an earlier rule matched`, and proof that trace refresh performs no mutation or service call;
- Script-mode start/Silence script selection, generic fallback, SILENCE/new-alarm re-sound, no-active-alarm/output-replacement/disconnect stop transitions, failed-start handling, and service payloads;
- render-generation, captured Lamp Test snapshots, Derived final-state change-alert transitions, alarm-output ordering, ACK mutation serialization, local-history caching/cross-tab invalidation, reconnect timer recovery, and stale-work suppression;
- headless Chromium runtime rendering and interaction.

## Header ACK regression coverage

The v1.0.2 ACK header tests specifically verify:

- new visual-editor cards can show ACK ALL and CLEAR ACK together;
- each button can be independently hidden;
- ACK ALL acknowledges an active alert;
- ACK ALL does not pre-ACK an inactive lamp;
- CLEAR ACK removes stored panel ACK state;
- old Clear-only configuration remains Clear-only;
- old ACK-All configuration remains ACK-All;
- an old minimal config keeps the historical Clear-only default;
- Presentation mode hides header ACK controls and does not reserve an empty ACK-only header;
- the editor exposes the two new switches and removes the obsolete action/label selectors.

## Browser validation

Headless Chromium validation is useful for catching issues that pure Node tests cannot see, including:

- custom-element registration;
- actual Shadow DOM rendering;
- computed CSS differences;
- visible header controls;
- real click/pointer gesture routing;
- Home Assistant service-call shapes;
- editor rendering;
- computed OFF/ON/ALERT profile levels, INOP/Lamp-Test 100% precedence, alert brightness after ACK, and the non-mutating OFF · ON · ALERT preview;
- desktop/compact preset controls and eight-section Appearance organization;
- Quick setup/Full editor, Bulk edit, group suggestions, lamp presets, and live rule trace at desktop/compact widths;
- entity-backed historical-tally values and invalid-state dashes, plus Script/Silence script controls;
- desktop/compact icon editor controls, rounded surfaces, and version-only editor branding.

The final v1.1.0 browser gate passes **24/24 harness runs**: 12 desktop and 12 mobile. Direct in-app desktop/mobile inspection also records no card/harness console errors and no horizontal overflow.

It is still not identical to a real Home Assistant frontend. Final smoke testing in Home Assistant is required.

The distribution remains one self-contained `dist/annunciator-grid-card.js` resource. No split runtime files or network-loaded modules are required by the release package.

The finalized v1.1.0 code passes more than **626,000 non-browser checks** plus the **24/24** browser runs. Focused editor tests confirm Quick setup dim/custom dependent controls and reference-preview persistence, bounded color-drag configuration reflection, exact final color storage, selector reflection/stale-event suppression, and safe closure of native edit transactions before structural rerenders.

## Compatibility philosophy

When a cleaner v1.1 model conflicts with old saved behavior, the card generally chooses:

1. preserve the old configuration behavior;
2. expose the cleaner model for new configuration;
3. migrate only when the user deliberately selects the new model;
4. validate and repair malformed structures without inventing unstable runtime identity.

## Reporting a regression

Include:

- card version;
- Home Assistant version;
- browser/device;
- exact configuration or diagnostic package;
- expected/actual behavior;
- console errors;
- screenshot/video when relevant.
