import { IAMType } from "./IAMType.js";

/** Application OAuth client resolver. */
export class ApplicationOAuthClientResolver extends IAMType<unknown> {
  id() {
    // TODO: Resolve the OAuth client global ID.
  }

  organizationId() {
    // TODO: Resolve the owning organization ID.
  }

  applicationId() {
    // TODO: Resolve the owning application ID.
  }

  clientId() {
    // TODO: Resolve the public OAuth client ID.
  }

  name() {
    // TODO: Resolve the OAuth client name.
  }

  clientType() {
    // TODO: Resolve the OAuth client type.
  }

  environment() {
    // TODO: Resolve the OAuth client environment.
  }

  redirectUris() {
    // TODO: Resolve the OAuth client redirect URIs.
  }

  postLogoutRedirectUris() {
    // TODO: Resolve the OAuth client post-logout redirect URIs.
  }

  storeId() {
    // TODO: Resolve the bound Store ID.
  }

  resources() {
    // TODO: Resolve the read-only OAuth resources.
  }

  grantTypes() {
    // TODO: Resolve the read-only OAuth grant types.
  }

  responseTypes() {
    // TODO: Resolve the read-only OAuth response types.
  }

  tokenEndpointAuthMethod() {
    // TODO: Resolve the token endpoint authentication method.
  }

  requirePkce() {
    // TODO: Resolve the PKCE requirement.
  }

  protocolPolicyVersion() {
    // TODO: Resolve the protocol policy version.
  }

  skipConsent() {
    // TODO: Resolve the consent bypass policy.
  }

  enableEndSession() {
    // TODO: Resolve the end-session capability state.
  }

  disabled() {
    // TODO: Resolve whether the OAuth client is disabled.
  }

  archived() {
    // TODO: Resolve whether the OAuth client is archived.
  }

  revision() {
    // TODO: Resolve the OAuth client revision.
  }

  createdAt() {
    // TODO: Resolve the OAuth client creation timestamp.
  }

  updatedAt() {
    // TODO: Resolve the OAuth client update timestamp.
  }

  archivedAt() {
    // TODO: Resolve the OAuth client archival timestamp.
  }

  createdBy() {
    // TODO: Resolve the actor that created the OAuth client.
  }

  updatedBy() {
    // TODO: Resolve the actor that updated the OAuth client.
  }
}

/** Application OAuth client mutation payload resolver. */
export class ApplicationOAuthClientPayloadResolver extends IAMType<unknown> {
  client() {
    // TODO: Resolve the changed OAuth client.
  }

  userErrors() {
    // TODO: Resolve OAuth client mutation user errors.
  }
}

/** Application OAuth client create payload resolver. */
export class ApplicationOAuthClientCreatePayloadResolver extends IAMType<unknown> {
  client() {
    // TODO: Resolve the created OAuth client.
  }

  clientSecret() {
    // TODO: Resolve the one-time OAuth client secret.
  }

  userErrors() {
    // TODO: Resolve OAuth client creation user errors.
  }
}

/** Application OAuth client secret rotation payload resolver. */
export class ApplicationOAuthClientSecretRotatePayloadResolver extends IAMType<unknown> {
  client() {
    // TODO: Resolve the OAuth client with the rotated secret.
  }

  clientSecret() {
    // TODO: Resolve the one-time rotated OAuth client secret.
  }

  userErrors() {
    // TODO: Resolve OAuth client secret rotation user errors.
  }
}
