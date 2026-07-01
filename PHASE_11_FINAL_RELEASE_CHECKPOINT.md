# OTT Master — Phase 11 Final Release Checkpoint

## Current Production Stack

- Frontend: Render Static Site
- Backend: Render Web Service
- Database/Auth: Supabase
- AI: Claude / Anthropic backend-only

## Production URLs

- Backend: https://ott-master-backend.onrender.com
- Frontend: https://ott-master-frontend.onrender.com
- Dashboard: https://ott-master-frontend.onrender.com/ui/operational-integration-dashboard.html
- CFS Full Report: https://ott-master-frontend.onrender.com/ui/cfs-full-report.html
- Customer Portal: https://ott-master-frontend.onrender.com/ui/customer-portal.html

## Completed / PASS

### Production / Deployment

- Phase 6F–6Q — Production deployment/access hardening PASS

### Claude AI Manifest Workflow

- Phase 7A–7J — Claude AI manifest workflow, PDF/file intake, review queue, office approval, final cargo creation, AI guardrails PASS

### UI Polish / Module Stabilization

- Phase 8A — Production dashboard layout alignment PASS
- Phase 8B — Upload Manifest Review UI polish PASS
- Phase 8C — Module cards linked to real pages / manifest UI polish PASS
- Phase 8D — Final production workflow regression PASS
- Phase 8E-A/B — Cargo Management UI polish PASS
- Phase 8E-C — Recovery Queue UI polish PASS
- Phase 8E-D/F — Warehouse Inspection layout reset PASS
- Phase 8E-E/H — Cargo Release / Pickup Packet compact layout PASS
- Phase 8E-F — Forklift Driver Board UI polish PASS
- Phase 8E-G — Equipment Return UI polish PASS
- Phase 8E-H — Accounting / Billing UI polish PASS
- Phase 8E-I — Admin Data Center UI polish PASS
- Phase 8E-J — Customer Portal UI polish PASS
- Phase 8E-K — Final production UI regression PASS

### Reports

- Phase 9A — CFS Full Report UI + Status Reliability PASS
- Phase 9B — CFS Full Report Column Controls / Customer-Safe Export PASS
- Phase 9C — CFS Full Report Customer View / Print-Friendly Report PASS

### Customer Portal Reports

- Phase 10A — Customer Portal CFS Report Access UI PASS
- Phase 10B — Customer Portal Report Assignment Workflow Polish PASS

### Cleanup / Release Readiness

- Phase 11A — Temporary files / backup files / patch script cleanup PASS
- Phase 11B — Dashboard session verification UX PASS

## Current Working Modules

- Operational Integration Dashboard
- Upload Manifest Review
- Cargo Management
- Recovery Queue
- Warehouse Inspection
- Cargo Release / Pickup Packet
- Forklift Driver Board
- Equipment Return
- Damage Photos
- Accounting / Billing
- Admin Data Center
- Customer Portal
- CFS Full Report

## Important Behaviors Confirmed

- Dashboard session badge now shows:
  - Not logged in = gray
  - Token saved but not verified = yellow
  - Verified session = green
  - Session failed = red
- Password field clears after login.
- Back to Operations Dashboard button is available on module pages.
- CFS Full Report has:
  - Read-only aggregation
  - Status reliability logic
  - Column controls
  - Customer-safe CSV export
  - Customer print / Save PDF view
- Customer Portal has:
  - Customer-safe CFS report section
  - Assigned-cargo-only report view
  - Customer-safe CSV export
  - Customer-safe Print / Save PDF
  - Report assignment workflow checklist

## Security Rules

- Do not expose API keys.
- Do not expose Supabase service role key.
- Do not expose database password.
- Do not expose bearer tokens.
- Claude / Anthropic remains backend-only.
- Customer reports must not expose:
  - Invoice number
  - Internal billing
  - Equipment billing
  - Internal status source

## Known Notes

- Local Live Server is for visual layout only.
- Production auth/API testing must be done from Render frontend URL.
- Local Live Server may show CORS errors when calling production backend. This is expected.

## Next Recommended Development Areas

### Option 1 — Phase 12A: Real Customer Login Test / Customer Account Setup

Purpose:
- Create or confirm a real customer portal user.
- Assign MAWB/HAWB/report access.
- Confirm customer sees only assigned cargo.
- Confirm customer-safe report visibility.

### Option 2 — Phase 12B: Delivery Module Planning / Dispatch Workflow

Purpose:
- Start Delivery module design.
- Connect CFS release data to delivery jobs.
- Add driver dispatch, proof of delivery, and delivery status.

### Option 3 — Phase 12C: Accounting Deepening

Purpose:
- Improve invoice workflow.
- Tighten QuickBooks Desktop export preparation.
- Add invoice batch review and customer-specific accessorial logic.

### Option 4 — Phase 12D: Production Data Cleanup / Seed Data Review

Purpose:
- Remove test-looking production demo data if needed.
- Normalize test Payors/MAWBs.
- Prepare real customer/customer-user onboarding.