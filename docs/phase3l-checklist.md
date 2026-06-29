# Phase 3L Checklist — Admin Data Center Clean Rebuild

## Backend must be running

- [ ] `cd C:\OTT-Master-Backend`
- [ ] `npm run dev`
- [ ] `/health` passes
- [ ] `/api/v1/version` passes

## Frontend install

- [ ] Copy package into `C:\Master-Frontend`
- [ ] Keep `live-server\ott-config.js`
- [ ] Hard refresh with `Ctrl + F5`
- [ ] Open `live-server\ui\admin-data-center.html`

## Login

- [ ] Login with OFFICE/ADMIN test user
- [ ] `/auth/me` passes
- [ ] Login badge shows `Logged in`

## Admin read checks

- [ ] Admin Stats loads
- [ ] Organizations load
- [ ] Payors load
- [ ] Airlines load
- [ ] Employees load
- [ ] Users load
- [ ] Roles load
- [ ] Permissions load
- [ ] Audit Logs load

## Clean create checks

- [ ] Create Test Payor Clean passes
- [ ] New Payor appears in Payors list
- [ ] Create Test Airline Clean passes
- [ ] New Airline appears in Airlines list
- [ ] Create Test Employee passes
- [ ] New Employee appears in Employees list

## Payload guard checks

- [ ] API client includes `cleanAdminPayorBody`
- [ ] Admin UI includes `forbidInternalKeys`
- [ ] No frontend create flow sends `metadata`
- [ ] No frontend create flow sends `contact_phone`
- [ ] No frontend create flow sends the duplicate contact-phone internal key

## Smoke test

- [ ] `node scripts\phase3l-frontend-smoke-test.mjs` returns PASS


Phase 3L v3 note: test Payor and Airline codes are generated with uppercase letters/numbers only, no hyphens, to satisfy backend database code-format constraints.

Phase 3L v4 note: Create Test Payor Clean now always repopulates the required Billing Email and Phone fields before sending the request, and the API client omits empty strings so selected rows with blank optional fields cannot cause validation failures.
