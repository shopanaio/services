import type {
  AuthProvider,
  AuthorizeParams,
} from "@shopana/shared-kernel";
import type { IamKernelServices } from "./types.js";
import { getContext } from "../context/index.js";
import { ORG_DOMAIN, type Domain, type Resource } from "../casbin/CasbinService.js";

/**
 * Authorization provider for IAM service.
 *
 * Implements AuthProvider interface with organization name resolution via NameResolver.
 * Used by BaseScript and IAMType via composition (this.auth).
 * Gets kernel services from context automatically.
 *
 * @param userId - Optional user ID to check permissions for. If not provided, uses current user from context.
 */
export class Authorizable implements AuthProvider {
  private readonly overrideUserId?: string;

  constructor(userId?: string) {
    this.overrideUserId = userId;
  }

  private get services(): IamKernelServices {
    return getContext().kernel as unknown as IamKernelServices;
  }

  /**
   * User ID for authorization checks.
   * Uses override if provided, otherwise falls back to current user from context.
   */
  get userId(): string | null {
    return this.overrideUserId ?? getContext().currentUser?.id ?? null;
  }

  /**
   * Authorization check with organization name resolution.
   *
   * If organizationName is provided (instead of organizationId),
   * it will be resolved to organizationId via NameResolver cache.
   */
  async authorize(params: AuthorizeParams): Promise<boolean> {
    const userId = this.userId;
    if (!userId) {
      return false;
    }

    // Check if user is site admin (bypasses all checks)
    const isAdmin = await this.services.repository.user.isAdmin(userId);
    if (isAdmin) {
      return true;
    }

    // Resolve organizationName to organizationId if needed
    let organizationId = params.organizationId;

    if (!organizationId && params.organizationName) {
      const resolved = await this.resolveOrganizationId(params.organizationName);
      if (!resolved) {
        return false;
      }
      organizationId = resolved;
    }

    if (!organizationId) {
      return false;
    }

    // Check permission using Casbin RBAC
    return this.services.repository.casbin.enforce({
      organizationId,
      userId,
      domain: (params.domain as Domain) ?? ORG_DOMAIN,
      resource: params.resource as Resource,
      action: params.action,
    });
  }

  /**
   * Resolve organization name to ID using cached NameResolver.
   */
  async resolveOrganizationId(name: string): Promise<string | null> {
    return this.services.nameResolver.resolveOrganizationId(name, async (n) => {
      const org = await this.services.repository.organization.findByName(n);
      return org?.id ?? null;
    });
  }
}
