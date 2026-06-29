# Phase 3A Install Steps

## Option A — Static HTML / Live Server frontend

Use this if your current UI Reference Version is still HTML/CSS/JavaScript.

1. Open your frontend project folder.
2. Copy this package's `live-server` folder into your frontend project.
3. Rename:

```text
live-server/ott-config.example.js
```

to:

```text
live-server/ott-config.js
```

4. Fill in your Supabase staging URL and anon/publishable key inside `ott-config.js`.
5. Open this file with Live Server:

```text
live-server/ui/ott-connection-test.html
```

6. Test backend health, Supabase DB health, version, login, and `/auth/me`.

### CORS note for Live Server

VS Code Live Server often uses:

```text
http://127.0.0.1:5500
```

or:

```text
http://localhost:5500
```

If the browser blocks API requests because of CORS, update backend `.env.local`:

```env
CORS_ORIGIN=http://127.0.0.1:5500
```

Then restart backend:

```cmd
cd C:\OTT-Master-Backend
npm run dev
```

## Option B — Vite frontend

Use this if the frontend uses Vite, React, or TypeScript.

1. Copy the `vite/src` folders into your Vite frontend `src` folder.
2. Create frontend `.env.local` using `.env.frontend.example`.
3. Run your Vite dev server:

```cmd
npm run dev
```

4. Open the API connection test component/page and verify it can reach the backend.

### CORS note for Vite

Vite usually runs on:

```text
http://localhost:5173
```

Your backend `.env.local` should have:

```env
CORS_ORIGIN=http://localhost:5173
```

Restart backend after changing CORS.
