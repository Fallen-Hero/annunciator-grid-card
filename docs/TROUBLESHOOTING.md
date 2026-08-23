# Annunciator Grid Card v1.0.2 — Troubleshooting

Use this page for common installation, rendering, color, ACK, rule, interaction, and editor problems. For configuration details, see [CONFIG_REFERENCE.md](CONFIG_REFERENCE.md). For feature explanations, see [USER_GUIDE.md](USER_GUIDE.md).

## First checks for any problem

1. Confirm the browser console shows the expected card version.
2. Hard-refresh Home Assistant after an update.
3. Confirm only one resource entry loads `annunciator-grid-card.js`.
4. Open the card's diagnostics/support package if the problem is lamp-specific.
5. Check the browser console for JavaScript errors.
6. If the issue appeared after upgrading, test an existing configuration without manually converting Legacy color behavior.

## Card is missing or says custom element does not exist

Check:

- HACS finished downloading the card.
- The Lovelace resource is a JavaScript Module.
- Manual resource path is `/local/annunciator-grid-card.js` if the file is under `<config>/www/`.
- The browser has been refreshed after installation.
- You do not have stale duplicate resources loading old and new versions.

Manual resource:

```yaml
resources:
  - url: /local/annunciator-grid-card.js
    type: module
```

## HACS shows old README or old version information

GitHub/HACS/browser caches can lag behind repository changes.

- Confirm the GitHub release/tag is correct.
- Confirm `VERSION`, `package.json`, and `dist/annunciator-grid-card.js` agree.
- Refresh HACS/repository information.
- Hard-refresh the browser.

## New lamp is amber/alarm-colored when I expected green

A new v1.0.2 lamp should normally use **Standard ON/OFF** and green ON.

If a lamp is amber/red/yellow:

1. Open **Setup** or **Appearance**.
2. Check **Color behavior**.
3. If it is Severity, the active color comes from Status/Warn/Alarm/Trip.
4. If it is Legacy, the lamp is preserving older v1.x color behavior.
5. If it is Standard, check for a matching Conditional Rule with an explicit ON color.

## OFF lamp is white/light gray

That is the normal v1.0.2 Standard OFF default (`#f2f2f2`). OFF does not automatically mean an alarm/fault.

Change **Panel Settings → Appearance → OFF / Inactive** if your panel needs another color, or use Custom ON/OFF for one lamp.

## Per-lamp ON color seems to do nothing

Per-lamp ON/OFF colors are exposed under **Custom ON/OFF** color behavior.

- Standard uses global ON/OFF.
- Severity uses severity active color plus global OFF.
- Custom uses per-lamp ON/OFF.
- Legacy preserves old v1.x precedence.

A matching Conditional Rule with an explicit ON color has higher active-color priority.

## Existing v1.x lamp shows “Legacy compatibility”

This is intentional. Existing configurations are not silently converted to the new model.

You can leave the lamp in Legacy indefinitely, or deliberately choose:

- Standard ON/OFF
- Severity
- Custom ON/OFF

When converting a legacy lamp to Custom, v1.0.2 preserves the old visually effective ON color as the new Custom ON color where possible.

## Panel theme does not look different

Check **Panel Settings → Appearance**.

If **Frame** or **Panel** global color overrides are enabled, they intentionally override theme surface colors. Disable those overrides to let Classic/Avionics/Neon own the panel surfaces.

Also verify the card is actually v1.0.2; lens/theme differences were strengthened in this release.

## Plastic / Glass / Frosted / Smoked look the same

Check:

- **Allow per-lamp lens override** is enabled if using a per-lamp selection.
- The lamp is not locked to the panel default.
- You are testing v1.0.2.
- Browser cache is not serving an older JS file.

The material changes finish/optics, not the logical state/color. Compare the same lamp/color while changing only lens material.

## Standalone lamp color differs from a paired lamp

v1.0.2 includes a specific fix and regression tests for standalone/paired active-color parity.

