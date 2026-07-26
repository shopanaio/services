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
  AppsQueryAppInstallationArgs,
  AppsQueryAppInstallationsArgs,
  AppsQueryAppLifecycleOperationArgs,
  AppsQueryAvailableAppsArgs,
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

  async availableApps(args: AppsQueryAvailableAppsArgs) {
    const runtimes = [...this.$ctx.runtimes.list()].sort((left, right) =>
      left.definition.manifest.code.localeCompare(
        right.definition.manifest.code,
      ),
    );
    const installedFilter = args.where?.installed;
    const selected =
      installedFilter == null
        ? runtimes
        : (
            await Promise.all(
              runtimes.map(async (runtime) => ({
                runtime,
                installation:
                  await this.$ctx.loaders.installationByAppCode.load(
                    runtime.definition.manifest.code,
                  ),
              })),
            )
          )
            .filter(
              ({ installation }) =>
                Boolean(installation) === installedFilter,
            )
            .map(({ runtime }) => runtime);

    return Promise.all(
      selected.map((runtime) =>
        this.resolvers.appDefinition(runtime.definition.manifest.code),
      ),
    );
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

  appInstallations(args: AppsQueryAppInstallationsArgs) {
    return this.resolvers.appInstallationConnection({
      first: args.first ?? undefined,
      after: args.after ?? undefined,
      last: args.last ?? undefined,
      before: args.before ?? undefined,
      where: args.where ?? undefined,
      orderBy: args.orderBy ?? undefined,
    });
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
