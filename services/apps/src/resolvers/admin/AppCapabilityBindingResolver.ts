import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference, TypePolicy } from "@shopana/type-resolver";
import type { AppCapabilityBindingRecord } from "../../repositories/capability/AppCapabilityRepository.js";
import { AppsType } from "./AppsType.js";

@SubgraphReference()
@TypePolicy<AppCapabilityBindingResolver>({
  resource: "store.apps",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
  onDeny: "null",
})
export class AppCapabilityBindingResolver extends AppsType<string, AppCapabilityBindingRecord> {
  async $preload(): Promise<AppCapabilityBindingRecord> {
    const binding = await this.$ctx.loaders.capabilityBinding.load(this.$props);
    if (!binding) {
      throw new PreloadNotFoundError(`App capability binding "${this.$props}" not found`);
    }
    return binding;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.AppCapabilityBinding);
  }

  capability() {
    return this.$get("capability");
  }

  async assignmentMode() {
    return (await this.$get("assignmentMode")).toUpperCase();
  }

  operation() {
    return this.$get("operation");
  }

  targetAppCode() {
    return this.$get("targetAppCode");
  }

  targetAction() {
    return this.$get("targetAction");
  }

  async status() {
    return (await this.$get("status")).toUpperCase();
  }

  precedence() {
    return this.$get("precedence");
  }

  async assignmentStatus() {
    const status = await this.$get("assignmentStatus");
    return status?.toUpperCase() ?? null;
  }
}
