# Install Phase 3F Damage Photos Frontend Integration

1. Stop editing your frontend files.
2. Unzip the Phase 3F package.
3. Copy everything inside the package into:

```text
C:\Master-Frontend
```

4. Choose **Replace files in destination**.
5. Do not delete or replace:

```text
C:\Master-Frontend\live-server\ott-config.js
```

6. Keep backend running:

```cmd
cd C:\OTT-Master-Backend
npm run dev
```

7. Open with Live Server:

```text
C:\Master-Frontend\live-server\ui\damage-photos.html
```

8. Optional smoke test from CMD:

```cmd
cd C:\Master-Frontend
node scripts\phase3f-frontend-smoke-test.mjs
```
