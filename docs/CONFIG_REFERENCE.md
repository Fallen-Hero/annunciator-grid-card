# Annunciator Grid Card v1.0.2 — Configuration Reference

This is the YAML/schema reference for Annunciator Grid Card. The visual editor is recommended for normal use; manual YAML is mainly useful for examples, bulk editing, debugging, and support.

> Values shown as defaults are the v1.0.2 normal/runtime defaults. Existing v1.x configurations can intentionally remain on compatibility paths instead of being silently rewritten to new behavior.

## Card type

```yaml
type: custom:annunciator-grid-card
```

## Top-level configuration

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `type` | string | `custom:annunciator-grid-card` | Lovelace card type. |
| `config_version` | number | `2` | Persisted config schema version. |
| `title` | string | empty | Optional panel header title. |
| `panel_id` | string | `annunciator_panel` | Namespace used by ACK storage. Use unique IDs for independent panels. |
| `panel_mode` | string | `operator` | `operator` or `presentation`. |
| `presentation_allow_more_info` | boolean | `true` | In Presentation mode, optionally allow More Info. Control/ACK actions remain blocked. |
| `columns` | number | `7` | Maximum physical cells per row. |
| `rows` | number | `3` | Minimum rows when `row_mode: fixed`. |
| `row_mode` | string | `auto` | `auto` or `fixed` minimum-row mode. |
| `panel_sizing` | string | `auto_fit` | `auto_fit`, `fixed`, or `scroll`. |
| `cell_width` | number | `225` | Cell width in pixels. |
| `cell_height` | number | `160` | Cell height in pixels. |
| `cell_gap` | number | `0` | Gap between cells. |
| `mullion` | number | `6` | Frame thickness around lamp windows. |
| `outer_frame` | number | `6` | Outer panel frame thickness. |
| `cell_padding` | number | `10` | Text padding inside windows. |
| `corner_style` | string | `rounded` | `rounded` or `sharp`. |
| `corner_radius` | number | `12` | Radius in pixels when rounded. |
| `font_size` | number | `13` | Lamp text size. |
| `font_weight` | string/number | `700` | Lamp text weight. |
| `line_height` | number | `1.15` | Lamp line-height multiplier. |
| `unavailable_text` | string | `INOP` | Text shown for missing/unknown/unavailable source entities. |
| `panel_theme` | string | `classic` | `classic`, `avionics`, or `neon`. |
| `default_lamp_style` | string | `modern` | `modern` or `retro`. |
| `allow_lamp_style_override` | boolean | `true` | Allow individual lamps to choose Modern/Retro. |
| `default_lens_type` | string | `plastic` | `plastic`, `glass`, `frosted`, or `smoked`. |
| `allow_lens_override` | boolean | `true` | Allow per-lamp lens selection. |
| `imperfections` | boolean | `true` | Stable per-lamp surface variation. |
| `flicker` | boolean | `false` | Optional subtle retro flicker. |
| `retro_warmup` | boolean | `true` | Retro warm-up/cool-down animation. |
| `severity_colors` | object | see below | Global color overrides. |
| `severity_appearance` | object | `{}` | Optional severity → lamp style/lens map. |
| `ack_store` | object | `{type: local}` | ACK storage backend. |
| `show_ack_all` | boolean | `true` for new visual-editor cards | Show panel-wide ACK ALL button. |
| `show_clear_ack` | boolean | `true` for new visual-editor cards | Show panel-wide CLEAR ACK button. |
| `pair_ack_lock` | boolean | `false` | Link pair ACK/Clear behavior. |
| `lamp_test_entity` | string | empty/null | Home Assistant helper/entity used for Lamp Test. |
| `lamp_test_mode` | string | `steady` | `steady` or `full`. |
| `show_group_headers` | boolean | `false` | Show group header rows. |
| `group_ack` | object | implicit defaults | Group ACK behavior. |
| `group_header` | object | implicit defaults | Group-header controls/styling. |
| `history_overlay` | object | disabled | Diagnostics/history overlay options. |
| `next_ack_slot` | number | `1` | Internal monotonic ACK slot allocator. Normally managed by editor. |
| `entities` | array | `[]` | Lamp/spacer definitions. |

### Legacy top-level ACK keys

These remain readable for v1.x compatibility but are no longer the normal editor controls:

| Key | Meaning |
| --- | --- |
| `show_reset_ack` | Old single header ACK button visibility. |
| `reset_ack_action` | Old action: `clear` or `ack_all`. |
| `reset_ack_label` | Old custom label. v1.0.2 standardizes the new two-button UI as ACK ALL / CLEAR ACK. |

Compatibility mapping:

