import type { RatingCriterionRelayInput } from "../../repositories/configuration/ConfigurationRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class RatingCriterionConnectionResolver extends BaseConnectionResolver<RatingCriterionRelayInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.configuration.getCriterionConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.ratingCriterion(nodeId);
  }
}
