import { Inject, Injectable } from "@nestjs/common";
import type {
  AppInstallationContextProvider,
  AppInvocationContextRef,
} from "@shopana/app-sdk";
import {
  InjectBroker,
  type ServiceBroker,
} from "@shopana/shared-kernel";
import { AppRuntimeRegistry } from "./AppRuntimeRegistry.js";
import { APP_INSTALLATION_CONTEXT_PROVIDER } from "./AppInstallationContextProvider.js";
import {
  getExternallyRoutableActions,
  restrictGrantedScopes,
} from "./AppManifestContracts.js";

@Injectable()
export class AppsRuntimeRouter {
  constructor(
    @InjectBroker("apps") private readonly broker: ServiceBroker,
    private readonly registry: AppRuntimeRegistry,
    @Inject(APP_INSTALLATION_CONTEXT_PROVIDER)
    private readonly installations: AppInstallationContextProvider,
  ) {}

  async invoke<TResult = unknown, TInput = unknown>(
    appCode: string,
    action: string,
    input: TInput,
    contextRef: Readonly<AppInvocationContextRef>,
  ): Promise<TResult> {
    const runtime = this.registry.get(appCode);
    if (!runtime || runtime.status !== "READY") {
      throw new Error(`App runtime "${appCode}" is not ready`);
    }
    if (!contextRef.installationId) {
      throw new Error("App installation reference is required");
    }

    const localAction = action.trim();
    if (!localAction || localAction.includes(".")) {
      throw new Error("App action must be a non-empty local name");
    }
    if (
      !getExternallyRoutableActions(
        runtime.definition.manifest,
      ).has(localAction)
    ) {
      throw new Error(
        `App action "${localAction}" is not declared as an external contract`,
      );
    }

    const context = await this.installations.resolve({
      appCode,
      installationId: contextRef.installationId,
      appVersion: runtime.definition.manifest.version,
      operationId: contextRef.operationId,
    });
    if (
      context.appCode !== appCode ||
      context.appVersion !== runtime.definition.manifest.version ||
      context.installationId !== contextRef.installationId ||
      !context.organizationId ||
      !context.storeId
    ) {
      throw new Error("Resolved App installation context is invalid");
    }

    return this.broker.callAsApp<TResult, TInput>(
      `apps.${appCode}.${localAction}`,
      input,
      Object.freeze({
        ...context,
        correlationId: contextRef.correlationId ?? context.correlationId,
        grantedScopes: restrictGrantedScopes(
          runtime.definition.manifest,
          context.grantedScopes,
        ),
      }),
    );
  }
}
