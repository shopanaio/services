import type { CustomerMonetaryStatisticsConnectionInput } from "../../repositories/statistics/CustomerStatisticsRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class CustomerMonetaryStatisticsConnectionResolver extends BaseConnectionResolver<CustomerMonetaryStatisticsConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.statistics.getMonetaryConnection(
      this.$props
    );
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.monetaryStatistics(nodeId);
  }
}
