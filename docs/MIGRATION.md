# Annunciator Grid Card — v1.1.0 Migration and Compatibility

## Migrating from v1.0.2 to v1.1.0

Schema v3 adds only normalized, opt-in fields. Old lamps inherit the original shape, remain Text content, retain their original display modes, retain 1×1 spans, stay vertical when paired, do not use translucent illumination, remain at full brightness unless legacy dimming was explicitly configured, and do not participate in alarm output. State-aware labels, dynamic text rules, Icon mode, state icon colors, independent panel/header/frame radii, and historical alarm tallies remain disabled unless explicitly selected. An old enabled icon-color override maps to One custom color and keeps its exact prior result. Old configs gain neither a panel nor lamp appearance-preset library, and no preset is ever auto-applied. Historical tally source defaults to local-browser observations; Home Assistant entity sources are never inferred. An absent Script-mode Silence script remains absent, with existing generic `silence_action` behavior retained. Old spacers remain in Compatibility appearance; neither Blend nor Custom is enabled automatically. Old ACK ALL/CLEAR ACK visibility and labels are retained. Header appearance defaults to an empty object, so old title/tally/button colors, backgrounds, borders, fonts, and square complete-header geometry remain untouched. All new panel/header/lamp/spacer `*_none` switches normalize to `false` unless the saved value is explicitly boolean `true`. A missing `panel_appearance.lamp_frame_mode` normalizes to `follow_panel`, preserving the prior behavior in which an explicit outer-frame override also colors lamp bezels. New cards use the longer professional labels. No source entity is changed by ACKNOWLEDGE, SILENCE, RESET, or CLEAR ACKNOWLEDGED.

Existing items default to `source_mode: entity`. A blank legacy item therefore remains a spacer exactly as before. Derived lamps exist only when explicitly added or configured with `cell_type: lamp` and `source_mode: derived`; they do not alter how any v1.0.2 entity-backed lamp is evaluated.

v1.0.2 keeps configuration schema v2 and is designed to load existing v1.0.0/v1.0.1 dashboards without requiring a manual migration.

## Main principle

Existing configurations retain legacy-compatible behavior where silently applying the new defaults could change a dashboard. New lamps/cards use the simplified v1.0.2 defaults.

## Color migration

### Existing lamps

A lamp with no `color_behavior` normalizes to:

```yaml
color_behavior: legacy
```

This preserves old severity/ON Window precedence as closely as possible.

### New lamps

New lamps created by the v1.0.2 visual editor use:

```yaml
lamp_type: status
color_behavior: standard
severity: status
alert_style: none
```

They use the global ON/OFF colors unless deliberately changed.

### Converting Legacy to Custom

When you explicitly choose **Custom ON/OFF**, v1.0.2 copies the color that actually had visual ON-window priority into the new Custom ON value where possible, then stops exposing the redundant ON Window control.

### Global Frame/Panel

Old saved configs that explicitly contain Frame or Panel colors but no new enable flags are treated as intentional overrides. New cards default those overrides OFF so panel themes can own the surfaces.

The visual editor now distinguishes the **Outer frame** from **Lamp frame source**. Existing configurations default to `follow_panel` for visual compatibility. Select `theme` to keep the theme bezel when overriding the outer panel frame, or `custom` plus `lamp_frame` to choose an independent lamp-bezel color.

The new None switches are reversible presentation flags. They take precedence while enabled but do not delete older custom colors. Leaving them absent or `false` preserves the prior panel edge, frame, lamp bezel/lens border, header surfaces, and spacer layers.

## Header ACK migration

v1.x used one configurable header ACK button:

```yaml
show_reset_ack: true
reset_ack_action: clear   # or ack_all
reset_ack_label: ""
```

v1.0.2 introduced two independent controls:

```yaml
show_ack_all: true
show_clear_ack: true
```

v1.1.0 uses a five-control header model:

```yaml
header_controls:
  acknowledge:
    enabled: true
    label: ACKNOWLEDGE
  silence:
    enabled: false
    label: SILENCE
  reset:
    enabled: false
    label: RESET
  lamp_test:
    enabled: false
    label: LAMP TEST
  clear_acknowledged:
    enabled: true
    label: CLEAR ACKNOWLEDGED
```

Compatibility behavior:

