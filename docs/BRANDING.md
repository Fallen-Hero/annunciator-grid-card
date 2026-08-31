![Annunciator Grid Card — Alarm, Status, Control](../images/annunciator-grid-card-logo.png)

# Brand assets and usage

Annunciator Grid Card uses a dual brand system: a compact, unlabeled lamp matrix where space is limited and a labeled annunciator panel for banners, documentation, releases, and social presentation.

## Brand line

**ALARM · STATUS · CONTROL**

Keep the words uppercase and preserve the centered-dot separators. The accessible plain-text equivalent is “Alarm, Status, Control.”

## Asset directory

| File | Size | Intended use |
| --- | ---: | --- |
| `annunciator-grid-card-mark.svg` | Vector | Compact master mark |
| `annunciator-grid-card-icon.png` | 256 × 256 | Standard square icon |
| `annunciator-grid-card-icon@2x.png` | 512 × 512 | High-density square icon |
| `annunciator-grid-card-logo.svg` | Vector | Labeled horizontal master logo |
| `annunciator-grid-card-logo.png` | 600 × 180 | Documentation and normal-density logo |
| `annunciator-grid-card-logo@2x.png` | 1200 × 360 | High-density horizontal logo |
| `annunciator-grid-card-banner.svg` | Vector | Editable banner master |
| `annunciator-grid-card-social-preview.png` | 1280 × 640 | GitHub social preview, releases, and social posts |
| `annunciator-grid-card-v1.1.0.gif` | 800 × 449 | Animated product demonstration |

All assets are stored in [`images/`](../images/).

## Color palette

| Role | Color |
| --- | --- |
| Alarm red | `#E63B3F` |
| Lamp white | `#F4F6F8` |
| Status green | `#78DC5B` |
| Panel black | `#0D1014` |
| Frame gray | `#30363D` |
| Home Assistant accent | `#41BDF5` |

The logo's gradients may use lighter and darker versions of the three lamp colors to create illuminated lenses. Do not recolor the mark with Home Assistant branding or imply that the card is an official Home Assistant component.

## Usage rules

- Use the square icon when the artwork will appear at avatar or favicon scale.
- Use the labeled horizontal logo for documentation headers and compact promotional placement.
- Use the labeled social preview for GitHub repository social media settings and wide release graphics.
- Keep enough clear space around the artwork for the outer frame and shadow to remain visible.
- Do not stretch, rotate, crop through the frame, rearrange the lamp labels, or replace the brand line.
- Preserve useful alt text: “Annunciator Grid Card — Alarm, Status, Control.”

## GitHub and HACS

Upload `annunciator-grid-card-social-preview.png` under the repository's **Settings → General → Social preview**. GitHub stores that setting separately; committing the image alone does not select it.

For HACS Dashboard plugins, `hacs.json` controls the display name and install filename but does not currently provide a logo field. HACS requires plugins submitted to the default catalog to include images in the README, which this repository does. The README banner and demonstration will therefore be available in the repository details content, but the HACS catalog's small repository icon is managed separately by HACS and is not changed by adding a local `brand/` directory. See the official [HACS repository manifest](https://www.hacs.xyz/docs/publish/start/), [Dashboard plugin requirements](https://www.hacs.xyz/docs/publish/plugin/), and [default-submission checks](https://www.hacs.xyz/docs/publish/include/).

## Source and licensing

These project-specific brand assets are maintained with this repository. The project code remains licensed under the repository's [MIT License](../LICENSE). Home Assistant and HACS names and marks belong to their respective owners; their names are used only to describe compatibility.
