import { ApolloQuery } from "@shopana/type-resolver";
import { GraphQLError } from "graphql";
import { ProjectType } from "./ProjectType.js";

@ApolloQuery
export class QueryResolver extends ProjectType<Record<string, never>> {
  store() {
    return this.resolvers.store(this.storeId());
  }

  async market(args: { handle: string }) {
    const item = await this.$ctx.kernel.repository.market.findActiveByHandle(
      this.storeId(),
      args.handle,
    );
    return item ? this.resolvers.market(item.id) : null;
  }

  async localization() {
    const storeId = this.storeId();
    const item = await this.$ctx.kernel.repository.market.findDefaultActive(storeId);
    if (!item) {
      throw new GraphQLError("The storefront has no active default market", {
        extensions: { code: "STORE_CONFIGURATION_ERROR" },
      });
    }
    return this.resolvers.localization({ storeId, marketId: item.id });
  }

  private storeId(): string {
    const id = this.$ctx.storefrontStore?.id;
    if (!id) {
      throw new GraphQLError("Verified storefront context is required", {
        extensions: { code: "UNAUTHENTICATED" },
      });
    }
    return id;
  }
}
