# Annunciator Grid Card v1.1.0 — Configuration Reference

This is the YAML/schema reference for Annunciator Grid Card. The visual editor is recommended for normal use; manual YAML is mainly useful for examples, bulk editing, debugging, and support.

> Values shown as defaults describe normalized v1.1.0 behavior. Existing v1.x configurations can intentionally remain on compatibility paths instead of being silently rewritten to new behavior.

## Card type

```yaml
type: custom:annunciator-grid-card
```

## Top-level configuration

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `type` | string | `custom:annunciator-grid-card` | Lovelace card type. |
| `config_version` | number | `3` | Persisted config schema version. |

## v1.1.0 additive keys

| Key | Default | Purpose |
|---|---:|---|
| `header_tallies` | all `false` | Optional live Active/Alarm/Unacknowledged/Total/Unavailable counters and rolling Alarm Day/Week/Month/Year arrival totals. |
| `header_controls` | migrated compatibility | Per-control `enabled` and `label` values. New-card labels are ACKNOWLEDGE, SILENCE, RESET, LAMP TEST, and CLEAR ACKNOWLEDGED. |
| `header_appearance` | `{}` | Fully opt-in header colors, surfaces, borders, typography, sizes, and button radius. |
| `alarm_output.mode` | `none` | `none`, `media_player`, `script`, or `advanced_action`. |
| `panel_appearance` | `{}` | Opt-in panel surfaces plus independent outer-frame/lamp-frame selection. |
| `spacer_appearance` | `{}` / compatibility | Global spacer `default`, `blend`, or `custom` appearance. |
| `appearance_presets` | omitted / `[]` | Up to 24 named, portable snapshots of panel-wide appearance only. Never applied automatically. |
| `lamp_appearance_presets` | omitted / `[]` | Up to 24 named, portable lamp visual styles. Never applied automatically and never contain semantic/layout fields. |
| `lamp_brightness` | `{profile: normal}` | Canonical global brightness profile and OFF/ON/ALERT levels; see below. |
| `inactive_lamp_default` | omitted | Legacy read alias: `normal` → `lamp_brightness.profile: normal`; `dim` → `dim_off`. |
| `inactive_lamp_brightness` | omitted | Legacy read alias for `lamp_brightness.dim_level`, normalized through its historical 10–90 range. |
| `ack_rearm_default` | `auto` | Panel default used by lamps whose `ack_rearm` is `inherit`. |
| lamp `shape` | `inherit` | `rectangle`, `round_rectangle`, `pill`, `square`, `circle`, or `indicator_dot`. |
| lamp `row_span` / `column_span` | `1` | Collision-free multi-cell footprint. |
| lamp `pair_orientation` | `vertical` | `vertical` or `horizontal`; old pair IDs remain valid. |
| lamp `pair_shape_mode` | `independent` | `independent` or opt-in `split_pill`; stored on both valid halves. |
| lamp `translucent_illumination` | `false` | Opt-in diffused ON appearance with a color-matched halo; works with every shape, lens material, style, and paired half. Retro uses a color-filled incandescent diffuser. |
| lamp `lamp_brightness` | `{profile: inherit}` | Canonical per-lamp brightness override. `inherit` uses the panel object. |
| lamp `inactive_lamp_mode` | omitted | Legacy read alias: `inherit`, `normal`, or `dim` maps to profile `inherit`, `normal`, or `dim_off`. |
| lamp `participates_in_alarm_output` | `false` | Makes an active, unacknowledged lamp eligible for panel output. |

### `appearance_presets`

The visual editor stores each preset as `{id, name, values}`. `id` is editor-managed, `name` is trimmed to 60 characters, and the list is capped at 24 entries. `values` contains only these normalized panel-wide appearance keys:

`panel_theme`, `default_lamp_style`, `default_lens_type`, `panel_appearance`, `header_appearance`, `spacer_appearance`, `severity_colors`, `severity_appearance`, `allow_lamp_style_override`, `allow_lens_override`, `imperfections`, `flicker`, `retro_warmup`, canonical `lamp_brightness`, and the normalized compatibility aliases `inactive_lamp_default` / `inactive_lamp_brightness`.

The canonical object is authoritative when a preset is applied. The alias copies remain in the appearance-only snapshot for legacy/downgrade compatibility and cannot override it.

Applying a preset preserves every other configuration key, including `entities`, lamp overrides, `columns`, dimensions, spans, header tallies/controls, alarm output, ACK settings/state, interactions, and rules. Presets are configuration data rather than browser-local state, so they travel with the card and dashboard backup. They are never applied during migration or card loading.

### `lamp_appearance_presets`

The visual editor stores each lamp preset as `{id, name, values}`. IDs are editor-managed, names are trimmed to 60 characters, and the list is capped at 24 entries. `values` contains only these normalized visual keys:

