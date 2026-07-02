import { ApolloQuery } from "@shopana/type-resolver";
import { ListingType } from "./ListingType.js";

@ApolloQuery
export class QueryResolver extends ListingType<Record<string, never>> {
  listingQuery() {
    return new ListingQueryResolver({}, this.$ctx);
  }
}

export class ListingQueryResolver extends ListingType<Record<string, never>> {
  node(_args: { id: string }) {
    return null;
  }

  nodes(args: { ids: string[] }) {
    return args.ids.map(() => null);
  }
}
