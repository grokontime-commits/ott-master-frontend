# OTT Master Frontend — Phase 3N Checklist

## Phase 3N-C: Browser Operational Integration Dashboard

Goal: validate operational API modules from the browser before connecting each production operational screen.

## New files

- `live-server/ui/operational-integration-dashboard.html`
- `live-server/ui/operational-integration-dashboard.html.js`
- `live-server/ui/phase3n.css`
- `scripts/phase3n-operational-dashboard-smoke-test.mjs`
- `docs/phase3n-checklist.md`
- `INSTALL_PHASE3N.md`

## Validation order

1. Start backend from `C:\OTT-Master-Backend` with `npm run dev`.
2. Install this frontend package into `C:\Master-Frontend`.
3. Run `node scripts\phase3n-operational-dashboard-smoke-test.mjs`.
4. Open `live-server/ui/operational-integration-dashboard.html` with Live Server.
5. Hard refresh with `Ctrl + F5`.
6. Login with the same test/admin user used in Phase 3L/3M.
7. Click `Run Read-Only Operational Test`.

## Expected result

The dashboard should return PASS or WARN for read-only operational checks.

- PASS means the endpoint responded successfully.
- WARN usually means the endpoint exists but requires authorization, or PTT endpoint discovery needs exact route confirmation.
- FAIL means the route returned 404, 500, or an unexpected client error and must be fixed before connecting the production UI module.

## Modules covered

- Manifest
- Cargo
- Recovery
- PTT exact route validation
- Warehouse
- Damage
- Release
- Forklift
- Equipment
- Accounting
- Customer Portal

## Safe test rule

The Phase 3N-C default test is read-only. It does not create, update, approve, reject, finalize, bill, or delete operational records.