`color_behavior`, `use_color_override`, `colors`, `font_family`, `font_custom`, `icon_size`, `icon_color_enabled`, `icon_color_mode`, `icon_color`, `icon_color_on`, `icon_color_off`, `shape`, `translucent_illumination`, `lamp_style`, `lens_type`, optional canonical `lamp_brightness`, and the normalized compatibility alias `inactive_lamp_mode`.

A preset captured from a lamp with a valid canonical `lamp_brightness` stores and applies that object. A legacy-only preset deliberately omits the canonical object. Applying that legacy preset removes a receiving lamp's canonical override, retains the preset's `inactive_lamp_mode`, and resolves its dim level from the receiving panel. This preserves old alias semantics instead of silently baking the canonical 32% default into the preset.

Applying a lamp preset preserves all excluded fields, including `entity`, `cell_type`, `source_mode`, Derived base state, `lamp_type`, `severity`, name/text modes and content, the `icon` identity, alert/ACK fields, alarm-output participation, interactions, rules, group, pair metadata, row/column spans, UID, and ACK slot. The same preset can therefore be applied to one lamp or a bulk selection without changing what those lamps represent or operate.

Quick setup/Full editor mode, open disclosures, navigator search/page, bulk selection, and staged bulk values are editor-session state. They are deliberately not serialized into the card configuration.

### `lamp_brightness`

The same canonical object is accepted globally and on a lamp. Global `profile` accepts `normal`, `dim_off`, `dim_on`, `dim_non_alert`, `dim_all`, or `custom`; a lamp additionally accepts `inherit`. An inherited lamp uses the resolved complete global object.

| Field | Range/default | Purpose |
| --- | --- | --- |
| `profile` | global `normal`; lamp `inherit` | Selects the mapping below. |
| `dim_level` | 10–100; `32` | Shared level used by predefined dim profiles. Canonical `100` is preserved. |
| `off` | 10–100; resolved `dim_level` | OFF level used by `custom`. |
| `on` | 10–100; `100` | ON level used by `custom`. |
| `alert` | 10–100; `100` | Active alarm/change-alert level used by `custom`. |

| Profile | OFF | ON | ALERT |
| --- | ---: | ---: | ---: |
| `normal` | 100 | 100 | 100 |
| `dim_off` | `dim_level` | 100 | 100 |
| `dim_on` | 100 | `dim_level` | 100 |
| `dim_non_alert` | `dim_level` | `dim_level` | 100 |
| `dim_all` | `dim_level` | `dim_level` | `dim_level` |
| `custom` | `off` | `on` | `alert` |

Runtime precedence is INOP/Lamp Test at 100, then an active main alarm condition or change alert at ALERT brightness even after ACK, then the resolved final ON or OFF state. Paired halves resolve independently. One captured Lamp Test snapshot is used for the complete render so its timer cannot expire between lamp-state evaluation and brightness resolution.

A valid explicit canonical object wins over aliases. A malformed/profile-less canonical value is ignored and removed during normalization, so valid legacy aliases remain effective. If no valid canonical object exists, global `inactive_lamp_default: normal|dim` maps to `profile: normal|dim_off`, and `inactive_lamp_brightness` maps to `dim_level` after the legacy value is normalized through the historical 10–90 range. Per-lamp `inactive_lamp_mode: inherit|normal|dim` maps to `profile: inherit|normal|dim_off`. If all canonical and legacy fields are absent, the result is Normal/full. Canonical percentages accept only finite numbers or nonblank numeric strings; null, blank, non-finite, boolean, array, and object values use the field's documented fallback instead of JavaScript numeric coercion. The visual editor reads aliases without rewriting configuration merely because Lamp lighting, the live OFF · ON · ALERT preview, a lamp, or Bulk edit was opened; the preview refreshes as an intentional numeric edit is made, explicit edits write the canonical object, and staged bulk **Brightness** changes require Apply.

```yaml
lamp_brightness:
  profile: custom
  dim_level: 32
  off: 24
  on: 68
  alert: 100

entities:
  - entity: binary_sensor.boiler_alarm
    lamp_brightness:
      profile: inherit
```

### `header_tallies`

Every tally is opt-in. `active`, `alarm`, `unacknowledged`, `total`, and `unavailable` are live panel snapshots. `alarms_day`, `alarms_week`, `alarms_month`, and `alarms_year` are historical values whose source is selected by `history_source`.

The historical labels may be changed with `alarms_day_label`, `alarms_week_label`, `alarms_month_label`, and `alarms_year_label`. Their defaults are `ALARM DAY`, `ALARM WEEK`, `ALARM MONTH`, and `ALARM YEAR`. Labels are trimmed, limited to 80 characters, and rendered as text; blank or malformed values restore the corresponding default.

