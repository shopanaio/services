# SMTP App

The SMTP App stores multiple provider connections per App installation. Exactly one non-disconnected
connection can be active, and notification delivery always uses that active connection.

Provider presets are available for SendGrid, Mailchimp Transactional, Google Workspace, and custom
SMTP servers. Presets only supply public connection defaults; credentials remain
installation-specific.

## Credential encryption

Set `SMTP_CREDENTIAL_MASTER_KEY` to a stable 32-byte secret on every App runtime instance. Prefix a
base64-encoded key with `base64:`.

Passwords and API keys are encrypted with AES-256-GCM and connection-scoped associated data before
they are stored. They are never returned through the Admin GraphQL API. Disconnecting a connection
permanently removes its encrypted credential.
