import { ApolloMutation } from "@shopana/type-resolver";
import { ListingType } from "./ListingType.js";

@ApolloMutation
export class MutationResolver extends ListingType<Record<string, never>> {
  listingMutation() {
    return new ListingMutationResolver({}, this.$ctx);
  }
}

export class ListingMutationResolver extends ListingType<Record<string, never>> {
  _empty() {
    return true;
  }
}