| Saved config | v1.1.0 initial behavior |
| --- | --- |
| `reset_ack_action: clear` | only Clear action enabled with its saved legacy label |
| `reset_ack_action: ack_all` | only Acknowledge action enabled with its saved legacy label |
| `show_reset_ack: false` | Acknowledge and Clear actions hidden |
| no old/new header keys | historical Clear-only behavior retained |
| v1.0.2 `show_ack_all` / `show_clear_ack` | corresponding actions retain their visibility and ACK ALL/CLEAR ACK labels |
| new v1.1.0 visual-editor card | ACKNOWLEDGE and CLEAR ACKNOWLEDGED enabled; SILENCE, RESET, and LAMP TEST optional |

Once a v1.1 header control is changed, the editor stores its `enabled` and `label` values under `header_controls`. Compatibility keys remain readable, and existing custom labels are not silently replaced.

## Conditional Rules

Existing rules continue to work.

v1.0.2 adds:

- `source: entity` + `source_entity` for cross-entity conditions;
- `force_state: off` for Force OFF;
- compatibility with older `force_on: true`.

An incomplete Another Entity rule is skipped instead of falling back to the lamp entity.

## Interactions

Existing lamps have no stored interaction fields, so normalization supplies the historical behavior:

```yaml
tap_action: more_info
double_tap_action: ack
hold_action: ack
```

New alternate target fields default to `self` and empty alternate entity values.

## ACK storage

The compact persistent ACK system remains compatible with stable UID/ACK slots. ACK slots remain monotonic and are not intentionally reused.

## ACK rearm migration

Existing lamps with no saved `ack_rearm` continue to normalize to `manual`; explicit `manual` and `auto` values also keep their prior behavior. The new top-level `ack_rearm_default` is `auto`, but it affects only lamps that explicitly use `ack_rearm: inherit`. New editor-created lamps and pair halves use inheritance.

Automatic rearm now clears after the configured ON/OFF alert condition returns to normal even when the lamp uses no visual effect. It does not clear while the condition is active, while the source is unavailable/unknown, or for `alert_when: both` because that setting has no normal state.

## Alarm output migration

Alarm output remains `none` unless explicitly enabled, and every existing lamp remains excluded unless `participates_in_alarm_output: true` is deliberately set. Existing Script output continues to use `alarm_output.script`. The optional `alarm_output.silence_script` is never inferred; when absent, an existing generic `silence_action` remains the Script-mode stop fallback. No migration calls a service.

## Spacer appearance migration

A missing top-level `spacer_appearance` remains the established Compatibility appearance. New global/per-spacer modes are `default`, `blend`, and `custom`; individual spacers may also use `inherit`. Custom mode controls fill, frame/bezel, border color, and border width, with independent `fill_none`, `bezel_none`, and `border_none` switches. Blend is opt-in and creates a transparent panel gap.

## Appearance preset and brightness migration

A missing `appearance_presets` key remains absent; loading or editing an old card never captures or applies a look automatically. If a library is present, entries are normalized, duplicate IDs are repaired, names are trimmed, malformed appearance values receive safe defaults, and at most 24 entries are retained. Applying a preset remains a deliberate editor action and preserves all non-appearance configuration.

A missing `lamp_appearance_presets` key likewise remains absent. A present library is limited to 24 normalized named entries, and each entry is reduced to the explicit lamp visual allowlist. Legacy or malformed preset content cannot introduce entity/source identity, text/icon identity, type/severity, alerts, ACK, rules, actions, groups, pairs, spans, UID, or ACK slots when applied. A legacy-only lamp preset intentionally omits canonical brightness; applying it clears the receiving lamp's canonical override, keeps `inactive_lamp_mode`, and resolves against the receiving panel's current legacy dim level rather than baking 32% into the preset.

`lamp_brightness` is now the canonical global and per-lamp object. A valid explicit canonical object wins over the old aliases. A malformed or profile-less object is ignored/removed so it cannot mask valid legacy settings. If no valid global canonical object exists, `inactive_lamp_default: normal` maps to `profile: normal`, `inactive_lamp_default: dim` maps to `profile: dim_off`, and `inactive_lamp_brightness` maps to `dim_level` through its historical whole-percentage normalization: finite numeric conversion is rounded and clamped to 10–90, while absent or non-finite input defaults to 32. If no valid per-lamp canonical object exists, `inactive_lamp_mode: inherit`, `normal`, or `dim` maps exactly to `profile: inherit`, `normal`, or `dim_off`.

