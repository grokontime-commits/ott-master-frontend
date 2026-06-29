# OTT Master Production Rollback Instructions - Phase 6L

Date: 2026-06-29

## Current stable production checkpoint

Backend URL:
https://ott-master-backend.onrender.com

Frontend URL:
https://ott-master-frontend.onrender.com

Dashboard URL:
https://ott-master-frontend.onrender.com/ui/operational-integration-dashboard.html

Supabase Production Project:
https://jssqcleczwppfvoutcow.supabase.co

## Stable checkpoint status

Phase 6F Backend Deploy: PASS
Phase 6G Frontend to Backend Connection: PASS
Phase 6H Production Frontend Smoke Test: PASS
Phase 6I Frontend Render Static Site: PASS
Phase 6J Production Operational Smoke Test: PASS
Phase 6K Production Test MAWB Workflow: PASS
Phase 6L Production Stabilization and Go-Live Safety Check: PASS
Phase 6M Supabase Manual Backup: PASS

## Backup location

Local private backup folder:
C:\OTT-Master-Production-Backups\Phase6L-Supabase

Backup files:
- roles.sql
- schema.sql
- data.sql
- BACKUP_MANIFEST_PHASE_6L.txt

Do not commit SQL backup files to GitHub.

## Frontend rollback

Preferred rollback method:
1. Open Render.
2. Go to ott-master-frontend.
3. Open Deploys.
4. Select the last known good deploy.
5. Redeploy/rollback to that deploy.

Git rollback option:
git checkout phase-6l-production-stable-frontend

## Backend rollback

Preferred rollback method:
1. Open Render.
2. Go to ott-master-backend.
3. Open Deploys.
4. Select the last known good deploy.
5. Redeploy/rollback to that deploy.

Git rollback option:
git checkout phase-6l-production-stable-backend

## Database rollback warning

Do not restore directly over production unless absolutely necessary.
Safer method:
1. Create a new temporary Supabase project.
2. Restore roles.sql, schema.sql, and data.sql into the temporary project.
3. Validate tables, functions, policies, and test data.
4. Point staging/backend test environment to the restored project.
5. Only after validation, decide whether production restore is necessary.

## Emergency production checks after rollback

curl -i https://ott-master-backend.onrender.com/health
curl -i https://ott-master-backend.onrender.com/api/v1
curl -i https://ott-master-backend.onrender.com/api/v1/version

Browser checks:
- Open https://ott-master-frontend.onrender.com
- Confirm dashboard loads
- Confirm Console has no red errors
- Confirm Network has no failed API calls

## Known improvement

Recovery Queue needs a MAWB search button.
