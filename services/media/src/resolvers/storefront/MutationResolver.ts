import { ApolloMutation } from "@shopana/type-resolver";
import { MediaType } from "./MediaType.js";

@ApolloMutation
export class MutationResolver extends MediaType<Record<string, never>> {
  _media() {
    return true;
  }
}
