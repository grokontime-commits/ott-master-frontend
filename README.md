# OTT Master Frontend — Phase 3L Admin Data Center Clean Rebuild

This package upgrades the Phase 3K frontend package with a clean Phase 3L Admin Data Center page.

It keeps the existing Phase 3K Customer Portal files and adds:

- `live-server/ui/admin-data-center.html`
- `live-server/ui/admin-data-center.html.js`
- `live-server/ui/phase3l.css`
- Clean Admin API client methods in `live-server/api/ott-api-client.js`
- `scripts/phase3l-frontend-smoke-test.mjs`
- `docs/phase3l-checklist.md`

## Why this rebuild exists

The previous Phase 3L troubleshooting showed that the bad duplicate contact-phone field was not hardcoded in the backend service. This rebuild avoids the old crowded admin page and creates a clean frontend contract.

The new **Create Test Payor Clean** flow sends only:

```js
{
  payorCode,
  payorName,
  displayName,
  billingEmail,
  phone,
  isActive,
  notes
}
```

It does **not** send:

```txt
metadata
contact_phone
contactPhone
duplicate contact-phone internal key
contactContactPhone
```

The frontend API client and admin page both include guards that block those internal/database fields before the request leaves the browser.

## Install

Copy the contents of this package into your frontend folder:

```text
C:\Master-Frontend
```

Choose **Replace files in destination**.

Keep your existing config file:

```text
C:\Master-Frontend\live-server\ott-config.js
```

## Open

Use Live Server to open:

```text
C:\Master-Frontend\live-server\ui\admin-data-center.html
```

Then hard refresh with `Ctrl + F5`.

## Test order

1. Keep backend running: `cd C:\OTT-Master-Backend && npm run dev`
2. Open `admin-data-center.html` with Live Server.
3. Test `/health`.
4. Test `/api/v1/version`.
5. Login with your OFFICE/ADMIN test user.
6. Test `/auth/me`.
7. Click **Admin Stats**.
8. Click **Organizations**.
9. Click **Create Test Payor Clean**.
10. Click **Payors** and verify the new Payor appears.
11. Click **Create Test Airline Clean**.
12. Click **Employees / Users / Roles / Permissions / Audit Logs** as needed.

## Smoke test

From the package root after copying:

```cmd
node scripts\phase3l-frontend-smoke-test.mjs
```

This smoke test checks that the new files exist, the clean admin API methods are present, forbidden fields are absent from the API client, and `/health` + `/api/v1/version` respond.


Phase 3L v3 note: test Payor and Airline codes are generated with uppercase letters/numbers only, no hyphens, to satisfy backend database code-format constraints.

Phase 3L v6 note: Create Test Payor Clean now always repopulates the required Billing Email and Phone fields before sending the request, and the API client omits empty strings so selected rows with blank optional fields cannot cause validation failures.


Phase 3L v6 note: Smoke test now checks empty-string omission in live-server/api/ott-api-client.js instead of the UI file.

## Phase 3N-C — Operational Integration Dashboard

This package adds a read-only browser dashboard for validating operational API integration before the production operation screens are connected.

Open:

```txt
live-server/ui/operational-integration-dashboard.html
```

Run smoke test:

```cmd
node scripts\phase3n-operational-dashboard-smoke-test.mjs
```

The dashboard validates Manifest, Cargo, Recovery, PTT exact route validation, Warehouse, Damage, Release, Forklift, Equipment, Accounting, and Customer Portal read-only endpoints.