- old Clear-only → new `show_ack_all: false`, `show_clear_ack: true`;
- old ACK-All-only → new `show_ack_all: true`, `show_clear_ack: false`;
- old hidden button → both hidden;
- a minimal old config with no header keys keeps the historical Clear-only behavior;
- new visual-editor cards explicitly store both new keys as `true`.

## `severity_colors`

Example new-card palette:

```yaml
severity_colors:
  enabled: true
  on: "#8bd66a"
  on_enabled: true
  off: "#f2f2f2"
  off_enabled: true
  status: "#8bd66a"
  status_enabled: true
  warn: "#ffd24a"
  warn_enabled: true
  alarm: "#ffb000"
  alarm_enabled: true
  trip: "#ff3a2f"
  trip_enabled: true
  unavailable: "#bdbdbd"
  unavailable_enabled: true
  blank: "#111111"
  blank_enabled: true
  frame: "#111111"
  frame_enabled: false
  panel: "#2a2a2a"
  panel_enabled: false
  on_text: "rgba(0,0,0,0.85)"
  on_text_enabled: true
  off_text: "#1c1c1c"
  off_text_enabled: true
  unavailable_text: "#1c1c1c"
  unavailable_text_enabled: true
```

### Master switch

`enabled: false` disables all global color overrides without discarding individual values/toggle preferences.

### Individual switches

Each color has a corresponding `<key>_enabled` flag. Disabled means that global value does not override its built-in/theme fallback.

### Frame and Panel

For new cards, `frame_enabled` and `panel_enabled` default false so the selected theme can visibly own those surfaces.

For existing configs that explicitly contain old `frame` or `panel` values but no enable flags, v1.0.2 treats the explicit value as an intentional compatibility override.

### Legacy `on_window`

`on_window` / `on_window_enabled` are retained for old YAML compatibility but hidden from the simplified editor. New work should use Standard/Severity/Custom color behavior instead.

## `severity_appearance`

Optional style/lens map:

```yaml
severity_appearance:
  trip:
    style: retro
    lens: glass
  alarm:
    style: modern
    lens: smoked
  warn:
    style: ""
    lens: frosted
  status:
    style: ""
    lens: ""
```

Empty values inherit the panel/default resolution.

## `ack_store`

### Local browser

```yaml
ack_store:
  type: local
```

ACK is stored per browser/device in local storage.

### Persistent Home Assistant helper

```yaml
ack_store:
  type: input_text
  entity: input_text.annunciator_ack_map
```

The card uses compact adaptive encoding and falls back locally if a helper write fails or encoded state exceeds helper capacity.

## Header ACK controls

```yaml
show_ack_all: true
show_clear_ack: true
```

- `ACK ALL` ACKs only currently active alert channels.
- `CLEAR ACK` clears stored acknowledgement for the current panel namespace.
- both are hidden in Presentation mode;
- Lamp Test blocks ACK mutations.

## Group options

```yaml
show_group_headers: true
group_ack:
  ack_scope: alerting   # all | alerting
  include_change: true
group_header:
  show_buttons: true
  button_mode: icons    # icons | text
  show_ack_alerts_button: false
  background: "#222222"
  color: "#ffffff"
  divider: false
```

`background` and `color` accept CSS colors.

## Diagnostics overlay

```yaml
history_overlay:
  enabled: true
  show_icon: true
```

When enabled, the runtime can show lamp diagnostics/history information and copy support data.

## Lamp / spacer configuration

Each entry under `entities` is normalized independently.

A spacer is simply an item whose `entity` is empty. The editor keeps UID/ACK identity so the physical cell can be moved/duplicated safely.

### Identity and grouping

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `entity` | string | empty | Source Home Assistant entity. Empty = spacer. |
| `uid` | string | generated/persisted | Stable lamp identity. Normally editor-managed. |
| `ack_slot` | positive integer | allocated | Stable compact ACK slot. Normally editor-managed. |
| `lamp_type` | string | inferred/status for new lamps | `alarm`, `status`, `sensor`, `custom`. |
| `name_override` | string | empty | Custom display label. |
| `label_source` | string | entity/custom | Label source compatibility field. |
| `group` | string | empty | Group name. |
| `note` | string | empty | Maintainer note; not rendered on panel. |

## Lamp condition fields

| Key | Values / type | Default | Meaning |
| --- | --- | --- | --- |
| `eval_mode` | `toggle`, `state_equals`, `string_match`, `numeric_threshold` | `toggle` | Normal ON condition mode. |
| `on_states` | comma-separated string | `on,true,1,open` | Exact states for `state_equals`. |
| `string_match` | `contains`, `equals`, `starts_with`, `ends_with` | `contains` | String operator. |
| `string_value` | string | empty | String match value. |
| `threshold_rule` | object | above 0 inclusive | Numeric rule. |
| `invert` | boolean | `false` | Flip normal condition result. |
| `always_on` | boolean | `false` | Force lamp ON before Conditional Rule force-state. |

