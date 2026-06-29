# Install Phase 3B Frontend Package

Use your actual frontend folder. Your screenshots show:

```text
C:\Master-Frontend
```

## Install

1. Stop Live Server if you want a clean refresh.
2. Unzip this package.
3. Copy the contents into:

```text
C:\Master-Frontend
```

4. Choose **Replace files in destination**.
5. Do **not** replace or delete:

```text
live-server\ott-config.js
```

This package does not include `ott-config.js`; it only uses your existing frontend config.

## Backend

Keep backend running:

```cmd
cd C:\OTT-Master-Backend
npm run dev
```

## Browser test

Open:

```text
C:\Master-Frontend\live-server\ui\upload-manifest-review.html
```

with Live Server.

## Node smoke test

Optional:

```cmd
cd C:\Master-Frontend
node scripts\phase3b-frontend-smoke-test.mjs
```

If you want authenticated checks from the Node smoke test, set these CMD variables first:

```cmd
set OTT_TEST_USER_EMAIL=your-test-user-email
set OTT_TEST_USER_PASSWORD=your-test-user-password
node scripts\phase3b-frontend-smoke-test.mjs
```

