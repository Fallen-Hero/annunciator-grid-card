# Configuration Reference

Normal users should prefer the visual editor. This reference is for advanced/manual YAML, troubleshooting, examples, and migration work.

## Top-level card

```yaml
 type: custom:annunciator-grid-card
 config_version: 2
 panel_id: annunciator_panel
 columns: 7
 entities: []
```

### Layout

| Key | Typical/default | Purpose |
|---|---:|---|
| `title` | blank | Optional panel title |
| `columns` | `7` | Maximum physical cells per row |
| `rows` | `3` | Minimum rows when `row_mode: fixed` |
| `row_mode` | `auto` | `auto` or `fixed` minimum depth |
| `panel_sizing` | `auto_fit` | `auto_fit`, `fixed`, or `scroll` |
| `cell_width` | `225` | Configured physical cell width in px |
| `cell_height` | `160` | Configured physical cell height in px |
| `cell_gap` | `0` | Gap between physical cells |
| `mullion` | `6` | Lamp/window framing thickness |
| `outer_frame` | `6` | Outer panel frame thickness |
| `cell_padding` | `10` | Text padding inside single/paired windows |
| `font_size` | `13` | Lamp text size |
| `font_weight` | `700` | Base lamp font weight |
| `line_height` | `1.15` | Lamp text line height |
| `corner_style` | `rounded` | `rounded` or `sharp` |
| `corner_radius` | `12` | Rounded radius in px |

`columns` is a maximum, not a command to create invisible blank cells. Add **Spacer** entries when a blank physical position is intentional.

### Appearance

| Key | Values/purpose |
|---|---|
| `panel_theme` | `classic`, `avionics`, `neon` |
| `default_lamp_style` | `modern`, `retro` |
| `default_lens_type` | `plastic`, `glass`, `frosted`, `smoked` |
| `allow_lamp_style_override` | Allow individual lamp style choice |
| `allow_lens_override` | Allow individual lamp lens choice |
| `imperfections` | Stable lens texture/imperfections |
| `flicker` | Subtle retro flicker |
| `retro_warmup` | Retro warm-up/cool-down transition |
| `severity_colors` | Global color map |
| `severity_appearance` | Optional severity-specific style/lens map |

Default severities are TRIP, ALARM, WARN and STATUS. Global appearance also includes OFF, Unavailable, Blank, Frame, Panel and text colors.

### Acknowledgement

```yaml
ack_store:
  type: local
```

or:

```yaml
ack_store:
  type: input_text
  entity: input_text.annunciator_ack_map
```

Related keys:

| Key | Purpose |
|---|---|
| `panel_id` | ACK namespace; use a unique ID per independent panel |
| `show_reset_ack` | Show header ACK/Clear button |
| `reset_ack_action` | `clear` or `ack_all` |
| `reset_ack_label` | Optional custom header-button text |
| `pair_ack_lock` | ACK paired halves together |
| `next_ack_slot` | Internal monotonic ACK-slot allocator; do not manually reduce |

### Groups

| Key | Purpose |
|---|---|
| `show_group_headers` | Render group headers |
| `group_ack.ack_scope` | `all` or `alerting` |
| `group_ack.include_change` | Include change-alert ACK state |
| `group_header.show_buttons` | Group ACK/Clear controls |
| `group_header.button_mode` | `icons` or `text` |
| `group_header.show_ack_alerts_button` | Dedicated alerting-only ACK button |
| `group_header.background` | Optional CSS background color |
| `group_header.color` | Optional CSS text color |
| `group_header.divider` | Bottom divider |

### Advanced panel

| Key | Purpose |
|---|---|
| `lamp_test_entity` | Optional boolean/toggle-like Lamp Test entity |
| `lamp_test_mode` | `steady` or `full` |
| `unavailable_text` | Text such as `INOP` |
| `panel_mode` | `operator` or `presentation` |
| `presentation_allow_more_info` | Keep More Info in read-only mode |
| `history_overlay.enabled` | Enable diagnostics overlay |
| `history_overlay.show_icon` | Show per-lamp info icon |

## Lamp object

A configured lamp lives under `entities:`.

```yaml
entities:
  - entity: binary_sensor.boiler_trip
    lamp_type: alarm
    severity: trip
    eval_mode: toggle
    alert_style: blink
```

### Identity / organization

| Key | Purpose |
|---|---|
| `entity` | Home Assistant entity ID; blank = spacer |
| `uid` | Stable internal lamp identity; editor-managed |
| `ack_slot` | Stable compact-ACK slot; editor-managed |
| `lamp_type` | `alarm`, `status`, `sensor`, `custom` |
| `name_override` | Custom label |
| `label_source` | `entity` or `custom` |
| `group` | Group-header/ACK grouping name |
| `note` | Maintainer-only note |

