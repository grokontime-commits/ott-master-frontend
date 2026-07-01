# OTT Master — Phase 10B Customer Portal Workflow Checkpoint

## Completed / PASS

- Phase 10A-A — Customer Portal CFS Report Access UI PASS
- Phase 10A-B — Customer Portal Report Access Production Regression PASS
- Phase 10B-A — Customer Portal Report Assignment Workflow Polish PASS

## Important fixes

- Added Customer Report Assignment Workflow card.
- Added Report Access dropdown near Portal Role.
- Added assignment checklist showing selected Portal Account, User Profile, MAWB, HAWB, File Record, and report access.
- Added customer-safe instructions above Customer-Safe CFS Report.
- Assignment payloads now respect the Report Access dropdown while defaulting to Customer Reports Enabled.
- Customer report remains read-only and customer-safe.

## Customer-safe rules

- Assigned cargo only.
- No invoice number.
- No internal billing.
- No equipment billing.
- No internal status source.
- Customer-safe CSV only includes customer-safe fields.
- Customer print/PDF remains customer-safe.

## Security reminders

- Do not expose API keys.
- Do not expose Supabase service role key.
- Do not expose DB password.
- Do not expose bearer tokens.
- Claude/Anthropic remains backend-only.

## Production URLs

- Dashboard: https://ott-master-frontend.onrender.com/ui/operational-integration-dashboard.html
- Customer Portal: https://ott-master-frontend.onrender.com/ui/customer-portal.html
- CFS Full Report: https://ott-master-frontend.onrender.com/ui/cfs-full-report.html

## Next recommended phase

Phase 11A — Production Cleanup / Backup Files / Patch Script Hygiene