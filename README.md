# Stuttgart ALKIS Full Excel Export

Node.js CLI that downloads **all** Stuttgart ALKIS features from the LGL WFS (`WFS_LGL-BW_ALKIS`) and writes **one Excel file per layer**.

## Data source

- Portal: [opengeodata.lgl-bw.de](https://opengeodata.lgl-bw.de)
- WFS: `https://owsproxy.lgl-bw.de/owsproxy/wfs/WFS_LGL-BW_ALKIS`
- License attribution (required): **Datenquelle: LGL, www.lgl-bw.de**

## Install

```bash
npm install
```

## Run full export

```bash
npm run export:stuttgart
```

Optional flags:

```bash
npm run export:stuttgart -- --resume
npm run export:stuttgart -- --out-dir ./output/my-export
npm run export:stuttgart -- --tile-size 2000
npm run export:stuttgart -- --include-wkt true
npm run export:stuttgart -- --layer v_al_flurstueck
```

Smoke test (one tile, one layer):

```bash
npm run export:stuttgart:smoke
```

## Output

- Directory: `output/stuttgart-alkis-YYYY-MM-DD/`
- One file per layer: `v_al_flurstueck.xlsx`, `v_al_gebaeude.xlsx`, …
- Each file has a `_metadata` sheet plus the layer data
- `_export-manifest.json` — row counts and file paths for all layers

With `--resume`, cached GML tiles are reused and **layers that already have an `.xlsx` file are skipped**.

## Cache

Downloaded GML tiles are cached under `cache/wfs/{layer}/{tileId}.gml`. Use `--resume` to skip re-downloading.

## Notes

- Full export processes **31 layers sequentially** (~3–4 hours for all layers).
- Each layer is saved immediately when done, so interrupted runs keep completed files.
- `--include-wkt true` adds geometry WKT columns (large files; default is off).
- Node is started with `--max-old-space-size=4096` for large layers.
