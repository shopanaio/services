import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { CustomerMonetaryStatistics } from "../../repositories/models/index.js";
import { CustomersType } from "./CustomersType.js";

export class CustomerMonetaryStatisticsResolver extends CustomersType<
  string,
  CustomerMonetaryStatistics
> {
  async $preload() {
    const statistics = await this.$ctx.loaders.monetaryStatistics.load(this.$props);
    if (!statistics) {
      throw new PreloadNotFoundError(
        `Customer monetary statistics with ID ${this.$props} not found`,
      );
    }
    return statistics;
  }

  id() {
    return this.encodeId(this.$props, GlobalIdEntity.CustomerMonetaryStatistics);
  }

  async customer() {
    return this.resolvers.customer(await this.$get("customerId"));
  }

  currencyCode() {
    return this.$get("currencyCode");
  }

  ordersCount() {
    return this.$get("ordersCount");
  }

  async totalSpentMinor() {
    return String(await this.$get("totalSpentMinor"));
  }

  async totalRefundedMinor() {
    return String(await this.$get("totalRefundedMinor"));
  }

  async netSpentMinor() {
    return String(await this.$get("netSpentMinor"));
  }

  async averageOrderValueMinor() {
    return String(await this.$get("averageOrderValueMinor"));
  }

  updatedAt() {
    return this.$get("updatedAt");
  }
}
