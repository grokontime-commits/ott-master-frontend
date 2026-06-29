# Install Phase 3L — Admin Data Center Clean Rebuild

1. Keep backend running:

```cmd
cd C:\OTT-Master-Backend
npm run dev
```

2. Unzip this package.
3. Copy all contents into:

```text
C:\Master-Frontend
```

4. Choose **Replace files in destination**.
5. Do not replace/delete your existing config file:

```text
C:\Master-Frontend\live-server\ott-config.js
```

6. Hard refresh the browser with:

```text
Ctrl + F5
```

7. Open with Live Server:

```text
C:\Master-Frontend\live-server\ui\admin-data-center.html
```

8. Login with your OFFICE/ADMIN test user.
9. Click in this order:

```text
Test /health
Test /api/v1/version
Login
Test /auth/me
Admin Stats
Organizations
Create Test Payor Clean
Payors
```

10. Optional smoke check:

```cmd
node scripts\phase3l-frontend-smoke-test.mjs
```

## Important

This Phase 3L rebuild intentionally bypasses the old crowded Admin Data Center logic. The clean Payor create flow sends only frontend API contract fields and blocks internal database column names or duplicate contact-phone internal keys.


Phase 3L v3 note: test Payor and Airline codes are generated with uppercase letters/numbers only, no hyphens, to satisfy backend database code-format constraints.

Phase 3L v6 note: Create Test Payor Clean now always repopulates the required Billing Email and Phone fields before sending the request, and the API client omits empty strings so selected rows with blank optional fields cannot cause validation failures.


Phase 3L v6 note: Smoke test now checks empty-string omission in live-server/api/ott-api-client.js instead of the UI file.
