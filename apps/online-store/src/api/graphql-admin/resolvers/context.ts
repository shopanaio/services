import type {
  AppExecutionContext,
  AppGraphQLHandlerContext,
} from "@shopana/app-sdk";
import {
  adminContextAllows,
  type AdminContextClaims,
} from "@shopana/shared-context";
import { GraphQLError } from "graphql";
import { OnlineStoreRepository } from "../../../content/repositories/index.js";
import { OnlineStoreLoader } from "../loaders/index.js";

export interface OnlineStoreResolverContext {
  readonly app: Readonly<AppExecutionContext>;
  readonly repository: OnlineStoreRepository;
  readonly loaders: OnlineStoreLoader;
  readonly locale: string;
}

export function assertOnlineStoreAdminAccess(
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

export function createOnlineStoreResolverContext(
  context: AppGraphQLHandlerContext,
): OnlineStoreResolverContext {
  const admin = context.adminContext as AdminContextClaims | undefined;
  if (!admin?.store) {
    throw new GraphQLError("Verified admin store context is required", {
      extensions: { code: "UNAUTHENTICATED" },
    });
  }
  const repository = OnlineStoreRepository.create(context.host.databaseClient);
  const locale = admin.store.defaultLocale;
  return Object.freeze({
    app: context.app,
    repository,
    loaders: new OnlineStoreLoader(repository, {
      installationId: context.app.installationId,
      storeId: context.app.storeId,
    }, locale),
    locale,
  });
}
