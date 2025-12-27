import type {
  AuthProvider as IAuthProvider,
  AuthorizeParams,
} from "@shopana/shared-kernel";
import type { ProjectKernelServices } from "./types.js";
import { getContext } from "../context/index.js";

/**
 * Extended authorize params with store name support.
 */
export interface ProjectAuthorizeParams extends AuthorizeParams {
  /** Store name (slug) - will be resolved to storeId via NameResolver */
  storeName?: string;
}

/**
 * Authorization provider for project service.
 *
 * Implements AuthProvider interface with store name resolution via NameResolver.
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
    console.log("Getting services from context");
    return getContext().kernel.getServices();
  }

  /**
   * User ID for authorization checks.
   * Uses override if provided, otherwise falls back to current user from context.
   */
  get userId(): string | null {
    return this.overrideUserId ?? getContext().user?.id ?? null;
  }

  /**
   * Authorization check with store name resolution.
   *
   * If storeName is provided, it will be resolved to storeId via NameResolver cache.
   * Authorization is delegated to IAM service.
   */
  async authorize(params: ProjectAuthorizeParams): Promise<boolean> {
    const userId = params.userId ?? this.userId;
    if (!userId) {
      return false;
    }

    // Resolve storeName to storeId if needed
    let storeId: string | undefined;

    if (params.storeName) {
      const resolved = await this.resolveStoreId(params.storeName);
      if (!resolved) {
        // Store not found - deny access
        return false;
      }
      storeId = resolved;
    }

    // Determine domain: explicit > resolved store > default org
    const domain = params.domain ?? (storeId ? `store:${storeId}` : "org");

    // Delegate to IAM service
    const result = (await this.services.broker.call("iam.authorize", {
      userId,
      organizationId: params.organizationId,
      organizationName: params.organizationName,
      resource: params.resource,
      action: params.action,
      domain,
    })) as { allowed: boolean };

    return result.allowed;
  }

  /**
   * Resolve store name to ID using cached NameResolver.
   */
  async resolveStoreId(name: string): Promise<string | null> {
    return this.services.nameResolver.resolveStoreId(name, async (n) => {
      const store = await this.services.repository.store.findByName(n);
      return store?.id ?? null;
    });
  }
}
