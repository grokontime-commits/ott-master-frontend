# Install Phase 3E Frontend Package

1. Keep backend running:

```cmd
cd C:\OTT-Master-Backend
npm run dev
```

2. Copy this package into your frontend folder:

```text
C:\Master-Frontend
```

Choose **Replace files in destination**.

3. Do not replace/delete your working config:

```text
C:\Master-Frontend\live-server\ott-config.js
```

4. Open with Live Server:

```text
C:\Master-Frontend\live-server\ui\warehouse-inspection.html
```

5. Test in this order:

```text
Test /health
Test /api/v1/version
Login
Test /auth/me
Warehouse Stats
Load Inspections
Select inspection
Load Selected Inspection
Load HAWB Inspections
Mark HAWB Inspected
Ready-for-Release HAWBs
```

If damage is marked present, the HAWB should remain blocked by the damage-photo requirement until Phase 3F handles photos/waivers.
