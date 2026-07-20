import type {
  AuthProvider as IAuthProvider,
  AuthorizeParams,
} from "@shopana/shared-kernel";
import {
  ServiceLinkedResourceAuthorizationError,
  validateAuthorizeInput,
} from "@shopana/rbac";
import type { IamKernelServices } from "./types.js";
import { getContext } from "../context/index.js";
import {
  ORG_DOMAIN,
  type Domain,
  type Resource,
} from "../casbin/CasbinService.js";
import {
  isIamServiceLinkedPermission,
  isServiceLinkedWriteAction,
} from "../service-linked/resources.js";

/**
 * Authorization provider for IAM service.
 *
 * Implements AuthProvider interface with organization name resolution via NameResolver.
 * Used by BaseScript and IAMType via composition (this.authProvider).
 * Gets kernel services from context automatically.
 */
export class AuthProvider implements IAuthProvider {

  private get services(): IamKernelServices {
    return getContext().kernel.getServices();
  }

  /**
   * Current subject (user ID) for authorization checks.
   * Falls back to current user from context.
   */
  get subject(): string | null {
    return getContext().currentUser?.id ?? null;
  }

  /**
   * Authorization check with organization name resolution.
   *
   * If organizationName is provided (instead of organizationId),
   * it will be resolved to organizationId via NameResolver cache.
   *
   * Validates domain, resource, and action against @shopana/rbac definitions.
   */
  async authorize(params: AuthorizeParams): Promise<boolean> {
    // Resolve organizationName to organizationId if needed
    let { organizationId, organizationName } = params;
    if (organizationName) {
      const resolved = await this.resolveOrganizationId(organizationName);
      if (!resolved) {
        return false;
      }
      organizationId = resolved;
    }

    if (!organizationId) {
      return false;
    }

    const domain = params.domain ?? "org";
    if (
      params.protectedResource &&
      params.protectedResource.organizationId !== organizationId
    ) {
      return false;
    }
    // Validate authorization input against @shopana/rbac definitions
    // Must happen BEFORE owner bypass to reject invalid domains
    const validation = validateAuthorizeInput({
      domain,
      resource: params.resource,
      action: params.action,
    });

    if (!validation.success) {
      console.error("[AuthProvider] Invalid authorization request:", validation.errors);
      return false;
    }

    const protectedResourceDecision =
      await this.authorizeProtectedResource(params);
    if (protectedResourceDecision !== null) {
      return protectedResourceDecision;
    }

    const subject = params.subject || this.subject;
    if (!subject) {
      return false;
    }

    // Check if user is site admin (bypasses RBAC, but not service-linked mutability)
    if (await this.services.repository.user.isAdmin(subject)) {
      return true;
    }

    // Check if user is organization owner (bypasses all authorization checks within org)
    if (await this.services.repository.organization.isOwner(organizationId, subject)) {
      return true;
    }

    // Check permission using Casbin RBAC
    const allowed = await this.services.repository.casbin.enforce({
      organizationId,
      subject,
      domain: domain as Domain,
      resource: params.resource as Resource,
      action: params.action,
    });
    if (!allowed) return false;

    return true;
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

  private async authorizeProtectedResource(
    params: AuthorizeParams
  ): Promise<boolean | null> {
    if (
      !params.protectedResource ||
      !isServiceLinkedWriteAction(params.action)
    ) {
      return null;
    }
    const binding =
      await this.services.repository.serviceLinkedResource.findActiveByResource(
        params.protectedResource
      );
    if (!binding) return null;

    const caller = getContext().brokerCallContext?.caller;
    if (
      caller?.service === binding.linkedService &&
      isIamServiceLinkedPermission(
        binding.resourceKind,
        params.resource,
        params.action
      )
    ) {
      return true;
    }

    throw new ServiceLinkedResourceAuthorizationError({
      organizationId: binding.organizationId,
      resourceKind: binding.resourceKind,
      resourceId: binding.resourceId,
      linkedService: binding.linkedService,
      linkedOwnerType: binding.linkedOwnerType,
      linkedOwnerId: binding.linkedOwnerId,
    });
  }

}