### Numeric threshold object

```yaml
threshold_rule:
  type: above      # above | below | between | equal
  a: 80
  b: 100           # used by between
  inclusive: true
```

For the lamp's own numeric condition, the transformed numeric value is used.

## Lamp color fields

### `color_behavior`

Values:

- `standard`
- `severity`
- `custom`
- `legacy`

New lamps explicitly use `standard`. Existing lamps with no field normalize to `legacy` for compatibility.

### `severity`

```yaml
severity: status   # status | warn | alarm | trip
```

Used for active color in Severity/Legacy mode and can be overridden by a matching Conditional Rule.

### `colors`

Custom mode example:

```yaml
color_behavior: custom
colors:
  on: "#00ff00"
  off: "#333333"
  on_text: "#000000"
  text: "#ffffff"            # OFF text
  unavailable: "#777777"
  unavailable_text: "#ffffff"
```

Legacy compatibility fields may also include `on_window`.

### `use_color_override`

Legacy flag retained for old configurations. New Custom mode does not require users to reason about this flag in the editor.

## Lamp display fields

| Key | Values | Default |
| --- | --- | --- |
| `use_templates` | boolean | `false` |
| `label_template` | string | `{{name}}` |
| `legend_template` | string | `{{value}} {{unit}}` |
| `primary_mode` | `custom`, `name`, `state` | `custom` (new lamps set `name`) |
| `primary_text` | string | empty |
| `secondary_mode` | `none`, `custom`, `state`, `entity_id`, `last_changed`, `last_updated` | `state` |
| `secondary_text` | string | empty |
| `tertiary_mode` | same info choices | `none` |
| `tertiary_text` | string | empty |

### Template variables

```text
{{name}}
{{state}}
{{value}}
{{unit}}
{{acked}}
{{severity}}
{{attributes.xxx}}
```

These are card-side substitutions, not Home Assistant Jinja.

## `value_format`

```yaml
value_format:
  mode: auto             # auto | number | text
  decimals: 0            # editor offers 0..3; runtime safely clamps malformed values
  rounding: round        # round | floor | ceil
  unit: auto             # auto | none | override
  unit_override: ""
  convert: none          # none | c_to_f | f_to_c
  scale: 1
  offset: 0
  prefix: ""
  suffix: ""
```

Logic transform:

```text
raw numeric state
→ temperature conversion
→ multiply by scale
→ add offset
```

Display rounding/unit/prefix/suffix happen after logic evaluation.

## Alert fields

| Key | Values | Default |
| --- | --- | --- |
| `alert_style` | `none`, `blink`, `pulse`, `wave`, `throb`, `heartbeat`, `flash` | normalized from legacy flags / none for new status |
| `alert_when` | `on`, `off`, `both` | `on` via compatibility field |
| `blink_mode` | `on`, `off`, `both` | `on` | Legacy alias used as fallback for Alert when. |
| `blink` | boolean | `false` | Legacy compatibility flag. |
| `pulse` | boolean | false/legacy | Legacy compatibility flag. |
| `ack_rearm` | `manual`, `auto` | legacy default `manual`; new lamps use `auto` |
| `alert_speed` | `slow`, `normal`, `fast` | `normal` |
| `alert_opacity_depth` | 0..1 | `0.5` |
| `alert_border_emphasis` | `none`, `soft`, `strong` | `soft` |
| `alert_wave_radius` | number | `10` |
| `alert_throb_subtlety` | 0..1 | `0.5` |

## Change alert fields

| Key | Default | Meaning |
| --- | --- | --- |
| `blink_on_change` | `false` | Enable change-event channel. |
| `blink_on_change_seconds` | `3` | Timed duration when not until-ACK. |
| `blink_on_change_until_ack` | `false` | Continue until acknowledged. |
| `blink_on_change_filter_mode` | `any` | `any`, `state_equals`, `string_match`, `numeric_threshold`. |
| `blink_on_change_state` | empty | Exact state filter. |
| `blink_on_change_string_match` | `contains` | String filter operator. |
| `blink_on_change_string_value` | empty | String filter value. |
| `blink_on_change_threshold_rule` | above 0 inclusive | Numeric filter. |
| `alert_on_change_style` | `inherit` | `inherit`, `off`, or normal alert effects. |
| `alert_on_change_speed` | empty | Empty = inherit. |
| `alert_on_change_opacity_depth` | empty | Empty = inherit. |
| `alert_on_change_border_emphasis` | empty | Empty = inherit. |
| `alert_on_change_wave_radius` | empty | Empty = inherit. |
| `alert_on_change_throb_subtlety` | empty | Empty = inherit. |

