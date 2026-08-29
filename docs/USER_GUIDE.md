# Annunciator Grid Card v1.1.0 — Complete User Guide

## v1.1.0 features

v1.1.0 is additive: existing v1.0.2 panels keep their legacy lamp geometry, labels, output behavior, and 1×1 layout until a new option is enabled.

- **Lamp shape**: Rectangle, Round rectangle, Pill, Square, Circle, or Indicator dot. The inherited setting preserves the v1.0.2 window. The outer bezel, border, lens, and text all follow the selected geometry rather than leaving a rectangular frame around circles or pills. Indicator dot uses roughly 80% of the available short side and includes a compact text layout.
- **Lamp icons**: each lamp can remain Text, show an Icon only, or combine an icon with any selected Primary, Secondary, and Tertiary lines. Choose a Home Assistant icon, set its size, and optionally override its color; otherwise it follows the entity/domain icon and current lamp text color.
- **Custom lamp fonts**: choose a panel lamp-font default and optionally override individual lamps with presets or an installed custom CSS font stack. A live **Font preview** uses the resolved browser stack. Existing cards keep their original built-in typeface.
- **Column span** and **Row span**: extend a lamp across cells. Placement uses collision-free physical blocks; a pair uses the larger span selected by either half.
- **Illumination**: translucent illuminated lens treatment while ON, with internal diffusion, a brighter lens surface, and a color-matched halo. It works with every lamp shape, style, lens material, and paired half. Retro illumination uses a full-color incandescent diffuser rather than the Modern-style white center.
- **Lamp brightness**: choose global or per-lamp Normal, Dim OFF, Dim ON, Dim non-alert, Dim all, or Custom OFF/ON/ALERT profiles. Per-lamp Inherit keeps setup simple; INOP and Lamp Test remain full brightness.
- **Appearance presets**: save up to 24 named panel-wide looks and 24 named lamp looks in the card configuration. Panel presets never change lamps or behavior; lamp presets contain visual fields only and never replace a lamp's identity, text/icon choice, severity, alarm behavior, rules, actions, group, pair, or span.
- **Pair orientation**: Vertical or Horizontal. Existing TOP/BOTTOM metadata stays readable; horizontally it means left/right.
- **Audible alarm**: opt a lamp into panel output. Existing lamps remain excluded.
- Header tallies: live ACTIVE, ALARM, UNACKNOWLEDGED, TOTAL, and UNAVAILABLE plus optional ALARM DAY, ALARM WEEK, ALARM MONTH, and ALARM YEAR totals. Every historical label can be renamed. Local-browser mode uses rolling 24-hour/7-day/30-day/365-day observations; entity mode displays the values maintained by the selected Home Assistant entities and does not impose a rolling window.
- Header controls, in fixed order: ACKNOWLEDGE, SILENCE, RESET, LAMP TEST, CLEAR ACKNOWLEDGED. Every control is independently visible and has a custom label.
- Header appearance: optional background/border, separate title/tally/button text colors, normal/hover button fills, button border, font family/weight, title/tally/button sizes, and button corner radius.
- Rounded surfaces: opt-in independent radii for the complete panel, outer grid frame, complete header, header buttons, and inherited/Round rectangle lamp bezels and borders. Explicit Rectangle, Pill, Square, Circle, and Indicator dot geometry remains authoritative.
- Explicit **None** switches independently remove the panel background/edge/frame, lamp bezels/lens borders, header background/border/button surfaces, and spacer fill/bezel/border. Saved colors are retained when a layer is temporarily removed.
- Alarm output modes: None, **Media player**, Script, and Advanced action. Media player mode includes Home Assistant's native media browser plus a collapsible manual URI/URL fallback. Script mode accepts separate Start and optional Silence scripts; Advanced action exposes a **Start service** and optional **Silence service**.
- Editor cleanup: **Quick setup** is the default for common lamp work, **Full editor** retains every specialist tab, existing group names are suggested with exact casing, paired halves remain group-consistent, and pair-safe bulk editing applies common settings only after an explicit Apply.
- Rule diagnostics: a read-only live trace explains the current result of every ordered Conditional Rule and identifies the first winner without changing the lamp or calling a service.

SILENCE stops output without acknowledging. An unchanged alarm stays silent; a newly arriving participating alarm re-sounds. RESET only rearms cleared alarm state. LAMP TEST toggles the configured helper or runs a local three-second test.

This guide covers normal setup, advanced annunciator behavior, acknowledgement, rules, interactions, panel appearance, diagnostics, compatibility, and common recipes.

> **Safety notice:** Annunciator Grid Card is a Home Assistant dashboard component. It is not a certified safety device and must not be the sole means of protecting people, equipment, or property.

## Table of Contents

