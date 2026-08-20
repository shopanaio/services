import { encodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { AssetGroup } from "../../repositories/models/index.js";
import { PreloadNotFoundError, TypePolicy } from "@shopana/type-resolver";
import { CdnConfigurationResolver } from "./CdnConfigurationResolver.js";
import { CdnRoutingRuleResolver } from "./CdnRoutingRuleResolver.js";
import { MediaType } from "./MediaType.js";

@TypePolicy<MediaSettingsResolver>({
  resource: "store.data",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
  onDeny: "null",
})
export class MediaSettingsResolver extends MediaType<string, AssetGroup> {
  async $preload() {
    const assetGroup = await this.$ctx.kernel.repository.assetGroup.findById(this.$props);
    if (
      !assetGroup ||
      assetGroup.ownerType !== "store" ||
      assetGroup.ownerId !== this.$ctx.store.id
    ) {
      throw new PreloadNotFoundError("Media settings not found");
    }
    return assetGroup;
  }

  assetGroupId() {
    return encodeGlobalIdByType(this.$props, GlobalIdEntity.MediaAssetGroup);
  }

  async cdnConfigurations() {
    const rows = await this.$ctx.kernel.repository.cdnConfiguration.getAll(this.$props);
    return rows.map((row) => new CdnConfigurationResolver(row.id, this.$ctx));
  }

  async cdnRoutingRules() {
    const rows = await this.$ctx.kernel.repository.cdnRoutingRule.getAll(this.$props);
    return rows.map((row) => new CdnRoutingRuleResolver(row.id, this.$ctx));
  }
}