| Field | Default | Purpose |
|---|---:|---|
| `history_source` | `local` | `local` counts browser-observed arrivals; `entities` reads Home Assistant entity states. Invalid values normalize to `local`. |
| `alarms_day_entity` | empty | Entity supplying the enabled Day value in entity mode. |
| `alarms_week_entity` | empty | Entity supplying the enabled Week value in entity mode. |
| `alarms_month_entity` | empty | Entity supplying the enabled Month value in entity mode. |
| `alarms_year_entity` | empty | Entity supplying the enabled Year value in entity mode. |

With `history_source: local`, totals are stored under the card's `panel_id` in the current browser. The card counts each stable Alarm/Trip lamp identity once when it observes a new active condition, does not recount ordinary rerenders/reloads, and can count it again after normal and reactivation. The windows are rolling 24 hours, 7 days, 30 days, and 365 days. **Reset alarm history → Clear saved alarm totals** clears only these local counters and baselines currently active alarms. Clearing site data also removes the history. Local mode cannot backfill alarms that occur while no relevant card is open and connected.

With `history_source: entities`, the card performs no local history reads, writes, arrival tracking, or expiry scheduling. Each enabled historical tally reads its configured entity's current state. A finite non-negative numeric state is displayed; a blank/missing entity, missing state, `unknown`, `unavailable`, nonnumeric, non-finite, or negative value is displayed as `—`, not `0`. The card does not enforce a time window, create/increment/reset the source, or query Recorder. The local reset control is hidden. Use Home Assistant automations, helpers, integrations, or statistics sensors to maintain whatever shared authoritative totals the installation requires.

See [`examples/shared-historical-tallies.yaml`](../examples/shared-historical-tallies.yaml) for an entity-backed card example.

### `panel_appearance`

Panel-surface colors require their matching `_enabled` switch. Lamp-frame selection is independent of the panel/grid frame.

| Field | Default | Purpose |
|---|---:|---|
| `background_enabled` / `background` | `false` / empty | Panel interior background. |
| `background_none` | `false` | Remove the panel background surface completely. |
| `border_enabled` / `border` | `false` / empty | Card outer-edge color. |
| `border_none` | `false` | Remove the panel outer edge and its panel shadow. |
| `frame_enabled` / `frame` | `false` / empty | Outer panel/grid frame color. |
| `frame_none` | `false` | Remove the outer grid surround while retaining configured spacing. |
| `lamp_frame_mode` | `follow_panel` | `follow_panel`, `theme`, or `custom`. Missing values use compatibility mode. |
| `lamp_frame` | empty | Lamp bezel color used only when `lamp_frame_mode: custom`. |
| `lamp_frame_none` | `false` | Remove lamp frames/bezels and their frame shadows while leaving lenses visible. |
| `lamp_border_none` | `false` | Remove the line directly around every lamp lens. |
| `radius_enabled` / `radius` | `false` / `12` | Optional complete-panel/background/border corner radius (0–120px). |
| `frame_radius_enabled` / `frame_radius` | `false` / `12` | Optional outer grid-frame corner radius (0–120px). |

`follow_panel` applies an explicitly enabled outer frame to lamp bezels, preserving the established compatibility behavior. `theme` keeps the lamp bezel on the selected panel theme while allowing an independent outer frame. `custom` uses `lamp_frame` for every lamp bezel. Shaped lamps use the same resolved color around their actual shape; they do not receive a rectangular lamp border.

The `*_none` fields are explicit visual-layer switches. They take precedence over a saved color override without deleting that saved color, so turning a None switch back off restores the previous choice. All default to `false`; missing v1.0.2 configurations therefore keep their established surfaces exactly.

### `spacer_appearance`

The top-level object sets the panel default. An individual spacer can store the same object under its `entities` entry; per-spacer mode additionally accepts `inherit`.

| Field | Values / type | Default | Purpose |
|---|---|---:|---|
| `mode` | `default`, `blend`, `custom`; per spacer also `inherit` | global `default`; per spacer `inherit` | Compatibility lens, transparent gap, custom surfaces, or panel inheritance. |
| `fill` | CSS color | global OFF color | Interior fill in Custom mode. |
| `bezel` | CSS color | global Blank spacer color | Spacer frame/bezel in Custom mode. `frame` is accepted as a YAML alias. |
| `border` | CSS color | `rgba(0,0,0,0.55)` | Interior border in Custom mode. |
| `border_width` | number, 0–24 | `2` | Custom border width in pixels. |
| `fill_none` | boolean | `false` | Make only the spacer fill transparent in Custom mode. |
| `bezel_none` | boolean | `false` | Remove only the spacer frame/bezel and its shadow in Custom mode. |
| `border_none` | boolean | `false` | Remove only the spacer lens border in Custom mode. |

Blend makes the cell transparent and suppresses its lens, frame/bezel, border, glare, and shadow. Missing top-level configuration preserves the v1.0.2-compatible spacer rendering exactly.

Custom mode can combine `fill_none`, `bezel_none`, and `border_none` independently. The same fields work in the top-level default and in a single spacer override.

