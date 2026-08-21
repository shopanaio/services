import type { Apps } from "@shopana/broker-types";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { ApolloMutation } from "@shopana/type-resolver";
import {
  assertAppsAuthorized,
  type AppsAuthorizationOperation,
} from "../../api/graphql-admin/authorization.js";
import { toAppsUserErrors } from "../../api/graphql-admin/userErrors.js";
import { AppsType } from "./AppsType.js";
import {
  AppConfigureInputSchema,
  AppInstallInputSchema,
  AppInstallationActionInputSchema,
  AppUpdateInputSchema,
} from "./generated/schemas.js";
import type {
  AppInstallInput,
  AppInstallationActionInput,
  AppUpdateInput,
  AppsMutationAppConfigureArgs,
  AppsMutationAppInstallArgs,
  AppsMutationAppResumeArgs,
  AppsMutationAppSuspendArgs,
  AppsMutationAppUninstallArgs,
  AppsMutationAppUpdateArgs,
} from "./generated/types.js";

@ApolloMutation
export class MutationResolver extends AppsType<Record<string, never>> {
  appsMutation() {
    return new AppsMutationResolver({}, this.$ctx);
  }
}

export class AppsMutationResolver extends AppsType<Record<string, never>> {
  appInstall(args: AppsMutationAppInstallArgs) {
    return this.lifecyclePayload("APP_INSTALL_FAILED", async () => {
      await this.authorize("install");
      const input = AppInstallInputSchema().parse(args.input);
      return this.$ctx.broker.call<Apps.AppLifecycleAcceptedResult, Apps.InstallAppParams>(
        "apps.installApp",
        {
          appCode: input.appCode,
          organizationId: this.$ctx.store.organizationId,
          storeId: this.$ctx.store.id,
          configuration: input.configuration ?? undefined,
          grantedScopes: input.grantedScopes ?? undefined,
          secrets: secretsToRecord(input.secrets),
          installedByUserId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
          idempotencyKey: this.$ctx.requestId,
          correlationId: this.$ctx.requestId,
        },
        { adminContext: this.$ctx.adminContext },
      );
    });
  }

  appUpdate(args: AppsMutationAppUpdateArgs) {
    return this.lifecyclePayload("APP_UPDATE_FAILED", async () => {
      await this.authorize("configure");
      const input = AppUpdateInputSchema().parse(args.input);
      return this.$ctx.broker.call<Apps.AppLifecycleAcceptedResult, Apps.UpdateAppParams>(
        "apps.updateApp",
        {
          installationId: this.decodeInstallationId(input.installationId),
          storeId: this.$ctx.store.id,
          configuration: input.configuration ?? undefined,
          grantedScopes: input.grantedScopes ?? undefined,
          secrets: secretsToRecord(input.secrets),
          idempotencyKey: this.$ctx.requestId,
          userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
          correlationId: this.$ctx.requestId,
        },
        { adminContext: this.$ctx.adminContext },
      );
    });
  }

  async appConfigure(args: AppsMutationAppConfigureArgs) {
    try {
      await this.authorize("configure");
      const input = AppConfigureInputSchema().parse(args.input);
      const installationId = this.decodeInstallationId(input.installationId);
      await this.validateGrantedScopes(installationId, input.grantedScopes ?? undefined);
      const installation = await this.$ctx.installations.configure({
        installationId,
        configuration: input.configuration,
        grantedScopes: input.grantedScopes ?? undefined,
      });

      return {
        installation: await this.resolvers.appInstallation(installation.id),
        userErrors: [],
      };
    } catch (error) {
      return {
        installation: null,
        userErrors: toAppsUserErrors(error, "APP_CONFIGURE_FAILED"),
      };
    }
  }

  appSuspend(args: AppsMutationAppSuspendArgs) {
    return this.installationActionPayload(
      args.input,
      "configure",
      "apps.suspendApp",
      "APP_SUSPEND_FAILED",
    );
  }

  appResume(args: AppsMutationAppResumeArgs) {
    return this.installationActionPayload(
      args.input,
      "configure",
      "apps.resumeApp",
      "APP_RESUME_FAILED",
    );
  }

  appUninstall(args: AppsMutationAppUninstallArgs) {
    return this.installationActionPayload(
      args.input,
      "uninstall",
      "apps.uninstallApp",
      "APP_UNINSTALL_FAILED",
    );
  }

  private installationActionPayload(
    rawInput: AppInstallationActionInput,
    authorization: AppsAuthorizationOperation,
    action: "apps.suspendApp" | "apps.resumeApp" | "apps.uninstallApp",
    fallbackCode: string,
  ) {
    return this.lifecyclePayload(fallbackCode, async () => {
      await this.authorize(authorization);
      const input = AppInstallationActionInputSchema().parse(rawInput);
      const params = {
        installationId: this.decodeInstallationId(input.installationId),
        storeId: this.$ctx.store.id,
        idempotencyKey: this.$ctx.requestId,
        userId: this.$ctx.hasUser ? this.$ctx.user.id : undefined,
        correlationId: this.$ctx.requestId,
      };
      return this.$ctx.broker.call<
        Apps.AppLifecycleAcceptedResult,
        Apps.SuspendAppParams | Apps.ResumeAppParams | Apps.UninstallAppParams
      >(action, params, { adminContext: this.$ctx.adminContext });
    });
  }

  private async lifecyclePayload(
    fallbackCode: string,
    action: () => Promise<Apps.AppLifecycleAcceptedResult>,
  ) {
    try {
      const accepted = await action();
      const [installation, operation] = await Promise.all([
        this.resolvers.appInstallation(accepted.installationId),
        this.resolvers.appLifecycleOperation(accepted.operationId),
      ]);
      return {
        installation,
        operation,
        userErrors: [],
      };
    } catch (error) {
      return {
        installation: null,
        operation: null,
        userErrors: toAppsUserErrors(error, fallbackCode),
      };
    }
  }

  private authorize(operation: AppsAuthorizationOperation): Promise<void> {
    return assertAppsAuthorized(this.authProvider, this.$ctx, operation);
  }

  private decodeInstallationId(globalId: string): string {
    try {
      return this.decodeId(globalId, GlobalIdEntity.AppInstallation);
    } catch {
      throw new Error("installationId is invalid");
    }
  }

  private async validateGrantedScopes(
    installationId: string,
    scopes: readonly string[] | undefined,
  ): Promise<void> {
    if (scopes === undefined) {
      return;
    }
    const installation = await this.$ctx.repository.installation.findByIdForStore(installationId);
    if (!installation) {
      throw new Error(`App installation "${installationId}" not found`);
    }
    const runtime = this.$ctx.runtimes.get(installation.appCode);
    if (!runtime) {
      throw new Error(`App runtime "${installation.appCode}" is not registered`);
    }
    const declared = new Set(runtime.definition.manifest.permissions);
    const unknown = [...new Set(scopes)].filter((scope) => !declared.has(scope));
    if (unknown.length > 0) {
      throw new Error(
        `App "${installation.appCode}" cannot receive undeclared scopes: ${unknown.join(", ")}`,
      );
    }
  }
}

function secretsToRecord(
  secrets: AppInstallInput["secrets"] | AppUpdateInput["secrets"],
): Record<string, string> | undefined {
  if (!secrets) {
    return undefined;
  }
  return Object.fromEntries(secrets.map(({ name, value }) => [name, value]));
}
