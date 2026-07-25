import {
  AuthorizationError,
  type AuthProvider,
} from "@shopana/shared-kernel";
import type { ServiceContext } from "../../context/types.js";

export type AppsAuthorizationOperation =
  | "read"
  | "install"
  | "configure"
  | "uninstall";

const actionByOperation = {
  read: "read",
  install: "write",
  configure: "write",
  uninstall: "admin",
} as const satisfies Record<
  AppsAuthorizationOperation,
  "read" | "write" | "admin"
>;

/**
 * Authorizes an Apps admin operation in the current store domain.
 *
 */
export async function assertAppsAuthorized(
  provider: AuthProvider,
  context: ServiceContext,
  operation: AppsAuthorizationOperation,
): Promise<void> {
  const action = actionByOperation[operation];
  const allowed = await provider.authorize({
    subject: context.hasUser ? context.user.id : undefined,
    organizationId: context.store.organizationId,
    resource: "store.apps",
    action,
    domain: `store:${context.store.id}`,
  });
  if (!allowed) {
    throw new AuthorizationError(
      [
        {
          message: "Access denied",
          field: null,
          code: "FORBIDDEN",
        },
      ],
      "store.apps",
      action,
    );
  }
}
