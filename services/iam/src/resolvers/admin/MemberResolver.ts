import { IAMType, Cache } from "./IAMType.js";
import { UserResolver } from "./UserResolver.js";
import type { UserRole } from "../../repositories/models/authorization.js";
import { ORG_DOMAIN } from "@src/casbin/CasbinService.js";

export interface MemberInput {
  userId: string;
  role: string;
  domain: string;
  organizationId: string;
}

/**
 * Member resolver - resolves member with role assignment
 * Loads full data from userRole table including grantedAt and grantedBy
 * Uses DataLoader for batch loading
 */
export class MemberResolver extends IAMType<MemberInput, UserRole> {
  @Cache({
    cacheName: "iam:member",
    // Cache by unique constraint: organizationId + userId + domain
    key: ({ $props }: MemberResolver) =>
      `${$props.organizationId}:${$props.userId}:${$props.domain}`,
  })
  async $preload(): Promise<UserRole> {
    const { organizationId, userId, domain } = this.$props;

    const userRoleData = await this.$ctx.loaders.member.load({
      organizationId,
      userId,
      domain,
    });

    if (!userRoleData) {
      throw new Error(
        `UserRole not found: org=${organizationId}, user=${userId}, domain=${domain}`
      );
    }

    return userRoleData;
  }

  async id() {
    return this.$get("id");
  }

  user(): UserResolver {
    return new UserResolver(this.$props.userId, this.$ctx);
  }

  role() {
    return this.$props.role;
  }

  async grantedAt() {
    return (await this.$data).grantedAt;
  }

  async grantedBy(): Promise<UserResolver | null> {
    const { grantedBy } = await this.$data;
    return grantedBy ? new UserResolver(grantedBy, this.$ctx) : null;
  }

  /**
   * Whether this member is the organization owner.
   * Only applicable for org-level membership (domain = "org").
   * Store-level members always return false.
   */
  async isOwner(): Promise<boolean> {
    const { organizationId, userId, domain } = this.$props;

    // Only org-level members can be owners
    if (domain !== ORG_DOMAIN) {
      return false;
    }

    return this.$ctx.kernel.repository.organization.isOwner(
      organizationId,
      userId
    );
  }
}
