# Validation — v1.0.0

## Release provenance

v1.0.0 is a release promotion of the final `v2.3.0-rc.5` candidate. No runtime behavior was changed during the promotion; only release/version-facing strings were changed:

- source banner
- `CARD_VERSION`
- visual-editor release label
- custom-card description text
- console load message

The final RC had already completed the full pre-HACS validation pass. The v1.0 source is syntax-checked again and a normalized source comparison confirms it is behavior-equivalent to the validated RC.

## Final RC validation inherited by v1.0.0

- Full real-Chromium runtime/editor regression: **746/746 PASS**
- Chromium page exceptions: **0**
- Focused ACK/group/history operator-path suite: **17/17 PASS**
- Internal method-reference audit: **0 unresolved calls**
- Runtime card registration count: **1**
- Visual editor registration count: **1**
- ZIP/extracted-file integrity: **PASS**

### Input/color regressions

- Slow text entry retains focus.
- Slow number entry retains focus.
- Required numeric blank/re-entry behavior passes.
- Optional numeric clear-to-Inherit passes.
- Native color picker remains connected through reflected Home Assistant updates.
- Multiple delayed color changes remain editable.
- Slowly typed hex colors retain focus.

### ACK/operator paths

Validated scenarios include ACK All, Group ACK All, alerting-only Group ACK, Group Clear, Include Change on/off, Pair ACK Lock, Clear ACK with an active until-ACK change alert, Lamp Test ACK blocking, persistent `input_text` optimistic ACK and failure fallback, automatic/manual rearm, and idempotent per-lamp ACK.

### Layout/runtime

Validated scenarios include occupied-column sizing, compact/narrow/extreme Auto Fit, Fixed Size, Horizontal Scroll, paired-cell physical counting, spacers, group headers, dynamic `getCardSize()`/`getGridOptions()`, and targeted entity refresh.

### Config/rules/pairing

Validated scenarios include schema-v2 migration, UID repair, monotonic ACK slots, Undo allocator protection, pair validation/canonicalization, TOP-defined physical position, atomic pair movement/deletion, ordered rule movement/duplication/deletion, Rule Undo, inclusive/exclusive thresholds, and repair actions.

### Display/alerts/accessibility

Validated scenarios include value transforms, scale=0, negative scale, C/F conversion and unit resolution, rule priority, all six alert effects, speed/opacity/border/wave/throb tuning, reduced motion, pointer long-press, movement cancellation, keyboard ACK, Presentation mode, diagnostics overlay, and diagnostic support package construction.

## v1.0.0 release checks

Run from repository root:

```bash
npm test
```

The GitHub HACS workflow should also pass before publishing a release.

The authoritative distributable is:

```text
dist/annunciator-grid-card.js
```

## Exact v1.0.0 source verification

SHA-256 of `dist/annunciator-grid-card.js`:

```text
486d0eaf8eb5aacfd58826248cf84062d2a1300ccf9f1ec745beb20db05228b1
```

Repository-level checks completed before packaging:

- `node --check dist/annunciator-grid-card.js`: PASS
- `npm test`: PASS
- `hacs.json` JSON parse: PASS
- `package.json` JSON parse: PASS
- example YAML parse: PASS
- GitHub workflow YAML parse: PASS
- issue-template YAML parse: PASS
- HACS manifest filename resolves to `dist/annunciator-grid-card.js`: PASS
- README contains a repository image: PASS
- normalized v1.0.0 source is byte-identical to the exact validated RC.5 source: PASS

The GitHub-side HACS checks for repository description, topics, Issues status and published Release can only run after the repository exists on GitHub. The included HACS Action is configured to perform those checks after publication.