### `header_appearance`

All color fields require their matching `_enabled` flag to be `true`. Disabled or omitted fields retain the existing component/theme value.

| Field | Default | Purpose |
|---|---:|---|
| `background_enabled` / `background` | `false` / empty | Complete header background. |
| `background_none` | `false` | Remove the complete header background surface. |
| `border_enabled` / `border` / `border_width` | `false` / empty / `1` | Complete header border color and width (0–12px). |
| `border_none` | `false` | Remove the complete header border. |
| `title_color_enabled` / `title_color` | `false` / empty | Panel-title font color. |
| `tally_color_enabled` / `tally_color` | `false` / empty | Font color for every live and historical tally. |
| `button_text_enabled` / `button_text` | `false` / empty | Header-control font color. |
| `button_background_enabled` / `button_background` | `false` / empty | Normal header-control fill. |
| `button_background_none` | `false` | Remove normal and hover button fills while keeping buttons operable. |
| `button_hover_enabled` / `button_hover` | `false` / empty | Hovered header-control fill. |
| `button_border_enabled` / `button_border` / `button_border_width` | `false` / empty / `1` | Header-control border color and width (0–12px). |
| `button_border_none` | `false` | Remove all header-control borders. |
| `font_family` | `inherit` | `inherit`, `condensed`, `system`, `monospace`, `serif`, or `custom`. |
| `font_custom` | empty | Installed font name or CSS font stack used when `font_family: custom`. Delimiters that could break a CSS declaration are removed. |
| `font_weight` | `inherit` | `inherit`, `400`, `500`, `600`, `700`, `800`, or `900`. |
| `title_font_size_enabled` / `title_font_size` | `false` / `16` | Optional title size (8–72px). |
| `tally_font_size_enabled` / `tally_font_size` | `false` / `12` | Optional tally size (8–48px), including mobile. |
| `button_font_size_enabled` / `button_font_size` | `false` / `12` | Optional control-label size (8–48px). |
| `button_radius_enabled` / `button_radius` | `false` / `8` | Optional control corner radius (0–40px). |
| `radius_enabled` / `radius` | `false` / `12` | Optional complete-header background/border corner radius (0–80px). |

### `alarm_output`

The visual editor's **Home Assistant media browser** fills the media fields and optional display metadata. Manual YAML and the editor's collapsed **Manual media settings** fallback remain supported.

| Field | Default | Purpose |
|---|---:|---|
| `mode` | `none` | `none`, `media_player`, `script`, or `advanced_action`. |
| `media_player` | empty | Target `media_player` entity for media mode. |
| `media_content_id` | empty | Picker-generated `media-source://` ID or a manually entered direct URL. |
| `media_content_type` | `music` | Media type passed to `media_player.play_media`. The picker normally supplies it. |
| `media_metadata` | `{}` | Optional picker display metadata such as title, thumbnail, class, and navigation IDs. It is not sent to `play_media`. |
| `script` | empty | Script entity started in script mode. |
| `silence_script` | empty | Optional Script-mode reversal/stop script used after a successful start when SILENCE is selected, no active audible alarms remain, the sounding output configuration changes, or the card disconnects. |
| `action` | `{}` | Start service/action for advanced-action mode. |
| `silence_action` | `{}` | Optional stop service/action for advanced-action mode and the Script-mode fallback when `silence_script` is empty. |

```yaml
alarm_output:
  mode: media_player
  media_player: media_player.hall
  media_content_id: media-source://media_source/local/FGD Alarm.mp3
  media_content_type: audio/mpeg
  media_metadata:
    title: FGD Alarm.mp3
```

`media_metadata` is optional. Removing it does not affect playback. SILENCE calls `media_player.media_stop`; an unchanged alarm remains silent, while a newly arriving participating alarm re-sounds.

Script example:

```yaml
alarm_output:
  mode: script
  script: script.start_annunciator_horn
  silence_script: script.stop_annunciator_horn
```

Script mode invokes both configured entities with `script.turn_on`; it deliberately does not use `script.turn_off`, which cannot reverse arbitrary devices/services changed by the start script. After Start script succeeds, the applied configuration's `silence_script` is used when SILENCE is selected, the active audible-alarm set becomes empty, the sounding output configuration changes, or the card disconnects. When the configuration changes while sounding, the old applied stop configuration runs before any eligible new output starts. An advanced YAML `silence_action` remains the fallback for these stop transitions when `silence_script` is absent. SILENCE never changes ACK or source-entity state. If Start script fails, the output is not marked as sounding and no matching stop call is scheduled for that failed start.

Alarm output is executed by each browser card instance. It requires an open, awake, connected dashboard and a signed-in user allowed to call the configured service. Several open instances can each call the same target. Silence state is held by the live card instance and can be recreated by a card/browser reload. Use Home Assistant automations for unattended, server-owned, or critical alarm notification.

