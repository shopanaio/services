import { Inject, Injectable } from "@nestjs/common";
import type {
  AppDurableContextRef,
  AppInstallationContextProvider,
  AppInvocationContextRef,
  AppWorkflowInvocation,
  AppIdempotencyContext,
  AppWorkflowStartOptions,
} from "@shopana/app-sdk";
import {
  InjectBroker,
  type ServiceBroker,
} from "@shopana/shared-kernel";
import { AppRuntimeRegistry } from "./AppRuntimeRegistry.js";
import { APP_INSTALLATION_CONTEXT_PROVIDER } from "./AppInstallationContextProvider.js";
import {
  getExternallyRoutableActions,
  getExternallyRoutableWorkflows,
  restrictGrantedScopes,
} from "./AppManifestContracts.js";
import { AppRuntimeInvocationError } from "./AppRuntimeInvocationError.js";

export interface PreparedAppWorkflowInvocation {
  readonly workflowName: string;
  readonly invocation: AppWorkflowInvocation<unknown>;
  readonly idempotency: AppIdempotencyContext;
  readonly options?: AppWorkflowStartOptions;
}

@Injectable()
export class AppsRuntimeRouter {
  constructor(
    @InjectBroker("apps") private readonly broker: ServiceBroker,
    @Inject(AppRuntimeRegistry)
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
      throw new AppRuntimeInvocationError(
        "APP_RUNTIME_UNAVAILABLE",
      );
    }
    if (!contextRef.installationId) {
      throw new AppRuntimeInvocationError(
        "APP_ROUTE_UNAVAILABLE",
      );
    }

    const localAction = action.trim();
    if (!localAction || localAction.includes(".")) {
      throw new AppRuntimeInvocationError(
        "APP_ROUTE_UNAVAILABLE",
      );
    }
    if (
      !getExternallyRoutableActions(
        runtime.definition.manifest,
      ).has(localAction)
    ) {
      throw new AppRuntimeInvocationError(
        "APP_ROUTE_UNAVAILABLE",
      );
    }
    const qualifiedAction = `apps.${appCode}.${localAction}`;
    if (
      contextRef.executionKind === "COMMERCE_FUNCTION" &&
      this.broker.getActionMetadata(qualifiedAction)?.readOnly !== true
    ) {
      throw new AppRuntimeInvocationError(
        "APP_ACTION_NOT_READ_ONLY",
      );
    }

    const context = await (async () => {
      try {
        return await this.installations.resolve({
          appCode,
          installationId: contextRef.installationId,
          appVersion: runtime.definition.manifest.version,
          operationId: contextRef.operationId,
        });
      } catch (error) {
        throw new AppRuntimeInvocationError(
          "APP_ROUTE_UNAVAILABLE",
          error,
        );
      }
    })();
    if (
      context.appCode !== appCode ||
      context.appVersion !== runtime.definition.manifest.version ||
      context.installationId !== contextRef.installationId ||
      !context.organizationId ||
      !context.storeId
    ) {
      throw new AppRuntimeInvocationError(
        "APP_ROUTE_UNAVAILABLE",
      );
    }

    return this.broker.callAsApp<TResult, TInput>(
      qualifiedAction,
      input,
      Object.freeze({
        ...context,
        correlationId: contextRef.correlationId ?? context.correlationId,
        executionKind: contextRef.executionKind ?? "STANDARD",
        grantedScopes: restrictGrantedScopes(
          runtime.definition.manifest,
          context.grantedScopes,
        ),
      }),
    );
  }

  async runWorkflow<TResult = unknown, TInput = unknown>(
    appCode: string,
    workflow: string,
    input: TInput,
    contextRef: Readonly<AppInvocationContextRef>,
    idempotency: AppIdempotencyContext,
    options?: AppWorkflowStartOptions,
  ): Promise<TResult> {
    const prepared = await this.prepareWorkflow(
      appCode,
      workflow,
      input,
      contextRef,
      idempotency,
      options,
    );
    return this.runPreparedWorkflow<TResult>(prepared);
  }

  async prepareWorkflow<TInput = unknown>(
    appCode: string,
    workflow: string,
    input: TInput,
    contextRef: Readonly<AppInvocationContextRef>,
    idempotency: AppIdempotencyContext,
    options?: AppWorkflowStartOptions,
  ): Promise<PreparedAppWorkflowInvocation> {
    const runtime = this.registry.get(appCode);
    if (!runtime || runtime.status !== "READY") {
      throw new Error(`App runtime "${appCode}" is not ready`);
    }
    if (!contextRef.installationId || !contextRef.operationId) {
      throw new Error(
        "App lifecycle workflow requires installation and operation references",
      );
    }
    const localWorkflow = workflow.trim();
    if (
      !localWorkflow ||
      localWorkflow.includes(".") ||
      !getExternallyRoutableWorkflows(
        runtime.definition.manifest,
      ).has(localWorkflow)
    ) {
      throw new Error(
        `App workflow "${localWorkflow}" is not declared as a lifecycle contract`,
      );
    }

    const context = await this.resolveContext(
      appCode,
      runtime.definition.manifest.version,
      contextRef,
    );
    const durableContext: AppDurableContextRef = Object.freeze({
      schemaVersion: 1,
      appCode: context.appCode,
      installationId: context.installationId,
      organizationId: context.organizationId,
      storeId: context.storeId,
      appVersion: context.appVersion,
      operationId: context.operationId,
      actor: context.actor,
      correlationId: context.correlationId,
    });
    const invocation: AppWorkflowInvocation<TInput> = Object.freeze({
      context: durableContext,
      input,
    });
    return Object.freeze({
      workflowName: `apps.${appCode}.${localWorkflow}`,
      invocation,
      idempotency,
      options,
    });
  }

  runPreparedWorkflow<TResult = unknown>(
    prepared: PreparedAppWorkflowInvocation,
  ): Promise<TResult> {
    return this.broker.runWorkflow<TResult, AppWorkflowInvocation<unknown>>(
      prepared.workflowName,
      prepared.invocation,
      prepared.idempotency,
      prepared.options,
    );
  }

  private async resolveContext(
    appCode: string,
    appVersion: string,
    contextRef: Readonly<AppInvocationContextRef>,
  ) {
    const context = await this.installations.resolve({
      appCode,
      installationId: contextRef.installationId,
      appVersion,
      operationId: contextRef.operationId,
    });
    if (
      context.appCode !== appCode ||
      context.appVersion !== appVersion ||
      context.installationId !== contextRef.installationId ||
      !context.organizationId ||
      !context.storeId
    ) {
      throw new Error("Resolved App installation context is invalid");
    }
    return Object.freeze({
      ...context,
      correlationId: contextRef.correlationId ?? context.correlationId,
      grantedScopes: restrictGrantedScopes(
        this.registry.get(appCode)!.definition.manifest,
        context.grantedScopes,
      ),
    });
  }
}
