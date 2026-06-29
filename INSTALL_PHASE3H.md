# Install Phase 3H

1. Keep backend running:

```cmd
cd C:\OTT-Master-Backend
npm run dev
```

2. Unzip this package.

3. Copy the package contents into:

```text
C:\Master-Frontend
```

Choose **Replace files in destination**.

4. Keep your existing config file:

```text
C:\Master-Frontend\live-server\ott-config.js
```

5. Open with Live Server:

```text
C:\Master-Frontend\live-server\ui\forklift-driver-board.html
```

6. Test:

- Test /health
- Test /api/v1/version
- Login
- Test /auth/me
- Forklift Stats
- Load READY_FOR_FORKLIFT Orders
- Select release order
- Create Forklift Job
- Load Job HAWBs
- Confirm All HAWBs
- Record Pallet Exchange
- Capture Signature
- Finalize Pickup

If no READY_FOR_FORKLIFT release orders are available, use Phase 3G to create and verify a release order first.
