import {
  Actions,
  AllResources,
  StoreResources,
  type Action,
  type ResourceName,
} from "@shopana/rbac";
import { decodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { Util } from "casbin";
import type {
  AdminPermission,
  ContextStore,
  ResolvedAdminAccessContext,
} from "@shopana/shared-context";
import type { Domain } from "../../../casbin/CasbinService.js";
import type { Kernel } from "../../../kernel/Kernel.js";

export interface AdminContextResolveInput {
  readonly accessToken: string;
  readonly organizationId?: string;
  readonly storeName?: string;
}

interface ProjectStoreResult {
  readonly store: ContextStore | null;
  readonly userErrors: readonly {
    readonly code: string;
    readonly message: string;
  }[];
}

const IMPLIED_ACTIONS = {
  read: ["read"],
  write: ["read", "write"],
  admin: ["read", "write", "admin"],
} as const satisfies Readonly<Record<Action, readonly Action[]>>;

export class AdminContextResolver {
  constructor(private readonly kernel: Kernel) {}

  async resolve(input: AdminContextResolveInput): Promise<ResolvedAdminAccessContext | null> {
    const validated = await this.kernel.repository.user.validateAccessJwt(input.accessToken);
    if (!validated) return null;

    const user = Object.freeze({
      id: validated.user.id,
      name: validated.user.name,
      email: validated.user.email,
    });
    const isSiteAdmin = validated.user.admin;

    if (!input.storeName && !input.organizationId) {
      return Object.freeze({
        user,
        sessionId: validated.sessionId,
        organizationId: null,
        store: null,
        permissions: Object.freeze([]),
        isSiteAdmin,
        isOrganizationOwner: false,
      });
    }

    let organizationId: string | undefined;
    if (input.organizationId) {
      try {
        organizationId = decodeGlobalIdByType(input.organizationId, GlobalIdEntity.Organization);
      } catch {
        return null;
      }
    }

    let store: ContextStore | null = null;
    if (input.storeName) {
      const result = await this.kernel
        .getServices()
        .broker.call<ProjectStoreResult, { readonly name: string }>("project.getCurrentStore", {
          name: input.storeName,
        });
      store = result?.store ?? null;
      if (!store || (organizationId !== undefined && organizationId !== store.organizationId)) {
        return null;
      }
      organizationId = store.organizationId;
    }
    if (!organizationId) return null;

    const member = isSiteAdmin
      ? null
      : await this.kernel.repository.organization.findMember(organizationId, validated.user.id);
    if (!isSiteAdmin && !member) return null;

    const isOrganizationOwner = member?.isOwner ?? false;
    const permissions =
      isSiteAdmin || isOrganizationOwner
        ? Object.freeze<AdminPermission[]>([])
        : store
          ? await this.resolvePermissions(organizationId, store.id, validated.user.id)
          : await this.resolveRolePermissions(
              organizationId,
              validated.user.id,
              "org",
              AllResources,
            );

    return Object.freeze({
      user,
      sessionId: validated.sessionId,
      organizationId,
      store: store ? Object.freeze({ ...store }) : null,
      permissions,
      isSiteAdmin,
      isOrganizationOwner,
    });
  }

  private async resolvePermissions(
    organizationId: string,
    storeId: string,
    userId: string,
  ): Promise<readonly AdminPermission[]> {
    const storeDomain = `store:${storeId}` as const;
    const [organizationPermissions, storePermissions] = await Promise.all([
      this.resolveRolePermissions(organizationId, userId, "org", AllResources),
      this.resolveRolePermissions(organizationId, userId, storeDomain, StoreResources),
    ]);

    return Object.freeze([...organizationPermissions, ...storePermissions]);
  }

  private async resolveRolePermissions(
    organizationId: string,
    userId: string,
    domain: AdminPermission["domain"],
    resources: readonly ResourceName[],
  ): Promise<readonly AdminPermission[]> {
    const assignment = await this.kernel.repository.organization.findUserRole(
      organizationId,
      userId,
      domain,
    );
    if (!assignment) return Object.freeze([]);

    const role = await this.kernel.repository.organization.findRoleById(
      organizationId,
      assignment.roleId,
    );
    if (!role || role.domain !== domain) return Object.freeze([]);

    const policies = await this.kernel.repository.casbin.getPoliciesForRoleInDomain(
      organizationId,
      role.name,
      domain as Domain,
    );
    const permissionKeys = new Set<string>();

    for (const [, , resourcePattern, grantedAction] of policies) {
      if (!isAction(grantedAction)) continue;

      for (const resource of resources) {
        if (!Util.keyMatchFunc(resource, resourcePattern)) continue;

        for (const action of IMPLIED_ACTIONS[grantedAction]) {
          permissionKeys.add(permissionKey(resource, action));
        }
      }
    }

    const permissions = resources.flatMap((resource) =>
      Actions.flatMap((action) =>
        permissionKeys.has(permissionKey(resource, action))
          ? [
              Object.freeze({
                domain,
                resource,
                action,
              }),
            ]
          : [],
      ),
    );

    return Object.freeze(permissions);
  }
}

function isAction(value: string): value is Action {
  return (Actions as readonly string[]).includes(value);
}

function permissionKey(resource: ResourceName, action: Action): string {
  return `${resource}\u0000${action}`;
}
