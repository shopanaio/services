import { SubgraphReference } from "@shopana/type-resolver";
import { Resources } from "@shopana/rbac";
import { IAMType } from "./IAMType.js";
import { MemberResolver } from "./MemberResolver.js";
import { RoleResolver } from "./RoleResolver.js";
import type { Domain } from "../../casbin/CasbinService.js";
import type { ResourceDefinition } from "./interfaces/ResourceDefinition.js";

export interface MembershipInput {
  domain: Domain;
  organizationId: string;
}

/**
 * Membership resolver - resolves membership container for members and roles
 */
@SubgraphReference(
  (ref: { __typename: "Membership"; domain: string; organizationId: string }) => ({
    domain: ref.domain as Domain,
    organizationId: ref.organizationId,
  })
)
export class MembershipResolver extends IAMType<
  MembershipInput,
  MembershipInput
> {
  async $preload() {
    return this.$props;
  }

  domain() {
    return this.$props.domain;
  }

  organizationId() {
    return this.$props.organizationId;
  }

  async roles(): Promise<RoleResolver[]> {
    const { organizationId, domain } = this.$props;

    // Get roles from database via DataLoader
    const roles = await this.$ctx.loaders.rolesByDomain.load({
      organizationId,
      domain,
    });

    return roles.map(
      (role) =>
        new RoleResolver({ organizationId, domain, name: role.name }, this.$ctx)
    );
  }

  async members(): Promise<MemberResolver[]> {
    const { organizationId, domain } = this.$props;

    // Get members for this domain using casbin
    const memberData = await this.$ctx.kernel.repository.casbin.getMembers({
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
          this.$ctx
        )
    );
  }

  availableResources(): ResourceDefinition[] {
    const { domain } = this.$props;

    // Select resources based on domain
    const resources = domain === "org" ? Resources.org : Resources.store;

    // Map to ResourceDefinition format
    return Object.entries(resources).map(([name, def]) => ({
      name,
      displayName: def.displayName,
      actions: [...def.actions],
      description: def.description,
    }));
  }
}
