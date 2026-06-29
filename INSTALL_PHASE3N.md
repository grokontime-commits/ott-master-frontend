# Install Phase 3N-C Operational Integration Dashboard

## 1. Backup current frontend

Optional but recommended:

```cmd
xcopy C:\Master-Frontend C:\Master-Frontend-Phase3M-PASS /E /I /H
```

## 2. Install package

Extract this ZIP directly into:

```cmd
C:\Master-Frontend
```

Choose **Replace files in destination**.

Keep your existing:

```cmd
C:\Master-Frontend\live-server\ott-config.js
```

## 3. Start backend

Open CMD 1:

```cmd
cd /d C:\OTT-Master-Backend
npm run dev
```

Leave this running.

## 4. Run smoke test

Open CMD 2:

```cmd
cd /d C:\Master-Frontend
node scripts\phase3n-operational-dashboard-smoke-test.mjs
```

Expected result:

```txt
Result: PASS
```

A PTT warning is acceptable until the exact PTT backend route map is validated.

## 5. Browser validation

Open with VS Code Live Server:

```txt
C:\Master-Frontend\live-server\ui\operational-integration-dashboard.html
```

Hard refresh:

```txt
Ctrl + F5
```

Then test:

1. Test `/health`
2. Test `/api/v1/version`
3. Login
4. Test `/auth/me`
5. Run Read-Only Operational Test

## 6. Phase close condition

Phase 3N-C passes when all operational modules return PASS or acceptable WARN, and no module returns 404, Cannot GET, or 500.
