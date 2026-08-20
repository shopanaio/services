import type { CdnDeliveryResult } from "../../infrastructure/cdn/index.js";
import { TypePolicy } from "@shopana/type-resolver";
import { CdnConfigurationResolver } from "./CdnConfigurationResolver.js";
import { CdnRoutingRuleResolver } from "./CdnRoutingRuleResolver.js";
import { MediaType } from "./MediaType.js";

@TypePolicy<CdnDeliveryPreviewResolver>({
  resource: "store.data",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
  onDeny: "null",
})
export class CdnDeliveryPreviewResolver extends MediaType<CdnDeliveryResult, CdnDeliveryResult> {
  async $preload() {
    return this.$props;
  }
  async url() {
    return this.$get("url");
  }
  async originUrl() {
    return this.$get("originUrl");
  }
  async fallback() {
    return this.$get("fallback");
  }
  async userErrors() {
    return this.$get("userErrors");
  }

  async configuration() {
    const configuration = await this.$get("configuration");
    return configuration ? new CdnConfigurationResolver(configuration.id, this.$ctx) : null;
  }

  async routingRule() {
    const rule = await this.$get("routingRule");
    return rule ? new CdnRoutingRuleResolver(rule.id, this.$ctx) : null;
  }
}