If you can reproduce a difference:

1. Confirm both lamps use the same color behavior and relevant overrides.
2. Check whether one has a rule color or Custom color.
3. Copy each lamp's diagnostic package.
4. Include the card version and screenshots in the GitHub issue.

## ACK ALL is missing

Open **Panel Settings → Acknowledgement** and enable **Show ACK ALL**.

Compatibility note: an existing v1.x Clear-only header configuration remains Clear-only until you change the new v1.0.2 toggles. A minimal old config with no old header keys also keeps the historical Clear-only default.

New cards created through the v1.0.2 visual editor default to both ACK ALL and CLEAR ACK.

## CLEAR ACK is missing

Open **Panel Settings → Acknowledgement** and enable **Show CLEAR ACK**.

If the panel is in Presentation mode, both header ACK controls are intentionally hidden.

## ACK ALL does not ACK every lamp

That is intentional. **ACK ALL means acknowledge all currently active alert channels**, not “pre-ACK every configured lamp.”

A lamp is not ACKed when:

- it has no active main/change alert;
- it is unavailable and not in an alert path;
- it is already ACKed;
- Lamp Test is active;
- the panel is in Presentation mode.

This design prevents inactive future alarms from being silently pre-acknowledged.

## CLEAR ACK makes an active alarm start blinking again

That is expected. CLEAR ACK removes stored acknowledgement. If the underlying alert condition is still active, the alert becomes eligible to indicate again immediately.

## ACK does not change the entity state

Correct. ACK is annunciator state, not device control.

To control an entity, configure Tap/Double tap/Long press as:

- Toggle
- Turn On
- Turn Off

## ACK storage is not shared across devices

Local browser storage is per browser/device.

For shared ACK state, create an `input_text` helper and configure **Persistent input_text** storage.

## Persistent ACK seems delayed

The card uses an optimistic local shadow after writing the helper, so visible ACK should update immediately while Home Assistant reflects the helper state.

If it does not:

- confirm the helper entity exists;
- confirm the helper max length is sufficient (255 recommended);
- check console warnings for service failures;
- verify your user has permission to call `input_text.set_value`.

If persistent writing fails, the card intentionally falls back to local storage.

## Tap toggles and then Double tap also toggles

v1.0.2's gesture arbitration is designed to prevent this. If reproduced:

1. Confirm you are running v1.0.2.
2. Test with Tap = Toggle and Double tap = Acknowledge.
3. Record browser/device and whether mouse/touch/pen was used.
4. Include a screen recording and diagnostic package in the issue.

## Long press also fires Tap

This should not happen in v1.0.2. Long press consumes its release click, including very long holds. Touch browsers that do not synthesize a click are also handled so the next real tap remains usable.

Report the exact browser/device if reproducible.

## Long press triggers while I am scrolling

Pointer movement beyond the hold tolerance cancels the long press. If a particular touch browser behaves differently, report the browser/device and a reproduction sequence.

## Another entity action does nothing

For More Info/Toggle/Turn On/Turn Off:

1. Open **Interaction**.
2. Confirm target = **Another entity**.
3. Confirm an entity is actually selected.

A blank alternate target is intentionally a safe no-op. It does not fall back to the displayed lamp entity.

## Acknowledge / Clear ACK action ignores alternate target

ACK actions operate on the annunciator lamp's ACK state, not another Home Assistant entity. Alternate entity targets are relevant only to More Info / Toggle / Turn On / Turn Off.

## Control action fails

The card uses Home Assistant services:

```text
homeassistant.toggle
homeassistant.turn_on
homeassistant.turn_off
```

Check:

- the target entity exists;
- that entity supports the selected operation;
- browser console for `Lamp <gesture> action failed` warnings;
- user/service permissions.

## Presentation mode controls do nothing

Expected. Presentation mode blocks ACK and entity-control actions. More Info can optionally remain enabled.

## Conditional Rule does not run when another entity changes

Check:

