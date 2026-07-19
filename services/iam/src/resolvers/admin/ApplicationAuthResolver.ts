import { IAMType } from "./IAMType.js";

/** Application authentication configuration resolver. */
export class ApplicationAuthConfigurationResolver extends IAMType<unknown> {
  applicationId() {
    // TODO: Resolve the application ID.
  }

  realmEnabled() {
    // TODO: Resolve whether the realm is enabled.
  }

  registrationMode() {
    // TODO: Resolve the registration mode.
  }

  emailVerificationRequired() {
    // TODO: Resolve the email verification policy.
  }

  consentMode() {
    // TODO: Resolve the consent mode.
  }

  accessTokenTtlSeconds() {
    // TODO: Resolve the access token lifetime.
  }

  idTokenTtlSeconds() {
    // TODO: Resolve the ID token lifetime.
  }

  refreshTokenTtlSeconds() {
    // TODO: Resolve the refresh token lifetime.
  }

  sessionTtlSeconds() {
    // TODO: Resolve the session lifetime.
  }

  branding() {
    // TODO: Resolve the auth branding.
  }

  defaultLocale() {
    // TODO: Resolve the default locale.
  }

  supportedLocales() {
    // TODO: Resolve the supported locales.
  }

  trustedOrigins() {
    // TODO: Resolve the trusted origins.
  }

  protocolUrls() {
    // TODO: Resolve the protocol URLs.
  }

  emailDelivery() {
    // TODO: Resolve the email delivery configuration.
  }

  authMethod(_args: { id: string }) {
    // TODO: Resolve an auth method from the catalog.
  }

  authMethods() {
    // TODO: Resolve all auth methods from the catalog.
  }

  provider(_args: { name: string }) {
    // TODO: Resolve an auth provider from the catalog.
  }

  providers() {
    // TODO: Resolve all auth providers from the catalog.
  }

  revision() {
    // TODO: Resolve the auth configuration revision.
  }

  createdAt() {
    // TODO: Resolve the auth configuration creation timestamp.
  }

  updatedAt() {
    // TODO: Resolve the auth configuration update timestamp.
  }
}

/** Catalog-owned authentication method resolver. */
export class ApplicationAuthMethodResolver extends IAMType<unknown> {
  id() {
    // TODO: Resolve the auth method ID.
  }

  availableCapabilities() {
    // TODO: Resolve available auth method capabilities.
  }

  enabledCapabilities() {
    // TODO: Resolve enabled auth method capabilities.
  }

  configured() {
    // TODO: Resolve whether the auth method is configured.
  }

  revision() {
    // TODO: Resolve the auth method revision.
  }

  updatedAt() {
    // TODO: Resolve the auth method update timestamp.
  }

  updatedBy() {
    // TODO: Resolve the actor that updated the auth method.
  }
}

/** Hosted authentication UI branding resolver. */
export class ApplicationAuthBrandingResolver extends IAMType<unknown> {
  displayName() {
    // TODO: Resolve the branding display name.
  }

  headline() {
    // TODO: Resolve the branding headline.
  }

  logoUrl() {
    // TODO: Resolve the branding logo URL.
  }

  primaryColor() {
    // TODO: Resolve the branding primary color.
  }

  backgroundColor() {
    // TODO: Resolve the branding background color.
  }
}

/** Trusted origin resolver. */
export class ApplicationAuthTrustedOriginResolver extends IAMType<unknown> {
  origin() {
    // TODO: Resolve the trusted origin.
  }

  createdAt() {
    // TODO: Resolve the trusted origin creation timestamp.
  }
}

/** Social provider callback URL resolver. */
export class ApplicationAuthProviderCallbackUrlResolver extends IAMType<unknown> {
  provider() {
    // TODO: Resolve the provider name.
  }

  url() {
    // TODO: Resolve the provider callback URL.
  }
}

/** OAuth and OpenID Connect protocol URL resolver. */
export class ApplicationAuthProtocolUrlsResolver extends IAMType<unknown> {
  issuer() {
    // TODO: Resolve the issuer URL.
  }

  oidcDiscoveryUrl() {
    // TODO: Resolve the OIDC discovery URL.
  }

  oauthAuthorizationServerMetadataUrl() {
    // TODO: Resolve the OAuth authorization server metadata URL.
  }

  authorizationUrl() {
    // TODO: Resolve the authorization URL.
  }

  tokenUrl() {
    // TODO: Resolve the token URL.
  }

  jwksUrl() {
    // TODO: Resolve the JWKS URL.
  }

  revocationUrl() {
    // TODO: Resolve the revocation URL.
  }

  endSessionUrl() {
    // TODO: Resolve the end-session URL.
  }

  providerCallbackUrls() {
    // TODO: Resolve social provider callback URLs.
  }
}

/** Non-secret application email delivery configuration resolver. */
export class ApplicationAuthEmailDeliveryConfigurationResolver extends IAMType<unknown> {
  configured() {
    // TODO: Resolve whether email delivery is configured.
  }

  transportProfile() {
    // TODO: Resolve the email transport profile.
  }

  senderIdentity() {
    // TODO: Resolve the email sender identity.
  }

  emailVerificationTemplateId() {
    // TODO: Resolve the email verification template ID.
  }

  passwordResetTemplateId() {
    // TODO: Resolve the password reset template ID.
  }

  emailOtpSignInTemplateId() {
    // TODO: Resolve the email OTP sign-in template ID.
  }

  updatedAt() {
    // TODO: Resolve the email delivery update timestamp.
  }

  updatedBy() {
    // TODO: Resolve the actor that updated email delivery.
  }
}

/** Application auth update payload resolver. */
export class ApplicationAuthUpdatePayloadResolver extends IAMType<unknown> {
  configuration() {
    // TODO: Resolve the updated auth configuration.
  }

  userErrors() {
    // TODO: Resolve auth configuration update user errors.
  }
}

/** Application auth method payload resolver. */
export class ApplicationAuthMethodPayloadResolver extends IAMType<unknown> {
  authMethod() {
    // TODO: Resolve the updated auth method.
  }

  userErrors() {
    // TODO: Resolve auth method update user errors.
  }
}
