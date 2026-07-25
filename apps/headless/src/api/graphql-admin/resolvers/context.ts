import type {
  AppGraphQLHandlerContext,
  AppExecutionContext,
} from "@shopana/app-sdk";
import { HeadlessStorefrontRepository } from "../../../storefront-access/repositories/index.js";

export interface HeadlessResolverContext {
  readonly app: Readonly<AppExecutionContext>;
  readonly repository: HeadlessStorefrontRepository;
}

export function createHeadlessResolverContext(
  context: AppGraphQLHandlerContext,
): HeadlessResolverContext {
  return Object.freeze({
    app: context.app,
    repository: HeadlessStorefrontRepository.create(
      context.host.databaseClient,
    ),
  });
}
