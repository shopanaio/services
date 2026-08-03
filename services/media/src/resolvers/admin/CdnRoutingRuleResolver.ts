import { PreloadNotFoundError, TypePolicy } from "@shopana/type-resolver";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { CdnRoutingRule } from "../../repositories/models/index.js";
import { CdnConfigurationResolver } from "./CdnConfigurationResolver.js";
import { MediaType } from "./MediaType.js";

@TypePolicy<CdnRoutingRuleResolver>({
  resource: "store.data",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
  onDeny: "null",
})
export class CdnRoutingRuleResolver extends MediaType<string, CdnRoutingRule> {
  async $preload() {
    const assetGroup = await this.$ctx.kernel.repository.assetGroup.findByOwner(
      "store",
      this.$ctx.store.id
    );
    const rule = assetGroup
      ? await this.$ctx.kernel.repository.cdnRoutingRule.findById(
          assetGroup.id,
          this.$props
        )
      : null;
    if (!rule) throw new PreloadNotFoundError("CDN routing rule not found");
    return rule;
  }

  id() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.CdnRoutingRule);
  }

  async configuration() {
    const id = await this.$get("cdnConfigurationId");
    return new CdnConfigurationResolver(id, this.$ctx);
  }

  async name() { return this.$get("name"); }
  async priority() { return this.$get("priority"); }
  async enabled() { return this.$get("enabled"); }
  async conditions() { return this.$get("conditions"); }
  async transformOverrides() { return this.$get("transformOverrides"); }
  async createdAt() { return this.$get("createdAt"); }
  async updatedAt() { return this.$get("updatedAt"); }
}