### ON condition

| `eval_mode` | Supporting keys |
|---|---|
| `toggle` | default truthy state behavior |
| `state_equals` | `on_states` comma-separated list |
| `string_match` | `string_match`, `string_value` |
| `numeric_threshold` | `threshold_rule` |

String operators: `contains`, `equals`, `starts_with`, `ends_with`.

Numeric rule shape:

```yaml
threshold_rule:
  type: above      # above | below | between | equal
  a: 170
  b: 200           # used for between
  inclusive: true
```

Numeric comparisons use the transformed logic value.

### Display / value formatting

| Key | Values/purpose |
|---|---|
| `primary_mode` | `custom`, `name`, `state` |
| `secondary_mode` | `none`, `custom`, `state`, `entity_id`, `last_changed`, `last_updated` |
| `tertiary_mode` | same informational modes |
| `primary_text` / `secondary_text` / `tertiary_text` | Custom text |
| `use_templates` | Replace normal primary/secondary display selection |
| `label_template` | Lightweight primary template |
| `legend_template` | Lightweight secondary template |

Template variables include `{{name}}`, `{{state}}`, `{{value}}`, `{{unit}}`, `{{acked}}`, `{{severity}}`, and `{{attributes.xxx}}`.

`value_format` supports:

```yaml
value_format:
  convert: none     # none | c_to_f | f_to_c
  scale: 1
  offset: 0
  decimals: 0
  rounding: round   # round | floor | ceil
  unit: auto        # auto | none | override
  unit_override: ""
  mode: auto        # auto | number | text
  prefix: ""
  suffix: ""
```

Pipeline:

```text
HA state → conversion → scale → offset → logic value → display rounding/unit/prefix/suffix
```

### Severity / alert

| Key | Purpose |
|---|---|
| `severity` | `status`, `warn`, `alarm`, `trip` |
| `alert_style` | `none`, `blink`, `pulse`, `wave`, `throb`, `heartbeat`, `flash` |
| `alert_when` | `on`, `off`, `both` |
| `ack_rearm` | `manual`, `auto` |
| `alert_speed` | `slow`, `normal`, `fast` |
| `alert_opacity_depth` | 0..1 |
| `alert_border_emphasis` | `none`, `soft`, `strong` |
| `alert_wave_radius` | Wave radius in px |
| `alert_throb_subtlety` | Throb tuning 0..1 |

### Change alert

| Key | Purpose |
|---|---|
| `blink_on_change` | Enable state/value-change alert |
| `blink_on_change_until_ack` | Continue until ACK instead of timed duration |
| `blink_on_change_seconds` | Timed duration |
| `alert_on_change_style` | `inherit`, normal effects, or `off` |
| `blink_on_change_filter_mode` | `any`, `state_equals`, `string_match`, `numeric_threshold` |
| `alert_on_change_speed` | Optional override |
| `alert_on_change_opacity_depth` | Optional override |
| `alert_on_change_border_emphasis` | Optional override |
| `alert_on_change_wave_radius` | Optional override |
| `alert_on_change_throb_subtlety` | Optional override |

### Per-lamp appearance

| Key | Purpose |
|---|---|
| `lamp_style` | `inherit`, `modern`, `retro` |
| `lens_type` | `inherit`, `plastic`, `glass`, `frosted`, `smoked` |
| `use_color_override` | Enable lamp-local colors |
| `colors.on` | ON severity/current color |
| `colors.on_window` | Explicit ON lens/window background |
| `colors.on_text` | ON text |
| `colors.off` | OFF window |
| `colors.text` | OFF text |
| `colors.unavailable` | Unavailable window |
| `colors.unavailable_text` | Unavailable text |

A matching Conditional Rule ON color has higher priority than a per-lamp ON color.

### Pairing

Normally managed by the visual editor:

```yaml
pair_id: pair_...
pair_mode: top     # top | bottom | none
```

A valid pair has exactly one TOP and one BOTTOM and occupies one physical panel cell.

### Conditional Rules

Enable with:

```yaml
enable_auto_styles: true
```

Rules are stored in `auto_styles` for backward compatibility. **First matching rule wins.** A rule can match numeric/state/string conditions and override severity, alert effect, ON color and Force ON.

### Advanced flags

| Key | Purpose |
|---|---|
| `always_on` | Force ON independent of normal condition |
| `invert` | Invert result after condition evaluation |

## Internal fields

`uid`, `ack_slot`, `next_ack_slot`, and generated Pair IDs are editor/runtime identity data. They should generally be left to the card rather than renumbered manually.
