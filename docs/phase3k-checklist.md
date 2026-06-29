# Phase 3K Checklist

- [ ] Backend running on `http://127.0.0.1:4000`
- [ ] `ott-config.js` still present and valid
- [ ] Login works
- [ ] `/auth/me` shows roles/permissions
- [ ] Customer Portal Stats loads
- [ ] Payors load
- [ ] Portal accounts load
- [ ] Portal account can be created or selected
- [ ] User profile can be linked to portal account
- [ ] Cargo MAWB can be assigned to portal account
- [ ] HAWB can be assigned to portal account
- [ ] Customer `/me/accounts` loads
- [ ] Customer `/me/mawbs` loads
- [ ] Customer `/me/hawbs` loads
- [ ] Customer `/me/release-orders` loads
- [ ] Customer `/me/damage-records` loads
- [ ] Customer `/me/files` loads
- [ ] Selected MAWB/HAWB read-only detail loads
- [ ] Access event logging works

Notes:
- The customer portal is read-only for `/me/...` endpoints.
- Do not expose service-role keys in frontend.
- Do not assign restricted driver-license-private or PTT documents to customer portal.
