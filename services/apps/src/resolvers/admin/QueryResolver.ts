import { ApolloQuery } from "@shopana/type-resolver";
import { AppsType } from "./AppsType.js";

@ApolloQuery
export class QueryResolver extends AppsType<Record<string, never>> {
  appsQuery() {
    return new AppsQueryResolver({}, this.$ctx);
  }
}

export class AppsQueryResolver extends AppsType<Record<string, never>> {}
