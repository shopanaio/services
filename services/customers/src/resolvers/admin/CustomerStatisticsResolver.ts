import { PreloadNotFoundError } from "@shopana/type-resolver";
import type { CustomerStatistics } from "../../repositories/models/index.js";
import { CustomersType } from "./CustomersType.js";

export class CustomerStatisticsResolver extends CustomersType<
  string,
  CustomerStatistics
> {
  async $preload() {
    const statistics = await this.$ctx.loaders.statisticsByCustomer.load(
      this.$props
    );
    if (!statistics) {
      throw new PreloadNotFoundError(
        `Statistics for customer ${this.$props} not found`
      );
    }
    return statistics;
  }

  customer() {
    return this.resolvers.customer(this.$props);
  }

  ordersCount() {
    return this.$get("ordersCount");
  }

  completedOrdersCount() {
    return this.$get("completedOrdersCount");
  }

  cancelledOrdersCount() {
    return this.$get("cancelledOrdersCount");
  }

  returnsCount() {
    return this.$get("returnsCount");
  }

  firstOrderId() {
    return this.$get("firstOrderId");
  }

  firstOrderAt() {
    return this.$get("firstOrderAt");
  }

  lastOrderId() {
    return this.$get("lastOrderId");
  }

  lastOrderAt() {
    return this.$get("lastOrderAt");
  }

  lastCheckoutAt() {
    return this.$get("lastCheckoutAt");
  }

  updatedAt() {
    return this.$get("updatedAt");
  }
}
