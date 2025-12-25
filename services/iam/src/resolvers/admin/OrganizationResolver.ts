import type { Organization } from "../../repositories/models/authorization.js";
import { IAMType, Cache } from "./IAMType.js";
import { MembershipResolver } from "./MembershipResolver.js";

/**
 * Organization resolver - resolves organization domain interface
 */
export class OrganizationResolver extends IAMType<string, Organization | null> {
  @Cache({
    cacheName: "organization",
    key: (resolver: OrganizationResolver) => resolver.value,
  })
  async loadData() {
    return this.ctx.kernel.repository.organization.findById(this.value);
  }

  id() {
    return this.value;
  }

  async name() {
    return this.get("name");
  }

  async slug() {
    return this.get("slug");
  }

  membership() {
    const orgId = this.value;
    return new MembershipResolver(
      { domain: `org:${orgId}`, organizationId: orgId },
      this.ctx
    );
  }

  async createdAt() {
    const date = await this.get("createdAt");
    return date?.toISOString() ?? null;
  }

  async updatedAt() {
    const date = await this.get("updatedAt");
    return date?.toISOString() ?? null;
  }
}
