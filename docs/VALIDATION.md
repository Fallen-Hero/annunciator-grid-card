# Annunciator Grid Card v1.0.2 — Validation Notes

The project uses several layers of validation. No automated suite can reproduce every Home Assistant/browser/theme/device combination, so real Home Assistant smoke testing remains part of the release gate.

## Repository test command

```bash
npm test
```

The v1.0.2 repository test command performs:

1. JavaScript syntax validation (`node --check`).
2. Static feature/invariant checks.
3. Deterministic runtime regression tests.
4. Dedicated dual-header ACK compatibility/stress tests.
5. Documentation validation, including a check that every literal visual-editor field label is covered by the Complete User Guide.

## Release-candidate validation layers

The v1.0.2 release candidate was also exercised with broader local suites covering:

- color behavior and precedence;
- standalone/paired parity;
- global color enable/disable combinations;
- legacy v1.x differential behavior;
- cross-entity rules and Force OFF;
- malformed configuration fuzzing;
- ACK encoding/decoding and layout stress;
- configurable interactions and gesture arbitration;
- alternate entity target safety;
- panel themes and lens materials;
- editor controls;
- headless Chromium runtime rendering and interaction.

## Header ACK regression coverage

The v1.0.2 ACK header tests specifically verify:

- new visual-editor cards can show ACK ALL and CLEAR ACK together;
- each button can be independently hidden;
- ACK ALL acknowledges an active alert;
- ACK ALL does not pre-ACK an inactive lamp;
- CLEAR ACK removes stored panel ACK state;
- old Clear-only configuration remains Clear-only;
- old ACK-All configuration remains ACK-All;
- an old minimal config keeps the historical Clear-only default;
- Presentation mode hides header ACK controls and does not reserve an empty ACK-only header;
- the editor exposes the two new switches and removes the obsolete action/label selectors.

## Browser validation

Headless Chromium validation is useful for catching issues that pure Node tests cannot see, including:

- custom-element registration;
- actual Shadow DOM rendering;
- computed CSS differences;
- visible header controls;
- real click/pointer gesture routing;
- Home Assistant service-call shapes;
- editor rendering.

It is still not identical to a real Home Assistant frontend. Final smoke testing in Home Assistant is required.

## Compatibility philosophy

When a new cleaner model conflicts with old saved behavior, v1.0.2 generally chooses:

1. preserve the old configuration behavior;
2. expose the cleaner model for new configuration;
3. migrate only when the user deliberately selects the new model;
4. validate and repair malformed structures without inventing unstable runtime identity.

## Reporting a regression

Include:

- card version;
- Home Assistant version;
- browser/device;
- exact configuration or diagnostic package;
- expected/actual behavior;
- console errors;
- screenshot/video when relevant.