- Rules are enabled.
- Rule source is **Another entity**.
- Source entity is selected.
- Source is not `unknown`/`unavailable`.
- Rule order: first matching rule wins.

v1.0.2 tracks external rule dependencies so a source-entity state change reevaluates dependent lamps.

## Another Entity rule seems to use the lamp entity instead

v1.0.2 explicitly prevents that fallback. If Another entity is selected and `source_entity` is blank, the rule is skipped.

If you see otherwise, include the exact lamp YAML and diagnostic package.

## Rule changes severity but Standard lamp stays green

Expected. Standard ON/OFF intentionally ignores severity for normal active color.

Options:

- Change the lamp to Severity color behavior, or
- set the rule's explicit **ON color**.

## Numeric rule seems to compare the wrong value

For the lamp's own numeric condition/rule pipeline, the lamp's conversion/scale/offset can be involved.

For **Another entity** numeric rules, v1.0.2 intentionally compares the external source entity's raw numeric state. It does not apply the displayed lamp's conversion/scale/offset to someone else's entity.

Use Diagnostics to compare raw and transformed values.

## Force OFF does not stay OFF during Lamp Test

Expected. Rule Force OFF runs before Lamp Test. Lamp Test has final authority so every populated window can be tested.

## Change alert keeps coming back

Check whether:

- it is timed or Until ACK;
- the source state/value keeps changing;
- a qualifying change filter keeps matching;
- Clear ACK was used instead of ACK.

Clear ACK rearms; it is not the same as acknowledging an active Until-ACK change event.

## Automatic ACK rearm never occurs

If **Alert when = ON or OFF**, there is no non-alert state, so automatic rearm cannot naturally occur.

Use:

- Lamp ON, or
- Lamp OFF,

when automatic rearm is desired.

## Pair will not stay together

The editor repairs/canonicalizes valid pairs and keeps TOP/BOTTOM adjacent. Avoid manually giving more than two lamps the same pair ID.

If hand-editing YAML, a valid pair needs two compatible entries sharing the same `pair_id`, one `top`, one `bottom`.

## Paired bottom/upper label is blank

Ensure Primary is Label or State/value, or provide custom Primary text. Paired lamps with empty custom primary text are normalized toward the label so the window can populate.

## Group ACK affects unexpected lamps

Group membership is based on the exact `group` string. Check:

- group names;
- Group ACK scope (`all` vs `alerting`);
- Include change alerts setting;
- Pair ACK Lock if a paired partner is involved.

## Lamp Test changes ACK state

It should not. ACK/Clear mutations are blocked while Lamp Test helper is ON. If reproducible in v1.0.2, report it immediately with exact steps.

## Unavailable entity shows INOP

Expected. Missing, `unknown`, and `unavailable` source entities use the unavailable appearance and `unavailable_text` (default `INOP`).

Lamp Test can still illuminate/test a populated unavailable window.

## Values show NaN, Infinity, or crash the card

v1.0.2 contains additional malformed-value hardening. The visual editor limits decimals to 0–3; manual YAML is runtime-clamped to a safe range.

If a malformed value still crashes rendering, include the exact YAML and console stack trace.

## Editor field loses focus or resets while typing

The editor is designed not to rebuild the entire tree on ordinary reflected config updates. If a particular field still loses focus:

- identify the exact tab/field;
- note whether an entity state update happened at the same time;
- include browser/device and Home Assistant version.

## Diagnostics info button performs the lamp action

v1.0.2 isolates diagnostic/info controls from lamp gesture handling. If clicking/holding the info icon also controls/ACKs a lamp, verify cache/version and report the exact browser/device.

## What to include in a GitHub issue

Include as much as possible:

- Annunciator Grid Card version;
- Home Assistant version;
- browser/device;
- HACS or manual installation;
- exact reproduction steps;
- expected behavior;
- actual behavior;
- screenshot/video for visual or interaction problems;
- relevant YAML;
- browser-console errors;
- **Copy diagnostic package** output.
