import DataLoader from "dataloader";
import { authorizeAdminContext, type AdminContextClaims } from "@shopana/shared-context";

export interface AuthRequest {
  userId: string;
  organizationId: string;
  resource: string;
  action: string;
  domain?: string;
}

/**
 * Creates a DataLoader for request-local authorization checks.
 */
export function createAuthorizationLoader(adminContext?: AdminContextClaims) {
  return new DataLoader<AuthRequest, boolean, string>(
    async (requests) =>
      requests.map((request) =>
        authorizeAdminContext(adminContext, {
          subject: request.userId,
          organizationId: request.organizationId,
          domain: request.domain ?? "org",
          resource: request.resource,
          action: request.action,
        }),
      ),
    {
      // Cache key based on all authorization parameters
      cacheKeyFn: (req) =>
        JSON.stringify([
          req.userId,
          req.organizationId,
          req.domain ?? "",
          req.resource,
          req.action,
        ]),
    },
  );
}

export type AuthorizationLoader = ReturnType<typeof createAuthorizationLoader>;
