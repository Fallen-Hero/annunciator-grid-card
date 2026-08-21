# Migration Guide

## From v2.x release candidates to v1.0.0

v1.0.0 is the stable release of the final release-candidate code line. Existing v2.x/RC configurations should continue to work without manual conversion.

The persisted card schema remains:

```yaml
config_version: 2
```

The product version and configuration-schema version are intentionally separate.

## From older v1.83-era configurations

The card contains compatibility normalization for older configuration names and behavior. When the visual editor opens an older configuration, it may:

- assign a stable lamp UID;
- assign a stable monotonic ACK slot;
- set schema-v2 defaults;
- preserve older condition/alert/rule keys through compatibility paths;
- validate malformed pairing metadata.

After opening an old card in the visual editor, save it once so generated identity information becomes persistent.

## ACK migration

Older JSON/entity-key ACK data can be read and migrated to the adaptive compact format used by v1.0. The new format uses stable ACK slots and chooses a dense or sparse representation depending on which is smaller.

If persistent storage fails or exceeds the selected Home Assistant text helper capacity, the card falls back to browser-local storage instead of silently discarding ACK state.

## Rearm behavior

Legacy lamps that do not explicitly declare `ack_rearm` retain **Manual** rearm for compatibility.

New Alarm lamps created by the current visual editor default to **Automatic** rearm.

Review older alarm lamps if you want recurring alarm behavior:

```text
Behavior → ACK rearm → Automatic — rearm when normal
```

## Pairing

The current editor manages Pair IDs automatically. Avoid hand-editing `pair_id` unless necessary. A valid pair has exactly one TOP and one BOTTOM. The editor provides validation/repair for malformed legacy pairs.
