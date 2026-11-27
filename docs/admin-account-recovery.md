# Atelier administrator account recovery

Administrator passwords changed in Account Settings are stored in MongoDB as scrypt hashes. Password changes also rotate the administrator session version, which signs out every active session.

## Before enabling persistent password changes

- Keep `ADMIN_AUTH_SECRET`, `INITIAL_ADMIN_EMAIL`, and the current bootstrap password hash in the deployment secret manager.
- Confirm that the MongoDB backup schedule is active and that a recent backup can be restored to an isolated database.
- Keep a separate, authorized MongoDB administrator account available for recovery.

The bootstrap password remains usable only until the `admin_credentials` record with `_id: "primary"` is created. After that, sign in with the password stored in that record.

## If the administrator is locked out

1. Create and verify a MongoDB backup before changing the credential record.
2. Use the authorized database administrator account and the restricted `admin_credentials` collection.
3. To restore bootstrap sign-in, remove only the document with `_id: "primary"`. The application then accepts the bootstrap email and password hash from the deployment secret manager. Do not remove session or enquiry records.
4. Sign in with the bootstrap credentials, open **Account Settings**, and set a new password. This creates a new scrypt hash and invalidates registered sessions.
5. Verify the new sign-in in a separate browser session before retiring the bootstrap password hash from the deployment secret manager.

If the bootstrap password hash is no longer available, restore it from the approved secret backup before step 3. Never put a plaintext password in a shell command, source file, support ticket, or database field.

## Deployment configuration

The existing deployment still needs `MONGODB_URI`, `MONGODB_DB_NAME`, `ADMIN_AUTH_SECRET`, and `INITIAL_ADMIN_EMAIL`. Keep the bootstrap password hash available until the persistent sign-in has been verified and the recovery path has been tested. Image and enquiry integrations continue to use their existing server-side credentials.
