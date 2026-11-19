# Neon Coast Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01/)
[![Rank](https://make.fun/badge/gta6-cover-art-01/Jelly-RayTian/gta6-cover-art-01/rank.svg)](https://make.fun/c/gta6-cover-art-01/)
[![Reward](https://make.fun/badge/gta6-cover-art-01/Jelly-RayTian/gta6-cover-art-01/reward.svg)](https://make.fun/c/gta6-cover-art-01/)

An original, offline, static web app that turns your own photos and a caption into bold multi-panel
"Vice City poster" cover art and exports a PNG. No Rockstar logos, artwork or fonts are used.

- **5 layouts:** Classic 4 (2x2), Hero + 3, 9 Grid, Full Bleed, tilted Snapshots.
- **Any photo:** pick a panel, upload a photo (or drop one on it), drag to reposition, scroll or use the slider to zoom; "Use in all panels" fills every panel from one photo. Two sample photos are bundled.
- **5 colour grades:** Vice Sunset, Neon Nights, Golden Hour, Noir, Clean (canvas filters and blend-mode gradient overlays, identical in preview and export).
- **Caption lettering:** editable title and subtitle in Anton, white / sunset gradient / neon pink, top/middle/bottom.
- **Export:** 1080x1080, 1080x1350 or 1920x1080 PNG, drawn on a canvas at full size.

## Run

```
node serve.ts        # http://localhost:8080
```

Any static server over `app/` works. Hand-in build: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.

## Credits and licences

Code: MIT (see `LICENSE`). Font: Anton, SIL Open Font License 1.1 (`app/fonts/LICENSE-Anton.txt`).
Sample photos in `app/samples/` come from the make.fun kit (made with an image model, free to use).
