import { IAMType } from "./IAMType.js";

/** Application realm management mutation namespace. */
export class ApplicationMutationResolver extends IAMType<
  Record<string, never>
> {
  applicationCreate(_args: unknown) {
    // TODO: Implement application creation.
  }

  applicationUpdate(_args: unknown) {
    // TODO: Implement application update.
  }

  applicationArchive(_args: unknown) {
    // TODO: Implement application archival.
  }

  applicationAuthUpdate(_args: unknown) {
    // TODO: Implement application auth configuration update.
  }

  applicationAuthRealmEnabledSet(_args: unknown) {
    // TODO: Implement application auth realm state update.
  }

  applicationAuthMethodUpdate(_args: unknown) {
    // TODO: Implement application auth method update.
  }

  applicationAuthProviderConfigure(_args: unknown) {
    // TODO: Implement application auth provider configuration.
  }

  applicationAuthProviderUpdate(_args: unknown) {
    // TODO: Implement application auth provider update.
  }

  applicationAuthProviderCredentialsRotate(_args: unknown) {
    // TODO: Implement application auth provider credential rotation.
  }

  applicationAuthProviderCredentialsDelete(_args: unknown) {
    // TODO: Implement application auth provider credential deletion.
  }

  applicationAuthProviderValidate(_args: unknown) {
    // TODO: Implement application auth provider validation.
  }

  applicationOAuthClientCreate(_args: unknown) {
    // TODO: Implement application OAuth client creation.
  }

  applicationOAuthClientUpdate(_args: unknown) {
    // TODO: Implement application OAuth client update.
  }

  applicationOAuthClientEnabledSet(_args: unknown) {
    // TODO: Implement application OAuth client state update.
  }

  applicationOAuthClientSkipConsentSet(_args: unknown) {
    // TODO: Implement application OAuth client consent policy update.
  }

  applicationOAuthClientSecretRotate(_args: unknown) {
    // TODO: Implement application OAuth client secret rotation.
  }

  applicationOAuthClientArchive(_args: unknown) {
    // TODO: Implement application OAuth client archival.
  }

  applicationUserBlock(_args: unknown) {
    // TODO: Implement application user blocking.
  }

  applicationUserUnblock(_args: unknown) {
    // TODO: Implement application user unblocking.
  }

  applicationUserSessionsRevokeAll(_args: unknown) {
    // TODO: Implement application user session revocation.
  }

  applicationUserAccountUnlink(_args: unknown) {
    // TODO: Implement application user account unlinking.
  }
}
