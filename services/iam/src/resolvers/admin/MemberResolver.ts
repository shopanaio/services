import { IAMType, Cache } from "./IAMType.js";
import { UserResolver } from "./UserResolver.js";
import type { UserRole } from "../../repositories/models/authorization.js";

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
    key: ({ value }: MemberResolver) =>
      `${value.organizationId}:${value.userId}:${value.domain}`,
  })
  async loadData(): Promise<UserRole> {
    const { organizationId, userId, domain } = this.value;

    const userRoleData = await this.ctx.loaders.member.load({
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
    return this.get("id");
  }

  user(): UserResolver {
    return new UserResolver(this.value.userId, this.ctx);
  }

  role() {
    return this.value.role;
  }

  async grantedAt() {
    return (await this.data).grantedAt.toISOString();
  }

  async grantedBy(): Promise<UserResolver | null> {
    const { grantedBy } = await this.data;
    return grantedBy ? new UserResolver(grantedBy, this.ctx) : null;
  }
}
