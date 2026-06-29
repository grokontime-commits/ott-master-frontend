# Install Phase 3D

1. Stop Live Server if it is running.
2. Unzip the Phase 3D package.
3. Copy the package contents into:

```text
C:\Master-Frontend
```

4. Choose **Replace files in destination**.
5. Keep your existing:

```text
C:\Master-Frontend\live-server\ott-config.js
```

6. Start backend:

```cmd
cd C:\OTT-Master-Backend
npm run dev
```

7. Open with Live Server:

```text
C:\Master-Frontend\live-server\ui\recovery-queue.html
```

8. Test login, load drivers, load Recovery Queue jobs, select a job, load detail, and verify attempts/events display.