See [`examples/script-alarm-output.yaml`](../examples/script-alarm-output.yaml) for the Script/Silence script form.

## Core top-level keys

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `title` | string | empty | Optional panel header title. |
| `panel_id` | string | `annunciator_panel` | Namespace used by ACK storage. Use unique IDs for independent panels. |
| `panel_mode` | string | `operator` | `operator` or `presentation`. |
| `presentation_allow_more_info` | boolean | `true` | In Presentation mode, optionally allow More info. Control/ACK actions remain blocked. |
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
| `corner_style` | string | `rounded` | `rounded` or `sharp` for inherited/Round rectangle lamp bezels and lens borders. Explicit shapes retain their geometry. |
| `corner_radius` | number | `12` | Lamp bezel/lens radius in pixels when rounded. |
| `font_size` | number | `13` | Lamp text size. |
| `font_weight` | string/number | `700` | Lamp text weight. |
| `lamp_font_family` | string | `inherit` | Panel lamp font: `inherit`, `condensed`, `system`, `monospace`, `serif`, or `custom`. Missing/`inherit` preserves the built-in v1.0.2 font stack. |
| `lamp_font_custom` | string | empty | Installed font name or CSS font stack used when `lamp_font_family: custom`. |
| `line_height` | number | `1.15` | Lamp line-height multiplier. |
| `unavailable_text` | string | `INOP` | Text shown for missing/unknown/unavailable source entities. |
| `panel_theme` | string | `classic` | `classic`, `avionics`, or `neon`. |
| `default_lamp_style` | string | `modern` | `modern` or `retro`. |
| `allow_lamp_style_override` | boolean | `true` | Allow individual lamps to choose Modern/Retro. |
| `default_lens_type` | string | `plastic` | `plastic`, `glass`, `frosted`, or `smoked`. |
| `allow_lens_override` | boolean | `true` | Allow per-lamp lens selection. |
| `imperfections` | boolean | `true` | Stable per-lamp surface variation. |
| `flicker` | boolean | `false` | Visible irregular flicker on active Retro lamps. Active alert effects temporarily take animation priority; flicker resumes afterward. Reduced-motion preferences disable it. |
| `retro_warmup` | boolean | `true` | Retro warm-up/cool-down animation. |
| `lamp_brightness` | object | `{profile: normal}` | Canonical global brightness profile and normalized levels. |
| `inactive_lamp_default` | `normal` or `dim` | omitted | Legacy profile alias used when no valid canonical `lamp_brightness` object exists. |
| `inactive_lamp_brightness` | number, historical 10–90 | omitted | Legacy `dim_level` alias used when no valid canonical `lamp_brightness` object exists. |
| `appearance_presets` | array | omitted | Named portable panel-wide appearance snapshots; maximum 24. |
| `lamp_appearance_presets` | array | omitted | Named portable lamp visual styles; maximum 24. |
| `severity_colors` | object | see below | Global color overrides. |
| `severity_appearance` | object | `{}` | Optional severity → lamp style/lens map. |
| `ack_store` | object | `{type: local}` | ACK storage backend. |
| `ack_rearm_default` | `auto` or `manual` | `auto` | Effective rearm mode for lamps using `ack_rearm: inherit`. |
| `spacer_appearance` | object | `{}` | Panel-wide spacer appearance default; see above. |
| `show_ack_all` | boolean | compatibility mirror | Legacy v1.0.2 visibility for the ACKNOWLEDGE action. |
| `show_clear_ack` | boolean | compatibility mirror | Legacy v1.0.2 visibility for the CLEAR ACKNOWLEDGED action. |
| `pair_ack_lock` | boolean | `false` | Link pair ACK/Clear behavior. |
| `lamp_test_entity` | string | empty/null | Home Assistant helper/entity used for Lamp Test. |
| `lamp_test_mode` | string | `steady` | `steady` or `full`. |
| `show_group_headers` | boolean | `false` | Show group header rows. |
| `group_ack` | object | implicit defaults | Group ACK behavior. |
| `group_header` | object | implicit defaults | Group-header controls/styling. |
| `history_overlay` | object | disabled | Diagnostics/history overlay options. |
| `next_ack_slot` | number | `1` | Internal monotonic ACK slot allocator. Normally managed by editor. |
| `entities` | array | `[]` | Lamp/spacer definitions. |

### Compatibility top-level ACK keys

These remain readable for v1.x compatibility. `header_controls` is the normal v1.1 configuration model.

| Key | Meaning |
| --- | --- |
| `show_ack_all` | v1.0.2 ACK ALL visibility; maps to `header_controls.acknowledge.enabled`. |
| `show_clear_ack` | v1.0.2 CLEAR ACK visibility; maps to `header_controls.clear_acknowledged.enabled`. |
| `show_reset_ack` | Old single header ACK button visibility. |
| `reset_ack_action` | Old action: `clear` or `ack_all`. |
| `reset_ack_label` | Old custom label retained when the corresponding action is migrated. |

