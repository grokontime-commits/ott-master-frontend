# Phase 3L Admin Payor Phone Direct Patch

Copy the CONTENTS of this ZIP directly into `C:\OTT-Master-Backend` and choose Replace files.

This replaces:

`src\modules\admin\admin.service.ts`

The corrected payor insert/update columns are:
- `contact_email`
- `contact_phone`

The invalid column `contact_contact_phone` must not appear anywhere under `src`.