When canonical and legacy fields are all missing, the global result is Normal/full and a lamp inherits it. Canonical `dim_level`, `off`, `on`, and `alert` accept finite numbers or nonblank numeric strings in the 10–100 range; `dim_level` defaults to 32, while Custom defaults are OFF=`dim_level`, ON=100, and ALERT=100. Null, blank, non-finite, boolean, array, and object inputs take those fallbacks rather than being numerically coerced. This distinction preserves a deliberately configured canonical 100% Dim level without changing the old alias's 10–90 contract.

The visual editor may resolve legacy aliases for display, previews, or runtime use without writing them back merely because the editor was opened. The preview refreshes in place while numeric fields are deliberately edited. A user edit to panel **Brightness profile**, per-lamp/bulk **Brightness**, **Dim level**, **OFF brightness**, **ON brightness**, or **Alert brightness** writes the canonical object. Bulk Brightness remains staged until Apply. Existing panel/lamp presets and old cards therefore remain non-mutating until a deliberate edit or preset application.

Brightness resolution itself remains compatibility-safe: INOP and Lamp Test force 100; an active main alarm condition or change alert uses ALERT brightness even after ACK; other lamps use the resolved final ON or OFF level. Derived-lamp change detection observes its post-rule final state. Editing a Derived base/rule configuration reseeds that observation without inventing a source transition or clearing an already-active change alert; the next actual dependency-state transition is still detected. Lamp Test uses one captured test-active snapshot for a complete render so expiration cannot split state and brightness decisions.

## Dynamic text and icon-color migration

Missing `dynamic_text` remains missing, and `primary_mode`, `secondary_mode`, and `tertiary_mode` retain their old defaults and results. The runtime emits no new display metadata for a legacy mode, preserving the v1.0.2 differential contract. Selecting **ON / OFF labels** or **Dynamic text rules** is the only action that creates per-line dynamic configuration. Each line is normalized independently and capped at 24 rules; malformed data fails safe without changing state, alerts, ACK, or entities.

Missing `icon_color_mode` maps from the old switch: `icon_color_enabled: true` becomes `single`, while false/missing becomes `follow`. `icon_color` remains the single-color value. New `icon_color_on` and `icon_color_off` values are used only after `icon_color_mode: state` is explicitly selected. Lamp appearance presets include these visual fields but continue to exclude icon identity and every semantic lamp field.

## Pairing

Malformed/legacy pair relationships are safely repaired/canonicalized where possible. A valid pair remains one TOP + one BOTTOM occupying one physical cell.

Legacy blank-entity entries continue to normalize as spacers. New **Add lamp** and **Add paired lamp** drafts explicitly persist `cell_type: lamp`, allowing their entity selector to remain blank during setup without becoming a spacer. **Add paired lamp** creates both canonical halves, adjacent order, a shared generated Pair ID, and independent UID/ACK slots in one operation. A non-empty entity always normalizes as a lamp even if malformed YAML claims otherwise.

## Historical tally source migration

Historical Day/Week/Month/Year tallies default off and create no storage until one is enabled. Their normalized default labels are `ALARM DAY`, `ALARM WEEK`, `ALARM MONTH`, and `ALARM YEAR`, so the new editable label fields do not alter existing visuals. A missing or invalid `header_tallies.history_source` normalizes to `local`; its arrival history is browser-local under `panel_id`, not part of configuration, ACK storage, or the Home Assistant Recorder database, and cannot backfill periods when no card observed the alarm.

Selecting `history_source: entities` is explicit. It disables local tracking/reset and reads only the configured `alarms_day_entity`, `alarms_week_entity`, `alarms_month_entity`, and `alarms_year_entity` states. No source entities are inferred or written. Invalid/missing, unknown/unavailable, nonnumeric, non-finite, and negative states display `—`; this prevents a migration or source failure from appearing as a valid zero.

## Editor-only cleanup

Quick setup/Full editor mode, group suggestions, Bulk edit selection/drafts, and Live rule trace are editor-only state. Opening or switching them does not add migration keys or rewrite an existing v1.0.2 configuration. Group values remain exact and case-sensitive; paired-half synchronization occurs only after an explicit editor group change.

## Recommended upgrade procedure

1. Back up the dashboard/Home Assistant configuration.
2. Update the card.
3. Hard-refresh the browser.
4. Confirm the card version in the browser console/diagnostics.
5. Open an existing v1.0.1 panel without editing colors first.
6. Confirm standalone and paired lamps look correct.
7. Test ACK, Clear ACK, ACK All, pair ACK, and Lamp Test.
8. Only then convert individual Legacy lamps to Standard/Severity/Custom if desired.

No mass conversion is required.