Compatibility mapping:

- old Clear-only → only `header_controls.clear_acknowledged` is enabled;
- old ACK-All-only → only `header_controls.acknowledge` is enabled;
- old hidden button → both hidden;
- a minimal old config with no header keys keeps the historical Clear-only behavior;
- new visual-editor cards enable ACKNOWLEDGE and CLEAR ACKNOWLEDGED, while SILENCE, RESET, and LAMP TEST remain optional.

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

ACK is stored per browser/device in local storage. Clearing site data removes it, and it is not visible to another browser/device.

### Persistent Home Assistant helper

```yaml
ack_store:
  type: input_text
  entity: input_text.annunciator_ack_map
```

The card uses compact adaptive encoding and falls back locally if a helper write fails or encoded state exceeds helper capacity. The connected browser performs the service write and requires permission to call `input_text.set_value`; this is shared card acknowledgement, not a server-side alarm controller, and it never changes the acknowledged source entity.

## Header controls

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

- controls render in the fixed order shown above;
- every control has independent `enabled` and `label` values;
- ACKNOWLEDGE acts only on currently active alert channels;
- SILENCE stops current alarm output without changing ACK state;
- RESET rearms cleared latched alarm state;
- LAMP TEST uses the configured helper or built-in three-second test;
- CLEAR ACKNOWLEDGED clears stored acknowledgement for the current panel namespace;
- all header controls are hidden in Presentation mode;
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

A legacy item whose `entity` is empty remains a spacer. New editor-created lamps use `cell_type: lamp` while waiting for entity selection, which prevents **Add lamp** and **Add paired lamp** from being mistaken for spacers. A Derived lamp also uses `cell_type: lamp` but explicitly sets `source_mode: derived`. An intentional spacer uses `cell_type: spacer`. The editor keeps UID/ACK identity so every physical cell can be moved or duplicated safely.

An empty-entity item may contain per-spacer `spacer_appearance`. Its mode can be `inherit`, `default`, `blend`, or `custom`; Custom accepts `fill`, `bezel`, `border`, and `border_width`.

### Identity and grouping

| Key | Type | Default | Meaning |
| --- | --- | --- | --- |
| `entity` | string | empty | Source Home Assistant entity. A legacy empty value is a spacer unless `cell_type: lamp` marks an unfinished editor-created lamp. |
| `cell_type` | `lamp`, `spacer` | inferred | Editor-managed distinction between an unfinished blank lamp and an intentional spacer. A non-empty entity always resolves as a lamp. |
| `source_mode` | `entity`, `derived` | `entity` | `derived` creates an operational lamp without a primary Home Assistant entity. |
| `derived_base_state` | `off`, `on` | `off` | Fallback logical state for a Derived lamp when no Conditional Rule matches. |
| `uid` | string | generated/persisted | Stable lamp identity. Normally editor-managed. |
| `ack_slot` | positive integer | allocated | Stable compact ACK slot. Normally editor-managed. |
| `lamp_type` | string | inferred/status for new lamps | `alarm`, `status`, `sensor`, `custom`. |
| `name_override` | string | empty | Custom display label. |
| `label_source` | string | entity/custom | Label source compatibility field. |
| `group` | string | empty | Exact, case-sensitive group name. The editor suggests existing names and synchronizes valid paired halves. |
| `note` | string | empty | Maintainer note; not rendered on panel. |

### Derived lamps

A Derived lamp is an entityless annunciator window with normal text/icon, appearance, alert, ACK, group, pair, span, live/historical tally, and alarm-output behavior. It uses a stable synthetic `off` or `on` base state, so it is available rather than INOP even though `entity` is empty. Ordered Conditional Rules can watch any Home Assistant entity and Force ON/OFF, select severity, override ON color, or select an alert effect.

```yaml
- uid: derived_pump_warning
  ack_slot: 12
  cell_type: lamp
  source_mode: derived
  derived_base_state: off
  lamp_type: alarm
  primary_mode: custom
  primary_text: PUMP WARNING
  content_mode: icon_text
  icon: mdi:pump
  enable_auto_styles: true
  auto_styles:
    - name: Follow pump fault
      source: entity
      source_entity: binary_sensor.pump_fault
      kind: state
      state: "on"
      severity: alarm
      alert: blink
      force_state: on
```

Lamp `group` values are exact and case-sensitive. The visual editor suggests existing values to prevent accidental capitalization variants and synchronizes an explicitly changed group across valid paired halves. Group suggestions, counts, and bulk selection are editor views, not extra schema keys.

