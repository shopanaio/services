import type {
  AuthProvider as IAuthProvider,
  AuthorizeParams,
} from "@shopana/shared-kernel";
import { authorizeAdminContext } from "@shopana/shared-context";
import {
  ServiceLinkedResourceAuthorizationError,
  type ProtectedResourceAuthorizeParams,
} from "@shopana/rbac";
import type { IamKernelServices } from "./types.js";
import { getContext } from "../context/index.js";
import {
  IAM_SERVICE_LINKED_RESOURCE_KIND,
  matchesServiceLinkedOwner,
} from "../service-linked/resources.js";

/**
 * Authorization provider for IAM service.
 *
 * Implements AuthProvider using the gateway-issued admin context.
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
   * Authorization check bound to the gateway JWT subject and organization.
   */
  async authorize(params: AuthorizeParams): Promise<boolean> {
    const domain = params.domain ?? "org";
    const subject = params.subject || this.subject;
    if (!subject) return false;

    return authorizeAdminContext(getContext().adminContext, {
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
    const resource = params.protectedResource;
    if (
      !resource.organizationId.trim() ||
      !resource.resourceKind.trim() ||
      !resource.resourceId.trim()
    ) {
      return false;
    }

    if (resource.resourceKind !== IAM_SERVICE_LINKED_RESOURCE_KIND.application) {
      return false;
    }

    const managementMode =
      await this.services.repository.serviceLinkedResource.findManagementMode(
        resource
      );
    if (!managementMode) return false;

    const binding =
      await this.services.repository.serviceLinkedResource.findActiveByResource(
        resource
      );
    if (managementMode === "organization") {
      return binding === null;
    }
    if (!binding) return false;

    const caller = getContext().brokerCallContext?.caller;
    if (
      caller?.service === binding.linkedService &&
      matchesServiceLinkedOwner(resource, binding)
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
