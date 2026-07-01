# OTT Master — Phase 10 Customer Portal Reports Checkpoint

## Completed / PASS

- Phase 10A-A — Customer Portal CFS Report Access UI PASS
- Phase 10A-B — Customer Portal Report Access Production Regression PASS

## Important fixes

- Customer Portal now includes Customer-Safe CFS Report section.
- Customer can build assigned-cargo-only CFS report.
- Customer-safe CSV export added inside Customer Portal.
- Customer-safe Print / Save PDF workflow added.
- Report excludes invoice numbers, internal billing, equipment billing, and Status Source.
- Report uses only customer portal assigned/read-only data:
  - My MAWBs
  - My HAWBs
  - My Releases
  - My Damage Records
  - My Files

## Security reminders

- Customer report must remain read-only.
- Customer report must not expose invoice numbers.
- Customer report must not expose internal billing.
- Customer report must not expose equipment billing.
- Customer report must not expose internal status source.
- Do not expose API keys, Supabase service role key, DB password, bearer tokens, or Claude/Anthropic keys.

## Production URLs

- Dashboard: https://ott-master-frontend.onrender.com/ui/operational-integration-dashboard.html
- CFS Full Report: https://ott-master-frontend.onrender.com/ui/cfs-full-report.html
- Customer Portal: https://ott-master-frontend.onrender.com/ui/customer-portal.html

## Next recommended phase

Phase 10B — Customer Portal Report Assignment Polish / Customer User Workflow