Rules should reference the same underlying Home Assistant entity used by another lamp, not that lamp's final rendered state. This keeps evaluation deterministic and prevents circular lamp-to-lamp dependencies. If a referenced rule source is missing, unknown, or unavailable, that rule is skipped and the Derived lamp falls back to its base state.

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
| `content_mode` | `text`, `icon`, `icon_text` | `text` |
| `icon` | Home Assistant icon ID such as `mdi:server` | empty; use entity icon or domain fallback |
| `icon_size` | number, 12–160 | `40` |
| `icon_color_enabled` | boolean | `false` |
| `icon_color_mode` | `follow`, `single`, `state` | `follow`; an old enabled override maps to `single` |
| `icon_color` | CSS color | empty; used by `single` |
| `icon_color_on` | CSS color | empty; used by `state` when final logical state is ON |
| `icon_color_off` | CSS color | empty; used by `state` when final logical state is OFF |
| `icon_show_primary` | boolean | `true` |
| `icon_show_secondary` | boolean | `true` |
| `icon_show_tertiary` | boolean | `true` |
| `font_family` | `inherit`, `condensed`, `system`, `monospace`, `serif`, `custom` | `inherit` panel default |
| `font_custom` | installed font name or CSS font stack | empty |
| `use_templates` | boolean | `false` |
| `label_template` | string | `{{name}}` |
| `legend_template` | string | `{{value}} {{unit}}` |
| `primary_mode` | `custom`, `name`, `state`, `state_labels`, `dynamic` | `custom` (new lamps set `name`) |
| `primary_text` | string | empty |
| `secondary_mode` | `none`, `custom`, `state`, `state_labels`, `dynamic`, `entity_id`, `last_changed`, `last_updated` | `state` |
| `secondary_text` | string | empty |
| `tertiary_mode` | same info choices | `none` |
| `tertiary_text` | string | empty |
| `dynamic_text` | object keyed by `primary`, `secondary`, `tertiary` | omitted |

`text` preserves the original line renderer and explicitly removes the unused icon from layout, so text remains centered. `icon` hides Primary/Secondary/Tertiary while retaining INOP when unavailable. `icon_text` places the icon above any independently enabled Primary, Secondary, and Tertiary lines; enabled blank lines consume no space. A configured `icon` wins; otherwise the entity's `attributes.icon` is used, followed by a deterministic domain fallback. `follow` icon color inherits the resolved lamp text; `single` uses `icon_color`; `state` chooses `icon_color_on` or `icon_color_off` from the final logical state. Unavailable always inherits unavailable text color. Paired halves resolve these settings independently. Oversized icons are constrained by Square, Circle, and Indicator dot lenses. A per-lamp font overrides the panel lamp font; `inherit` preserves the panel/built-in stack. The visual editor's **Font preview** specimen uses the same resolved CSS stack as the corresponding lamp/panel/header setting. Theme/default and System may intentionally match; Condensed uses Arial Narrow/Roboto Condensed/Liberation Sans Narrow fallbacks.

### `dynamic_text`

Dynamic display configuration is opt-in per line. `state_labels` reads `labels`; `dynamic` evaluates `rules` from top to bottom and uses the first enabled match. A line stores at most 24 rules.

```yaml
primary_mode: state_labels
secondary_mode: dynamic
dynamic_text:
  primary:
    labels:
      on: ACTIVE
      off: TRIP
      unavailable: OUT OF SERVICE
      unknown: NO DATA
  secondary:
    fallback: NORMAL
    rules:
      - name: High pressure
        enabled: true
        kind: numeric
        text: HIGH
        rule:
          type: above
          a: 70
          inclusive: true
```

Rule `kind` values are `lamp_on`, `lamp_off`, `unavailable`, `unknown`, `state_equals`, `string`, `numeric`, `acknowledged`, `unacknowledged`, `alarm_active`, and `alarm_inactive`. `state_equals` uses `state`. `string` uses `match: contains|equals|starts_with|ends_with` plus `value`. `numeric` uses the existing threshold `rule` object (`type: above|below|between|equal`, `a`, optional `b`, and `inclusive`). Numeric rules read the transformed logic value; state/string rules read the current source state. ON/OFF reads the final logical lamp state after condition, invert, Always ON, Force ON/OFF, and Lamp Test. Alarm active/inactive represents the configured main alarm condition; ACK suppresses its attention effect but does not make an active alarm normal.

Line labels, fallback, names, match values, and result text are bounded and stripped of control characters. Unknown rule types normalize safely, malformed rule arrays become empty, and extra entries beyond 24 are discarded. Templates remain authoritative and bypass these line modes. Unavailable/Unknown labels or matching rules can replace global INOP; a generic fallback cannot hide INOP.

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
| `ack_rearm` | `inherit`, `manual`, `auto` | legacy missing value `manual`; new lamps use `inherit` |
| `alert_speed` | `slow`, `normal`, `fast` | `normal` |
| `alert_opacity_depth` | 0..1 | `0.5` |
| `alert_border_emphasis` | `none`, `soft`, `strong` | `soft` |
| `alert_wave_radius` | number | `10` |
| `alert_throb_subtlety` | 0..1 | `0.5` |

