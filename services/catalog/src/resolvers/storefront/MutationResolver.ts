import { ApolloMutation } from "@shopana/type-resolver";
import { CatalogType } from "./CatalogType.js";

@ApolloMutation
export class MutationResolver extends CatalogType<Record<string, never>> {
  _catalog() {
    return true;
  }
}
