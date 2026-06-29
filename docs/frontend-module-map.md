# Frontend Module Map

Use these frontend module keys with the Phase 3A module-access helpers.

```text
dashboard
upload
cargo
recovery
ptt
warehouse
damage
release
forklift
equipment
accounting
customerPortal
admin
```

Recommended first menu behavior:

- Hide modules the current user cannot access.
- Do not delete module buttons from the DOM until the final UI cleanup phase; hide them with a controlled class first.
- Always rely on backend permission enforcement even if a frontend card is hidden.
- Customer portal must remain read-only.
- Driver license private files must never be visible to customer portal users.
```
