import { ApolloMutation } from "@shopana/type-resolver";
import { ReviewsType } from "./ReviewsType.js";

@ApolloMutation
export class MutationResolver extends ReviewsType<Record<string, never>> {
  async reviewsMutation() {
    return this.resolvers.reviewsMutation();
  }
}

export class ReviewsMutationResolver extends ReviewsType<
  Record<string, never>
> {
  async _empty() {
    return true;
  }
}
