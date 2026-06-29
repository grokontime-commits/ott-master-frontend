# Phase 3H Auth Login Patch

This patch fixes the Forklift Driver Board frontend login call.

## Fix

The page calls:

```js
window.OTTAuth.login(email, password)
```

but the shared auth helper exposed only:

```js
window.OTTAuth.loginWithPassword(email, password)
```

This patch adds `login` as an alias to `loginWithPassword`.

## Install

Copy this patch into your frontend folder:

```text
C:\Master-Frontend
```

Choose **Replace files in destination**.

Keep your existing:

```text
C:\Master-Frontend\live-server\ott-config.js
```

## Test

Hard refresh the browser with `Ctrl + F5`, then test login again on:

```text
live-server\ui\forklift-driver-board.html
```
