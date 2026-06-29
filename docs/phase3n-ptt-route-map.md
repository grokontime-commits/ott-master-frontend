# Phase 3N-C PTT Route Map

Confirmed backend routes under `/api/v1/ptt`:

Read-only dashboard routes:
- `GET /stats`
- `GET /documents`
- `GET /documents/:id`
- `GET /recovery-jobs/:jobId/status`
- `GET /recovery-jobs/:jobId/allows-dispatch`
- `GET /driver/recovery-jobs/:jobId/ptt`

Action routes wired in API client for later phases:
- `POST /recovery-jobs/:jobId/require`
- `POST /recovery-jobs/:jobId/not-required`
- `POST /recovery-jobs/:jobId/generate`
- `POST /recovery-jobs/:jobId/upload`
- `POST /documents/:id/approve`
- `POST /documents/:id/send-to-driver`
- `POST /documents/:id/use-for-recovery`
- `POST /documents/:id/void`

Phase 3N-C uses only read-only calls by default.