1. [How to think about the card](#1-how-to-think-about-the-card)
2. [Installation and updating](#2-installation-and-updating)
3. [Optional Home Assistant helpers](#3-optional-home-assistant-helpers)
4. [Quick start](#4-quick-start)
5. [The visual editor](#5-the-visual-editor)
6. [Lamp navigator, lamps, pairs, and spacers](#6-lamp-navigator-lamps-pairs-and-spacers)
7. [Lamp types](#7-lamp-types)
8. [Setup: choosing when a lamp is ON](#8-setup-choosing-when-a-lamp-is-on)
9. [Color behavior: Standard, Severity, Custom, Legacy](#9-color-behavior-standard-severity-custom-legacy)
10. [Global colors](#10-global-colors)
11. [Display lines and templates](#11-display-lines-and-templates)
12. [Value conversion and formatting](#12-value-conversion-and-formatting)
13. [Alert behavior](#13-alert-behavior)
14. [Acknowledgement fundamentals](#14-acknowledgement-fundamentals)
15. [Header alarm controls](#15-header-alarm-controls)
16. [Change alerts](#16-change-alerts)
17. [Configurable Tap, Double tap, and Long press](#17-configurable-tap-double-tap-and-long-press)
18. [Conditional Rules](#18-conditional-rules)
19. [Cross-entity rules](#19-cross-entity-rules)
20. [Paired lamps](#20-paired-lamps)
21. [Groups](#21-groups)
22. [Lamp style and lens material](#22-lamp-style-and-lens-material)
23. [Panel themes and appearance](#23-panel-themes-and-appearance)
24. [Panel layout and sizing](#24-panel-layout-and-sizing)
25. [Lamp Test](#25-lamp-test)
26. [Operator and Presentation modes](#26-operator-and-presentation-modes)
27. [Persistent ACK storage](#27-persistent-ack-storage)
28. [Diagnostics and support package](#28-diagnostics-and-support-package)
29. [Validation and repair](#29-validation-and-repair)
30. [Keyboard and accessibility](#30-keyboard-and-accessibility)
31. [What wins? Precedence rules](#31-what-wins-precedence-rules)
32. [Behavior matrices](#32-behavior-matrices)
33. [Upgrade notes for older releases](#33-upgrade-notes-for-older-releases)
34. [Recipes](#34-recipes)
35. [Home Assistant Jinja and templates](#35-home-assistant-jinja-and-templates)
36. [Recommended practices](#36-recommended-practices)
37. [Visual editor field index and less-common controls](#37-visual-editor-field-index-and-less-common-controls)

## 1. How to think about the card

Each visible annunciator window is driven by a Home Assistant entity. The card resolves that entity through a predictable pipeline:

```text
Home Assistant entity
  → raw state/value
  → optional conversion / scale / offset
  → lamp ON/OFF condition
  → optional first matching Conditional Rule
  → final lamp ON/OFF state
  → color behavior / severity / custom color
  → optional alert effect
  → acknowledgement state
  → primary / secondary / tertiary display
  → lens / lamp / panel styling
```

The important simplification retained in v1.1.0 is that most users can ignore severity entirely. A normal lamp can simply be:

```text
condition true  → ON color
condition false → OFF color
```

Severity, rules, ACK, paired lamps, groups, change alerts, and alternate controls are there when you need them.

### “ON” means the lamp condition is true

The card's ON/OFF result is not always the literal Home Assistant entity state.

Examples:

- `light.porch` with the default truthy condition: `on` → lamp ON.
- `binary_sensor.door` with `state_equals`: `open` → lamp ON.
- `sensor.temperature` with numeric threshold `above 80`: `81` → lamp ON.
- a rule can Force ON or Force OFF after the normal condition.
- Lamp Test has final authority and forces populated windows ON for testing.

## 2. Installation and updating

### Install with HACS

Until the repository is part of the default HACS catalog:

1. Open **HACS**.
2. Open the HACS menu and choose **Custom repositories**.
3. Add `https://github.com/Fallen-Hero/annunciator-grid-card`.
4. Select **Dashboard**.
5. Open **Annunciator Grid Card** and choose **Download**.
6. Refresh Home Assistant after installation or update.

### Install manually

1. Download `annunciator-grid-card.js` from the latest GitHub Release.
2. Copy it to `<config>/www/annunciator-grid-card.js`.
3. Add this Lovelace resource:

```yaml
resources:
  - url: /local/annunciator-grid-card.js
    type: module
```

4. Reload Home Assistant, hard-refresh the browser, and confirm that the visual editor shows `v1.1.0`.

### Update from v1.0.2

Back up the dashboard configuration before updating. Update through HACS or replace the manually installed JavaScript file, then hard-refresh every browser that displays the panel. Existing v1.0.2 configurations preserve their established visuals and behavior unless a new v1.1 option is deliberately enabled.

### If an update appears not to load

Browsers and Home Assistant can cache frontend JavaScript aggressively. Try:

- hard-refreshing the browser;
- reloading the Home Assistant frontend;
- clearing site cache if necessary;
- verifying the browser console reports the expected Annunciator Grid Card version.

## 3. Optional Home Assistant helpers

The card does not require helpers, but two are useful.

### Shared persistent ACK helper

```yaml
input_text:
  annunciator_ack_map:
    name: Annunciator ACK Map
    max: 255
```

Select it under **Panel settings → Acknowledgement → ACK storage → Persistent input_text**.

Use persistent storage when multiple browsers/devices should share acknowledgement state.

### Lamp Test helper

```yaml
input_boolean:
  annunciator_lamp_test:
    name: Annunciator Lamp Test
```

Select it under **Panel settings → Advanced → Lamp test entity**.

## 4. Quick start

For the simplest possible lamp:

1. Add **Annunciator Grid Card**.
2. Choose **+ Lamp**.
3. Select an entity.
4. Leave **Lamp type = Status**.
5. Leave **Color behavior = Standard ON/OFF**.
6. Leave **Alert = None**.
7. Save.

A new lamp defaults to:

- Standard ON/OFF color behavior;
- STATUS-style intent;
- green ON;
- neutral/light OFF;
- no alert animation;
- **Use panel default** ACK rearm, with a new-card panel default of Automatic;
- Tap = More Info;
- Double tap = Acknowledge;
- Long press = Acknowledge.

This is deliberately simple for normal Home Assistant use.

## 5. The visual editor

The visual editor is divided into two main areas:

- **Lamp editor** for the selected lamp/cell.
- **Panel settings** for card-wide behavior.

A populated lamp opens in **Quick setup**. It contains the fields most people need for a straightforward ON/OFF or alarm lamp: source/entity, type and name, group, ON condition, content/icon/primary line, color behavior, severity, alert effect, and brightness choice.

Choose **Full editor** when you need every control. Full editor has seven tabs:

1. Setup
2. Display
3. Behavior
4. Appearance
5. Interaction
6. Rules
7. Advanced

Panel settings has six tabs:

1. Layout
2. Appearance
3. Acknowledgement
4. Alarm output
5. Groups
6. Advanced

Switching between Quick setup and Full editor changes only what the editor shows. It does not save an editor-mode field or modify the card. Full editor remains available immediately for line formatting, alert tuning, interactions, rules, pairing, spans, and diagnostics.

Long Appearance pages use eight compact disclosure sections: **Appearance presets**, **Quick appearance**, **Panel & frames**, **Spacers**, **Header**, **Lamp lighting**, **ON/OFF colors**, and **Advanced colors**. Quick appearance opens first; a saved preset library also opens when it contains presets. Open/closed state is remembered when a switch causes the editor to redraw. The lamp Appearance page uses **Lamp appearance presets**, **Colors**, **Shape & size**, **Lens & light**, and **Pairing**. This keeps ordinary ON/OFF setup short without removing advanced capability.

### Bulk editing

Select **Bulk edit** above the Lamp navigator to reveal checkboxes and staged common settings. Selecting either half of a valid pair includes both halves so a bulk operation cannot silently split pair-wide choices. The selection exists only for the current editor session and is not stored in the card.

Bulk editing can apply Group, lamp font/custom font, Shape, Lamp style, Lens, Color behavior, Icon size, **Brightness**, ACK rearm, alarm-output participation, or a saved lamp appearance preset. The Brightness bulk field stages a profile; Apply writes that profile using the panel's current levels. Save and bulk-apply a lamp appearance preset when the same independent Custom percentages must be copied. Existing mixed values are never overwritten merely by opening the panel, previewing brightness, or changing a staged selector: use the adjacent **Apply** button for the one setting you intend to change. One Apply creates one undo point and one configuration update for the selected lamps. Entity/source identity, names and display text, icon identity/color, type/severity, alert behavior, rules, actions, pairing, and spans are not general bulk-edit fields.

Use **Select this page** for only the currently filtered navigator page, **Select all lamps** for every operational lamp, and **Clear** to discard the transient selection. These selection controls do not modify card configuration.

Structural changes such as adding, deleting, moving, duplicating, pairing, and rule changes participate in Undo where supported.

### Alarm output and the media browser

Open **Panel settings → Alarm output**, choose **Media player**, and select the speaker or media-player entity. Then use **Home Assistant media browser** to choose the alarm sound from **My media** or another available media source. The picker saves the media content ID, content type, display title, and other harmless display metadata returned by Home Assistant.

For example, an item named `FGD Alarm.mp3` under **My media** can be selected directly; you do not need to discover or type its `media-source://` URI.

**Manual media settings** stays collapsed below the picker. Open **Media content ID or URL** only when you need to paste a `media-source://` URI or a direct HTTP(S) URL, or use **Media content type** when you need to override the detected type. Playback still sends only the media player, media content ID, and media content type to `media_player.play_media`; picker display metadata is not sent to the service.

For **Script** mode, **Start script** starts the audible output and the optional **Silence script** stops or reverses it. Both are invoked with `script.turn_on`; `script.turn_off` cannot undo devices that the start script has already changed. After Start script succeeds, the card uses the applied configuration's Silence script when SILENCE is selected, when the active audible-alarm set becomes empty, when a sounding output configuration is changed/replaced, or when the card disconnects. On a configuration change, the old applied stop configuration runs before a newly eligible output starts. If no Silence script is selected, an advanced YAML `silence_action` remains available as a fallback for those stop transitions. SILENCE does not acknowledge the lamp; a newly arriving participating alarm can start the output again.

See [`examples/script-alarm-output.yaml`](../examples/script-alarm-output.yaml) for a complete card fragment.

Alarm output is client-driven. At least one browser displaying this card must remain open, awake, connected, and authorized to call the service. Each open card instance can make its own service call, so do not point several simultaneously open dashboards at the same audible target unless duplicate calls are acceptable. Refreshing or recreating a card also recreates its local silence state. Use a Home Assistant automation for server-owned, unattended, or safety-critical notification behavior.

## 6. Lamp navigator, lamps, pairs, and spacers

The navigator treats the grid as physical panel cells instead of a raw entity list.

Small feature badges identify unusual settings without opening a lamp: **Paired**, **Span**, **Dynamic**, **Audible**, and **Override**. Dynamic covers Derived lamps, enabled Conditional Rules, and dynamic display text. Override is limited to meaningful per-lamp visual overrides so a normal v1.0.2-compatible lamp is not falsely marked.

- Cells are numbered `#01`, `#02`, and so on.
- A spacer counts as a physical cell.
- A TOP/BOTTOM pair counts as one physical cell.
- **Add lamp** creates an unfinished lamp and opens its entity selector; it is not treated as a spacer.
- **Add derived lamp** creates an operational lamp with no primary entity. Its custom text/icon and base state are controlled by normal Conditional Rules that watch other Home Assistant entities.
- **Add paired lamp** creates one adjacent paired cell with two selectable unfinished halves and an automatic Pair ID. Choose each half in the navigator and assign its entity.
- **Pair shape** can keep two Independent lamps or render a shared **Split pill**. Split pill works vertically or horizontally and changes only geometry: both halves retain separate state, color, text, icon, alert, ACK, output, and interaction behavior. Existing pairs default to Independent lamps.
- Search matches labels, entities, groups, pair information, and cell numbers.
- Pagination keeps large panels manageable.

### Move

Move Up/Down moves a physical cell. A valid pair moves atomically.

### Duplicate

Duplicating a lamp creates a new configuration item with its own identity/ACK slot. Duplicating a spacer creates another spacer.

### Delete

Deleting one half of a pair safely unpairs the survivor.

### Derived lamp

Use **Add derived lamp** when the panel needs a real annunciator window but no single Home Assistant entity should be its primary source—for example, a fixed **PUMP WARNING** label with an icon that illuminates when `binary_sensor.pump_fault` is on.

1. Select **Add derived lamp**.
2. In Setup, **Data source** is **Derived — rules only**.
3. Set **Base state** to OFF for the normal “dark until a rule matches” behavior, or ON when rules should turn it off.
4. In Display, enter custom Primary/Secondary/Tertiary text, choose Text/Icon/Icon + selected lines, and configure the icon normally.
5. In Rules, select **Add rule**, choose **Another entity**, select the underlying Home Assistant source, set the condition, and normally choose **Force ON** or **Force OFF**.

The starter Derived rule is “Another entity equals `on` → Force ON.” Rules remain ordered and first-match-wins. A Derived lamp is available rather than INOP, participates normally in ACK, pairing, grouping, spans, live/historical tallies, Lamp Test, dimming, and opt-in alarm output, and can use entity-targeted interactions by selecting **Another entity**.

Reference the same underlying Home Assistant entity used by another lamp, not another lamp's final rendered result. Direct lamp-to-lamp references are intentionally not offered because they can create ambiguous cycles. If an external source is missing, unknown, or unavailable, that rule is skipped and the Derived lamp returns to its Base state.

### Spacer

A spacer intentionally reserves an empty grid position. It now has a focused appearance editor:

- **Use panel default** inherits **Panel settings → Appearance → Spacer default**.
- **Compatibility appearance** preserves the established spacer lens and blank-color behavior.
- **Blend into panel (transparent gap)** removes the visible lens, frame/bezel, border, glare, and shadow so the cell reads as an intentional empty gap.
- **Custom fill / frame / border** exposes **No spacer fill**, **No spacer frame / bezel**, and **No spacer border** independently. **Spacer fill**, **Spacer frame / bezel**, **Spacer border**, and **Spacer border width** appear only for layers that remain visible.

The panel-wide Custom mode provides the same independent layers. A per-spacer mode always wins over the panel default. Select an entity in **Convert to lamp** to convert the spacer into a normal Standard ON/OFF status lamp.

## 7. Lamp types

Lamp type is an intent preset. It applies sensible defaults without removing advanced features.

### Status

Good for ordinary indicators such as:

- LIGHT ON
- PUMP RUNNING
- GARAGE OPEN
- FAN ACTIVE

Status favors Standard ON/OFF, severity STATUS, and no alert effect.

### Alarm

Good for conditions that need attention. Choosing Alarm moves a non-legacy lamp toward Severity mode, typically ALARM severity, and enables an alert-oriented configuration.

### Sensor

Good for continuously displayed numeric/text values. Sensor intent normally uses Always ON, Standard color behavior, and steady display.

### Custom

Use when the lamp intentionally combines behavior that does not fit the other presets.

## 8. Setup: choosing when a lamp is ON

### Entity

The Home Assistant entity that drives the lamp. Clearing the entity turns the cell into a spacer and safely breaks a pair.

### Label

Leave blank to use the entity friendly name, or enter a custom label.

### Group

Optional group name. Lamps with the same group can share group headers and group ACK controls.

### Condition modes

#### On / true / 1

Default truthy mode. Common ON states are treated as active.

#### State equals one of

Enter a comma-separated list such as:

```text
open,running,active
```

The source state must match one of those exact values.

#### String match

Available operators:

- Contains
- Equals
- Starts with
- Ends with

#### Numeric threshold

Available comparisons:

- Above
- Below
- Between
- Equal

Above/Below/Between can include or exclude the boundary.

For the lamp's own numeric condition, the comparison uses the **transformed logic value** after conversion, scale, and offset.

### Invert and Always ON

These are on the Advanced tab:

- **Invert** flips the normal condition result.
- **Always ON** forces the lamp ON after the normal condition/invert stage.

A Conditional Rule can then Force ON or Force OFF after those stages. Lamp Test runs last.

## 9. Color behavior: Standard, Severity, Custom, Legacy

### Standard ON/OFF

Recommended for most Home Assistant entities.

- ON → global ON color.
- OFF → global OFF color.
- Severity does not control the normal active color.
- A matching rule with an explicit ON color can still override the ON color.

### Severity

Recommended for traditional annunciator behavior.

When ON, the lamp uses one of:

- STATUS
- WARN
- ALARM
- TRIP

When OFF, the lamp uses the normal OFF color unless a Custom mode is chosen.

### Custom ON/OFF

Gives one lamp its own:

- ON color
- OFF color
- ON text
- OFF text
- Unavailable color
- Unavailable text

### Legacy compatibility

Existing v1.x lamps that do not have `color_behavior` stay on the compatibility resolver until you explicitly choose another mode.

Legacy mode preserves old severity/ON Window precedence where practical. The visual editor no longer exposes the redundant ON Window field for new work.

## 10. Global colors

Open **Panel settings → Appearance**.

### Saved appearance presets

Open **Appearance presets** at the top of the panel Appearance page. Enter a **Preset name** and choose **Save as new** to capture the current panel-wide look. When a **Saved preset** is selected:

- **Apply** changes the current panel-wide appearance to the saved look.
- **Update** replaces the saved look with the current appearance and any edited name.
- **Delete** removes only that preset.

Presets are saved under `appearance_presets` inside the card configuration, so they travel with dashboard backups and work on other devices. They snapshot the panel theme; default lamp style and lens; panel, header, and spacer appearance; global and severity colors/material mapping; optical-effect defaults; and the global lamp-brightness profile. They never snapshot lamp/entity entries, per-lamp overrides, grid dimensions, positions or spans, header tallies/controls, acknowledgement state or policy, interactions, rules, or alarm output. Saving a preset does not apply it, and applying one is explicit and undoable in the editor.

### Saved lamp appearance presets

Open a lamp in **Full editor → Appearance → Lamp appearance presets**. Enter a style name and use **Save as new** to capture that lamp's visual choices. **Apply**, **Update**, and **Delete** work like the panel preset controls. If Bulk edit is active, **Apply to selected** applies the style to every selected operational lamp, including both halves of a selected valid pair.

Lamp presets are stored under `lamp_appearance_presets` and travel with the card. They include color behavior and custom colors, lamp font, icon size and optional icon color, shape, translucent illumination, Modern/Retro style, lens material, and the per-lamp brightness profile. They intentionally exclude the source entity or Derived base, lamp name and display text, icon identity, lamp type and severity, alert/ACK behavior, rules, interactions, group, pair metadata, and row/column spans. This boundary makes one style reusable without accidentally changing what a lamp means or does.

Explicit custom lamp, global, and header color pairs are checked for readable contrast. Text warnings use a 4.5:1 target and icon warnings use 3:1. Warnings are advisory and never block saving. Theme variables, transparency, and CSS colors the editor cannot resolve reliably are not guessed. Complex per-lamp fields provide an adjacent inheritance reset for font, shape, lamp style, lens, brightness, and ACK rearm; icon color can similarly return to **Follow lamp text**, and spacer appearance can return to the panel default.

### Master global color switch

**Enable global color overrides** controls whether the global palette overrides built-in/theme defaults. Individual color choices are retained while the master switch is off.

### Standard colors

- ON / Active
- OFF / Inactive
- Unavailable

New-card defaults:

- ON: `#8bd66a`
- OFF: `#f2f2f2`
- Unavailable: `#bdbdbd`

### Severity colors

- STATUS: `#8bd66a`
- WARN: `#ffd24a`
- ALARM: `#ffb000`
- TRIP: `#ff3a2f`

These are primarily used by Severity/Legacy lamps and by rules that change severity.

### Advanced global colors

- ON text
- OFF text
- Unavailable text
- Blank spacer
- Frame fallback
- Panel

On new cards, **Frame fallback** and **Panel** overrides are disabled so Classic/Avionics/Neon can visibly own those surfaces. The fallback remains available for older YAML and theme compatibility.

### Outer panel frame and lamp frames

The **Outer frame** color changes the panel/grid frame. **Lamp frame source** independently decides what surrounds each lamp lens, including Pill, Square, Circle, and Indicator dot shapes:

- **Follow outer frame (compatibility)** keeps the existing v1.1 local-candidate behavior. An explicit outer-frame override is also used for lamp frames.
- **Theme / default bezel** keeps lamp frames on the selected Classic, Avionics, or Neon bezel even when the outer frame has a custom color.
- **Custom lamp frame color** reveals **Lamp frame / bezel**, allowing one card-wide lamp-frame color that does not change the outer frame.

Existing saved configurations without `lamp_frame_mode` normalize to **Follow outer frame (compatibility)**, so opening the new editor does not silently alter their appearance. The shaped bezel follows the selected lamp geometry rather than drawing a rectangular border around it.

### Quick None switches

Open **Panel settings → Appearance → Quick appearance** for the shortest path to a frameless or floating-lens layout:

- **No panel background**, **No panel border**, and **No panel frame** control the three panel layers independently.
- **No lamp bezels** removes rectangular and shaped bezels, including their frame shadows. It does not affect spacer styling.
- **No lens borders** removes the line directly around each lens while leaving the selected bezel visible.

These switches do not erase a saved custom color. Turning a switch off restores the previous theme/override source. All switches default off, so v1.0.2 configurations are visually unchanged.

When one or more panel/frame layers are disabled here, **Panel & frames** lists the hidden layers instead of opening to an unexplained blank section. If all four of its surfaces are disabled, select **Edit visibility** to return directly to **Quick appearance** and restore any layer you want to configure.

## 11. Display lines and templates

### Text or icon content

Open a lamp's **Display** tab and choose **Content**:

- **Text** is the unchanged compatibility default and uses the normal display lines below.
- **Icon only** replaces Primary, Secondary, and Tertiary with an icon. The unavailable INOP indicator remains visible.
- **Icon + selected lines** places the icon above any combination of Primary, Secondary, and Tertiary.

For either icon mode, **Icon** uses Home Assistant's icon selector. Leave it blank to use the entity's icon; if the entity does not declare one, the card uses a safe domain fallback. **Icon size** accepts 12–160px, with shaped lenses constraining oversized icons. **Icon color** can follow the lamp text, use one custom color, or use separate **ON icon color** and **OFF icon color** values. Unavailable icons always follow the unavailable text color so INOP remains legible. Existing single-color overrides automatically open as **One custom color**. In **Icon + selected lines**, **Text with icon** contains independent **Show primary**, **Show secondary**, and **Show tertiary** switches. A selected line that resolves to blank takes no space. Each paired half has its own icon and line settings.

**Lamp font** normally uses Panel / built-in default. Choose a font preset or **Custom CSS font** for one lamp; **Custom font** accepts an installed font name or CSS stack such as `"DIN Condensed", sans-serif`. The browser must already have the font—the card does not download fonts. The live **Font preview** specimen uses the same resolved stack as the lamp and shows the exact stack on hover. Theme/default and System may intentionally look alike. Condensed tries Arial Narrow, Roboto Condensed, and Liberation Sans Narrow before its fallback. The panel-wide **Lamp font** and conditional **Custom lamp font** controls are under **Panel settings → Layout**. Text-only lamps remove the unused icon element from layout so their text stays vertically centered.

### Normal display mode

Primary options:

- Custom text
- Label
- State / value
- ON / OFF labels
- Dynamic text rules

Secondary and Tertiary options:

- None
- Custom text
- State / value
- ON / OFF labels
- Dynamic text rules
- Entity ID
- Last changed
- Last updated

**ON / OFF labels** is the simple state-aware choice. Each line gets editable **ON text**, **OFF text**, **Unavailable text**, and **Unknown text**. ON/OFF uses the final logical lamp state after its condition, invert, Always ON, a rule's Force ON/OFF result, and Lamp Test. This makes a lamp show values such as `ACTIVE` while ON and `TRIP` while OFF without a template or helper entity.

**Dynamic text rules** is the advanced choice. Each line has an optional **Fallback text** and up to 24 ordered rules; the first enabled match wins. A rule can match Lamp ON, Lamp OFF, Unavailable/missing, Unknown, exact source state, **String match**, **Numeric threshold**, **ACK stored**, **No ACK stored**, **Main alert active**, or **Main alert inactive**. ACK refers to this lamp's stored acknowledgement. Main alert requires a configured visual Alert effect whose Alert when condition currently matches. State/string checks read the lamp's current source state, while Numeric threshold reads the transformed logic value after conversion, scale, and offset. **Text to match** appears for String match, and **Display text** is the result written to that line. Rules change text only; they do not change the lamp's logical state, color, severity, alert, or Home Assistant entity.

The read-only **Current display** line summarizes content, enabled display lines, font source, and dynamic-rule count. Open **Copy display settings**, choose the **Source lamp**, and select **Copy to this lamp** to copy its content mode, icon settings, font, line modes/text, dynamic text rules, templates, and value formatting. The selected lamp keeps its entity, name, alarm/ACK behavior, appearance, pairing, spans, interactions, group, UID, and ACK slot. One copy creates one undo step.

Unavailable/Unknown rules or labels can replace the normal INOP wording. If no such dynamic rule matches, the standard INOP indicator remains visible. This prevents a generic fallback from accidentally hiding an unavailable condition. Templates still take priority when **Use templates** is enabled.

### Lightweight templates

In Text or Icon + selected lines mode, enable **Use templates** to replace the normal line selectors with two substitution strings.

Available variables include:

```text
{{name}}
{{state}}
{{value}}
{{unit}}
{{acked}}
{{severity}}
{{attributes.xxx}}
```

These are display substitutions only. They are not full Home Assistant Jinja.

## 12. Value conversion and formatting

The numeric pipeline is:

```text
raw HA state
→ optional temperature conversion
→ scale
→ offset
→ transformed logic value
→ conditions/rules
→ display rounding
→ unit/prefix/suffix
```

### Conversion

- None
- °C → °F
- °F → °C

### Scale and offset

Formula after temperature conversion:

```text
(value × scale) + offset
```

`scale = 0` is valid.

### Display-only formatting

- Decimals: 0–3 in the visual editor.
- Rounding: Round / Floor / Ceil.
- Unit: Entity unit / Hide unit / Override.
- Value mode: Auto / Numeric / Text.
- Prefix.
- Suffix.

Malformed manual decimal settings are runtime-clamped so they cannot crash `toFixed()`.

### Cross-entity rule exception

A numeric rule whose source is **Another entity** uses that external entity's **raw numeric state**. The displayed lamp's own conversion/scale/offset is deliberately not applied to another entity.

## 13. Alert behavior

Open the Behavior tab.

The read-only **Current behavior** line summarizes the main alert, Alert when condition, effective ACK-rearm source, audible participation, and change-alert state. Per-lamp ACK rearm has an adjacent **Use panel default** action so a saved override can be removed explicitly.

### Alert effects

- None
- Blink
- Pulse
- Wave
- Throb
- Heartbeat
- Flash

### Alert when

- Lamp ON
- Lamp OFF
- ON or OFF

An OFF-state alert is useful for conditions such as “pump not running.”

### ACK rearm

Open **Panel settings → Acknowledgement → Default ACK rearm** to choose the new-lamp panel default. Then use **Behavior → ACK rearm** on an individual lamp to select **Use panel default**, **Manual**, or **Automatic**.

- **Manual** — ACK remains stored until **CLEAR ACKNOWLEDGED** or a per-lamp Clear ACK action removes it.
- **Automatic** — stored ACK clears only when the configured ON/OFF alert condition returns to normal.

Rearm follows the condition even when **Alert effect = None**; visual animation is not used as a proxy for alarm state. An unavailable/unknown source does not clear ACK. Automatic rearm also needs a normal/non-alert state. If the **Alert when** choice is **ON or OFF** (`both`), the condition is always eligible, so automatic rearm cannot naturally occur.

Compatibility is deliberate: an existing v1.0.2 lamp without `ack_rearm` normalizes to Manual. New lamps store `ack_rearm: inherit`, so changing **Default ACK rearm** can update their effective behavior without rewriting every lamp. An existing explicit Manual or Automatic lamp changes only if you select **Use panel default** for it.

### Effect tuning

Depending on effect:

- Speed: Slow / Normal / Fast
- Opacity depth
- Border emphasis: None / Soft / Strong
- Wave radius
- Throb subtlety

Reduced-motion browser preferences suppress attention animations for accessibility.

## 14. Acknowledgement fundamentals

ACK stops the currently active attention channel. It does **not** change the Home Assistant entity.

### Per-lamp Acknowledge

Acknowledge is idempotent:

- If a main alert is active, it is ACKed.
- If a change alert is active, it is ACKed.
- If both are active, both are ACKed with one operator action.
- Repeating Acknowledge does not un-ACK the lamp.

Use **Clear ACK** to remove acknowledgement state.

### Per-lamp Clear ACK

Clear ACK removes both the main and change ACK state for that lamp. With Pair ACK Lock enabled, the partner is cleared too.

### Lamp Test safety

ACK actions are blocked while Lamp Test is active so a test cannot accidentally change stored operator acknowledgement state.

## 15. Header alarm controls

Open **Panel settings → Acknowledgement**.

New cards can show five controls independently in this fixed order:

- **ACKNOWLEDGE** — acknowledges only alert channels that are currently active. It does not toggle source entities or pre-acknowledge inactive lamps. Pair ACK Lock is respected.
- **SILENCE** — stops the current panel alarm output without acknowledging it. A newly arriving participating alarm can re-sound the output.
- **RESET** — rearms cleared latched alarm state without changing a source entity.
- **LAMP TEST** — toggles the configured helper or starts the built-in three-second test.
- **CLEAR ACKNOWLEDGED** — clears stored acknowledgement for the current panel namespace so applicable alerts can indicate again.

Every control has an independent visibility switch and optional custom label. Presentation mode hides the controls, and Lamp Test blocks ACK mutations. With persistent `input_text` storage, CLEAR ACKNOWLEDGED preserves ACK data belonging to other panel namespaces in the same helper.

### Compatibility

v1.0.2 **ACK ALL** and **CLEAR ACK** settings and older single-header-button settings are still accepted. Existing configurations keep their saved visibility and labels when migrated. New cards use the longer ACKNOWLEDGE and CLEAR ACKNOWLEDGED labels.

## 16. Change alerts

Change Alert is independent of the lamp's normal ON/OFF condition.

Enable **Alert when state/value changes** when a state transition itself should request attention.

### Stop behavior

- Timed: stop after the configured number of seconds.
- Until ACK: remain active until acknowledged.

### Change effect

Can inherit the normal effect or use:

- Blink
- Pulse
- Wave
- Throb
- Heartbeat
- Flash
- No visual effect

### Change filter

- Any change
- State equals
- String match
- Numeric threshold

### Change tuning overrides

Speed, opacity, border emphasis, wave radius, and throb subtlety can inherit the normal alert or be overridden.

Changing card configuration does not intentionally manufacture a fake source-state change.

For a Derived lamp, change detection follows its resolved final ON/OFF state after ordered rules. An external rule that changes Force ON/Force OFF can therefore trigger the configured change alert, while rerenders that leave the final state unchanged do not repeatedly trigger it.

## 17. Configurable Tap, Double tap, and Long press

Open the Interaction tab.

Each gesture is independent:

- Tap / short press
- Double tap
- Long press

Available actions:

- More Info
- Toggle entity
- Turn On
- Turn Off
- Acknowledge
- Clear ACK
- Perform Action / service
- Navigate
- Open URL
- None

Defaults:

- Tap → More Info
- Double tap → Acknowledge
- Long press → Acknowledge

### Entity target

More Info / Toggle / Turn On / Turn Off can target:

- **This lamp entity**
- **Another entity**

If Another entity is selected but no entity is chosen, the action is a safe no-op instead of falling back to the displayed lamp.

### Service behavior

Toggle / Turn On / Turn Off use Home Assistant's `homeassistant.toggle`, `homeassistant.turn_on`, or `homeassistant.turn_off` service with the selected `entity_id`.

Perform Action uses a Home Assistant `domain.service` value. The visual editor exposes the service name; optional `<gesture>_service_data` and `<gesture>_service_target` objects remain available in YAML. A service target is passed through Home Assistant's target parameter rather than being mixed into service data.

Navigate accepts a local Home Assistant path such as `/lovelace/alarms`. Open URL accepts a normal URL and rejects executable schemes such as `javascript:` or `data:`. Missing, malformed, or unsafe action details are shown by the configuration check and remain safe no-ops without a clickable affordance.

### Gesture arbitration

The card waits long enough to determine the intended gesture before running the action.

- Double tap does not execute Tap twice.
- Long press does not execute Tap on release.
- Pointer movement/scroll cancels a hold.
- Very long holds and touch browsers without synthesized clicks are handled so the next real tap is not accidentally swallowed.

### Presentation mode

Presentation mode blocks control and ACK actions. More Info can optionally remain available.

## 18. Conditional Rules

Enable **Conditional Rules** on the Rules tab.

Rules are evaluated in order. **First matching rule wins.** Reorder them to make priority explicit.

### When types

- Numeric threshold
- State equals
- String match

### THEN actions

A matching rule can change:

- Severity
- Alert effect
- Lamp state: Inherit / Force ON / Force OFF
- ON color

### Rule severity and Standard mode

Changing severity only changes color if the lamp is in Severity or Legacy color behavior. If the lamp is Standard ON/OFF and a rule must change color directly, use the rule's **ON color**.

### Force state precedence

Rule Force ON / Force OFF is applied after normal condition, Invert, and Always ON. Lamp Test still has final authority.

### Live rule trace

Open **Full editor → Rules → Live rule trace** to inspect the current evaluation without changing configuration. The trace uses the same rule-condition evaluator as the runtime and shows the current source/state, whether each rule matched, why a rule was skipped, and which first match won. Its exact reason text is: **Disabled**, **Missing or unsupported condition**, **Missing source entity**, **Source entity not found**, **Source unavailable**, **Source unknown**, **Source is not numeric**, **Numeric threshold did not match**, **State did not match**, **String comparison did not match**, **Matched**, or **Not evaluated because an earlier rule matched**.

Use **Refresh trace** after changing a Home Assistant source state if the editor is already open. The trace is diagnostic only: it does not call a service, acknowledge an alarm, trigger an interaction, or save anything. ACK, Lamp Test, and temporary change-alert timers are intentionally not simulated; the rendered card remains authoritative for those transients and for audible-output/service-execution state.

## 19. Cross-entity rules

Rule source can be:

- This lamp entity
- Another entity

For a Derived lamp, the first choice is labeled **Derived base state**. **Another entity** is normally the useful choice and watches the selected Home Assistant source directly.

Examples:

- Show a porch-light lamp red when `binary_sensor.front_door` is open.
- Force a ventilation lamp OFF when `input_boolean.maintenance_mode` is on.
- Change severity based on an external temperature sensor.

### Safe incomplete configuration

If Rule source = Another entity but no source entity is selected, that rule does not match. It never silently evaluates the lamp's own entity.

### Dynamic dependency tracking

When an external rule source changes, the card knows that lamps depending on that entity need reevaluation even if their own entity state did not change.

## 20. Paired lamps

A pair combines two independent lamps into one physical panel cell.

Typical use:

```text
TOP    PUMP RUN
BOTTOM PUMP TRIP
```

Each half keeps its own:

- entity;
- condition;
- color behavior/severity;
- alert behavior;
- display;
- interaction settings;
- rules.

The pair shares one physical grid position and is kept adjacent/canonicalized automatically.

Use **Add paired lamp** for the fastest setup. It creates TOP and BOTTOM as lamps even before their entities are selected, gives each half its own stable UID and ACK slot, and opens the TOP entity picker. After choosing the TOP entity, select the BOTTOM half in the paired navigator and choose its entity. Neither unfinished half becomes a spacer or loses its Pair ID. The individual **Pair with lamp** control remains available for combining two existing independent lamps.

### Top / Bottom

Changing one half from TOP to BOTTOM automatically swaps its partner.

### Pair ACK Lock

When enabled, acknowledgement/clear operations on one half also apply to the partner according to the active ACK channel.

## 21. Groups

Set the same **Group** text on related lamps. Quick setup and Full editor suggest the exact names already used by the card; choose a suggestion to avoid accidental variants, or type a new name deliberately. Group matching is case-sensitive, so `Boiler Room` and `boiler room` are different groups. Assigning a group to one half of a valid pair applies the same group to its partner.

Panel group options include:

- Show Group Headers
- Group ACK scope: All lamps / Alerting lamps only
- Include change alerts
- Show group ACK/Clear buttons
- Compact icon or text buttons
- Optional ACK alerts button
- Header background
- Header text color
- Bottom divider

For clean visual grouping, keep group members contiguous.

## 22. Lamp style and lens material

### Lamp style

- Panel default
- Modern
- Retro

### Lens material

- Panel default
- Plastic
- Glass
- Frosted
- Smoked

v1.0.2 strengthens the visual differences so the lens selection is more than a subtle shadow change.

Lens material changes the physical finish/optics, not the lamp's logical ON/OFF state or severity.

### Per-lamp override locks

Panel settings can disable per-lamp style or lens overrides. When locked, the lamp editor visibly disables those selectors instead of letting them appear to change something that will not render.

## 23. Panel themes and appearance

Themes:

- Classic
- Avionics
- Neon

The selected theme controls panel/bezel styling when Frame/Panel global overrides are disabled.

### Header appearance

Open **Panel settings → Appearance → Header**. Every setting is optional; leaving its override off preserves the existing Home Assistant/theme appearance.

- **Header background** controls the surface behind the title, tallies, and controls.
- **Header border** and **Header border width** style the complete header edge.
- **No header background** and **No header border** remove those complete layers independently.
- **Title text** and **Tally text** have independent font colors. Tally text applies to every live and historical tally.
- **Button text**, **Button background**, **Button hover background**, **Button border**, and **Button border width** style all five controls consistently.
- **No button backgrounds** keeps the buttons operable but removes both normal and hover fills. **No button borders** removes their outlines.
- **Header font** selects Theme/default, Condensed sans-serif, System sans-serif, Monospace, Serif, or Custom CSS font. **Custom header font** accepts an installed font name or CSS font stack. Its **Font preview** uses the same browser-resolved stack as the title, tallies, and buttons.
- **Header font weight** optionally applies a shared weight while preserving the original title/tally/button weights when left at Component defaults.
- Optional title, tally, and button font-size overrides are measured in pixels. The tally size also applies on mobile.
- Optional button corner radius accepts `0` for square controls or a rounded pixel radius.

These controls change appearance only. Header order, button behavior, tally calculations, SILENCE semantics, and presentation-mode restrictions remain unchanged.

### Historical alarm tallies

Open **Panel settings → Acknowledgement → Historical alarm tallies** to enable **ALARM DAY**, **ALARM WEEK**, **ALARM MONTH**, and **ALARM YEAR** independently. Each enabled tally exposes **Custom label**; leave it blank to restore its default.

**Tally source** has two choices:

- **Local browser observations** is the compatibility default. The card counts Alarm/Trip lamp arrivals it observes over rolling 24-hour, 7-day, 30-day, and 365-day windows. A continuously active alarm counts once; ordinary card updates and reloads do not add duplicates. After a lamp returns to normal, its next Alarm/Trip activation counts as another arrival.
- **Home Assistant entities** reads one optional sensor/entity for each enabled period. This is the right choice when phones, tablets, and wall panels should display one shared value or when a Home Assistant integration/automation maintains the authoritative count. The card displays the entity's finite non-negative numeric state. A missing entity, `unknown`, `unavailable`, nonnumeric state, negative value, or non-finite value displays `—`, never a misleading zero.

Local history is namespaced by **Panel ID** in this browser. It records only transitions seen while a card instance is running; it cannot backfill alarms that occurred while every relevant dashboard was closed, asleep, or disconnected. Clearing browser site data removes it. **Reset alarm history → Clear saved alarm totals** clears only the local totals and baselines currently active alarms so they remain at zero until they clear and reactivate. ACK state, entities, and Home Assistant Recorder data are not changed.

Entity-backed mode skips local event tracking, storage reads/writes, and expiry timers. It hides the local reset control because the card is read-only with respect to those sensors. Create and maintain the Day/Week/Month/Year source entities in Home Assistant using the automation, helper, integration, or statistics approach appropriate to your installation; the card does not create, increment, clear, validate the time window of, or backfill them.

See [`examples/shared-historical-tallies.yaml`](../examples/shared-historical-tallies.yaml) for the card-side configuration.

### Lamp brightness profiles

Open **Panel settings → Appearance → Lamp lighting** and choose a **Brightness profile**. Under a lamp's Quick/Full editor or **Appearance → Lens & light**, use **Brightness** for a local override or choose **Inherit** to use the panel profile. **Brightness** in Bulk edit stages a profile and changes nothing until its adjacent Apply button is selected.

| Profile | OFF | ON | ALERT |
| --- | ---: | ---: | ---: |
| Full brightness (`normal`) | 100% | 100% | 100% |
| Dim when OFF (`dim_off`) | Dim level | 100% | 100% |
| Dim when ON (`dim_on`) | 100% | Dim level | 100% |
| Dim while not alerting (`dim_non_alert`) | Dim level | Dim level | 100% |
| Dim all states (`dim_all`) | Dim level | Dim level | Dim level |
| Custom levels (`custom`) | OFF brightness | ON brightness | Alert brightness |

Canonical **Dim level** accepts 10–100% and defaults to 32%; 100 is preserved as a deliberate no-dim setting. Under Custom, **OFF brightness**, **ON brightness**, and **Alert brightness** each accept 10–100%; their defaults are Dim level, 100%, and 100%. Only finite numbers or nonblank numeric text are accepted; malformed null, blank, non-finite, boolean, array, or object values use those defaults. The editor's **OFF · ON · ALERT** preview displays the resolved levels and refreshes as you edit them. Reading that preview or merely opening Lamp lighting, a lamp editor, or Bulk edit does not change configuration, lamp state, ACK, or Home Assistant services.

Runtime precedence is fixed: an unavailable/unknown/missing entity uses the full-brightness INOP treatment, and Lamp Test forces 100%. Next, an active main alarm condition or change alert uses Alert brightness—even after the visual alert is acknowledged. Otherwise, the lamp's resolved final ON/OFF state selects ON or OFF brightness. Paired halves resolve independently. The Lamp Test decision is captured once for a complete render so a short test timer cannot expire between state evaluation and brightness application.

The old Dim until active behavior remains compatible. A valid canonical `lamp_brightness` object wins. A malformed or profile-less object is ignored/removed so it cannot mask the old fields. Without a valid canonical object, global `inactive_lamp_default: normal` maps to `lamp_brightness.profile: normal`, `inactive_lamp_default: dim` maps to `profile: dim_off`, and `inactive_lamp_brightness` maps to `dim_level` after its historical 10–90 normalization. Per lamp, `inactive_lamp_mode: inherit`, `normal`, or `dim` maps to `profile: inherit`, `normal`, or `dim_off`. Missing canonical and legacy fields resolve to Normal/full. Loading or opening an old card does not rewrite those aliases; a canonical object is saved only after the user deliberately edits the new brightness controls.

### Stable lens imperfections

Adds repeatable per-lamp surface variation. The imperfection system is separate from the material glare strength so it does not erase the visible difference between Plastic/Glass/Frosted/Smoked.

### Retro flicker

Optional visible incandescent flicker for active Retro lamps. It uses irregular stepped brightness changes rather than a smooth pulse. The lamp must be ON and resolved to the Retro style; Modern and OFF lamps intentionally do not flicker. When Blink, Pulse, Wave, Throb, Heartbeat, or Flash is actively demanding attention, that alert effect temporarily owns lens brightness and Retro Flicker pauses instead of multiplying two unrelated animation cycles. Flicker resumes automatically after the alert is acknowledged or becomes inactive. All animation is disabled when the browser or operating system requests reduced motion.

Retro translucent lenses retain distinct material treatments: Plastic is softly diffused, Glass retains directional glare, Frosted retains its fine texture, and Smoked remains attenuated. Alert effects preserve those material characteristics.

### Severity appearance mapping

Each severity may optionally select a style and/or lens:

- TRIP style/lens
- ALARM style/lens
- WARN style/lens
- STATUS style/lens

This is independent of normal Standard ON/OFF color behavior unless severity is actually being used to select appearance.

## 24. Panel layout and sizing

### Grid height

- Auto — fit configured physical cells.
- Minimum row count — reserve at least the configured Rows depth without hiding extra lamps.

### Panel sizing

- **Auto fit** — preserve configured proportions and scale down only when needed.
- **Fixed size** — use configured pixel dimensions with no scaling.
- **Horizontal scroll** — preserve full size and allow horizontal scrolling.

### Layout controls

- Columns
- Rows minimum
- Cell width
- Cell height
- Cell gap
- Mullion
- Outer frame
- Cell padding
- Font size
- Font weight
- Line height
- Rounded / Sharp corners
- Corner radius

Panel height calculations use occupied physical cells and account for group headers and the card header when it is actually visible.

## 25. Lamp Test

Choose a Home Assistant toggle entity under **Panel settings → Advanced → Lamp test entity**.

When the helper is ON, every populated window can be tested, even if its normal source entity is unavailable.

Modes:

### Illuminate only

Forces lamps ON steadily and suppresses normal alert animation.

### Full alert test

Forces lamps ON and exercises their configured normal effect. Stored ACKs do not prevent the visual test.

ACK mutations are blocked during Lamp Test.

## 26. Operator and Presentation modes

### Operator

Normal interactive mode. Lamp actions and ACK controls are enabled according to configuration.

### Presentation

Read-only mode.

- ACK is disabled.
- control actions are disabled.
- header ACK controls are hidden.
- More Info can optionally remain available.

If a Presentation panel has no title or other required header control, it does not reserve an empty ACK-only header row.

## 27. Persistent ACK storage

### Local browser

Requires no helper. ACK state is stored in browser local storage and is specific to that browser/device. Clearing site data removes it, and another browser or device does not see it.

### Persistent `input_text`

Stores a compact shared representation through Home Assistant.

The v1.x/v1.0.2 ACK system uses:

- stable monotonic ACK slots;
- compact adaptive encoding;
- dense bitset or sparse representation depending on which is shorter;
- panel namespace separation;
- local fallback when the helper is unavailable, too short, or a service write fails;
- an optimistic shadow so ACK feedback appears immediately while Home Assistant reflects the helper update.

A helper max length around 255 is recommended.

The card still performs ACK reads and writes from the connected browser. The signed-in user must be allowed to read the helper and call `input_text.set_value`, and a disconnected or rejected write can fall back to local state. The helper shares card ACK state; it does not acknowledge or reset the underlying Home Assistant entity, and it does not turn the card into a server-side alarm controller. Avoid assigning unrelated panels the same `panel_id` and helper unless shared acknowledgement is intentional.

## 28. Diagnostics and support package

Enable **Panel settings → Advanced → Diagnostics overlay**.

The overlay can expose useful runtime information such as:

- entity and UID;
- lamp type;
- raw state;
- raw and transformed numeric values;
- computed ON/OFF;
- condition;
- severity;
- active alert/effect/reason;
- ACK keys/state;
- change-alert status;
- matched Conditional Rule;
- group context;
- timestamps;
- copy tools.

The lamp Advanced tab includes:

- Copy lamp config JSON
- Copy diagnostic package

The diagnostic package includes card version, panel context, lamp config, entity state, and resolved evaluation.

## 29. Validation and repair

The card validates/repairs safe structural issues such as:

- duplicate/missing lamp identities;
- invalid ACK slots;
- malformed pair relationships;
- canonical TOP/BOTTOM ordering;
- malformed numeric formatting values;
- incomplete external rule/interaction targets.

The runtime avoids inventing unstable identities on every render. The visual editor persists safe identity/slot repairs.

## 30. Keyboard and accessibility

Focused lamp keyboard mapping:

- Enter = Tap
- Space = Double tap
- Shift+Space = Long press

This preserves the old practical behavior that Space acknowledges with default interaction settings.

Other accessibility behavior includes:

- keyboard-focusable lamps;
- `aria` labels on interactive controls;
- reduced-motion support;
- pointer movement cancellation for long press;
- readable disabled state for locked style/lens selectors.

## 31. What wins? Precedence rules

### Final lamp ON/OFF state

Typical order:

```text
normal condition
→ Invert
→ Always ON
→ matching rule Force ON / Force OFF
→ Lamp Test final override
```

### Rule selection

```text
Rule 1
→ if no match, Rule 2
→ if no match, Rule 3
→ ...
```

First match wins.

### Standard ON color

```text
matching rule explicit ON color
→ enabled global ON override
→ built-in ON fallback
```

### Severity ON color

```text
matching rule explicit ON color
→ selected enabled severity color
→ enabled global ON fallback
→ built-in fallback
```

### Custom ON color

```text
matching rule explicit ON color
→ per-lamp Custom ON color
→ enabled global ON fallback
→ built-in fallback
```

### OFF color

```text
Custom OFF color (Custom mode)
→ enabled global OFF override
→ built-in OFF fallback
```

### Legacy mode

Legacy mode preserves the older v1.x precedence, including legacy ON Window behavior when it exists.

### Style/lens

Per-lamp style/lens can win only if panel-wide per-lamp overrides are allowed. Otherwise the card resolves severity-specific appearance and panel defaults as applicable.

## 32. Behavior matrices

### ACK matrix

| Situation | Acknowledge | Clear ACK / rearm |
| --- | --- | --- |
| Main alert active | stops current attention | Manual: explicit Clear ACK; Auto: condition normal |
| Change alert active | acknowledges change channel | next qualifying change can alert again |
| Main + Change active | one ACK handles both active channels | channels rearm independently |
| Already ACKed | Acknowledge is a no-op | Clear ACK removes stored ACK |
| Pair ACK Lock | active half and linked partner follow pair behavior | Clear also follows pair lock |
| Header ACKNOWLEDGE | only active panel alert channels are ACKed | CLEAR ACKNOWLEDGED clears the panel ACK namespace |
| Lamp Test active | ACK mutation blocked | ACK mutation blocked |
| Presentation mode | ACK blocked | ACK blocked |

### Interaction matrix

| Action | Needs entity target? | Operator | Presentation |
| --- | --- | --- | --- |
| More Info | Yes | Yes | Optional |
| Toggle | Yes | Yes | No |
| Turn On | Yes | Yes | No |
| Turn Off | Yes | Yes | No |
| Acknowledge | No | Yes | No |
| Clear ACK | No | Yes | No |
| Perform Action | No | Yes | No |
| Navigate | No | Yes | No |
| Open URL | No | Yes | No |
| None | No | No action | No action |

### Color-mode matrix

| Mode | ON color | OFF color | Severity normally changes color? |
| --- | --- | --- | --- |
| Standard | Global ON | Global OFF | No |
| Severity | STATUS/WARN/ALARM/TRIP | Global OFF | Yes |
| Custom | Per-lamp ON | Per-lamp OFF | No, unless you intentionally use rule color |
| Legacy | v1.x compatibility resolver | v1.x compatibility resolver | Yes according to old behavior |

## 33. Upgrade notes for older releases

v1.1.0 is designed to keep older dashboards working while adding new configuration options.

### Existing color configuration

A lamp without `color_behavior` stays on Legacy compatibility. It is not silently converted to Standard mode.

### ON Window

Legacy ON Window settings remain readable. The redundant ON Window picker is removed from the normal editor. When you deliberately convert a legacy lamp to Custom ON/OFF, the migration preserves the color that actually had visual priority.

### Header controls

The old fields remain readable:

- `show_reset_ack`
- `reset_ack_action`
- `reset_ack_label`

v1.0.2 `show_ack_all` and `show_clear_ack` values and the older fields above are mapped safely into `header_controls`. Existing saved labels are retained; new cards use ACKNOWLEDGE, SILENCE, RESET, LAMP TEST, and CLEAR ACKNOWLEDGED.

### New lamps

New lamps use Standard ON/OFF and no alert by default. Choosing Alarm can opt the lamp into Severity/alert-oriented behavior.

### Existing ACK identities

ACK slots are monotonic and existing stable identities are retained/repaired where safe.

## 34. Recipes

### Simple controllable light

```yaml
type: custom:annunciator-grid-card
entities:
  - entity: light.porch
    lamp_type: status
    color_behavior: standard
    eval_mode: toggle
    alert_style: none
    tap_action: toggle
    double_tap_action: more_info
    hold_action: none
```

### Alarm that blinks until ACK

```yaml
type: custom:annunciator-grid-card
entities:
  - entity: binary_sensor.boiler_trip
    lamp_type: alarm
    color_behavior: severity
    severity: trip
    eval_mode: toggle
    alert_style: blink
    alert_when: on
    ack_rearm: auto
```

### Display one entity and control another

```yaml
type: custom:annunciator-grid-card
entities:
  - entity: binary_sensor.garage_door_open
    lamp_type: status
    color_behavior: standard
    tap_action: toggle
    tap_target: entity
    tap_entity: cover.garage_door
    double_tap_action: more_info
    double_tap_target: entity
    double_tap_entity: cover.garage_door
```

### Cross-entity rule that forces a lamp OFF

```yaml
type: custom:annunciator-grid-card
entities:
  - entity: switch.exhaust_fan
    color_behavior: standard
    enable_auto_styles: true
    auto_styles:
      - name: Maintenance lockout
        source: entity
        source_entity: input_boolean.maintenance_mode
        kind: state
        state: "on"
        force_state: off
```

### Numeric severity ladder

```yaml
type: custom:annunciator-grid-card
entities:
  - entity: sensor.stack_temperature
    lamp_type: sensor
    color_behavior: severity
    severity: status
    always_on: true
    enable_auto_styles: true
    auto_styles:
      - name: Trip
        kind: numeric
        rule: { type: above, a: 200, inclusive: true }
        severity: trip
        alert: blink
      - name: Alarm
        kind: numeric
        rule: { type: above, a: 175, inclusive: true }
        severity: alarm
        alert: pulse
      - name: Warning
        kind: numeric
        rule: { type: above, a: 150, inclusive: true }
        severity: warn
```

Because first match wins, highest-priority thresholds belong first.

## 35. Home Assistant Jinja and templates

Annunciator Grid Card runs in the browser. It does not execute Home Assistant's server-side Jinja engine.

The built-in `{{state}}`-style substitutions are intentionally lightweight display templates.

For full Jinja logic:

1. Create a Home Assistant Template Sensor or Template Binary Sensor.
2. Put the Jinja logic in Home Assistant.
3. Use the resulting entity as the lamp entity or cross-entity rule source.

This keeps advanced template logic in Home Assistant where it is natively supported.

## 36. Recommended practices

- Start simple: Standard ON/OFF, no alert.
- Add Severity only when severity meaning matters.
- Use Custom ON/OFF only when one lamp truly needs unique colors.
- Put highest-priority Conditional Rules first.
- Name important rules for diagnostics.
- Use Live rule trace before changing a complex rule chain; it explains the current first-match result without operating anything.
- Give separate panels unique `panel_id` values.
- Use persistent ACK only when shared operator state is useful.
- Use Home Assistant entity-backed historical tallies when values must agree across devices or include periods when no dashboard was open.
- Treat card alarm output as operator-interface feedback. Use Home Assistant automations for unattended, server-owned, or critical notifications.
- Test Lamp Test and ACK behavior before relying on an operator workflow.
- Use Presentation mode for read-only display dashboards.
- Keep paired lamps and group members visually/structurally organized.
- Use the diagnostic package when opening a bug report.
- Keep a dashboard backup before major upgrades or bulk configuration changes.

## 37. Visual editor field index and less-common controls

The main sections above explain the workflows. This final index calls out editor fields that are easy to overlook so the guide also serves as a field-by-field reference.

### Conditions and numeric ranges

- **Upper threshold** — appears when a Numeric threshold comparison uses **Between**. It is the second endpoint of the range. The Boundary switch controls whether the endpoints are included.

### Display text and templates

- **Content** — Text, Icon only, or Icon + selected lines. Existing lamps normalize to Text.
- **Icon** — optional Home Assistant icon override; blank uses the entity/domain fallback.
- **Icon size** — 12–160px before shape-aware fitting.
- **Icon color** — Follow lamp text, One custom color, or Separate ON / OFF colors. Unavailable follows unavailable text.
- **Custom icon color** — single icon color used in One custom color mode.
- **ON icon color** — icon color for the final logical ON state.
- **OFF icon color** — icon color for the final logical OFF state.
- **Text with icon** — compact group containing independent Show primary, Show secondary, and Show tertiary switches.
- **Lamp font** — inherit the panel/built-in default or choose Condensed, System, Monospace, Serif, or Custom CSS font.
- **Custom font** — installed font name or CSS stack for one lamp; displayed only for Custom CSS font.
- **Custom header font** — installed font name or CSS stack for the header; displayed only for Custom CSS font.
- **Font preview** — live specimen rendered with the resolved lamp, panel-lamp, or header font stack; hover it to inspect the exact stack.
- **Primary template** — first display line when lightweight card templates are enabled.
- **Secondary template** — second display line when lightweight card templates are enabled.
- **Primary text** — literal first-line text when Primary is set to Custom.
- **Secondary text** — literal second-line text when Secondary is set to Custom.
- **Tertiary text** — literal third-line text when Tertiary is set to Custom.
- **ON text** / **OFF text** — per-line text selected from the final logical state in ON / OFF labels mode.
- **Unavailable text** / **Unknown text** — per-line replacement for unavailable/missing and unknown states.
- **Fallback text** — dynamic-line result when no enabled text rule matches; it does not by itself hide INOP.
- **Add text rule** — adds an ordered, enabled starter rule; maximum 24 per display line.
- **Rule name** / **Rule enabled** — optional editor identity and skip switch for a dynamic text rule.
- **When** — dynamic text condition: logical state, availability, source state/string/numeric value, ACK, or alarm condition.
- **Text to match** — source-state text used by Contains, Equals, Starts with, or Ends with.
- **Display text** — text written to the selected Primary, Secondary, or Tertiary line when the rule wins.

These template fields use the card's built-in substitutions; they do not execute Home Assistant Jinja.

### Change-alert timing and tuning

- **Duration (seconds)** — how long a timed Change Alert remains active when Until ACK is not selected. `0` is accepted as an immediate/zero-duration setting.
- **Change speed override** — Slow, Normal, Fast, or Inherit from the main alert.
- **Change opacity override** — optional change-alert-only opacity depth; blank inherits.
- **Change border override** — optional change-alert-only border emphasis; blank/inherit follows the main alert.
- **Change wave radius** — optional Wave radius for the change alert; blank inherits.
- **Change throb subtlety** — optional Throb tuning for the change alert; blank inherits.

### Pair controls

- **Add paired lamp** — creates TOP/BOTTOM unfinished lamp halves as one physical cell, assigns their Pair ID automatically, and opens entity selection.
- **Pair with lamp** — selects another lamp to form one physical TOP/BOTTOM cell.
- **This half** — chooses whether the selected lamp is TOP or BOTTOM. Changing it swaps the partner automatically so the pair remains valid.

### Conditional Rule fields

- **Data source** — Home Assistant entity or Derived — rules only. Derived lamps do not require a primary entity.
- **Base state** — Derived lamp fallback OFF/ON state used when no rule matches.
- **Rule name** — optional operator/maintainer-friendly name shown in diagnostics.
- **Then severity** — changes the resolved severity. It changes the visible color only in Severity/Legacy color behavior unless the rule also specifies an explicit ON color.
- **Then alert** — Inherit, Off, Blink, Pulse, Wave, Throb, Heartbeat, or Flash for the matching rule.
- **Live rule trace** — read-only current-state explanation of every rule, including the first winner and skipped/invalid-source reasons. Refresh does not save or call a service.

### Editor workflow fields

- **Quick setup / Full editor** — transient editor view choice. Quick setup exposes common fields; Full editor exposes every tab. It is not stored in YAML.
- **More options** — Quick setup shortcut containing **Open full editor**; no settings are lost.
- **Bulk edit** — transient navigator selection with explicit per-setting Apply buttons. Valid pairs expand to both halves, and one Apply creates one undo point. Select this page, Select all lamps, and Clear manage selection only.
- **Lamp appearance preset** — a named visual-only lamp style. It can be applied to one lamp or the current bulk selection without replacing semantic or layout fields.
- **Saved style** — selected entry in the lamp appearance-preset library.

### Advanced lamp field

- **Maintainer note** — free-form note stored in configuration for maintenance/support. It is never rendered on the annunciator panel.

### Panel layout and appearance fields

- **Panel corners** — optional radius for the complete panel background and outside border.
- **Outer frame corners** — optional independent radius for the grid surround.
- **Lamp bezel corners** — Rounded or Square inherited/Round rectangle lamp bezel and lens-border corners; explicit shapes retain their geometry.
- **Lamp corner radius** — pixel radius shown when Lamp bezel corners is Rounded.
- **Header corner radius** — optional radius for the complete header background and border.
- **Button corner radius** — optional shared radius for header controls.
- **Default lamp style** — panel-wide Modern or Retro default used by lamps that inherit the panel style.
- **Default lens** — panel-wide Plastic, Glass, Frosted, or Smoked default used by lamps that inherit the panel lens.
- **Lens realism** — enables stable per-lens imperfections/variation. The variation is deterministic and does not change the lamp's logical color or state.
- **Saved preset** — selects one of the named portable panel-wide looks stored in the card configuration.
- **Preset name** — name used by Save as new or Update; names are limited to 60 characters.
- **Lamp lighting** — panel Appearance section for brightness profiles, levels, and the OFF · ON · ALERT preview.
- **Brightness profile** — panel choice: Full brightness, Dim when OFF, Dim when ON, Dim while not alerting, Dim all states, or Custom levels.
- **Brightness** — per-lamp Quick/Full editor and Bulk edit choice; offers the same profiles plus Inherit/Panel default.
- **Dim level** — 10–100 percent shared level used by predefined dim profiles; default 32 percent. Legacy `inactive_lamp_brightness` aliases still use their historical 10–90 normalization.
- **OFF brightness** — Custom-profile OFF intensity from 10–100 percent; defaults to Dim level.
- **ON brightness** — Custom-profile ON intensity from 10–100 percent; defaults to 100 percent.
- **Alert brightness** — Custom-profile active alarm/change-alert intensity from 10–100 percent; defaults to 100 percent.
- **OFF · ON · ALERT preview** — read-only display of the three resolved levels; it does not change configuration, entities, ACK state, or alarm output.

### Panel acknowledgement and header fields

- **ACK input_text** — Home Assistant `input_text` helper used when ACK storage is Persistent input_text. The card uses compact/adaptive encoding and falls back locally if a safe persistent write cannot be completed.
- **ACKNOWLEDGE button** — Show/hide the panel-wide acknowledgement control. It acknowledges only currently active alert channels.
- **SILENCE button** — Show/hide alarm-output silence without changing ACK state.
- **RESET button** — Show/hide rearming of cleared latched alarm state.
- **LAMP TEST button** — Show/hide the configured-helper or local lamp-test action.
- **CLEAR ACKNOWLEDGED button** — Show/hide removal of stored acknowledgement for the current panel namespace.
- **Custom label** — Optional independent display text for each of the five controls.
- **Tally source** — Local browser or Home Assistant entities. Entity mode displays user-maintained sensor values and disables local history reset.
- **Value entity** — source shown for each enabled entity-backed historical tally. Blank/missing, `unknown`, `unavailable`, nonnumeric, non-finite, or negative states render as `—`; a valid finite non-negative number is displayed in trimmed numeric form.

### Group field

- **Group** — exact, case-sensitive group name. Existing names are suggested; assigning one half of a valid pair updates its partner.
- **Existing groups** — read-only group membership summary on Panel settings → Groups.
- **Button style** — chooses Compact icons or Text buttons for group-header controls.

### Alarm-output fields

- **Start script** — Script-mode entity invoked with `script.turn_on` when output begins.
- **Silence script** — optional Script-mode entity invoked with `script.turn_on`, after a successful start, when SILENCE is selected, no active audible alarms remain, the sounding output configuration changes, or the card disconnects. Generic YAML `silence_action` is the fallback when this field is empty.

### Panel Advanced fields

- **Lamp test behavior** — **Illuminate only — steady ON** or **Full alert test — configured effect**.
- **Build / schema** — read-only diagnostic line showing card version, config schema, and next monotonic ACK slot.
- **Panel mode** — Operator (interactive) or Presentation (read-only).
- **Presentation interaction** — allows More Info on tap while Presentation mode continues to block ACK and entity-control actions.
- **Info icon** — show/hide the per-lamp diagnostics/history icon when the diagnostics overlay is enabled.
- **Retro animation** — enables Retro warm-up/cool-down behavior for Retro lamps.

If an option is not visible, it is usually conditional on another selection. Examples: Upper threshold requires Between, Change wave radius requires an effective Wave change alert, Pair half requires an active pair, ACK input_text requires Persistent input_text storage, and Presentation interaction appears when Panel mode is Presentation.

