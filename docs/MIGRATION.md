# Annunciator Grid Card — v1.0.2 Migration and Compatibility

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

## Header ACK migration

v1.x used one configurable header ACK button:

```yaml
show_reset_ack: true
reset_ack_action: clear   # or ack_all
reset_ack_label: ""
```

v1.0.2 uses two independent controls:

```yaml
show_ack_all: true
show_clear_ack: true
```

Compatibility behavior:

| Old config | v1.0.2 initial behavior |
| --- | --- |
| `reset_ack_action: clear` | CLEAR ACK shown, ACK ALL hidden |
| `reset_ack_action: ack_all` | ACK ALL shown, CLEAR ACK hidden |
| `show_reset_ack: false` | both hidden |
| no old/new header keys | historical CLEAR ACK-only behavior |
| new v1.0.2 visual-editor card | ACK ALL and CLEAR ACK shown |

Once you change the new header switches, the editor stores the new settings. Legacy keys remain available as downgrade compatibility fields.

The new header labels are standardized as **ACK ALL** and **CLEAR ACK**.

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

## Pairing

Malformed/legacy pair relationships are safely repaired/canonicalized where possible. A valid pair remains one TOP + one BOTTOM occupying one physical cell.

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