## Interaction fields

Each gesture has action/target/entity fields.

### Actions

Supported action values:

```text
more_info
toggle
turn_on
turn_off
ack
clear_ack
none
```

### Tap

```yaml
tap_action: more_info
tap_target: self       # self | entity
tap_entity: ""         # required only when target=entity for entity-based actions
```

### Double tap

```yaml
double_tap_action: ack
double_tap_target: self
double_tap_entity: ""
```

### Long press

```yaml
hold_action: ack
hold_target: self
hold_entity: ""
```

Entity targets are used only by More Info / Toggle / Turn On / Turn Off. A missing alternate entity is a safe no-op.

### Keyboard mapping

- Enter → Tap
- Space → Double tap
- Shift+Space → Long press

## Conditional Rules

Enable with:

```yaml
enable_auto_styles: true
```

Rules live in `auto_styles` and are processed in order. First match wins.

### Rule example

```yaml
auto_styles:
  - name: High temperature trip
    source: self
    kind: numeric
    rule:
      type: above
      a: 200
      inclusive: true
    severity: trip
    alert: blink
    force_state: on
    color: "#ff0000"
```

### Rule source

```yaml
source: self
source_entity: ""
```

or:

```yaml
source: entity
source_entity: input_boolean.maintenance_mode
```

A rule explicitly configured for `source: entity` does not fall back to the lamp entity when `source_entity` is blank.

### Rule condition fields

#### Numeric

```yaml
kind: numeric
rule:
  type: above      # above | below | between | equal
  a: 10
  b: 20
  inclusive: true
```

#### State

```yaml
kind: state
state: "on"
```

#### String

```yaml
kind: string
match: contains    # contains | equals | starts_with | ends_with
value: FAULT
```

### Rule effects

| Key | Meaning |
| --- | --- |
| `severity` | Optional Status/Warn/Alarm/Trip override. |
| `alert` | `off` or any supported alert effect. Omit/inherit to keep base behavior. |
| `force_state` | `on` or `off`; omit for inherit. |
| `color` | Direct ON-color override. |
| `on_color` | Legacy alias accepted by runtime. |
| `force_on` | Legacy boolean accepted for compatibility. |
| `force_off` | Compatibility boolean accepted; normalized into force state. |

Cross-entity numeric rules compare the external entity's raw numeric state.

## Pair fields

```yaml
pair_id: pair_abc123
pair_mode: top       # top | bottom | none
```

A valid pair consists of exactly two compatible entries sharing `pair_id`, one TOP and one BOTTOM. The editor creates/canonicalizes these values automatically.

## Lamp appearance fields

```yaml
lamp_style: inherit    # inherit | modern | retro
lens_type: inherit     # inherit | plastic | glass | frosted | smoked
```

Panel-wide allow/lock settings determine whether per-lamp selections can override defaults.

## Internal identity fields

`uid`, `ack_slot`, `next_ack_slot`, and generated `pair_id` values are part of persistence/repair behavior. Manual editing is possible but discouraged. The editor and validation system are designed to keep them stable and unique.

## Resolution / precedence summary

### Lamp state

```text
condition → invert → always_on → rule force_state → Lamp Test
```

### Rule

```text
first matching rule wins
```

### Standard active color

```text
rule explicit color → enabled global ON → built-in ON
```

### Severity active color

```text
rule explicit color → enabled selected severity → enabled global ON → built-in fallback
```

### Custom active color

```text
rule explicit color → lamp colors.on → enabled global ON → built-in ON
```

### Custom inactive color

```text
lamp colors.off → enabled global OFF → built-in OFF
```

### Legacy

The v1.x resolver remains available and preserves legacy ON Window/severity precedence as closely as possible while including the standalone/paired rendering bug fix.

## Minimal examples

### Standard ON/OFF

```yaml
type: custom:annunciator-grid-card
entities:
  - entity: light.kitchen
    color_behavior: standard
    eval_mode: toggle
```

### Configurable interaction

```yaml
type: custom:annunciator-grid-card
entities:
  - entity: binary_sensor.garage_door_open
    color_behavior: standard
    tap_action: toggle
    tap_target: entity
    tap_entity: cover.garage_door
    double_tap_action: more_info
    double_tap_target: entity
    double_tap_entity: cover.garage_door
    hold_action: ack
```

### Header buttons

```yaml
type: custom:annunciator-grid-card
show_ack_all: true
show_clear_ack: true
```
