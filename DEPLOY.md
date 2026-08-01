# Deploying the client dashboard (Render)

Production serves the **built** React app from `client-app/dist`. That folder is created during deploy, not stored in git.

## After you push to GitHub

1. Open [Render Dashboard](https://dashboard.render.com/) → **antberg-platform**.
2. Confirm a deploy started for your latest commit on `main`.
3. If the site looks unchanged: **Manual Deploy** → **Clear build cache & deploy**.
4. Wait until status is **Live** (free tier can take several minutes, especially after sleep).

## Verify the live build

Open (replace with your service URL):

```text
https://<your-service>.onrender.com/api/version
```

Example response:

```json
{ "build_id": "a1b2c3d", "render": true, "node_env": "production" }
```
 (production token)

From `render.yaml`:

```text
https://<your-service>.onrender.com/access/antberg-client-preview-2026
```

## Browser still shows old UI?

- Hard refresh: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac).
- Or open the access link in a private/incognito window.

## Live data vs demo JSON

MySQL on Render is optional. Without `database/.env` equivalents set in Render, the API uses `data/catalog.json` and file-based evaluations. The UI still updates; scouting orders / pipeline numbers may stay empty unless you configure MySQL and run `npm run import:db -- --reset` against that database.

## Local production-like run

```bash
npm run client:build
npm run client
```

Open `http://localhost:4173`.
