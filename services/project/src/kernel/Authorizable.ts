import { authorizeAdminContext } from "@shopana/shared-context";
import {
  throwIfBrokerAuthorizeDenied,
  type AuthProvider as IAuthProvider,
  type AuthorizeParams,
  type BrokerAuthorizeResult,
  type ProtectedResourceAuthorizeParams,
} from "@shopana/shared-kernel";
import type { ProjectKernelServices } from "./types.js";
import { getContext } from "../context/index.js";

/**
 * Extended authorize params with store name support.
 */
export type ProjectAuthorizeParams = AuthorizeParams & {
  /** Store name (slug) - will be resolved to storeId via NameResolver */
  storeName?: string;
};

/**
 * Authorization provider for project service.
 *
 * Implements AuthProvider using the gateway-issued admin context.
 * Used by BaseScript and BaseResolver via composition (this.auth).
 * Gets kernel services from context automatically.
 *
 * @param userId - Optional user ID to check permissions for. If not provided, uses current user from context.
 */
export class AuthProvider implements IAuthProvider {
  private readonly overrideUserId?: string;

  constructor(userId?: string) {
    this.overrideUserId = userId;
  }

  private get services(): ProjectKernelServices {
    return getContext().kernel.getServices();
  }

  /**
   * User ID for authorization checks.
   * Uses override if provided, otherwise falls back to current user from context.
   */
  get subject(): string | null {
    return this.overrideUserId ?? getContext().user?.id ?? null;
  }

  /**
   * Authorization check bound to the selected store in the gateway JWT.
   */
  async authorize(params: ProjectAuthorizeParams): Promise<boolean> {
    const subject = params.subject ?? this.subject;
    if (!subject) {
      return false;
    }

    const context = getContext();
    let storeId: string | undefined;

    if (params.storeName) {
      if (context.adminContext?.store?.name !== params.storeName) return false;
      storeId = context.adminContext.store.id;
    }

    // Determine domain: explicit > resolved store > default org
    const domain = params.domain ?? (storeId ? `store:${storeId}` : "org");

    return authorizeAdminContext(context.adminContext, {
      subject,
      organizationId: params.organizationId,
      organizationName: params.organizationName,
      resource: params.resource,
      action: params.action,
      domain,
    });
  }

  async authorizeProtectedResource(params: ProtectedResourceAuthorizeParams): Promise<boolean> {
    const result = (await this.services.broker.call(
      "iam.authorizeProtectedResource",
      params,
    )) as BrokerAuthorizeResult;
    throwIfBrokerAuthorizeDenied(result);
    return result.allowed;
  }
}
