import type { ShopanaAppDefinition } from "@shopana/app-sdk";
import {
  PreloadNotFoundError,
  TypePolicy,
} from "@shopana/type-resolver";
import { AppsType } from "./AppsType.js";

@TypePolicy<AppDefinitionResolver>({
  resource: "store.apps",
  action: "read",
  organizationId: (resolver) => resolver.$ctx.store.organizationId,
  domain: (resolver) => `store:${resolver.$ctx.store.id}`,
})
export class AppDefinitionResolver extends AppsType<
  string,
  ShopanaAppDefinition
> {
  $preload(): ShopanaAppDefinition {
    const runtime = this.$ctx.runtimes.get(this.$props);
    if (!runtime) {
      throw new PreloadNotFoundError(
        `App definition "${this.$props}" not found`,
      );
    }
    return runtime.definition;
  }

  code() {
    return this.$props;
  }

  async version() {
    return (await this.$data).manifest.version;
  }

  async displayName() {
    return (await this.$data).manifest.displayName;
  }

  async description() {
    return (await this.$data).manifest.description;
  }

  async icon() {
    const { manifest } = await this.$data;
    if (manifest.schemaVersion !== 2) {
      return {
        url: "/app-icons/default.svg",
        alt: manifest.displayName,
      };
    }
    return manifest.icon;
  }

  runtimeStatus() {
    return this.$ctx.runtimes.get(this.$props)?.status ?? "STOPPED";
  }

  async runtimeHealth() {
    const health = await this.$ctx.runtimes.health(this.$props);
    return {
      status: health.status.toUpperCase(),
      message: health.message ?? null,
    };
  }

  async permissions() {
    const [definition, installation] = await Promise.all([
      this.$data,
      this.$ctx.loaders.installationByAppCode.load(this.$props),
    ]);
    const grantedScopes = installation
      ? await this.$ctx.loaders.scopesByInstallation.load(installation.id)
      : [];
    const granted = new Set(
      grantedScopes
        .filter((scope) => scope.revokedAt === null)
        .map((scope) => scope.scope),
    );

    return definition.manifest.permissions.map((scope) => ({
      scope,
      granted: granted.has(scope),
    }));
  }

  async capabilities() {
    const { capabilities } = (await this.$data).manifest;
    return capabilities.map((capability) => ({
      key: capability.key,
      assignmentMode:
        (capability.assignmentMode ?? "store").toUpperCase(),
      operations: Object.entries(capability.operations).map(
        ([name, action]) => ({ name, action }),
      ),
    }));
  }

  async graphql() {
    return (await this.$data).manifest.graphql;
  }

  async installed() {
    return Boolean(
      await this.$ctx.loaders.installationByAppCode.load(this.$props),
    );
  }

  async installation() {
    const installation =
      await this.$ctx.loaders.installationByAppCode.load(this.$props);
    return installation
      ? this.resolvers.appInstallation(installation.id)
      : null;
  }
}
