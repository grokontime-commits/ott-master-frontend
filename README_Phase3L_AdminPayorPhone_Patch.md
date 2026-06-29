# Phase 3L Admin Payor Phone Patch

Fixes the Admin/Data Center `Create Test Payor` failure:

```text
Could not find the 'contact_contact_phone' column of 'payors' in the schema cache
```

Cause: backend `createPayor` had a typo. It was inserting `contact_contact_phone` instead of the real staging column `contact_phone`.

This patch replaces:

```text
src/modules/admin/admin.service.ts
```

No SQL Editor step is required.
