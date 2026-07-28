import {
  GlobalIdEntity,
  type GlobalIdType,
} from "@shopana/shared-graphql-guid";
import {
  ApolloQuery,
  TypePolicy,
} from "@shopana/type-resolver";
import { AppsType } from "./AppsType.js";
import type {
  AppsQueryAppDefinitionArgs,
  AppsQueryAppsArgs,
  AppsQueryAppInstallationArgs,
  AppsQueryAppLifecycleOperationArgs,
} from "./generated/types.js";

@ApolloQuery
export class QueryResolver extends AppsType<Record<string, never>> {
  appsQuery() {
    return new AppsQueryResolver({}, this.$ctx);
  }
}

@TypePolicy<AppsQueryResolver>({
  resource: "store.apps",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
})
export class AppsQueryResolver extends AppsType<Record<string, never>> {
  appDefinition(args: AppsQueryAppDefinitionArgs) {
    const appCode = args.code;
    return appCode && this.$ctx.runtimes.get(appCode)
      ? this.resolvers.appDefinition(appCode)
      : null;
  }

  apps(args: AppsQueryAppsArgs = {}) {
    return this.resolvers.appConnection({
      first: args.first ?? undefined,
      after: args.after ?? undefined,
      last: args.last ?? undefined,
      before: args.before ?? undefined,
      where: args.where ?? undefined,
      orderBy: args.orderBy ?? undefined,
    });
  }

  async appInstallation(args: AppsQueryAppInstallationArgs) {
    const id = this.safeDecodeId(
      args.id,
      GlobalIdEntity.AppInstallation,
    );
    if (!id) {
      return null;
    }
    const installation = await this.$ctx.loaders.installation.load(id);
    return installation
      ? this.resolvers.appInstallation(installation.id)
      : null;
  }

  async appLifecycleOperation(
    args: AppsQueryAppLifecycleOperationArgs,
  ) {
    const id = this.safeDecodeId(
      args.id,
      GlobalIdEntity.AppLifecycleOperation,
    );
    if (!id) {
      return null;
    }
    const operation =
      await this.$ctx.loaders.lifecycleOperation.load(id);
    return operation
      ? this.resolvers.appLifecycleOperation(operation.id)
      : null;
  }

  private safeDecodeId(
    globalId: string,
    expectedType: GlobalIdType,
  ): string | null {
    try {
      return this.decodeId(globalId, expectedType);
    } catch {
      return null;
    }
  }
}
