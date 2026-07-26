import { authorizeAdminContext } from "@shopana/shared-context";
import {
  throwIfBrokerAuthorizeDenied,
  type AuthProvider as IAuthProvider,
  type AuthorizeParams,
  type BrokerAuthorizeResult,
  type ProtectedResourceAuthorizeParams,
} from "@shopana/shared-kernel";
import type { InventoryKernelServices } from "./types.js";
import { getContext } from "../context/index.js";

/**
 * Authorization provider for inventory service.
 *
 * Implements AuthProvider interface.
 * Validates authorization against gateway-issued admin claims.
 * Used by InventoryType via composition (this.authProvider).
 * Gets kernel services from context automatically.
 */
export class AuthProvider implements IAuthProvider {
  private get services(): InventoryKernelServices {
    return getContext().kernel.getServices();
  }

  /**
   * Current subject (user ID) for authorization checks.
   * Falls back to current user from context.
   */
  get subject(): string | null {
    return getContext().user?.id ?? null;
  }

  /**
   * Authorization check.
   *
   * Uses the verified admin context stored in the request context.
   * Uses store context from ServiceContext for domain resolution.
   */
  async authorize(params: AuthorizeParams): Promise<boolean> {
    const subject = params.subject ?? this.subject;
    if (!subject) {
      return false;
    }

    const ctx = getContext();

    // Determine domain: explicit > store from context > default org
    const domain =
      params.domain ?? (ctx.store?.id ? `store:${ctx.store.id}` : "org");

    return authorizeAdminContext(ctx.adminContext, {
      subject,
      organizationId: params.organizationId,
      organizationName: params.organizationName,
      resource: params.resource,
      action: params.action,
      domain,
    });
  }

  async authorizeProtectedResource(
    params: ProtectedResourceAuthorizeParams
  ): Promise<boolean> {
    const result = (await this.services.broker.call(
      "iam.authorizeProtectedResource",
      params
    )) as BrokerAuthorizeResult;
    throwIfBrokerAuthorizeDenied(result);
    return result.allowed;
  }
}
