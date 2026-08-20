import { Injectable } from "@nestjs/common";
import type {
  AppActionHandler,
  AppActionMetadata,
  AppBroker,
  AppDurableContextRef,
  AppExecutionContext,
  AppIdempotencyContext,
  AppInstallationContextProvider,
  AppManifest,
  AppSaga,
  AppWorkflow,
  AppWorkflowInvocation,
  AppWorkflowStartOptions,
} from "@shopana/app-sdk";
import type {
  IdempotencyContext,
  ServiceBroker,
  WorkflowStartOptions,
} from "@shopana/shared-kernel";
import { AppContextRunner } from "./AppContextRunner.js";
import { assertAppOutboundContractAllowed } from "./AppManifestContracts.js";
import { AppOutboundAuthorizationError } from "./AppOutboundAuthorizationError.js";
import { AppWorkflowActivation } from "./AppWorkflowActivation.js";

interface CreateAppBrokerInput {
  readonly appCode: string;
  readonly appVersion: string;
  readonly manifest: AppManifest;
  readonly broker: ServiceBroker;
  readonly contextRunner: AppContextRunner;
  readonly installations: AppInstallationContextProvider;
}

interface FacadeRegistration {
  readonly actions: Set<string>;
  readonly workflows: Set<string>;
}

@Injectable()
export class AppBrokerFacadeFactory {
  private readonly registrations = new Map<string, FacadeRegistration>();

  create(input: CreateAppBrokerInput): AppBroker {
    if (this.registrations.has(input.appCode)) {
      throw new Error(`App broker "${input.appCode}" already exists`);
    }

    const registration: FacadeRegistration = {
      actions: new Set(),
      workflows: new Set(),
    };
    this.registrations.set(input.appCode, registration);

    const qualifyLocal = (name: string): string => {
      const localName = name.trim();
      if (!localName || localName.includes(".")) {
        throw new Error(`App "${input.appCode}" contract must be a non-empty local name`);
      }
      return `apps.${input.appCode}.${localName}`;
    };

    const currentContext = (): Readonly<AppExecutionContext> => {
      const context = input.contextRunner.current();
      if (context.appCode !== input.appCode) {
        throw new Error(
          `App context mismatch: expected "${input.appCode}", received "${context.appCode}"`,
        );
      }
      if (context.appVersion !== input.appVersion) {
        throw new Error(
          `App version mismatch: expected "${input.appVersion}", received "${context.appVersion}"`,
        );
      }
      return context;
    };

    const toDurableContextRef = (context: Readonly<AppExecutionContext>): AppDurableContextRef =>
      Object.freeze({
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

    const registerDurableContract = (
      kind: "workflow" | "saga",
      name: string,
      workflow: AppWorkflow | AppSaga,
    ): void => {
      const qualifiedName = qualifyLocal(name);
      if (registration.workflows.has(qualifiedName)) {
        throw new Error(
          `${kind === "workflow" ? "Workflow" : "Saga"} "${qualifiedName}" already registered`,
        );
      }
      const instanceName = ["App", input.appCode, kind, name]
        .join("_")
        .replace(/[^A-Za-z0-9_]/g, "_");
      const activation = new AppWorkflowActivation({
        instanceName,
        manifest: input.manifest,
        workflow,
        installations: input.installations,
        contextRunner: input.contextRunner,
      });
      input.broker.getWorkflowRegistry().register(qualifiedName, activation);
      registration.workflows.add(qualifiedName);
    };

    return Object.freeze({
      register: <TParams = unknown, TResult = unknown>(
        action: string,
        handler: AppActionHandler<TParams, TResult>,
        metadata?: AppActionMetadata,
      ): void => {
        const qualifiedName = qualifyLocal(action);
        if (registration.actions.has(qualifiedName)) {
          throw new Error(`Action "${qualifiedName}" already registered`);
        }

        input.broker.register<TParams, TResult>(
          qualifiedName,
          (params, context) => {
            if (!context.app) {
              throw new Error(
                `App action "${qualifiedName}" requires trusted installation context`,
              );
            }
            if (context.app.appCode !== input.appCode) {
              throw new Error(
                `App action "${qualifiedName}" received context for "${context.app.appCode}"`,
              );
            }
            return input.contextRunner.run(context.app, () => handler(params, context));
          },
          metadata,
        );
        registration.actions.add(qualifiedName);
      },
      registerWorkflow: (name: string, workflow: AppWorkflow): void => {
        registerDurableContract("workflow", name, workflow);
      },
      registerSaga: (name: string, saga: AppSaga): void => {
        registerDurableContract("saga", name, saga);
      },
      call: <TResult = unknown, TParams = unknown>(
        qualifiedAction: string,
        params?: TParams,
      ): Promise<TResult> => {
        const context = currentContext();
        assertAppOutboundContractAllowed(input.manifest, qualifiedAction, context.grantedScopes);
        if (
          context.executionKind === "COMMERCE_FUNCTION" &&
          input.broker.getActionMetadata(qualifiedAction)?.readOnly !== true
        ) {
          throw new AppOutboundAuthorizationError(
            `Commerce Function cannot call mutating or unclassified action "${qualifiedAction}"`,
          );
        }
        return input.broker.callAsApp<TResult, TParams>(qualifiedAction, params, context);
      },
      runWorkflow: <TResult = unknown, TParams = unknown>(
        qualifiedWorkflow: string,
        params: TParams,
        idempotency: AppIdempotencyContext,
        options?: AppWorkflowStartOptions,
      ): Promise<TResult> => {
        const context = currentContext();
        if (context.executionKind === "COMMERCE_FUNCTION") {
          throw new AppOutboundAuthorizationError(
            `Commerce Function cannot start workflow "${qualifiedWorkflow}"`,
          );
        }
        assertAppOutboundContractAllowed(input.manifest, qualifiedWorkflow, context.grantedScopes);
        const invocation: AppWorkflowInvocation<TParams> = Object.freeze({
          context: toDurableContextRef(context),
          input: params,
        });
        return input.broker.runWorkflow<TResult, AppWorkflowInvocation<TParams>>(
          qualifiedWorkflow,
          invocation,
          idempotency as IdempotencyContext,
          options as WorkflowStartOptions,
        );
      },
    } satisfies AppBroker);
  }

  async release(appCode: string, broker: ServiceBroker): Promise<void> {
    const registration = this.registrations.get(appCode);
    if (!registration) {
      return;
    }

    for (const workflow of registration.workflows) {
      broker.getWorkflowRegistry().deregister(workflow);
    }
    for (const action of registration.actions) {
      broker.deregister(action);
    }
    this.registrations.delete(appCode);
  }
}