`inherit` resolves through top-level `ack_rearm_default`. Automatic rearm tests the configured `alert_when` condition, not whether a Blink/Pulse/etc. effect exists. It therefore works with steady/no-effect lamps, never clears for unavailable sources, and cannot naturally clear when `alert_when: both` because that mode has no normal state.

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

For a Derived lamp, `source: self` means its internal **Base state**. The normal choice is `source: entity` plus a selected `source_entity`. The visual editor's starter Derived rule is “Another entity equals `on` → Force ON.”

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

The visual editor's **Live rule trace** is not a configuration key. It calls the same pure rule-condition evaluator used by runtime selection and reports the current source/state, match result/reason, and first winning rule. Its exact reasons are `Disabled`, `Missing or unsupported condition`, `Missing source entity`, `Source entity not found`, `Source unavailable`, `Source unknown`, `Source is not numeric`, `Numeric threshold did not match`, `State did not match`, `String comparison did not match`, `Matched`, and `Not evaluated because an earlier rule matched`. Reading or refreshing the trace does not alter `auto_styles`, invoke actions, write ACK state, or call a Home Assistant service.

## Pair fields

```yaml
pair_id: pair_abc123
pair_mode: top       # top | bottom | none
pair_orientation: vertical   # vertical | horizontal
pair_shape_mode: split_pill  # independent | split_pill
```

A valid pair consists of exactly two compatible entries sharing `pair_id`, one TOP and one BOTTOM. **Add paired lamp** immediately creates one adjacent physical pair with two unfinished lamp halves, a shared generated Pair ID, independent ACK slots, and entity selectors for both halves. The relationship remains valid while either selector is still blank and is canonicalized automatically. `pair_shape_mode: split_pill` gives a vertical or horizontal pair one continuous capsule bezel and a center seam without joining its logical state, colors, text, icons, alerts, ACK, output, or interactions. Missing and malformed values normalize to `independent`, preserving existing-pair geometry.

## Lamp appearance fields

```yaml
lamp_style: inherit    # inherit | modern | retro
lens_type: inherit     # inherit | plastic | glass | frosted | smoked
lamp_brightness:
  profile: inherit     # inherit | normal | dim_off | dim_on | dim_non_alert | dim_all | custom
```

Panel-wide allow/lock settings determine whether per-lamp style/lens selections can override defaults. Lamp brightness inheritance is independent of those locks. A valid non-inherited per-lamp canonical object resolves its own profile and levels; `inactive_lamp_mode` remains the compatibility alias when no valid per-lamp `lamp_brightness` object exists.

## Internal identity fields

`uid`, `ack_slot`, `next_ack_slot`, and generated `pair_id` values are part of persistence/repair behavior. Manual editing is possible but discouraged. The editor and validation system are designed to keep them stable and unique.

## Resolution / precedence summary

### Lamp state

```text
condition → invert → always_on → rule force_state → Lamp Test
```

Derived-lamp change alerts compare the resolved final state after rule `force_state`, not an absent source-entity value. An unchanged final state does not retrigger solely because the card rerendered.

### Lamp brightness

```text
INOP or Lamp Test (100) → active alarm/change alert (ALERT) → final ON (ON) → OFF (OFF)
```

ACK can suppress the attention animation but does not downgrade an otherwise active alarm/change channel from ALERT brightness.

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

Each gesture uses the same suffixes. Replace `<gesture>` with `tap`, `double_tap`, or `hold`.

| Key | Type | Purpose |
| --- | --- | --- |
| `<gesture>_action` | string | `more_info`, `toggle`, `turn_on`, `turn_off`, `ack`, `clear_ack`, `perform_action`, `navigate`, `url`, or `none` |
| `<gesture>_target` | string | `self` or `entity` for entity-based actions |
| `<gesture>_entity` | string | Required when the entity target is `entity` |
| `<gesture>_service` | string | Valid `domain.service` for `perform_action` |
| `<gesture>_service_data` | object | Optional Home Assistant service data |
| `<gesture>_service_target` | object | Optional Home Assistant service target, passed separately from data |
| `<gesture>_navigation_path` | string | Local Home Assistant path for `navigate` |
| `<gesture>_url` | string | URL for `url`; executable schemes are rejected |

Incomplete or unsafe action details are configuration warnings and safe no-ops. They do not leave a misleading clickable lamp. Presentation mode continues to block every mutating or external action.

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
  - source_mode: derived
    primary_text: SERVICE TEST
    tap_action: perform_action
    tap_service: light.turn_on
    tap_service_data:
      brightness_pct: 50
    tap_service_target:
      entity_id: light.shop
```

### Header buttons

```yaml
type: custom:annunciator-grid-card
header_controls:
  acknowledge:
    enabled: true
  silence:
    enabled: true
  reset:
    enabled: true
  lamp_test:
    enabled: true
  clear_acknowledged:
    enabled: true
```
