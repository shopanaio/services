import { HeadlessType } from "./HeadlessType.js";
import type { StorefrontAccessPolicyRecord } from "../../../storefront-access/repositories/index.js";

export class StorefrontAccessPolicyResolver extends HeadlessType<
  string,
  StorefrontAccessPolicyRecord | null
> {
  protected $preload() {
    return this.$ctx.repository.accessPolicy.findByConnectionId(this.scope, this.$props);
  }

  permissions() {
    return this.requiredData("permissions");
  }

  revision() {
    return this.requiredData("revision");
  }

  updatedAt() {
    return this.requiredData("updatedAt");
  }

  private async requiredData<TKey extends keyof StorefrontAccessPolicyRecord>(
    key: TKey,
  ): Promise<StorefrontAccessPolicyRecord[TKey]> {
    const data = await this.$data;
    if (!data) {
      throw new Error("Storefront access policy was not found");
    }
    return data[key];
  }
}
