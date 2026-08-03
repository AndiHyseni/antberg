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

## Admin panel

- URL: `http://localhost:4173/admin/login` (same on Render: `/admin/login`)
- **With MySQL:** run `database/migrations/001_admin_auth.sql` on existing DBs, then `npm run import:db` to seed the admin user (or set `ANTBERG_ADMIN_EMAIL` / `ANTBERG_ADMIN_PASSWORD` in env).
- **Without MySQL:** env fallback login — default `admin@antberg.io` / `antberg-admin-2026` (override with `ANTBERG_ADMIN_EMAIL` and `ANTBERG_ADMIN_PASSWORD` on Render).

Admin can manage clients, users, client access tokens, and view the activity log. Tokens issued in admin work as `/access/<token>` client links when MySQL is connected.

### MySQL on Render (for admin data & live client demo)

1. Create a **MySQL** instance on Render (or use an external host).
2. On **antberg-platform** → **Environment**, add:
   - `MYSQL_HOST`
   - `MYSQL_PORT` (usually `3306`)
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE` (e.g. `antberg`)
3. Run `database/schema.sql` on that database (Workbench or Render shell).
4. On an **existing** DB from before the admin panel, also run `database/migrations/001_admin_auth.sql`.
5. Redeploy, then from your machine (with `database/.env` pointing at Render MySQL) run: `npm run import:db -- --reset` to load catalogue + admin user.

Check connection: `GET /api/version` should include `"database": true`.
