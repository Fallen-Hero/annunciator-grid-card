# Annunciator Grid Card v1.0.2 — Complete User Guide

This guide covers normal setup, advanced annunciator behavior, acknowledgement, rules, interactions, panel appearance, diagnostics, compatibility, and common recipes.

> **Safety notice:** Annunciator Grid Card is a Home Assistant dashboard component. It is not a certified safety device and must not be the sole means of protecting people, equipment, or property.

## Table of Contents

1. [How to think about the card](#1-how-to-think-about-the-card)
2. [Installation and updating](#2-installation-and-updating)
3. [Optional Home Assistant helpers](#3-optional-home-assistant-helpers)
4. [Quick start](#4-quick-start)
5. [The visual editor](#5-the-visual-editor)
6. [Lamp Navigator, lamps, pairs, and spacers](#6-lamp-navigator-lamps-pairs-and-spacers)
7. [Lamp types](#7-lamp-types)
8. [Setup: choosing when a lamp is ON](#8-setup-choosing-when-a-lamp-is-on)
9. [Color behavior: Standard, Severity, Custom, Legacy](#9-color-behavior-standard-severity-custom-legacy)
10. [Global colors](#10-global-colors)
11. [Display lines and templates](#11-display-lines-and-templates)
12. [Value conversion and formatting](#12-value-conversion-and-formatting)
13. [Alert behavior](#13-alert-behavior)
14. [Acknowledgement fundamentals](#14-acknowledgement-fundamentals)
15. [ACK ALL and CLEAR ACK header controls](#15-ack-all-and-clear-ack-header-controls)
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
33. [Upgrade notes for v1.0.0 / v1.0.1](#33-upgrade-notes-for-v100--v101)
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

The important simplification in v1.0.2 is that most users can ignore severity entirely. A normal lamp can simply be:

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

### HACS custom repository

Until the repository is part of the default HACS catalog:

1. Open **HACS**.
2. Open the HACS menu and choose **Custom repositories**.
3. Add `https://github.com/Fallen-Hero/annunciator-grid-card`.
4. Select **Dashboard**.
5. Open **Annunciator Grid Card** and choose **Download**.
6. Refresh Home Assistant after installation or update.

### Manual installation

1. Download `annunciator-grid-card.js` from the latest GitHub Release.
2. Copy it to `<config>/www/annunciator-grid-card.js`.
3. Add this Lovelace resource:

```yaml
resources:
  - url: /local/annunciator-grid-card.js
    type: module
```

4. Refresh Home Assistant.

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

Select it under **Panel Settings → Acknowledgement → ACK storage → Persistent input_text**.

Use persistent storage when multiple browsers/devices should share acknowledgement state.

### Lamp Test helper

```yaml
input_boolean:
  annunciator_lamp_test:
    name: Annunciator Lamp Test
```

Select it under **Panel Settings → Advanced → Lamp test entity**.

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
- automatic ACK rearm stored in the config, although ACK has no visible effect unless an alert is enabled;
- Tap = More Info;
- Double tap = Acknowledge;
- Long press = Acknowledge.

This is deliberately simple for normal Home Assistant use.

## 5. The visual editor

The visual editor is divided into two main areas:

- **Lamp editor** for the selected lamp/cell.
- **Panel Settings** for card-wide behavior.

A populated lamp has seven tabs:

1. Setup
2. Display
3. Behavior
4. Appearance
5. Interaction
6. Rules
7. Advanced

Panel Settings has five tabs:

1. Layout
2. Appearance
3. Acknowledgement
4. Groups
5. Advanced

Structural changes such as adding, deleting, moving, duplicating, pairing, and rule changes participate in Undo where supported.

## 6. Lamp Navigator, lamps, pairs, and spacers

The navigator treats the grid as physical panel cells instead of a raw entity list.

- Cells are numbered `#01`, `#02`, and so on.
- A spacer counts as a physical cell.
- A TOP/BOTTOM pair counts as one physical cell.
- Search matches labels, entities, groups, pair information, and cell numbers.
- Pagination keeps large panels manageable.

### Move

Move Up/Down moves a physical cell. A valid pair moves atomically.

### Duplicate

Duplicating a lamp creates a new configuration item with its own identity/ACK slot. Duplicating a spacer creates another spacer.

### Delete

Deleting one half of a pair safely unpairs the survivor.

### Spacer

A spacer intentionally reserves an empty grid position. Select an entity in **Convert to lamp** to convert it into a normal Standard ON/OFF status lamp.

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

Open **Panel Settings → Appearance**.

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
- Frame
- Panel

On new cards, **Frame** and **Panel** overrides are disabled so Classic/Avionics/Neon can visibly own those surfaces. Enable the overrides only when you want to force specific panel/frame colors.

## 11. Display lines and templates

### Normal display mode

Primary options:

- Custom text
- Label
- State / value

Secondary and Tertiary options:

- None
- Custom text
- State / value
- Entity ID
- Last changed
- Last updated

### Lightweight templates

Enable **Use templates** to replace the normal line selectors with two substitution strings.

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

When an alert effect is active:

- **Manual** — ACK remains stored until Clear ACK.
- **Automatic** — stored ACK clears when the configured alert condition returns to normal.

Automatic rearm needs a normal/non-alert state. If **Alert when = ON or OFF**, the alert condition is always eligible, so automatic rearm cannot naturally occur.

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

## 15. ACK ALL and CLEAR ACK header controls

Open **Panel Settings → Acknowledgement**.

New cards can show both buttons independently.

### ACK ALL

**ACK ALL** scans the panel and acknowledges only alert channels that are currently active.

It does not:

- toggle or change Home Assistant entities;
- pre-ACK inactive lamps;
- modify Lamp Test;
- run in Presentation mode.

If Pair ACK Lock is enabled, linked pair behavior is respected.

### CLEAR ACK

**CLEAR ACK** clears stored acknowledgement for the current panel namespace so applicable alerts can indicate again.

For persistent `input_text` storage, the card preserves ACK data belonging to other panel namespaces in the same helper.

### Show/hide controls

The two header buttons are independent:

- Show ACK ALL
- Show CLEAR ACK

You can show both, either one, or neither.

### v1.x compatibility

Old single-header-button settings are still accepted. A legacy Clear-only configuration remains Clear-only; an old ACK-All configuration remains ACK-All. A minimal old configuration with no explicit header keys keeps the historical Clear ACK-only default.

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

### WHEN types

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

## 19. Cross-entity rules

Rule source can be:

- This lamp entity
- Another entity

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

### Top / Bottom

Changing one half from TOP to BOTTOM automatically swaps its partner.

### Pair ACK Lock

When enabled, acknowledgement/clear operations on one half also apply to the partner according to the active ACK channel.

## 21. Groups

Set the same **Group** text on related lamps.

Panel group options include:

- Show Group Headers
- Group ACK scope: All lamps / Alerting lamps only
- Include change alerts
- Show group ACK/Clear buttons
- Compact icon or text buttons
- Optional ACK Alerts button
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

Panel Settings can disable per-lamp style or lens overrides. When locked, the lamp editor visibly disables those selectors instead of letting them appear to change something that will not render.

## 23. Panel themes and appearance

Themes:

- Classic
- Avionics
- Neon

The selected theme controls panel/bezel styling when Frame/Panel global overrides are disabled.

### Stable lens imperfections

Adds repeatable per-lamp surface variation. The imperfection system is separate from the material glare strength so it does not erase the visible difference between Plastic/Glass/Frosted/Smoked.

### Retro flicker

Optional subtle flicker effect for retro-style lamps.

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

- **Auto Fit** — preserve configured proportions and scale down only when needed.
- **Fixed Size** — use configured pixel dimensions with no scaling.
- **Horizontal Scroll** — preserve full size and allow horizontal scrolling.

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

Choose a Home Assistant toggle entity under **Panel Settings → Advanced → Lamp test entity**.

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

Requires no helper. ACK state is stored in browser local storage and is specific to that browser/device.

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

## 28. Diagnostics and support package

Enable **Panel Settings → Advanced → Diagnostics overlay**.

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
| ACK ALL | only active panel alert channels are ACKed | CLEAR ACK clears panel ACK namespace |
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
| None | No | No action | No action |

### Color-mode matrix

| Mode | ON color | OFF color | Severity normally changes color? |
| --- | --- | --- | --- |
| Standard | Global ON | Global OFF | No |
| Severity | STATUS/WARN/ALARM/TRIP | Global OFF | Yes |
| Custom | Per-lamp ON | Per-lamp OFF | No, unless you intentionally use rule color |
| Legacy | v1.x compatibility resolver | v1.x compatibility resolver | Yes according to old behavior |

## 33. Upgrade notes for v1.0.0 / v1.0.1

v1.0.2 is designed to keep old dashboards working while simplifying new configuration.

### Existing color configuration

A lamp without `color_behavior` stays on Legacy compatibility. It is not silently converted to Standard mode.

### ON Window

Legacy ON Window settings remain readable. The redundant ON Window picker is removed from the normal editor. When you deliberately convert a legacy lamp to Custom ON/OFF, the migration preserves the color that actually had visual priority.

### Header ACK button

The old fields remain readable:

- `show_reset_ack`
- `reset_ack_action`
- `reset_ack_label`

The new UI uses independent `show_ack_all` and `show_clear_ack` controls with standardized button text. Old behavior is mapped safely.

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
- Give separate panels unique `panel_id` values.
- Use persistent ACK only when shared operator state is useful.
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

- **Primary template** — first display line when lightweight card templates are enabled.
- **Secondary template** — second display line when lightweight card templates are enabled.
- **Primary text** — literal first-line text when Primary is set to Custom.
- **Secondary text** — literal second-line text when Secondary is set to Custom.
- **Tertiary text** — literal third-line text when Tertiary is set to Custom.

These template fields use the card's built-in substitutions; they do not execute Home Assistant Jinja.

### Change-alert timing and tuning

- **Duration (seconds)** — how long a timed Change Alert remains active when Until ACK is not selected. `0` is accepted as an immediate/zero-duration setting.
- **Change speed override** — Slow, Normal, Fast, or Inherit from the main alert.
- **Change opacity override** — optional change-alert-only opacity depth; blank inherits.
- **Change border override** — optional change-alert-only border emphasis; blank/inherit follows the main alert.
- **Change wave radius** — optional Wave radius for the change alert; blank inherits.
- **Change throb subtlety** — optional Throb tuning for the change alert; blank inherits.

### Pair controls

- **Pair with lamp** — selects another lamp to form one physical TOP/BOTTOM cell.
- **This half** — chooses whether the selected lamp is TOP or BOTTOM. Changing it swaps the partner automatically so the pair remains valid.

### Conditional Rule fields

- **Rule name** — optional operator/maintainer-friendly name shown in diagnostics.
- **THEN severity** — changes the resolved severity. It changes the visible color only in Severity/Legacy color behavior unless the rule also specifies an explicit ON color.
- **THEN alert** — Inherit, Off, Blink, Pulse, Wave, Throb, Heartbeat, or Flash for the matching rule.

### Advanced lamp field

- **Maintainer note** — free-form note stored in configuration for maintenance/support. It is never rendered on the annunciator panel.

### Panel layout and appearance fields

- **Corner style** — Rounded or Sharp physical cell/window corners.
- **Default lamp style** — panel-wide Modern or Retro default used by lamps that inherit the panel style.
- **Default lens** — panel-wide Plastic, Glass, Frosted, or Smoked default used by lamps that inherit the panel lens.
- **Lens realism** — enables stable per-lens imperfections/variation. The variation is deterministic and does not change the lamp's logical color or state.

### Panel acknowledgement fields

- **ACK input_text** — Home Assistant `input_text` helper used when ACK storage is Persistent input_text. The card uses compact/adaptive encoding and falls back locally if a safe persistent write cannot be completed.
- **ACK ALL button** — Show/hide the panel-wide ACK ALL control. ACK ALL acknowledges only currently active alert channels.
- **CLEAR ACK button** — Show/hide the panel-wide CLEAR ACK control. CLEAR ACK removes stored acknowledgement for the current panel namespace.

### Group field

- **Button style** — chooses Compact icons or Text buttons for group-header controls.

### Panel Advanced fields

- **Lamp test behavior** — **Illuminate only — steady ON** or **Full alert test — configured effect**.
- **Build / schema** — read-only diagnostic line showing card version, config schema, and next monotonic ACK slot.
- **Panel mode** — Operator (interactive) or Presentation (read-only).
- **Presentation interaction** — allows More Info on tap while Presentation mode continues to block ACK and entity-control actions.
- **Info icon** — show/hide the per-lamp diagnostics/history icon when the diagnostics overlay is enabled.
- **Retro animation** — enables Retro warm-up/cool-down behavior for Retro lamps.

If an option is not visible, it is usually conditional on another selection. Examples: Upper threshold requires Between, Change wave radius requires an effective Wave change alert, Pair half requires an active pair, ACK input_text requires Persistent input_text storage, and Presentation interaction appears when Panel mode is Presentation.

