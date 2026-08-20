import { encodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { ApplicationAuthProviderName } from "../../auth/applicationSocialProviders.js";
import type { ApplicationAuthProviderValidationResult } from "../../services/ApplicationAuthAdminManagementService.js";
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
    return encodeGlobalIdByType(this.$props.applicationId, GlobalIdEntity.Application);
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
export class ApplicationAuthProviderValidationResolver extends IAMType<ApplicationAuthProviderValidationResult> {
  provider() {
    return this.$props.provider.toUpperCase();
  }

  status() {
    return this.$props.status.toUpperCase();
  }

  reasonCode() {
    return this.$props.reasonCode;
  }

  revision() {
    return this.$props.revision;
  }

  checkedAt() {
    return this.$props.checkedAt;
  }
}

/** Application social provider mutation payload resolver. */
interface ApplicationAuthProviderPayloadValue {
  provider: ApplicationAuthProviderResolver | null;
  userErrors: readonly unknown[];
}

export class ApplicationAuthProviderPayloadResolver extends IAMType<ApplicationAuthProviderPayloadValue> {
  provider() {
    return this.$props.provider;
  }

  userErrors() {
    return this.$props.userErrors;
  }
}

/** Application social provider validation payload resolver. */
interface ApplicationAuthProviderValidationPayloadValue {
  validation: ApplicationAuthProviderValidationResolver | null;
  userErrors: readonly unknown[];
}

export class ApplicationAuthProviderValidationPayloadResolver extends IAMType<ApplicationAuthProviderValidationPayloadValue> {
  validation() {
    return this.$props.validation;
  }

  userErrors() {
    return this.$props.userErrors;
  }
}
