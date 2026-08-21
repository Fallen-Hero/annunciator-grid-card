# GitHub / HACS Publishing Guide — v1.0.0

This package is designed for a GitHub repository named exactly:

```text
annunciator-grid-card
```

That name matches `dist/annunciator-grid-card.js`, satisfying the HACS Dashboard/plugin filename requirement.

## 1. Create the GitHub repository

Create a **public** repository named `annunciator-grid-card`.

Recommended GitHub description:

> Industrial-style annunciator panel card for Home Assistant with alerts, ACKs, groups, paired lamps, conditional rules, and a visual editor.

Recommended topics:

```text
home-assistant
homeassistant
lovelace
hacs
custom-card
dashboard
annunciator
alarm-panel
industrial
scada
```

Keep **Issues enabled**.

## 2. Upload this repository package

The repository root should contain `README.md`, `hacs.json`, `LICENSE`, `CHANGELOG.md`, `.github/`, `docs/`, `examples/` and `dist/`.

The HACS distributable is:

```text
dist/annunciator-grid-card.js
```

Do not rename it unless you also intentionally rename the repository/HACS manifest.

## 3. Verify locally

From repository root:

```bash
npm test
```

Expected: syntax check passes and static validation reports success.

## 4. Push to GitHub

Example:

```bash
git init
git add .
git commit -m "Release Annunciator Grid Card v1.0.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/annunciator-grid-card.git
git push -u origin main
```

## 5. Confirm GitHub Actions

The included **Validate** workflow runs:

- source/static checks;
- the official HACS validation action with `category: plugin`.

Do not publish v1.0.0 until the validation workflow is green.

## 6. Publish the GitHub Release

The included Release workflow runs when a `v*` tag is pushed. For v1.0.0:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow:

- reruns `npm test`;
- verifies the source contains the tag's version;
- creates a GitHub Release;
- attaches standalone `annunciator-grid-card.js`;
- attaches a manual-install ZIP;
- uses `release-notes/1.0.0.md` when available.

Alternatively, create the GitHub Release manually and attach `dist/annunciator-grid-card.js`.

A **GitHub Release**, not only a tag, is important because HACS uses the release tag as the remote version when releases are used.

## 7. Test as a HACS custom repository

Before applying for default inclusion:

1. HACS → Custom repositories.
2. Add your repository URL.
3. Category: **Dashboard**.
4. Download the card.
5. Confirm Home Assistant loads `ANNUNCIATOR-GRID-CARD 1.0.0 Loaded` in the browser console.
6. Add/edit a card and confirm the visual editor appears.

## 8. Apply for HACS default inclusion

Current HACS requirements for default inclusion include:

- owner or major contributor submits;
- public GitHub repository;
- HACS Action passes with no ignored checks;
- full GitHub Release exists after actions pass;
- repository description, topics and Issues are present/enabled;
- plugin README contains an image;
- repository can already be added to HACS as a custom repository.

Then fork `hacs/default`, create a branch from `master`, and add your repository to the plugin list in alphabetical order following the HACS PR template.

HACS notes that default-repository review can take time; custom-repository installation remains available while waiting.

## 9. Release checklist

- [ ] Repository is public and named `annunciator-grid-card`.
- [ ] GitHub description set.
- [ ] Topics set.
- [ ] Issues enabled.
- [ ] README image renders.
- [ ] `hacs.json` is in repository root.
- [ ] `dist/annunciator-grid-card.js` exists.
- [ ] `npm test` passes.
- [ ] GitHub Validate workflow passes.
- [ ] Test installation as HACS custom Dashboard repository.
- [ ] Tag `v1.0.0` pushed.
- [ ] GitHub Release `v1.0.0` exists.
- [ ] Release has standalone `.js` asset.
- [ ] Browser console shows v1.0.0 after HACS install.
- [ ] Submit HACS default-list PR when ready.

## Reference documentation

- HACS general publishing: https://www.hacs.xyz/docs/publish/start/
- HACS Dashboard/plugin requirements: https://www.hacs.xyz/docs/publish/plugin/
- HACS validation action: https://www.hacs.xyz/docs/publish/action/
- HACS default inclusion: https://www.hacs.xyz/docs/publish/include/
- Home Assistant custom cards: https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card/
- Home Assistant resource registration: https://developers.home-assistant.io/docs/frontend/custom-ui/registering-resources/
