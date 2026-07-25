import { ApolloMutation } from "@shopana/type-resolver";
import { AppsType } from "./AppsType.js";

@ApolloMutation
export class MutationResolver extends AppsType<Record<string, never>> {
  appsMutation() {
    return new AppsMutationResolver({}, this.$ctx);
  }
}

/**
 * Namespace resolver. Domain mutation fields are added here as they are implemented.
 */
export class AppsMutationResolver extends AppsType<Record<string, never>> {}
