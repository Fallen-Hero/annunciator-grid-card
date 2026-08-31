![Annunciator Grid Card — Alarm, Status, Control](images/annunciator-grid-card-logo.png)

# Contributing

Contributions, bug reports, documentation fixes, and focused feature proposals are welcome.

## Before opening an issue

- Confirm the issue still occurs on the latest release.
- Hard-refresh Home Assistant after updating the JavaScript resource.
- Check the browser console.
- Use **Copy diagnostic package** when the issue is tied to one lamp.
- Remove or redact private entity names/data before posting logs publicly.

## Pull requests

1. Fork the repository and create a focused branch.
2. Keep unrelated behavioral changes out of the same PR.
3. Update documentation/changelog where user-facing behavior changes.
4. Run:

   ```bash
   pnpm install --frozen-lockfile
   pnpm test
   ```

5. Ensure the HACS validation workflow passes.
6. Describe what was changed, why, and how it was tested.

## Versioning

The project uses semantic versioning for public releases:

- PATCH: bug fixes and compatible polish.
- MINOR: backward-compatible features.
- MAJOR: intentionally breaking configuration/behavior changes.

The persisted configuration schema is independently versioned by `config_version`.

## Coding principles

- Preserve backward compatibility unless a breaking release explicitly says otherwise.
- Keep lamp evaluation centralized so rendering, ACK, group logic, and diagnostics do not drift.
- Avoid visual-editor options that do not have a runtime consumer.
- Do not silently discard user configuration.
- Treat paired lamps as one physical cell for navigation/movement.
- Keep acknowledgement behavior deterministic and testable.
