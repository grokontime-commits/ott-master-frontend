# Phase 3D Checklist — Recovery Queue / Driver Frontend Integration

Use this after copying the package into `C:\Master-Frontend`.

## Required

- Backend running at `http://127.0.0.1:4000`
- `live-server/ott-config.js` has `API_BASE_URL`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`
- Supabase smoke test user can log in from the browser
- Phase 2C Recovery Queue API passed backend smoke test
- At least one Recovery Queue job exists, or one final Cargo MAWB with status `NEW` exists to create a job

## Browser flow

1. Open `live-server/ui/recovery-queue.html` with Live Server.
2. Click `/health`, `/api/v1/version`, and log in.
3. Click `Recovery Stats`.
4. Click `Load Drivers`.
5. Click `Load Jobs`.
6. Select a Recovery Queue job and click `Load Selected Job`.
7. If safe, select a driver and click `Assign Driver`.
8. Click `Mark Driver Dispatched`.
9. Create or select a recovery attempt.
10. Add driver event: `Driver At Airline`.
11. Update attempt status and pieces.
12. Add driver event: `Cargo Recovered Complete` only on staging/test data.

## Expected result

Recovery Queue job list, driver list, job detail, HAWBs, recovery attempts, driver events, and status updates are all displayed from the backend API without mock data.

## Note

If driver assignment returns `PTT_DISPATCH_BLOCKED`, that is correct backend behavior. The job requires PTT approval/sent before dispatch.
