# Backend Ready Checklist for Phase 3A

Before connecting the frontend module screens, confirm:

```text
Backend version endpoint shows 1.3.0-phase2m.
Phase 2M regression test passed.
Backend is running on port 4000.
Supabase app schema is exposed for backend RPCs.
.env.local has correct Supabase URL, anon key, and service-role key.
Frontend never receives the service-role key.
CORS_ORIGIN matches the frontend dev server origin.
```

## CORS examples

For Vite:

```env
CORS_ORIGIN=http://localhost:5173
```

For VS Code Live Server:

```env
CORS_ORIGIN=http://127.0.0.1:5500
```

Restart backend after CORS changes.

## Frontend module connection order after Phase 3A

```text
Phase 3B — Upload Center + Manifest Review frontend integration
Phase 3C — Cargo Management frontend integration
Phase 3D — Recovery Queue / Driver frontend integration
Phase 3E — Warehouse Inspection frontend integration
Phase 3F — Damage Photos frontend integration
Phase 3G — Cargo Release / Pickup Packet frontend integration
Phase 3H — Forklift Driver Board frontend integration
Phase 3I — Equipment Return frontend integration
Phase 3J — Accounting frontend integration
Phase 3K — Customer Portal frontend integration
Phase 3L — Admin/Data Center frontend integration
```
