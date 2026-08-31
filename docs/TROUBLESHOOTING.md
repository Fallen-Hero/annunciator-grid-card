![Annunciator Grid Card — Alarm, Status, Control](../images/annunciator-grid-card-logo.png)

# Annunciator Grid Card v1.1.0 — Troubleshooting

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

- HACS finished downloading the card or the release file was copied successfully.
- The Lovelace resource is a JavaScript Module.
- The resource URL matches the filename under `<config>/www/`; a manual installation normally uses `/local/annunciator-grid-card.js`.
- The browser has been refreshed after installation.
- You do not have stale duplicate resources loading old and new versions.

Manual resource:

```yaml
resources:
  - url: /local/annunciator-grid-card.js
    type: module
```

## HACS or a manual installation shows old version information

Browser and Home Assistant frontend caches can keep an older resource active.

- Confirm the installed GitHub release/tag or refresh the HACS repository information.
- Disable duplicate HACS/manual resources so only one URL registers the custom element.
- For a manual installation, change a resource cache token such as `?v=1.1.0` after replacing the file.
- Hard-refresh the browser.

## New lamp is amber/alarm-colored when I expected green

A new lamp should normally use **Standard ON/OFF** and green ON.

If a lamp is amber/red/yellow:

1. Open **Setup** or **Appearance**.
2. Check **Color behavior**.
3. If it is Severity, the active color comes from Status/Warn/Alarm/Trip.
4. If it is Legacy, the lamp is preserving older v1.x color behavior.
5. If it is Standard, check for a matching Conditional Rule with an explicit ON color.

## OFF lamp is white/light gray

That is the normal v1.0.2 Standard OFF default (`#f2f2f2`). OFF does not automatically mean an alarm/fault.

Change **Panel settings → Appearance → OFF / Inactive** if your panel needs another color, or use Custom ON/OFF for one lamp.

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

Check **Panel settings → Appearance**.

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

Standalone and paired active-color parity is covered by dedicated regression tests.

If you can reproduce a difference:

1. Confirm both lamps use the same color behavior and relevant overrides.
2. Check whether one has a rule color or Custom color.
3. Copy each lamp's diagnostic package.
4. Include the card version and screenshots in the GitHub issue.

## ACKNOWLEDGE is missing

Open **Panel settings → Acknowledgement → Header controls** and enable **Show ACKNOWLEDGE**.

Compatibility note: an existing v1.x Clear-only header configuration remains Clear-only until you change the v1.1 header controls. Existing ACK ALL/CLEAR ACK visibility and labels are preserved during migration.

New v1.1 cards enable ACKNOWLEDGE and CLEAR ACKNOWLEDGED by default. SILENCE, RESET, and LAMP TEST remain optional.

## CLEAR ACKNOWLEDGED is missing

Open **Panel settings → Acknowledgement → Header controls** and enable **Show CLEAR ACKNOWLEDGED**.

If the panel is in Presentation mode, header controls are intentionally hidden.

## ACKNOWLEDGE does not ACK every lamp

That is intentional. **ACKNOWLEDGE means acknowledge all currently active alert channels**, not “pre-ACK every configured lamp.” Legacy panels may display the same action as ACK ALL.

A lamp is not ACKed when:

- it has no active main/change alert;
- it is unavailable and not in an alert path;
- it is already ACKed;
- Lamp Test is active;
- the panel is in Presentation mode.

This design prevents inactive future alarms from being silently pre-acknowledged.

## CLEAR ACKNOWLEDGED makes an active alarm start blinking again

That is expected. CLEAR ACKNOWLEDGED removes stored acknowledgement. If the underlying alert condition is still active, the alert becomes eligible to indicate again immediately.

## Manual or Automatic ACK rearm seems wrong

Check both levels:

1. **Panel settings → Acknowledgement → Default ACK rearm** sets the panel default.
2. **Lamp → Behavior → ACK rearm** can use the panel default or explicitly override it.

Manual keeps ACK stored after the source returns to normal until Clear ACK/CLEAR ACKNOWLEDGED. Automatic keeps ACK while the configured alert condition remains active, then clears it after the condition becomes normal. This is condition-based and also applies when Alert effect is None. Unknown/unavailable never clears the ACK. **Alert when → ON or OFF** is always eligible, so it has no automatic normal state.

Existing v1.0.2 lamps remain explicit Manual unless changed. New lamps use **Use panel default**.

## Spacer will not disappear into the panel

Select the spacer, set **Appearance → Blend into panel (transparent gap)**, or make that the panel's **Spacer default** and leave the spacer on **Use panel default**. Blend suppresses the lens, frame/bezel, border, glare, and shadow. Compatibility intentionally retains the old visible spacer; Custom intentionally renders the selected Spacer fill, Spacer frame / bezel, Spacer border, and Spacer border width.

If only one spacer layer should disappear, choose **Custom fill / frame / border** and enable **No spacer fill**, **No spacer frame / bezel**, or **No spacer border** independently. A per-spacer Custom choice overrides the panel default.

