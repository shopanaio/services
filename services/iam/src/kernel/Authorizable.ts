import type {
  AuthProvider as IAuthProvider,
  AuthorizeParams,
} from "@shopana/shared-kernel";
import {
  ServiceLinkedResourceAuthorizationError,
  validateAuthorizeInput,
  type LinkedOwnerRef,
  type ProtectedResourceRef,
} from "@shopana/rbac";
import type { IamKernelServices } from "./types.js";
import { getContext } from "../context/index.js";
import {
  ORG_DOMAIN,
  type Domain,
  type Resource,
} from "../casbin/CasbinService.js";
import { IAM_SERVICE_LINKED_RESOURCE_KIND } from "../service-linked/resources.js";

const APPLICATION_LINKED_OWNER_RESOURCES = new Set([
  "org.applications",
  "org.application-auth",
  "org.application-auth-providers",
  "org.application-oauth-clients",
  "org.application-users",
]);

const LINKED_OWNER_WRITE_ACTIONS = new Set(["write", "admin"]);

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
    const linkedOwner =
      "linkedOwner" in params ? params.linkedOwner : undefined;
    const subject = params.subject || this.subject;
    if (!subject) {
      return false;
    }

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
    if (linkedOwner && linkedOwner.organizationId !== organizationId) {
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

    if (
      params.protectedResource &&
      linkedOwner &&
      !this.sameProtectedResource(params.protectedResource, linkedOwner)
    ) {
      return false;
    }

    if (
      linkedOwner &&
      !this.isLinkedOwnerPermissionScoped(
        linkedOwner,
        params.resource,
        params.action
      )
    ) {
      return false;
    }

    if (linkedOwner) {
      return this.isLinkedOwnerAuthorized(linkedOwner);
    }

    // Check if user is site admin (bypasses RBAC, but not service-linked mutability)
    if (await this.services.repository.user.isAdmin(subject)) {
      await this.assertAdminMutable(params);
      return true;
    }

    // Check if user is organization owner (bypasses all authorization checks within org)
    if (await this.services.repository.organization.isOwner(organizationId, subject)) {
      await this.assertAdminMutable(params);
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

    await this.assertAdminMutable(params);
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

  private async assertAdminMutable(params: AuthorizeParams): Promise<void> {
    if (!params.protectedResource) return;
    const binding =
      await this.services.repository.serviceLinkedResource.findActiveByResource(
        params.protectedResource
      );
    if (!binding) return;
    throw new ServiceLinkedResourceAuthorizationError({
      organizationId: binding.organizationId,
      resourceKind: binding.resourceKind,
      resourceId: binding.resourceId,
      linkedService: binding.linkedService,
      linkedOwnerType: binding.linkedOwnerType,
      linkedOwnerId: binding.linkedOwnerId,
    });
  }

  private async isLinkedOwnerAuthorized(
    linkedOwner: LinkedOwnerRef
  ): Promise<boolean> {
    const binding =
      await this.services.repository.serviceLinkedResource.findActiveLinkedOwner(
        linkedOwner
      );
    return Boolean(binding);
  }

  private sameProtectedResource(
    protectedResource: ProtectedResourceRef,
    linkedOwner: LinkedOwnerRef
  ): boolean {
    return (
      protectedResource.organizationId === linkedOwner.organizationId &&
      protectedResource.resourceKind === linkedOwner.resourceKind &&
      protectedResource.resourceId === linkedOwner.resourceId
    );
  }

  private isLinkedOwnerPermissionScoped(
    linkedOwner: LinkedOwnerRef,
    resource: string,
    action: string
  ): boolean {
    if (!LINKED_OWNER_WRITE_ACTIONS.has(action)) return false;
    if (linkedOwner.resourceKind === IAM_SERVICE_LINKED_RESOURCE_KIND.application) {
      return APPLICATION_LINKED_OWNER_RESOURCES.has(resource);
    }
    return false;
  }
}
