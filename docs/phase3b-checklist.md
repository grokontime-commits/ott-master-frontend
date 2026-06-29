# Phase 3B Checklist

## Backend required

- Phase 2M regression passed.
- Backend running on `http://127.0.0.1:4000`.
- User can login from Phase 3A test page.

## Frontend required

- `live-server/ott-config.js` exists.
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` are filled.
- Browser console shows `window.OTT_CONFIG` object.

## Phase 3B expected pass criteria

- Login succeeds.
- `/api/v1/auth/me` returns user, roles, permissions.
- Payors load from `/api/v1/admin/payors`.
- Manifest upload metadata is created.
- Extraction session is created and completed.
- Review Queue loads.
- Review item detail loads.
- Office review update is accepted.
- Office approval creates final MAWB.
- Cargo Management returns the approved MAWB with status `NEW`.

