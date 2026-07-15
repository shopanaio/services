import { ApolloQuery } from "@shopana/type-resolver";
import { ReviewsType } from "./ReviewsType.js";

@ApolloQuery
export class QueryResolver extends ReviewsType<Record<string, never>> {
  async reviewsQuery() {
    return this.resolvers.reviewsQuery();
  }
}

export class ReviewsQueryResolver extends ReviewsType<Record<string, never>> {
  async _empty() {
    return true;
  }
}
