import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { HeadlessType } from "./HeadlessType.js";
import { StorefrontAccessPolicyResolver } from "./StorefrontAccessPolicyResolver.js";
import { StorefrontCredentialResolver } from "./StorefrontCredentialResolver.js";
import type { HeadlessStorefrontConnectionRecord } from "../../../storefront-access/repositories/index.js";

export class HeadlessStorefrontConnectionResolver extends HeadlessType<
  string,
  HeadlessStorefrontConnectionRecord | null
> {
  protected $preload() {
    return this.$ctx.repository.connection.findById(this.scope, this.$props);
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.HeadlessStorefrontConnection);
  }

  displayName() {
    return this.requiredData("displayName");
  }

  status() {
    return this.requiredData("status");
  }

  async storefrontAccessPolicy() {
    const policy = await this.$ctx.repository.accessPolicy.findByConnectionId(
      this.scope,
      this.$props,
    );
    return policy ? new StorefrontAccessPolicyResolver(this.$props, this.$ctx) : null;
  }

  async storefrontCredentials() {
    const credentials = await this.$ctx.repository.credential.listByConnection(
      this.scope,
      this.$props,
    );
    return credentials.map(({ id }) => new StorefrontCredentialResolver(id, this.$ctx));
  }

  publicAccessToken() {
    return this.$ctx.credentials.getPublicAccessToken(this.scope, this.$props);
  }

  createdAt() {
    return this.requiredData("createdAt");
  }

  updatedAt() {
    return this.requiredData("updatedAt");
  }

  private async requiredData<TKey extends keyof HeadlessStorefrontConnectionRecord>(
    key: TKey,
  ): Promise<HeadlessStorefrontConnectionRecord[TKey]> {
    const data = await this.$data;
    if (!data) {
      throw new Error("Headless storefront connection was not found");
    }
    return data[key];
  }
}
