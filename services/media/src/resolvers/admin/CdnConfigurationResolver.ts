import { PreloadNotFoundError, TypePolicy } from "@shopana/type-resolver";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import type { CdnConfiguration } from "../../repositories/models/index.js";
import { MediaType } from "./MediaType.js";

@TypePolicy<CdnConfigurationResolver>({
  resource: "store.data",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
  onDeny: "null",
})
export class CdnConfigurationResolver extends MediaType<
  string,
  CdnConfiguration
> {
  async $preload() {
    const assetGroup = await this.$ctx.kernel.repository.assetGroup.findByOwner(
      "store",
      this.$ctx.store.id
    );
    const configuration = assetGroup
      ? await this.$ctx.kernel.repository.cdnConfiguration.findById(
          assetGroup.id,
          this.$props
        )
      : null;
    if (!configuration) {
      throw new PreloadNotFoundError("CDN configuration not found");
    }
    return configuration;
  }

  id() {
    return encodeGlobalIdByType(
      this.$props,
      GlobalIdEntity.CdnConfiguration
    );
  }

  async name() { return this.$get("name"); }
  async provider() { return this.$get("provider"); }
  async baseUrl() { return this.$get("baseUrl"); }
  async pathPrefix() { return this.$get("pathPrefix"); }
  async enabled() { return this.$get("enabled"); }
  async isDefault() { return this.$get("isDefault"); }
  async signingMode() { return this.$get("signingMode"); }
  async secretRef() { return this.$get("secretRef"); }
  async transformStrategy() { return this.$get("transformStrategy"); }
  async urlTemplate() { return this.$get("urlTemplate"); }
  async providerConfig() { return this.$get("providerConfig"); }
  async transformConfig() { return this.$get("transformConfig"); }
  async createdAt() { return this.$get("createdAt"); }
  async updatedAt() { return this.$get("updatedAt"); }
}
