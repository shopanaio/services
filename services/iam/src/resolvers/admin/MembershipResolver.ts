import { IAMType } from "./IAMType.js";
import { MemberResolver } from "./MemberResolver.js";
import { RoleResolver } from "./RoleResolver.js";
import { ORGANIZATION_RESOURCES } from "../../constants/rbac.js";
import { ResourceDefinition } from "@shopana/shared-kernel";
import { ScopeIdentifier } from "@src/casbin/CasbinService.js";

export interface MembershipInput {
  domain: ScopeIdentifier;
  organizationId: string;
}

/**
 * Membership resolver - resolves membership container for members and roles
 */
export class MembershipResolver extends IAMType<
  MembershipInput,
  MembershipInput
> {
  async loadData() {
    return this.value;
  }

  domain() {
    return this.value.domain;
  }

  async roles(): Promise<RoleResolver[]> {
    const { organizationId, domain } = this.value;

    // Get all policies for this organization
    const policies = await this.ctx.kernel.repository.casbin.getPolicies(
      organizationId
    );

    // Extract unique role names from policies matching this domain
    const roleNames = new Set<string>();
    for (const policy of policies) {
      // Policy format: [role, domain, resource, action, effect]
      if (policy[1] === domain || policy[1] === "*") {
        roleNames.add(policy[0]);
      }
    }

    // Create RoleResolver for each role
    return Array.from(roleNames).map(
      (roleName) =>
        new RoleResolver({ organizationId, domain, name: roleName }, this.ctx)
    );
  }

  async members(): Promise<MemberResolver[]> {
    const { organizationId, domain } = this.value;

    // Get members for this domain using casbin
    const memberData = await this.ctx.kernel.repository.casbin.getMembers({
      organizationId,
      domain,
    });

    // Create MemberResolver for each member
    return memberData.map(
      (m) =>
        new MemberResolver(
          {
            userId: m.userId,
            role: m.role,
            domain,
            organizationId,
          },
          this.ctx
        )
    );
  }

  availableResources(): ResourceDefinition[] {
    return ORGANIZATION_RESOURCES;
  }
}