## A surface still looks framed after choosing None

Open **Panel settings → Appearance → Quick appearance** and identify the separate layer that is still visible:

- **No panel frame** removes the grid surround, while **No panel border** removes the outside panel edge/shadow.
- **No lamp bezels** removes the area around the lenses, while **No lens borders** removes the line directly on the lenses.
- Header background/border and header button background/border each have their own None switch.
- Spacer layers are intentionally independent from lamp-layer switches; use the spacer's Blend or Custom controls.

None switches retain saved colors. If a surface returns after switching None off, that is the previous theme or custom override being restored.

## Panel & frames opens without color controls

This means some or all corresponding surfaces are disabled under **Quick appearance**. The editor now names the disabled layers inside **Panel & frames**; when every layer is disabled it shows **Edit visibility**. Select that button to reopen **Quick appearance**, then turn off the relevant **No...** switch before editing its color or source. The saved color was not deleted.

## An inactive lamp is unexpectedly dim or bright

Check **Panel settings → Appearance → Lamp lighting → Brightness profile** first, then inspect the **OFF · ON · ALERT** preview. Normal is 100/100/100. Dim OFF, Dim ON, Dim non-alert, and Dim all apply **Dim level** to the named states; Custom uses independent **OFF brightness**, **ON brightness**, and **Alert brightness**. Canonical Dim level and custom levels accept 10–100%, with Dim level defaulting to 32%.

For one lamp, open its Quick/Full editor or **Appearance → Lens & light → Brightness**. **Inherit** uses the panel profile; another selection replaces it only for that lamp. In Bulk edit, **Brightness** is staged and does nothing until Apply. INOP and Lamp Test force 100%. An active main alarm condition—including `Alert when: Lamp OFF`—or change alert uses Alert brightness even after ACK; ordinary lamps then use their resolved final ON or OFF level. Paired halves resolve independently.

If YAML still uses the old settings, an explicit `lamp_brightness` object wins. Otherwise `inactive_lamp_default: normal|dim` maps to profile `normal|dim_off`, `inactive_lamp_brightness` maps to Dim level through the old 10–90 range, and per-lamp `inactive_lamp_mode: inherit|normal|dim` maps to `inherit|normal|dim_off`. Opening the editor or preview does not rewrite those aliases.

## An appearance preset changed more than expected

Appearance presets are limited to panel-wide visual choices. They do not contain entities, per-lamp overrides, alarm output, ACK policy/state, header controls, interactions, rules, or layout. If one of those changed, use the editor's Undo immediately and inspect the surrounding Home Assistant dashboard edit history; the preset apply path does not write those keys. **Update** overwrites the selected preset with the current appearance, whereas **Apply** changes the current look to the selected saved values.

Lamp appearance presets are a separate library. They can change color behavior/custom colors, font, icon size/color, shape, illumination, style, lens, and the per-lamp brightness profile. They cannot change entity/source identity, display text, icon identity, lamp type/severity, alarm/ACK behavior, rules, actions, group, pair, or span. If the result is visually unexpected, use Undo and confirm that the selected item came from **Lamp appearance presets**, not the panel-wide **Appearance presets** library.

### My lamp should say ACTIVE when ON and TRIP when OFF

Open **Full editor → Display**, set the desired Primary, Secondary, or Tertiary selector to **ON / OFF labels**, and enter **ON text: ACTIVE** and **OFF text: TRIP**. This follows the final logical state after conditions, invert, Force ON/OFF rules, and Lamp Test. Use **Dynamic text rules** only when you need thresholds, source-state/string checks, availability, ACK, or active-alarm conditions. Rules are ordered; move the most specific match above broader ones because the first enabled match wins.

If a Dynamic line shows its fallback during an unavailable state, that fallback intentionally does not hide INOP. Add an explicit **Unavailable / missing** or **Unknown** rule, or use ON / OFF labels and customize **Unavailable text** / **Unknown text**, when you want to replace the INOP wording.

### My ON/OFF icon colors do not change

In **Full editor → Display**, Content must be Icon only or Icon + selected lines. Set **Icon color** to **Separate ON / OFF colors**, then set both color values. The selection follows the same final logical state as the lamp, not merely the raw entity string. Unavailable icons intentionally use the unavailable text color. Old configurations with the former override switch appear as **One custom color** and remain unchanged.

## Quick setup is missing an advanced option

Choose **Full editor** above the selected lamp. Quick setup intentionally shows only common fields; Display, Interaction, Rules, pairing, span, detailed alert tuning, and diagnostics remain in Full editor. Switching editor mode does not change or save configuration.

## Bulk edit changed both halves of a pair

Expected. Selecting either half of a valid pair expands the bulk selection to both halves so Group, visual style, and other common settings remain pair-safe. Bulk values are staged: opening Bulk edit or changing a selector does nothing until its adjacent **Apply** button is selected. One Apply is one undoable operation.

## ACK does not change the entity state

Correct. ACK is annunciator state, not device control.

To control an entity, configure Tap/Double tap/Long press as:

- Toggle
- Turn On
- Turn Off

