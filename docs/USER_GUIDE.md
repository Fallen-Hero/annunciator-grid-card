# Annunciator Grid Card v1.0.0 — Complete User Guide

## Table of Contents

1. [Concepts](#1-concepts)
2. [Installation](#2-installation)
3. [Optional helpers](#3-optional-helpers)
4. [Quick start](#4-quick-start)
5. [Lamp Navigator](#5-lamp-navigator)
6. [Lamp types](#6-lamp-types)
7. [Setup tab](#7-setup-tab)
8. [Conditions](#8-conditions)
9. [Display tab](#9-display-tab)
10. [Value transformation](#10-value-transformation)
11. [Behavior and alerts](#11-behavior-and-alerts)
12. [Acknowledgement](#12-acknowledgement)
13. [Change alerts](#13-change-alerts)
14. [Appearance](#14-appearance)
15. [Paired lamps](#15-paired-lamps)
16. [Conditional Rules](#16-conditional-rules)
17. [Advanced lamp settings](#17-advanced-lamp-settings)
18. [Spacers](#18-spacers)
19. [Panel Layout](#19-panel-layout)
20. [Panel Appearance](#20-panel-appearance)
21. [Panel Acknowledgement](#21-panel-acknowledgement)
22. [Groups](#22-groups)
23. [Panel Advanced](#23-panel-advanced)
24. [Runtime interaction](#24-runtime-interaction)
25. [ACK behavior matrix](#25-ack-behavior-matrix)
26. [Color/appearance priority](#26-colorappearance-priority)
27. [Unavailable entities](#27-unavailable-entities)
28. [Diagnostics](#28-diagnostics)
29. [Validation and repair](#29-validation-and-repair)
30. [Recommended practices](#30-recommended-practices)

> This card is a dashboard/monitoring component, not a certified safety system.

## 1. Concepts

Each physical annunciator cell is backed by either one lamp, one TOP/BOTTOM pair, or a spacer. A lamp reads a Home Assistant entity and resolves it through a common pipeline:

```text
HA entity
  → raw state/value
  → conversion / scale / offset
  → ON/OFF condition
  → first matching Conditional Rule
  → severity / color / style / lens
  → alert policy
  → ACK state
  → primary / secondary / tertiary display
```

The same evaluator is used by the renderer, group ACK logic and diagnostics so those paths do not maintain separate condition interpretations.

## 2. Installation

See the root [README](../README.md) for HACS and manual installation. The card type is:

```yaml
 type: custom:annunciator-grid-card
```

## 3. Optional helpers

### Persistent shared ACK

Create a Home Assistant Text helper such as:

```text
input_text.annunciator_ack_map
```

Maximum length 255 is recommended. Select it under **Panel Settings → Acknowledgement**.

Without this helper, ACK state is stored in the local browser. Local storage is appropriate for a single operator device; persistent `input_text` is recommended if multiple devices should see the same ACK state.

### Lamp Test

Create a Toggle helper such as:

```text
input_boolean.annunciator_lamp_test
```

Select it under **Panel Settings → Advanced → Lamp test entity**.

Lamp Test supports:

- **Illuminate only** — every non-spacer window is forced ON steadily.
- **Full alert test** — every non-spacer window is tested with its configured normal alert effect.

ACK actions are blocked during Lamp Test so testing cannot accidentally alter operator acknowledgement state.

## 4. Quick start

For a normal binary alarm:

1. Add the card.
2. Press **+ Lamp**.
3. Select an entity.
4. Select **Alarm**.
5. Enter a Label if the entity friendly name is not ideal.
6. Choose the ON condition.
7. Choose a Severity.
8. Choose an Alert effect.
9. Leave **ACK rearm = Automatic** for a normal recurring alarm.
10. Save.

New Alarm lamps default toward Blink + Automatic rearm; Status lamps default steady; Sensor lamps default Always ON with label/value display.

## 5. Lamp Navigator

The editor's top navigator treats the panel as physical cells instead of a long raw entity list.

- Cells are numbered `#01`, `#02`, etc.
- Spacers are numbered because they reserve physical positions.
- A pair is one physical cell and is shown as one navigator item with TOP/BOTTOM halves.
- Search matches labels, entity IDs, groups and cell numbers.
- Pagination prevents large panels from making the editor unwieldy.

Use Move Up/Down to move a physical cell. A pair moves atomically.

Delete of one paired half removes that half and cleanly unpairs the survivor.

Undo is available for structural changes such as add/delete/move/duplicate and rule changes.

## 6. Lamp types

### Alarm

Use for conditions that require operator attention. Selecting Alarm applies sensible alarm-oriented defaults without hiding advanced capabilities.

### Status

Use for steady state indication such as PUMP RUNNING or VALVE OPEN.

### Sensor

Use for continuously displayed values. Sensor intent normally sets Always ON and label/value display.

### Custom

Use when a lamp deliberately combines behavior outside the three common intents.

## 7. Setup tab

### Entity

The Home Assistant entity driving the lamp. Clearing it turns that cell into a spacer.

### Label

Leave blank for the entity friendly name or enter a custom annunciator legend.

### Group

Optional text used for group headers/group ACK. Keep group members contiguous for the cleanest panel layout.

### Severity

`Status`, `Warning`, `Alarm`, `Trip` selects the default ON appearance unless a rule/lamp override wins.

### Alert

Choose steady (`None`) or Blink, Pulse, Wave, Throb, Heartbeat, Flash. Behavior contains the detailed tuning.

## 8. Conditions

### On / true / 1

Normal truthy condition for binary/toggle-style entities.

### State equals one of

Comma-separated exact states. Use this for named states such as `open,running,active`.

### String match

Operators:

- Contains
- Equals
- Starts with
- Ends with

String matching uses the source state's text; configure capitalization deliberately.

### Numeric threshold

Operators:

- Above
- Below
- Between
- Equal

Above/Below/Between can include or exclude the boundary. Between safely treats the smaller configured number as the lower bound.

Numeric conditions compare the transformed logic value, not the prettified display string.

## 9. Display tab

Normal mode supports:

- Primary: Custom / Label / State-value
- Secondary: None / Custom / State-value / Entity ID / Last changed / Last updated
- Tertiary: same informational choices

### Templates

Template mode replaces normal Primary/Secondary selection with lightweight substitution strings. Supported variables include:

```text
{{name}}
{{state}}
{{value}}
{{unit}}
{{acked}}
{{severity}}
{{attributes.xxx}}
```

These are card templates, not arbitrary Home Assistant Jinja execution.

## 10. Value transformation

The numeric pipeline is:

```text
raw HA state
→ optional C↔F conversion
→ scale
→ offset
→ transformed logic value
→ conditions and rules
→ display rounding
→ display unit
→ prefix / suffix
```

### Conversion

- None
- °C → °F
- °F → °C

When Entity Unit is selected, recognized temperature units change with the conversion.

### Scale / Offset

Formula after conversion:

```text
(value × scale) + offset
```

`scale = 0` is valid.

### Display formatting

Decimals 0–3, Round/Floor/Ceil, Entity/Hidden/Override unit, Auto/Numeric/Text mode, Prefix and Suffix are display controls and do not silently change the transformed logic value.

## 11. Behavior and alerts

### Alert when

- Lamp ON
- Lamp OFF
- ON or OFF

`Lamp OFF` is useful for loss-of-running or return-to-normal annunciation.

### Effects

- Blink — stepped flashing
- Pulse — smooth brightness pulse
- Wave — brightness plus outward emphasis
- Throb — controlled subtle brightness movement
- Heartbeat — double-pulse rhythm
- Flash — short periodic flash

### Tuning

Speed: Slow / Normal / Fast.

Opacity Depth controls how strong dimming/attention appears.

Border Emphasis: None / Soft / Strong.

Wave and Throb expose their relevant additional tuning.

Reduced-motion browser preferences suppress the animations for accessibility.

## 12. Acknowledgement

ACK suppresses active attention; it does not change the source entity.

### Manual rearm

```text
alarm → ACK → normal → later alarm
```

The stored ACK remains until Clear ACK. This is compatible with older latched behavior.

### Automatic rearm

```text
alarm → ACK → condition normal → ACK clears automatically → future alarm alerts again
```

Use this for most recurring alarm conditions.

Avoid expecting auto-rearm with `Alert when = ON or OFF`; that policy has no normal/non-alert state.

### ACK storage

**Local browser** requires no helper but is per-browser/device.

**Persistent input_text** shares ACK state through Home Assistant. v1.0 uses stable monotonic ACK slots and adaptive compact encoding. It can migrate legacy storage and falls back locally on persistent-write failure.

### ACK vs Clear ACK

Per-lamp ACK is idempotent. Repeating ACK cannot accidentally un-ACK an acknowledged alarm. Use the explicit Clear ACK controls to clear stored acknowledgement.

## 13. Change alerts

Change Alert is independent of the main ON/OFF condition and can request attention when a source state/value changes even if the lamp is OFF.

### Stop behavior

- Timed: runs for the configured seconds.
- Until ACK: continues until acknowledged.

### Filter

- Any change
- State equals
- String match
- Numeric threshold

Change detection tracks the source state/value, not configuration edits; changing Scale/Offset in the editor does not manufacture a false process change.

### Change effect/tuning

The change alert can inherit the main effect or choose another effect, including No visual effect. Speed/opacity/border/wave/throb can optionally inherit or override normal tuning.

Disabling Change Alert cancels its transient state/timer immediately.

## 14. Appearance

### Lamp style

- Panel default
- Modern
- Retro

### Lens

- Panel default
- Plastic
- Glass
- Frosted
- Smoked

If panel-wide overrides are disabled, these controls are visibly locked instead of pretending to change runtime appearance.

### Per-lamp colors

Optional per-lamp overrides include ON color/window/text, OFF window/text and Unavailable window/text.

## 15. Paired lamps

Choose **Appearance → Pair with lamp**. The editor creates/manages the Pair ID and assigns TOP/BOTTOM positions.

A pair:

- occupies one physical cell;
- keeps TOP/BOTTOM adjacent;
- moves atomically;
- has independent entities/conditions/severities/alerts;
- may use **Pair ACK Lock** so acknowledging either half acknowledges its partner.

Changing TOP/BOTTOM automatically swaps the partner.

## 16. Conditional Rules

Enable Conditional Rules when one lamp should change appearance/behavior by state/value.

**First matching rule wins.** Reorder rules to express priority.

Rule WHEN types:

- Numeric threshold
- State equals
- String match

Rule THEN effects:

- Severity override
- Alert override/off
- Force lamp ON
- Custom ON color

Each rule can be moved, duplicated, deleted and named. Rule changes participate in Undo.

Example priority:

```text
> 200 → TRIP / Blink / Red
> 170 → ALARM / Pulse / Orange
> 150 → WARN / Yellow
```

Put the highest-priority threshold first.

## 17. Advanced lamp settings

### Always ON

Overrides the normal condition. Useful for sensor/value windows.

### Invert

Applied after normal condition evaluation.

### Maintainer note

Stored with configuration but never rendered on the panel.

### Diagnostic/support package

The Advanced page shows schema/card version, UID, ACK slot, type, rearm and condition information. **Copy diagnostic package** copies card version, panel context, lamp configuration, entity state and resolved evaluation for troubleshooting.

## 18. Spacers

A spacer is an intentional empty physical cell. It receives a cell number/identity but has no source entity.

Selecting a spacer displays a simplified editor. Choose an entity in **Convert to lamp** to turn it into a normal lamp.

Use spacers rather than relying on invisible unused configured columns.

## 19. Panel Layout

### Grid Height

- Auto — fit configured physical cells.
- Minimum row count — reserve at least `Rows` depth but never hide extra lamps.

### Panel Sizing

- **Auto Fit** — preserve proportions and scale down only when needed.
- **Fixed Size** — keep configured pixels; no scaling.
- **Horizontal Scroll** — preserve full size and scroll horizontally when needed.

Auto Fit measures occupied physical cells. `Columns = 7` with one lamp does not create six invisible columns.

### Columns

Maximum physical cells per row.

### Physical dimensions

Cell width, height, gap, Mullion, Outer frame, Cell padding, Font size/weight/line-height, Sharp/Rounded corners and Corner radius are all runtime-applied.

## 20. Panel Appearance

Themes: Classic / Avionics / Neon.

Defaults: Modern/Retro style and Plastic/Glass/Frosted/Smoked lens.

Per-lamp style/lens overrides can be globally allowed or locked.

Severity Colors define TRIP/ALARM/WARN/STATUS plus OFF, text, Unavailable, Blank, Frame and Panel colors.

Severity Appearance can map each severity to an optional style/lens.

## 21. Panel Acknowledgement

Choose Local Browser or Persistent input_text.

Header ACK button can be shown/hidden and configured as:

- Clear ACKs
- ACK All

Pair ACK Lock links pair acknowledgement.

## 22. Groups

Assign identical Group text to related lamps.

Options include:

- Show Group Headers
- ACK scope: All lamps or Alerting lamps only
- Include Change Alerts
- Header ACK/Clear buttons
- Icon or Text button style
- Dedicated ACK Alerts button
- Header background/text/divider styling

When Include Change Alerts is OFF, group actions leave the change-alert channel untouched.

## 23. Panel Advanced

### Panel ID

Namespace for ACK storage. Give independent panels unique IDs.

### Lamp Test

Select helper and Steady/Full behavior as described earlier.

### Build/schema

Shows card version, configuration schema and next monotonic ACK slot.

### Unavailable text

Default is `INOP`.

### Panel mode

Operator = interactive ACK panel.

Presentation = read-only; optional More Info may remain enabled.

### Diagnostics overlay

Enable the per-lamp info icon/overlay for resolved condition, value, ACK, rule, history-related timestamps and copy tools.

## 24. Runtime interaction

Operator mode:

- Single click/tap → More Info.
- Double-click → ACK.
- Long press → ACK.
- Pointer movement/scroll cancels long-press ACK.
- Enter/Space → ACK when keyboard focus is available.

Presentation mode disables ACK interaction.

## 25. ACK behavior matrix

| Situation | ACK result | Rearm |
|---|---|---|
| Main alert + Manual | effect stops | explicit Clear ACK |
| Main alert + Automatic | effect stops | condition returns normal |
| OFF-state alert + Automatic | effect stops | lamp returns to non-alert state |
| Timed change alert | ACK can stop it | next qualifying change |
| Until-ACK change alert | stops on ACK | next qualifying change |
| Main + Change both active | one operator ACK handles active channels | channels rearm independently |
| Pair ACK Lock | active half and partner ACK together | each configured rearm logic |
| Group All | selected group lamps ACK | configured rearm/Clear |
| Group Alerting only | only currently alerting lamps ACK | configured rearm |

## 26. Color/appearance priority

Typical ON color priority:

```text
matching Conditional Rule color
→ per-lamp ON color
→ global severity color
→ built-in fallback
```

Explicit per-lamp style/lens wins only when panel settings allow it; otherwise severity-specific then panel default appearance applies.

## 27. Unavailable entities

Missing, `unknown`, or `unavailable` source entities render as Unavailable/INOP and do not run the normal source-condition alert.

Lamp Test can still illuminate/test the physical window even if the source entity is unavailable.

## 28. Diagnostics

The diagnostics overlay can expose:

- entity / UID / type
- availability and raw state
- raw/transformed numeric values
- computed ON
- condition
- severity
- active effect/reason
- display lines
- main/change ACK state
- change-alert state/timestamp
- matching rule and effects
- group state
- entity last changed/updated/triggered when available

Copy Entity/YAML/JSON/support-package controls make bug reports reproducible.

## 29. Validation and repair

The editor checks important identity/pair structure, including:

- missing/duplicate UID
- missing/invalid/duplicate ACK slot
- incomplete pair metadata
- wrong TOP/BOTTOM counts
- pairing metadata on spacers
- pair group inconsistencies

Safe identity repair preserves the monotonic ACK-slot allocator. Undo never rewinds it.

Malformed pairs degrade safely as independent lamps rather than silently stealing another half.

## 30. Recommended practices

- Use Alarm for attention conditions, Status for steady binary indication and Sensor for always-visible values.
- Use Automatic rearm for normal recurring alarms unless manual reset is intentional.
- Use persistent ACK for shared operator devices.
- Give each independent panel a unique Panel ID.
- Keep groups contiguous.
- Let the visual editor manage Pair IDs and ACK slots.
- Keep Conditional Rule ranges clear and order highest priority first.
- Use Diagnostics before editing internal YAML identities.
- Use Spacer for intentional empty panel positions.
- Hard-refresh the browser after replacing a custom-card JavaScript resource.

For raw YAML keys, see [CONFIG_REFERENCE.md](CONFIG_REFERENCE.md).
