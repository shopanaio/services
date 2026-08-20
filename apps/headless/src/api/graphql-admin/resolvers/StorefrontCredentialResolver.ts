import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { HeadlessType } from "./HeadlessType.js";
import type { StorefrontCredentialRecord } from "../../../storefront-access/repositories/index.js";

export class StorefrontCredentialResolver extends HeadlessType<
  string,
  StorefrontCredentialRecord | null
> {
  protected $preload() {
    return this.$ctx.repository.credential.findById(this.scope, this.$props);
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.StorefrontCredential);
  }

  kind() {
    return this.requiredData("kind");
  }

  status() {
    return this.requiredData("status");
  }

  label() {
    return this.requiredData("label");
  }

  tokenHint() {
    return this.requiredData("tokenHint");
  }

  createdAt() {
    return this.requiredData("createdAt");
  }

  lastUsedAt() {
    return this.requiredData("lastUsedAt");
  }

  revokedAt() {
    return this.requiredData("revokedAt");
  }

  private async requiredData<TKey extends keyof StorefrontCredentialRecord>(
    key: TKey,
  ): Promise<StorefrontCredentialRecord[TKey]> {
    const data = await this.$data;
    if (!data) {
      throw new Error("Storefront credential was not found");
    }
    return data[key];
  }
}
