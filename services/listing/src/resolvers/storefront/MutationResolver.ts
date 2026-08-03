import { ApolloMutation } from "@shopana/type-resolver";
import { ListingType } from "./ListingType.js";

@ApolloMutation
export class MutationResolver extends ListingType<Record<string, never>> {
  _listing() {
    return true;
  }
}
