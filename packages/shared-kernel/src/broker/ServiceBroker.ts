import { Inject, Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { ActionHandler, ActionRegistry, type ActionMetadata } from './ActionRegistry';
import type { WorkflowRegistry } from '../workflow/WorkflowRegistry.js';
import { WORKFLOW_REGISTRY } from '../workflow/tokens.js';
import type { IdempotencyContext } from '../workflow/idempotency.js';

export interface ServiceBrokerOptions {
  serviceName: string;
}

/**
 * Parameters for emitting domain events via the events service.
 */
export interface EmitParams {
  payload: unknown;
  source: string;
  context: {
    tenantId: string;
    userId?: string;
    correlationId?: string;
    causationId?: string;
  };
  subject: { type: string; id: string };
  related?: Array<{ type: string; id: string }>;
  actor?: { type: 'user' | 'service' | 'system'; id?: string };
  emitKey: string;
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
    const qualifiedAction = this.assertFullyQualified(action);
    const handler = this.registry.resolve<TParams, TResult>(qualifiedAction);

    this.inFlight++;
    try {
      return (await handler(params)) as TResult;
    } finally {
      this.inFlight--;
    }
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
   * Emits a domain event via the events service.
   * This is a convenience method that calls broker.call("events.emit", params).
   *
   * @param eventType - The type of event to emit (e.g., 'productCreated')
   * @param params - Event emission parameters
   * @returns Promise with workflowId and eventId
   *
   * @example
   * await broker.emit('productCreated', {
   *   payload: { productId: '123' },
   *   source: 'inventory',
   *   context: { tenantId: 'org-1' },
   *   subject: { type: 'product', id: '123' },
   *   emitKey: 'product:123',
   * });
   */
  async emit(
    eventType: string,
    params: EmitParams,
  ): Promise<{ workflowId: string; eventId: string }> {
    return this.call<{ workflowId: string; eventId: string }, EmitParams & { eventType: string }>(
      'events.emit',
      { eventType, ...params },
    );
  }

  /**
   * Execute workflow and wait for result.
   */
  async runWorkflow<TResult = unknown, TParams = unknown>(
    workflow: string,
    params: TParams,
    idempotencyCtx: IdempotencyContext,
  ): Promise<TResult> {
    if (!this.workflowRegistry) {
      throw new Error(
        'WorkflowRegistry not available. Import WorkflowModule.forRoot() in your app module.'
      );
    }

    const qualifiedWorkflow = this.assertFullyQualified(workflow);
    const handle = await this.workflowRegistry.start<TParams, TResult>(
      qualifiedWorkflow,
      params,
      idempotencyCtx,
    );
    return handle.getResult();
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
}
