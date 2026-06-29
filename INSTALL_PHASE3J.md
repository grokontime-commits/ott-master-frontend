# Install Phase 3J — Accounting / Billing Frontend Integration

1. Stop nothing in frontend. Keep backend running if you are testing.
2. Unzip the package.
3. Copy all contents into:

```text
C:\Master-Frontend
```

4. Choose **Replace files in destination**.
5. Do not replace/delete:

```text
C:\Master-Frontend\live-server\ott-config.js
```

6. Start backend if it is not running:

```cmd
cd C:\OTT-Master-Backend
npm run dev
```

7. Open with Live Server:

```text
C:\Master-Frontend\live-server\ui\accounting-billing.html
```

8. Login with the same Supabase test user used in prior phases.
