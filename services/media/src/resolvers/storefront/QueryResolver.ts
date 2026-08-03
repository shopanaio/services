import { ApolloQuery } from "@shopana/type-resolver";
import { MediaType } from "./MediaType.js";

@ApolloQuery
export class QueryResolver extends MediaType<Record<string, never>> {
  _media() {
    return true;
  }
}
