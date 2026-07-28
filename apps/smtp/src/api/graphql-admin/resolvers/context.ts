import type {
  AppExecutionContext,
  AppGraphQLHandlerContext,
} from "@shopana/app-sdk";
import {
  adminContextAllows,
  type AdminContextClaims,
} from "@shopana/shared-context";
import { GraphQLError } from "graphql";
import {
  SmtpConnectionService,
  SmtpCredentialCrypto,
  SmtpRepository,
} from "../../../connections/index.js";
import { parseSmtpDeploymentPolicy } from "../../../configuration.js";

export interface SmtpResolverContext {
  readonly app: Readonly<AppExecutionContext>;
  readonly repository: SmtpRepository;
  readonly connections: SmtpConnectionService;
}

export function assertSmtpAdminAccess(
  context: AppGraphQLHandlerContext,
  action: "read" | "write",
): void {
  const admin = context.adminContext as AdminContextClaims | undefined;
  const store = admin?.store;
  if (
    !admin ||
    !store ||
    store.id !== context.app.storeId ||
    store.organizationId !== context.app.organizationId ||
    admin.organizationId !== context.app.organizationId
  ) {
    throw new GraphQLError("Verified admin context is required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  if (
    !adminContextAllows(admin, {
      domain: `store:${store.id}`,
      resource: "store.apps",
      action,
    })
  ) {
    throw new GraphQLError("Access denied", {
      extensions: { code: "FORBIDDEN" },
    });
  }
}

export function createSmtpResolverContext(
  context: AppGraphQLHandlerContext,
): SmtpResolverContext {
  const repository = SmtpRepository.create(context.host.databaseClient);
  return Object.freeze({
    app: context.app,
    repository,
    connections: new SmtpConnectionService(
      repository,
      SmtpCredentialCrypto.fromEnvironment(),
      parseSmtpDeploymentPolicy(context.host.config),
    ),
  });
}
