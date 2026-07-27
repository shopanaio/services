import { Inject, Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import {
  ActionHandler,
  ActionRegistry,
  type ActionMetadata,
} from './ActionRegistry';
import type {
  BrokerAppContext,
  BrokerCallContext,
} from './BrokerCallContext.js';
import {
  WORKFLOW_REGISTRY,
  type WorkflowRegistry,
  type IdempotencyContext,
  type SagaResult,
  type WorkflowExecutionContext,
  type WorkflowStartOptions,
} from '@shopana/dbos';
import {
  AuthorizationError,
  authorizePoliciesWithAdminContext,
  hasPolicies,
} from '../decorators/Authorize.js';
import type { BrokerWorkflowStartOptions } from './WorkflowAuthorization.js';

export interface ServiceBrokerOptions {
  serviceName: string;
}

@Injectable()
export class ServiceBroker implements OnModuleDestroy {
  private readonly logger = new Logger(ServiceBroker.name);
  private readonly localActions = new Set<string>();
  private inFlight = 0;

  constructor(
    private readonly registry: ActionRegistry,
    private readonly options: ServiceBrokerOptions,
    @Optional()
    @Inject(WORKFLOW_REGISTRY)
    private readonly workflowRegistry: WorkflowRegistry | null = null,
  ) {}

  /**
   * Registers a new action and keeps tracking for cleanup.
   */
  register<TParams = unknown, TResult = unknown>(
    action: string,
    handler: ActionHandler<TParams, TResult>,
    metadata?: ActionMetadata,
  ): void {
    const qualifiedAction = this.qualifyAction(action);
    this.registry.register(qualifiedAction, handler as ActionHandler, metadata);
    this.localActions.add(qualifiedAction);
    this.logger.debug(`Registered action: ${qualifiedAction}`);
  }

  /**
   * Calls a registered action using fully-qualified name.
   */
  async call<TResult = unknown, TParams = unknown>(
    action: string,
    params?: TParams,
  ): Promise<TResult> {
    const context = this.createCallContext({
      kind: 'action',
      service: this.options.serviceName,
    });
    return this.invoke<TResult, TParams>(action, params, context);
  }

  /**
   * Calls an action with host-owned App provenance.
   * This API is intended for the apps-service facade, not App packages.
   */
  async callAsApp<TResult = unknown, TParams = unknown>(
    action: string,
    params: TParams | undefined,
    app: Readonly<BrokerAppContext>,
  ): Promise<TResult> {
    if (this.options.serviceName !== 'apps') {
      throw new Error('Only apps service can create App broker calls');
    }
    const context = this.createCallContext(
      {
        kind: 'action',
        service: this.options.serviceName,
      },
      app,
    );
    return this.invoke<TResult, TParams>(action, params, context);
  }

  /**
   * Dispatch an event handler with the persisted event producer as caller.
   * Only the events service may create event caller contexts.
   */
  async callEvent<TResult = unknown, TParams = unknown>(
    action: string,
    params: TParams,
    producerService: string,
  ): Promise<TResult> {
    if (this.options.serviceName !== 'events') {
      throw new Error('Only events service can dispatch event broker calls');
    }
    const service = producerService.trim();
    if (!service) {
      throw new Error('Event producer service is required');
    }
    return this.invoke<TResult, TParams>(
      action,
      params,
      this.createCallContext({ kind: 'event', service }),
    );
  }

  private async invoke<TResult, TParams>(
    action: string,
    params: TParams | undefined,
    context: BrokerCallContext,
  ): Promise<TResult> {
    const qualifiedAction = this.assertFullyQualified(action);
    const handler = this.registry.resolve<TParams, TResult>(qualifiedAction);

    this.inFlight++;
    try {
      return (await handler(params, context)) as TResult;
    } finally {
      this.inFlight--;
    }
  }

  private createCallContext(
    caller: BrokerCallContext['caller'],
    app?: Readonly<BrokerAppContext>,
  ): BrokerCallContext {
    return Object.freeze({
      caller: Object.freeze(caller),
      ...(app ? { app: Object.freeze(app) } : {}),
    });
  }

  /**
   * Deregisters one action owned by a hosted component.
   */
  deregister(action: string): void {
    const qualifiedAction = this.assertFullyQualified(action);
    if (!this.localActions.has(qualifiedAction)) {
      return;
    }
    this.registry.deregister(qualifiedAction);
    this.localActions.delete(qualifiedAction);
  }

  /**
   * Returns metadata for a registered action.
   */
  getActionMetadata(action: string): ActionMetadata | undefined {
    const qualifiedAction = this.assertFullyQualified(action);
    return this.registry.getMetadata(qualifiedAction);
  }

  /**
   * Returns true if an action is registered.
   */
  hasAction(action: string): boolean {
    const qualifiedAction = this.assertFullyQualified(action);
    return this.registry.has(qualifiedAction);
  }

  /**
   * Execute workflow and wait for result.
   */
  async runWorkflow<TResult = unknown, TParams = unknown>(
    workflow: string,
    params: TParams,
    idempotencyCtx: IdempotencyContext,
    options?: BrokerWorkflowStartOptions,
  ): Promise<TResult> {
    if (!this.workflowRegistry) {
      throw new Error(
        'WorkflowRegistry not available. Import WorkflowModule.forRoot() in your app module.'
      );
    }

    const qualifiedWorkflow = this.assertFullyQualified(workflow);
    const trustedParams = this.withTrustedWorkflowCaller(
      qualifiedWorkflow,
      params,
    );
    const prepared = await this.prepareWorkflowStart(
      qualifiedWorkflow,
      trustedParams,
      options,
    );
    const handle = await this.workflowRegistry.start<TParams, TResult>(
      qualifiedWorkflow,
      trustedParams,
      idempotencyCtx,
      prepared.options,
      prepared.context,
    );
    return handle.getResult();
  }

  /**
   * Start workflow and return as soon as DBOS has durably accepted it.
   */
  async startWorkflow<TParams = unknown>(
    workflow: string,
    params: TParams,
    idempotencyCtx: IdempotencyContext,
    options?: BrokerWorkflowStartOptions,
  ): Promise<{ workflowId: string; status: 'started' }> {
    if (!this.workflowRegistry) {
      throw new Error(
        'WorkflowRegistry not available. Import WorkflowModule.forRoot() in your app module.'
      );
    }

    const qualifiedWorkflow = this.assertFullyQualified(workflow);
    const trustedParams = this.withTrustedWorkflowCaller(
      qualifiedWorkflow,
      params,
    );
    const prepared = await this.prepareWorkflowStart(
      qualifiedWorkflow,
      trustedParams,
      options,
    );
    const handle = await this.workflowRegistry.start<TParams, unknown>(
      qualifiedWorkflow,
      trustedParams,
      idempotencyCtx,
      prepared.options,
      prepared.context,
    );

    return { workflowId: handle.workflowId, status: 'started' };
  }

  /**
   * Execute saga and wait for result.
   * Sagas are workflows with automatic compensation on failure.
   */
  async runSaga<TResult = unknown, TParams = unknown>(
    sagaName: string,
    params: TParams,
    idempotencyCtx: IdempotencyContext,
    options?: BrokerWorkflowStartOptions,
  ): Promise<SagaResult<TResult>> {
    return this.runWorkflow<SagaResult<TResult>, TParams>(
      sagaName,
      params,
      idempotencyCtx,
      options,
    );
  }

  /**
   * Check if workflow is registered.
   * Returns false if WorkflowModule is not imported.
   */
  hasWorkflow(workflow: string): boolean {
    if (!this.workflowRegistry) {
      return false;
    }
    const qualifiedWorkflow = this.assertFullyQualified(workflow);
    return this.workflowRegistry.has(qualifiedWorkflow);
  }

  /**
   * Returns the workflow registry instance.
   * Throws if WorkflowModule is not imported.
   */
  getWorkflowRegistry(): WorkflowRegistry {
    if (!this.workflowRegistry) {
      throw new Error(
        'WorkflowRegistry not available. Import WorkflowModule.forRoot() in your app module.'
      );
    }
    return this.workflowRegistry;
  }

  /**
   * Returns true when broker is healthy.
   */
  isHealthy(): boolean {
    return true;
  }

  /**
   * Returns health snapshot for observability.
   */
  getHealth() {
    return {
      serviceName: this.options.serviceName,
      registeredActions: Array.from(this.localActions),
      inFlight: this.inFlight,
    };
  }

  /**
   * Deregisters all local actions after pending calls finish.
   */
  async onModuleDestroy(): Promise<void> {
    const start = Date.now();
    while (this.inFlight > 0 && Date.now() - start < 30_000) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    for (const action of this.localActions) {
      this.registry.deregister(action);
    }
    this.localActions.clear();
  }

  /**
   * Qualify action/workflow name with service prefix.
   */
  qualifyAction(action: string): string {
    return action.includes('.') ? action : `${this.options.serviceName}.${action}`;
  }

  private assertFullyQualified(action: string): string {
    if (!action.includes('.')) {
      throw new Error(`Action "${action}" must include service prefix`);
    }

    return action;
  }

  private withTrustedWorkflowCaller<TParams>(
    qualifiedWorkflow: string,
    params: TParams,
  ): TParams {
    if (
      qualifiedWorkflow !== 'events.emit' ||
      typeof params !== 'object' ||
      params === null ||
      Array.isArray(params)
    ) {
      return params;
    }

    return {
      ...params,
      source: this.options.serviceName,
    } as TParams;
  }

  private async prepareWorkflowStart<TParams>(
    qualifiedWorkflow: string,
    params: TParams,
    options?: BrokerWorkflowStartOptions,
  ): Promise<{
    options?: WorkflowStartOptions;
    context?: WorkflowExecutionContext;
  }> {
    if (!this.workflowRegistry) {
      return {};
    }
    if (options?.adminContext && options.workflowContext) {
      throw new Error(
        'Workflow start accepts either adminContext or workflowContext, not both',
      );
    }

    const descriptor = this.workflowRegistry.getDescriptor(qualifiedWorkflow);
    const instance = descriptor.instance as object;
    let context: WorkflowExecutionContext | undefined;

    if (options?.adminContext) {
      await authorizePoliciesWithAdminContext(
        instance,
        'run',
        params,
        options.adminContext,
      );
      context = this.createWorkflowContext(options.adminContext);
    } else if (options?.workflowContext) {
      context = this.normalizeWorkflowContext(options.workflowContext);
    } else if (hasPolicies(instance, 'run')) {
      throw new AuthorizationError(
        [
          {
            code: 'UNAUTHENTICATED',
            message: 'Verified admin workflow context is required',
            field: null,
          },
        ],
        'workflow',
        'run',
      );
    }

    const dbosOptions = this.toDbosWorkflowOptions(options);
    return {
      ...(dbosOptions ? { options: dbosOptions } : {}),
      ...(context ? { context } : {}),
    };
  }

  private createWorkflowContext(
    adminContext: NonNullable<BrokerWorkflowStartOptions['adminContext']>,
  ): WorkflowExecutionContext {
    const organizationId = adminContext.organizationId;
    if (
      !adminContext.user.id.trim() ||
      typeof organizationId !== 'string' ||
      !organizationId.trim() ||
      (adminContext.store !== null && !adminContext.store.id.trim())
    ) {
      throw new AuthorizationError(
        [
          {
            code: 'UNAUTHENTICATED',
            message: 'Admin organization context is required',
            field: null,
          },
        ],
        'workflow',
        'run',
      );
    }
    if (
      adminContext.store &&
      adminContext.store.organizationId !== organizationId
    ) {
      throw new Error('Admin store does not belong to its organization context');
    }
    return Object.freeze({
      authorization: Object.freeze({
        kind: 'admin',
        subject: adminContext.user.id,
        organizationId,
        ...(adminContext.store ? { storeId: adminContext.store.id } : {}),
      }),
    });
  }

  private normalizeWorkflowContext(
    context: WorkflowExecutionContext,
  ): WorkflowExecutionContext {
    const authorization = context.authorization;
    if (
      !authorization ||
      authorization.kind !== 'admin' ||
      !authorization.subject.trim() ||
      !authorization.organizationId.trim() ||
      (authorization.storeId !== undefined &&
        !authorization.storeId.trim())
    ) {
      throw new AuthorizationError(
        [
          {
            code: 'UNAUTHENTICATED',
            message: 'Invalid nested workflow authorization context',
            field: null,
          },
        ],
        'workflow',
        'run',
      );
    }
    return Object.freeze({
      authorization: Object.freeze({
        kind: 'admin',
        subject: authorization.subject,
        organizationId: authorization.organizationId,
        ...(authorization.storeId
          ? { storeId: authorization.storeId }
          : {}),
      }),
    });
  }

  private toDbosWorkflowOptions(
    options?: BrokerWorkflowStartOptions,
  ): WorkflowStartOptions | undefined {
    if (!options) return undefined;
    const {
      adminContext: _adminContext,
      workflowContext: _workflowContext,
      ...dbosOptions
    } = options;
    return Object.keys(dbosOptions).length > 0 ? dbosOptions : undefined;
  }
}
