import { ApolloQuery } from "@shopana/type-resolver";
import { AppsType } from "./AppsType.js";

@ApolloQuery
export class QueryResolver extends AppsType<Record<string, never>> {
  appsQuery() {
    return new AppsQueryResolver({}, this.$ctx);
  }
}

/**
 * Namespace resolver. Domain query fields are added here as they are implemented.
 */
export class AppsQueryResolver extends AppsType<Record<string, never>> {}
