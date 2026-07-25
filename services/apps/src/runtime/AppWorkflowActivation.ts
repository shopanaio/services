import type {
  AppDurableContextRef,
  AppExecutionContext,
  AppInstallationContextProvider,
  AppManifest,
  AppWorkflow,
  AppWorkflowInvocation,
} from "@shopana/app-sdk";
import {
  ConfiguredInstance,
  FatalError,
  Workflow,
} from "@shopana/shared-kernel";
import { AppContextRunner } from "./AppContextRunner.js";
import { restrictGrantedScopes } from "./AppManifestContracts.js";

interface AppWorkflowActivationInput {
  readonly instanceName: string;
  readonly manifest: AppManifest;
  readonly workflow: AppWorkflow;
  readonly installations: AppInstallationContextProvider;
  readonly contextRunner: AppContextRunner;
}

export class AppWorkflowActivation extends ConfiguredInstance {
  private readonly manifest: AppManifest;
  private readonly workflow: AppWorkflow;
  private readonly installations: AppInstallationContextProvider;
  private readonly contextRunner: AppContextRunner;

  constructor(input: AppWorkflowActivationInput) {
    super(input.instanceName);
    this.manifest = input.manifest;
    this.workflow = input.workflow;
    this.installations = input.installations;
    this.contextRunner = input.contextRunner;
  }

  @Workflow("appActivation")
  async run(invocation: AppWorkflowInvocation<unknown>): Promise<unknown> {
    const reference = this.assertInvocation(invocation);
    const resolved = await this.installations.resolve({
      appCode: reference.appCode,
      installationId: reference.installationId,
      appVersion: reference.appVersion,
      operationId: reference.operationId,
    });
    const context = this.restoreContext(reference, resolved);
    return this.contextRunner.run(context, () =>
      this.workflow.run(invocation.input),
    );
  }

  private assertInvocation(
    invocation: AppWorkflowInvocation<unknown>,
  ): AppDurableContextRef {
    if (
      !invocation ||
      typeof invocation !== "object" ||
      !invocation.context ||
      invocation.context.schemaVersion !== 1
    ) {
      throw new FatalError(
        "Invalid App workflow invocation",
        undefined,
        "APP_WORKFLOW_CONTEXT_INVALID",
      );
    }
    const reference = invocation.context;
    if (
      reference.appCode !== this.manifest.code ||
      reference.appVersion !== this.manifest.version ||
      !reference.installationId ||
      !reference.organizationId ||
      !reference.storeId
    ) {
      throw new FatalError(
        "App workflow durable context does not match its runtime",
        undefined,
        "APP_WORKFLOW_CONTEXT_MISMATCH",
      );
    }
    return reference;
  }

  private restoreContext(
    reference: AppDurableContextRef,
    resolved: Readonly<AppExecutionContext>,
  ): Readonly<AppExecutionContext> {
    if (
      resolved.appCode !== reference.appCode ||
      resolved.appVersion !== reference.appVersion ||
      resolved.installationId !== reference.installationId ||
      resolved.organizationId !== reference.organizationId ||
      resolved.storeId !== reference.storeId
    ) {
      throw new FatalError(
        "Resolved App installation does not match durable context",
        undefined,
        "APP_INSTALLATION_CONTEXT_MISMATCH",
      );
    }

    return Object.freeze({
      ...resolved,
      operationId: reference.operationId,
      actor: reference.actor,
      correlationId: reference.correlationId,
      grantedScopes: restrictGrantedScopes(
        this.manifest,
        resolved.grantedScopes,
      ),
    });
  }
}
