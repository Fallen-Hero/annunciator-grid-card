# Troubleshooting

## Card does not appear after updating

1. Confirm `annunciator-grid-card.js` is installed and registered as a **JavaScript Module**.
2. Hard-refresh the browser (`Ctrl+Shift+R` / `Cmd+Shift+R`).
3. Open the browser developer console and confirm the load message shows the expected version.
4. If using HACS, reload the frontend after the HACS update completes.

Expected v1.0 console message:

```text
ANNUNCIATOR-GRID-CARD 1.0.0 Loaded
```

## Visual editor field loses focus while typing

v1.0 contains the transaction/focus fix for text, numeric, and color inputs. If this occurs:

- verify the console shows v1.0.0;
- hard-refresh to eliminate an older cached resource;
- report the exact field and browser/device.

## Color picker closes or unselects itself

v1.0 specifically protects native color-picker sessions through Home Assistant reflected config updates. Verify the loaded version and clear stale browser resource cache before reporting a regression.

## Lamp never turns ON

Check:

- entity exists and is not `unknown`/`unavailable`;
- exact raw state in Home Assistant Developer Tools;
- ON condition type and case-sensitive string values;
- value conversion/scale/offset for numeric conditions;
- Invert and Always ON options;
- Diagnostics overlay → Raw value / Transformed value / Computed ON.

## Alarm stays quiet after a previous ACK

Check **Behavior → ACK rearm**.

- **Manual** requires explicit Clear ACK.
- **Automatic** clears the main ACK after the alert condition genuinely returns normal.

Do not combine Automatic rearm with `Alert when = ON or OFF` and expect a normal state; both lamp states are alerting in that configuration.

## ACK differs between phone and desktop

You are probably using **Local browser** ACK storage. Select **Persistent input_text** for shared operator state.

## Persistent ACK helper does not update

- Confirm the selected helper is an `input_text`.
- Prefer maximum length 255.
- Check browser console warnings.
- Verify Home Assistant service calls are permitted.

If the persistent write fails, the card deliberately falls back to local storage.

## Pair looks wrong or moves strangely

Open the card editor and review **Configuration check**. A valid pair contains exactly one TOP and one BOTTOM and is treated as one physical cell.

Use the visual editor's **Pair with lamp** control rather than manually assigning Pair IDs.

## Group header placement looks wrong

Group headers follow configured physical order. Keep lamps belonging to one group contiguous.

## Lamp shows INOP

The configured source entity is missing, `unknown`, or `unavailable`. Change **Panel Settings → Advanced → Unavailable text** if you prefer another label.

## Numeric threshold appears wrong

Numeric logic uses the transformed value:

```text
HA state → conversion → scale/offset → condition/rules → display rounding/unit
```

Use the Diagnostics overlay to compare Raw and Transformed values.

## Support package

For difficult problems, open the lamp's Advanced page and use **Copy diagnostic package**. Review/redact entity IDs or state attributes you do not want to post publicly.
