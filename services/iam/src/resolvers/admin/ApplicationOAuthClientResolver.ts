import { encodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { ApplicationOAuthClient } from "../../services/ApplicationOAuthClientManagementService.js";
import { IAMType } from "./IAMType.js";

/** Application OAuth client resolver. */
export class ApplicationOAuthClientResolver extends IAMType<ApplicationOAuthClient> {
  id() {
    return encodeGlobalIdByType(this.$props.id, GlobalIdEntity.ApplicationOAuthClient);
  }

  organizationId() {
    return encodeGlobalIdByType(this.$props.organizationId, GlobalIdEntity.Organization);
  }

  applicationId() {
    return encodeGlobalIdByType(this.$props.applicationId, GlobalIdEntity.Application);
  }

  clientId() {
    return this.$props.clientId;
  }

  name() {
    return this.$props.name;
  }

  clientType() {
    return this.$props.clientType.toUpperCase();
  }

  environment() {
    return this.$props.environment.toUpperCase();
  }

  redirectUris() {
    return this.$props.redirectUris;
  }

  postLogoutRedirectUris() {
    return this.$props.postLogoutRedirectUris;
  }

  resources() {
    return this.$props.resources;
  }

  grantTypes() {
    return this.$props.grantTypes;
  }

  responseTypes() {
    return this.$props.responseTypes;
  }

  tokenEndpointAuthMethod() {
    return this.$props.tokenEndpointAuthMethod.toUpperCase();
  }

  requirePkce() {
    return this.$props.requirePKCE;
  }

  protocolPolicyVersion() {
    return this.$props.protocolPolicyVersion;
  }

  skipConsent() {
    return this.$props.skipConsent;
  }

  enableEndSession() {
    return this.$props.enableEndSession;
  }

  disabled() {
    return this.$props.disabled;
  }

  archived() {
    return this.$props.archived;
  }

  revision() {
    return this.$props.revision;
  }

  createdAt() {
    return this.$props.createdAt;
  }

  updatedAt() {
    return this.$props.updatedAt;
  }

  archivedAt() {
    return this.$props.archivedAt;
  }

  createdBy() {
    return encodeGlobalIdByType(this.$props.createdBy, GlobalIdEntity.User);
  }

  updatedBy() {
    return encodeGlobalIdByType(this.$props.updatedBy, GlobalIdEntity.User);
  }
}

/** Application OAuth client mutation payload resolver. */
interface ApplicationOAuthClientPayloadValue {
  client: ApplicationOAuthClientResolver | null;
  userErrors: readonly unknown[];
}

interface ApplicationOAuthClientSecretPayloadValue extends ApplicationOAuthClientPayloadValue {
  clientSecret: string | null;
}

export class ApplicationOAuthClientPayloadResolver extends IAMType<ApplicationOAuthClientPayloadValue> {
  client() {
    return this.$props.client;
  }

  userErrors() {
    return this.$props.userErrors;
  }
}

/** Application OAuth client create payload resolver. */
export class ApplicationOAuthClientCreatePayloadResolver extends IAMType<ApplicationOAuthClientSecretPayloadValue> {
  client() {
    return this.$props.client;
  }

  clientSecret() {
    return this.$props.clientSecret;
  }

  userErrors() {
    return this.$props.userErrors;
  }
}

/** Application OAuth client secret rotation payload resolver. */
export class ApplicationOAuthClientSecretRotatePayloadResolver extends IAMType<ApplicationOAuthClientSecretPayloadValue> {
  client() {
    return this.$props.client;
  }

  clientSecret() {
    return this.$props.clientSecret;
  }

  userErrors() {
    return this.$props.userErrors;
  }
}
