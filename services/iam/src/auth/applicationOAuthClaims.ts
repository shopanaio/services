import type { OAuthOptions, Scope } from "@better-auth/oauth-provider";
import { readApplicationOAuthClientPolicyMetadata } from "./applicationOAuthPolicy.js";

type OAuthClaimsOptions = Pick<
  OAuthOptions<Scope[]>,
  "customAccessTokenClaims" | "customIdTokenClaims" | "customUserInfoClaims"
>;

export function createApplicationOAuthClaimsPolicy(input: {
  applicationId: string;
  resource: string;
}): OAuthClaimsOptions {
  const assertUserScope = (user: Record<string, unknown> | null | undefined) => {
    if (!user || typeof user.id !== "string" || user.applicationId !== input.applicationId) {
      throw new Error("OAuth token user is outside the application realm");
    }
  };

  return {
    customAccessTokenClaims: ({ user, resource, metadata, referenceId }) => {
      assertUserScope(user);
      if (resource !== undefined && resource !== input.resource) {
        throw new Error("OAuth token resource is outside the application realm");
      }
      const clientPolicy = readApplicationOAuthClientPolicyMetadata(metadata, {
        applicationId: input.applicationId,
        resource: input.resource,
      });
      if (typeof referenceId !== "string" || !referenceId) {
        throw new Error("OAuth token family reference is missing");
      }
      return {
        application_id: input.applicationId,
        actor_type: "application_user",
        client_id: clientPolicy.clientId,
        token_family_id: referenceId,
      };
    },
    customIdTokenClaims: ({ user, metadata }) => {
      assertUserScope(user);
      readApplicationOAuthClientPolicyMetadata(metadata, {
        applicationId: input.applicationId,
        resource: input.resource,
      });
      return {
        application_id: input.applicationId,
        actor_type: "application_user",
        ...(user.syntheticEmail === true ? { email: undefined, email_verified: undefined } : {}),
      };
    },
    customUserInfoClaims: ({ user }) => {
      assertUserScope(user);
      return user.syntheticEmail === true ? { email: undefined, email_verified: undefined } : {};
    },
  };
}
