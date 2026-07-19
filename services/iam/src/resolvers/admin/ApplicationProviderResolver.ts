import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { ApplicationAuthProviderName } from "../../auth/applicationSocialProviders.js";
import { IAMType } from "./IAMType.js";

export interface ApplicationAuthProviderResolverInput {
  applicationId: string;
  provider: ApplicationAuthProviderName;
  supported: true;
  configured: boolean;
  enabled: boolean;
  maskedClientId: string | null;
  scopes: readonly string[];
  callbackUrl: string;
  revision: number;
  updatedAt: Date | null;
  updatedBy: string | null;
}

/** Catalog-owned application social provider resolver. */
export class ApplicationAuthProviderResolver extends IAMType<ApplicationAuthProviderResolverInput> {
  applicationId() {
    return encodeGlobalIdByType(
      this.$props.applicationId,
      GlobalIdEntity.Application
    );
  }

  provider() {
    return this.$props.provider.toUpperCase();
  }

  supported() {
    return this.$props.supported;
  }

  configured() {
    return this.$props.configured;
  }

  enabled() {
    return this.$props.enabled;
  }

  maskedClientId() {
    return this.$props.maskedClientId;
  }

  scopes() {
    return this.$props.scopes;
  }

  callbackUrl() {
    return this.$props.callbackUrl;
  }

  revision() {
    return this.$props.revision;
  }

  updatedAt() {
    return this.$props.updatedAt;
  }

  updatedBy() {
    return this.$props.updatedBy
      ? encodeGlobalIdByType(this.$props.updatedBy, GlobalIdEntity.User)
      : null;
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
