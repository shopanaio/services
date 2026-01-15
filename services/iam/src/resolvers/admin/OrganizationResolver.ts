import { SubgraphReference } from "@shopana/type-resolver";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { Organization } from "../../repositories/models/authorization.js";
import { ORG_DOMAIN } from "../../casbin/CasbinService.js";
import { IAMType } from "./IAMType.js";
import { MembershipResolver } from "./MembershipResolver.js";

/**
 * Organization resolver - resolves organization domain interface
 */
@SubgraphReference()
export class OrganizationResolver extends IAMType<string, Organization> {
  async $preload() {
    const org = await this.$ctx.kernel.repository.organization.findById(
      this.$props
    );
    if (!org) {
      throw new Error(`Organization not found: ${this.$props}`);
    }
    return org;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.Organization);
  }

  membership() {
    return new MembershipResolver(
      {
        domain: ORG_DOMAIN,
        organizationId: this.$props,
      },
      this.$ctx
    );
  }

  async name() {
    return this.$get("name");
  }

  async displayName() {
    return this.$get("displayName");
  }

  async logo() {
    const logoId = await this.$get("logoId");
    if (!logoId) {
      return null;
    }
    // Return federation reference for File type
    return { __typename: "File" as const, id: logoId };
  }

  async createdAt() {
    return this.$get("createdAt");
  }

  async updatedAt() {
    return this.$get("updatedAt");
  }
}
