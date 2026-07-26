import type {
  AppGraphQLHandlerContext,
  AppExecutionContext,
} from "@shopana/app-sdk";
import { HeadlessStorefrontRepository } from "../../../storefront-access/repositories/index.js";
import {
  HeadlessStorefrontConnectionService,
  StorefrontAccessPolicyService,
  StorefrontCredentialCrypto,
  StorefrontCredentialService,
} from "../../../storefront-access/control-plane/index.js";
import { HEADLESS_STOREFRONT_DEFAULT_PERMISSIONS } from "../../../../app.manifest.js";

export interface HeadlessResolverContext {
  readonly app: Readonly<AppExecutionContext>;
  readonly repository: HeadlessStorefrontRepository;
  readonly connections: HeadlessStorefrontConnectionService;
  readonly policies: StorefrontAccessPolicyService;
  readonly credentials: StorefrontCredentialService;
}

export function createHeadlessResolverContext(
  context: AppGraphQLHandlerContext,
): HeadlessResolverContext {
  const repository = HeadlessStorefrontRepository.create(
    context.host.databaseClient,
  );
  const credentials = new StorefrontCredentialService(
    repository,
    StorefrontCredentialCrypto.fromEnvironment(),
  );
  const policies = new StorefrontAccessPolicyService(repository);
  return Object.freeze({
    app: context.app,
    repository,
    credentials,
    policies,
    connections: new HeadlessStorefrontConnectionService(
      repository,
      policies,
      credentials,
      HEADLESS_STOREFRONT_DEFAULT_PERMISSIONS,
    ),
  });
}
