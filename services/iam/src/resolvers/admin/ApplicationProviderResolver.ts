import { IAMType } from "./IAMType.js";

/** Catalog-owned application social provider resolver. */
export class ApplicationAuthProviderResolver extends IAMType<unknown> {
  applicationId() {
    // TODO: Resolve the application ID.
  }

  provider() {
    // TODO: Resolve the provider name.
  }

  supported() {
    // TODO: Resolve whether the provider is supported.
  }

  configured() {
    // TODO: Resolve whether the provider is configured.
  }

  enabled() {
    // TODO: Resolve whether the provider is enabled.
  }

  maskedClientId() {
    // TODO: Resolve the masked provider client ID.
  }

  scopes() {
    // TODO: Resolve the provider scopes.
  }

  callbackUrl() {
    // TODO: Resolve the exact provider callback URL.
  }

  revision() {
    // TODO: Resolve the provider revision.
  }

  updatedAt() {
    // TODO: Resolve the provider update timestamp.
  }

  updatedBy() {
    // TODO: Resolve the actor that updated the provider.
  }
}

/** Application social provider validation result resolver. */
export class ApplicationAuthProviderValidationResolver extends IAMType<unknown> {
  provider() {
    // TODO: Resolve the validated provider name.
  }

  status() {
    // TODO: Resolve the provider validation status.
  }

  reasonCode() {
    // TODO: Resolve the safe provider validation reason code.
  }

  revision() {
    // TODO: Resolve the validated provider revision.
  }

  checkedAt() {
    // TODO: Resolve the provider validation timestamp.
  }
}

/** Application social provider mutation payload resolver. */
export class ApplicationAuthProviderPayloadResolver extends IAMType<unknown> {
  provider() {
    // TODO: Resolve the changed provider.
  }

  userErrors() {
    // TODO: Resolve provider mutation user errors.
  }
}

/** Application social provider validation payload resolver. */
export class ApplicationAuthProviderValidationPayloadResolver extends IAMType<unknown> {
  validation() {
    // TODO: Resolve the provider validation result.
  }

  userErrors() {
    // TODO: Resolve provider validation user errors.
  }
}
