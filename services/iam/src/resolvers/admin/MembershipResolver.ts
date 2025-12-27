import { IAMType } from "./IAMType.js";
import { MemberResolver } from "./MemberResolver.js";
import { RoleResolver } from "./RoleResolver.js";
import type { ResourceDefinition } from "@shopana/shared-kernel";
import type { Domain } from "../../casbin/CasbinService.js";

export interface MembershipInput {
  domain: Domain;
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

  organizationId() {
    return this.value.organizationId;
  }

  async roles(): Promise<RoleResolver[]> {
    const { organizationId, domain } = this.value;

    // Get roles from database via DataLoader
    const roles = await this.ctx.loaders.rolesByDomain.load({
      organizationId,
      domain,
    });

    return roles.map(
      (role) =>
        new RoleResolver({ organizationId, domain, name: role.name }, this.ctx)
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

  async availableResources(): Promise<ResourceDefinition[]> {
    const { domain } = this.value;
    return this.ctx.kernel.resourceAggregator.getResourcesForDomain(domain);
  }
}
