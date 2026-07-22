# Store application auth provisioning

`project.storeCreate` owns the lifecycle of the store's service-linked IAM
application. The trusted `iam.createApplication` action creates the following
state in one IAM database transaction:

- the application, immutable resource audience and service management row;
- an auth configuration with open registration, store branding and locale;
- the exact storefront trusted origin;
- one public first-party storefront OAuth client;
- Authorization Code and Refresh Token grants, S256 PKCE and the fixed v1
  `openid profile email offline_access` scope registry;
- exact storefront redirect and post-logout URIs.

The realm is enabled immediately while all sign-in methods initially remain
disabled. Selecting or removing password, email OTP or social sign-in changes
only that method and does not toggle the realm.

Store provisioning never accepts OAuth protocol policy, social provider
credentials, provider scopes or upstream consent configuration. Google and
Facebook remain tenant-admin configuration performed after store creation.
Their exact callback URLs are derived by IAM from its canonical public base URL.

The Project service resolves storefront URLs from `services.project.storefront_auth`:

```yaml
storefront_auth:
  origin_template: https://{store}.shopana.io
  callback_path: /auth/callback
  post_logout_path: /
```

Production templates must resolve to HTTPS. Development may use loopback HTTP.
Failure to create any preset row rolls back the IAM application, so a store is
never returned with a partially provisioned authentication realm.