## ACK storage is not shared across devices

Local browser storage is per browser/device.

For shared ACK state, create an `input_text` helper and configure **Persistent input_text** storage.

The helper shares annunciator acknowledgement, not the underlying entity state. The browser still performs the helper service call and needs connectivity and permission; a failed persistent write can fall back locally.

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

Open **Full editor → Rules → Live rule trace** and refresh it. The trace uses the runtime condition evaluator. In particular, a rule below the first winner reads **Not evaluated because an earlier rule matched**; other exact reasons distinguish disabled/incomplete rules, missing/not-found/unknown/unavailable sources, nonnumeric sources, each kind of comparison miss, and a match. Reading the trace does not operate the entity or save configuration.

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

For a Derived lamp, the source for change detection is its resolved final ON/OFF state after rules. A qualifying external rule transition can create one change alert; rerendering with the same final state should not keep creating new ones.

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

- group names and capitalization (`Boiler Room` and `boiler room` are different);
- Group ACK scope (`all` vs `alerting`);
- Include change alerts setting;
- Pair ACK Lock if a paired partner is involved.

Choose an existing suggestion in the lamp's Group field when possible. Deliberately typing a new capitalization creates a distinct group. Assigning a group to one half of a valid pair updates its partner.

## Lamp Test changes ACK state

It should not. ACK/Clear mutations are blocked while Lamp Test is active. The v1.1.0 runtime captures one Lamp Test snapshot for the complete render, so state evaluation and brightness cannot disagree merely because a short manual-test timer expires between those steps. If ACK still changes, report the exact helper/manual-test path and timing.

## Unavailable entity shows INOP

Expected. Missing, `unknown`, and `unavailable` source entities use the unavailable appearance and `unavailable_text` (default `INOP`).

Lamp Test can still illuminate/test a populated unavailable window.

## Values show NaN, Infinity, or crash the card

v1.0.2 contains additional malformed-value hardening. The visual editor limits decimals to 0–3; manual YAML is runtime-clamped to a safe range.

If a malformed value still crashes rendering, include the exact YAML and console stack trace.

## Historical alarm totals differ between devices or missed an alarm

**Local browser observations** are intentionally device-local and count only Alarm/Trip arrivals seen while that card is open, awake, and connected. They cannot backfill dashboard downtime and are removed with browser site data. Make sure different logical panels use different Panel IDs.

For one shared value, set **Tally source** to **Home Assistant entities** and configure a Day/Week/Month/Year sensor for every enabled tally. Home Assistant—not the card—must maintain those values and time windows. Entity mode stops local history tracking and hides **Clear saved alarm totals** because the card cannot reset the source sensors.

## An entity-backed historical tally shows `—`

The configured entity is blank/missing, its state is `unknown` or `unavailable`, or its state is nonnumeric, non-finite, or negative. The dash is deliberate so missing data is not misreported as zero. Confirm the entity exists and has a finite non-negative numeric state in Home Assistant Developer Tools. A real numeric zero displays as `0`.

## My media only shows text fields

In v1.1.0, open **Panel settings → Alarm output**, select **Media player**, choose a target player, and use **Home Assistant media browser**. Selecting an item from **My media** fills the media content ID and content type automatically.

The text fields are still available under the collapsed **Manual media settings** section for a direct URL or `media-source://` URI. If the media browser control itself is missing, confirm that only one v1.1.0 Annunciator Grid Card resource is loaded, clear the browser cache, and reload the dashboard.

If a picked item does not play, verify that the chosen media player can play the same item from Home Assistant's Media panel. Then check the browser console and Home Assistant logs for a `media_player.play_media` service error.

## SILENCE does not stop Script alarm output

In **Panel settings → Alarm output → Script**, select a separate **Silence script** that stops or reverses the horn/output started by **Start script**. The card calls both through `script.turn_on`; it does not use `script.turn_off` because that cannot undo arbitrary devices changed by a script. After a successful start, the applied Silence script runs when SILENCE is selected, no active audible alarms remain, the sounding output configuration changes, or the card disconnects. Advanced YAML can use `silence_action` as the fallback for those transitions when no Silence script is configured. If the start call failed, the card does not mark the output as sounding and therefore does not schedule a stop for that failed start.

Also confirm that the dashboard remains open and connected and that the signed-in user can run both scripts. Alarm output and its silenced state are browser-card behavior, not a Home Assistant server alarm engine. Multiple open card instances may each call the target, and recreating/reloading an instance can recreate its local silence state. Use a Home Assistant automation when the behavior must continue without an open dashboard.

## Editor field loses focus or resets while typing

The editor is designed not to rebuild the entire tree on ordinary reflected config updates. If a particular field still loses focus:

- identify the exact tab/field;
- note whether an entity state update happened at the same time;
- include browser/device and Home Assistant version.

## Diagnostics info button performs the lamp action

The card isolates diagnostic/info controls from lamp gesture handling. If clicking or holding the info icon also controls or acknowledges a lamp, verify the loaded version and report the exact browser/device.

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
