import type { Organization } from "../../repositories/models/authorization.js";
import { ORG_DOMAIN } from "../../casbin/CasbinService.js";
import { IAMType, Cache } from "./IAMType.js";
import { MembershipResolver } from "./MembershipResolver.js";

/**
 * Organization resolver - resolves organization domain interface
 */
export class OrganizationResolver extends IAMType<string, Organization> {
  @Cache({
    cacheName: "iam:org",
    key: (resolver: OrganizationResolver) => resolver.value,
  })
  async loadData() {
    const org = await this.ctx.kernel.repository.organization.findById(
      this.value
    );
    if (!org) {
      throw new Error(`Organization not found: ${this.value}`);
    }
    return org;
  }

  id() {
    return this.value;
  }

  membership() {
    return new MembershipResolver(
      {
        domain: ORG_DOMAIN,
        organizationId: this.value,
      },
      this.ctx
    );
  }

  async name() {
    return this.get("name");
  }

  async slug() {
    return this.get("slug");
  }

  async createdAt() {
    return this.get("createdAt");
  }

  async updatedAt() {
    return this.get("updatedAt");
  }
}
