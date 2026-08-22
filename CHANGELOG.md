# Changelog

All notable public-release changes are documented here.

## [1.0.1] - 2026-08-21

### Changed
- Updated the README and documentation presented through HACS.
- Improved release/version presentation to avoid stale hard-coded release information.
- Prepared repository metadata and documentation for HACS default-catalog submission.

### Runtime
- No functional annunciator behavior changes from v1.0.0.
- Existing configurations remain compatible.

## [1.0.0] - 2026-08-20

### Added

- Full visual editor with responsive, searchable, paginated physical-cell navigator.
- Lamp intents: Alarm, Status, Sensor, Custom.
- Truthy, state-list, string, and numeric condition evaluation.
- Value conversion/formatting pipeline including C/F conversion, scale, offset, rounding, units, prefix, and suffix.
- Conditional Rules with ordered first-match priority, severity/color/effect overrides, Force ON, duplication, movement, deletion, and Undo.
- Attention effects: Blink, Pulse, Wave, Throb, Heartbeat, Flash.
- Separate state/value-change alert policy with timed or until-ACK operation.
- Manual and automatic acknowledgement rearm.
- Adaptive compact persistent ACK storage with legacy migration and browser-local fallback.
- Paired TOP/BOTTOM lamps with atomic physical-cell movement and optional linked ACK.
- Group headers, group ACK/Clear, alerting-only ACK, and optional change-alert inclusion.
- Modern/Retro lamps, lens styles, severity appearance maps, per-lamp colors, retro warm-up and subtle flicker.
- Auto Fit, Fixed Size, and Horizontal Scroll runtime sizing.
- Dynamic Home Assistant Masonry and Sections sizing.
- Operator and Presentation panel modes.
- Lamp Test helper with Illuminate Only and Full Alert Test modes.
- Diagnostics/history overlay and copyable diagnostic package.
- Configuration schema v2 validation and safe repair for UIDs, ACK slots, and malformed pairs.
- Undo for structural editor actions.
- Keyboard/pointer acknowledgement and reduced-motion support.

### Fixed / hardened before 1.0

- Text, number, and color inputs retain focus through Home Assistant reflected config updates.
- Native color picker remains active during delayed/multiple changes.
- Compact panels no longer reserve invisible configured columns.
- ACK header follows occupied panel width; stray right-side sizing artifacts removed.
- Celsius/Fahrenheit values and automatic units stay consistent.
- `scale: 0` is valid.
- Border-emphasis and all animation-speed controls are actually applied.
- Cell padding, font weight, frame color, corner radius, rows/minimum height, and paired-cell styling are consistently applied.
- Persistent ACK has immediate optimistic visual feedback and safe failed-write fallback.
- ACK actions are idempotent; Clear ACK is a separate operation.
- Group Include Change setting is honored.
- Lamp Test cannot accidentally mutate ACK state and can test unavailable source windows.
- Change-alert state is cleared when the feature is disabled and config changes cannot fake source-state changes.
- ACK slots are monotonic and are not rewound by Undo.
- Pair physical position is consistently defined by TOP, including legacy/manual configurations.
- Auto Fit has no arbitrary minimum scale that can reintroduce clipping.
