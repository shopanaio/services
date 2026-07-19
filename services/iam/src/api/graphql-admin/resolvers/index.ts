import { QueryResolver } from "../../../resolvers/admin/QueryResolver.js";
import { MutationResolver } from "../../../resolvers/admin/MutationResolver.js";
import { UserResolver } from "../../../resolvers/admin/UserResolver.js";
import { OrganizationResolver } from "../../../resolvers/admin/OrganizationResolver.js";
import { SessionResolver } from "../../../resolvers/admin/SessionResolver.js";
import {
  ApplicationResolver,
  ApplicationCreatePayloadResolver,
  ApplicationUpdatePayloadResolver,
  ApplicationArchivePayloadResolver,
} from "../../../resolvers/admin/ApplicationResolver.js";
import { ApplicationConnectionResolver } from "../../../resolvers/admin/ApplicationConnectionResolver.js";
import {
  ApplicationAuthConfigurationResolver,
  ApplicationAuthMethodResolver,
  ApplicationAuthBrandingResolver,
  ApplicationAuthTrustedOriginResolver,
  ApplicationAuthProviderCallbackUrlResolver,
  ApplicationAuthProtocolUrlsResolver,
  ApplicationAuthEmailDeliveryConfigurationResolver,
  ApplicationAuthUpdatePayloadResolver,
  ApplicationAuthMethodPayloadResolver,
} from "../../../resolvers/admin/ApplicationAuthResolver.js";
import {
  ApplicationAuthProviderResolver,
  ApplicationAuthProviderValidationResolver,
  ApplicationAuthProviderPayloadResolver,
  ApplicationAuthProviderValidationPayloadResolver,
} from "../../../resolvers/admin/ApplicationProviderResolver.js";
import {
  ApplicationOAuthClientResolver,
  ApplicationOAuthClientPayloadResolver,
  ApplicationOAuthClientCreatePayloadResolver,
  ApplicationOAuthClientSecretRotatePayloadResolver,
} from "../../../resolvers/admin/ApplicationOAuthClientResolver.js";
import { ApplicationOAuthClientConnectionResolver } from "../../../resolvers/admin/ApplicationOAuthClientConnectionResolver.js";
import {
  ApplicationUserResolver,
  ApplicationUserSecurityMetadataResolver,
  ApplicationUserLinkedAccountResolver,
  ApplicationUserPayloadResolver,
  ApplicationUserSessionsRevokeAllPayloadResolver,
  ApplicationUserAccountUnlinkPayloadResolver,
} from "../../../resolvers/admin/ApplicationUserResolver.js";
import { ApplicationUserConnectionResolver } from "../../../resolvers/admin/ApplicationUserConnectionResolver.js";
import { typeResolvers } from "./types.js";

export const resolvers = {
  // Root resolvers - decorated with @ApolloQuery/@ApolloMutation
  // They return Proxy objects that handle Apollo resolver signature
  Query: QueryResolver,
  Mutation: MutationResolver,

  // Type resolvers with @ResolveReference decorator
  User: UserResolver,
  Organization: OrganizationResolver,
  Session: SessionResolver,
  Application: ApplicationResolver,
  ApplicationConnection: ApplicationConnectionResolver,
  ApplicationCreatePayload: ApplicationCreatePayloadResolver,
  ApplicationUpdatePayload: ApplicationUpdatePayloadResolver,
  ApplicationArchivePayload: ApplicationArchivePayloadResolver,
  ApplicationAuthConfiguration: ApplicationAuthConfigurationResolver,
  ApplicationAuthMethod: ApplicationAuthMethodResolver,
  ApplicationAuthBranding: ApplicationAuthBrandingResolver,
  ApplicationAuthTrustedOrigin: ApplicationAuthTrustedOriginResolver,
  ApplicationAuthProviderCallbackUrl: ApplicationAuthProviderCallbackUrlResolver,
  ApplicationAuthProtocolUrls: ApplicationAuthProtocolUrlsResolver,
  ApplicationAuthEmailDeliveryConfiguration:
    ApplicationAuthEmailDeliveryConfigurationResolver,
  ApplicationAuthUpdatePayload: ApplicationAuthUpdatePayloadResolver,
  ApplicationAuthMethodPayload: ApplicationAuthMethodPayloadResolver,
  ApplicationAuthProvider: ApplicationAuthProviderResolver,
  ApplicationAuthProviderValidation: ApplicationAuthProviderValidationResolver,
  ApplicationAuthProviderPayload: ApplicationAuthProviderPayloadResolver,
  ApplicationAuthProviderValidationPayload:
    ApplicationAuthProviderValidationPayloadResolver,
  ApplicationOAuthClient: ApplicationOAuthClientResolver,
  ApplicationOAuthClientConnection: ApplicationOAuthClientConnectionResolver,
  ApplicationOAuthClientPayload: ApplicationOAuthClientPayloadResolver,
  ApplicationOAuthClientCreatePayload:
    ApplicationOAuthClientCreatePayloadResolver,
  ApplicationOAuthClientSecretRotatePayload:
    ApplicationOAuthClientSecretRotatePayloadResolver,
  ApplicationUser: ApplicationUserResolver,
  ApplicationUserSecurityMetadata: ApplicationUserSecurityMetadataResolver,
  ApplicationUserLinkedAccount: ApplicationUserLinkedAccountResolver,
  ApplicationUserConnection: ApplicationUserConnectionResolver,
  ApplicationUserPayload: ApplicationUserPayloadResolver,
  ApplicationUserSessionsRevokeAllPayload:
    ApplicationUserSessionsRevokeAllPayloadResolver,
  ApplicationUserAccountUnlinkPayload:
    ApplicationUserAccountUnlinkPayloadResolver,

  // Type resolvers for scalars, interfaces, and federation references
  // (includes Membership with __resolveReference)
  ...typeResolvers,
};
