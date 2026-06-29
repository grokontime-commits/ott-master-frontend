# Phase 3C Checklist — Cargo Management Frontend Integration

Use this after copying the package into `C:\Master-Frontend`.

## Required

- Backend running at `http://127.0.0.1:4000`
- `live-server/ott-config.js` has `API_BASE_URL`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`
- Supabase smoke test user can log in from the browser
- Phase 3B has created at least one final approved MAWB, or Phase 2M regression has created staging cargo

## Browser flow

1. Open `live-server/ui/cargo-management.html` with Live Server.
2. Click `/health`, `/api/v1/version`, and log in.
3. Click `Load Status / Payor / Airline`.
4. Click `Load Recent MAWBs`.
5. Click `Load NEW MAWBs`.
6. Select a MAWB row and click `Load Selected MAWB`.
7. Confirm HAWBs and status history display.
8. For a fresh Phase 3B-approved MAWB, click `Confirm Selected Status = NEW`.

## Expected result

Cargo Management shows MAWB list, search/filter, MAWB detail, HAWB rows, and status history without using mock data.
