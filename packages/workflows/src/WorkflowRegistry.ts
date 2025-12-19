import { Injectable, Logger } from '@nestjs/common';
import { DBOS } from '@dbos-inc/dbos-sdk';
import type { BaseWorkflow } from './BaseWorkflow.js';
import type { WorkflowHandle, WorkflowStatus, WorkflowStartOptions } from './types.js';

/**
 * Registry for managing and invoking durable workflows.
 *
 * Workflows are registered by name in service's onModuleInit() alongside broker.register().
 * The registry provides methods to start, call, and monitor workflows.
 *
 * @example
 * ```typescript
 * // Registration (in onModuleInit)
 * this.workflow.register('projectCreate', new ProjectCreateWorkflow({
 *   broker: this.broker,
 *   logger: this.logger,
 * }));
 *
 * // Start async (fire-and-forget)
 * const handle = await this.workflow.start('projectCreate', params);
 *
 * // Call sync (wait for result)
 * const result = await this.workflow.call('projectCreate', params);
 * ```
 */
@Injectable()
export class WorkflowRegistry {
  private readonly logger = new Logger(WorkflowRegistry.name);
  private readonly workflows = new Map<string, BaseWorkflow>();

  /**
   * Register workflow instance by name.
   * Called in service's onModuleInit() alongside broker.register().
   */
  register(name: string, workflow: BaseWorkflow): void {
    if (this.workflows.has(name)) {
      throw new Error(`Workflow "${name}" already registered`);
    }
    this.workflows.set(name, workflow);
    this.logger.debug(`Registered workflow: ${name}`);
  }

  /**
   * Deregister workflow (for graceful shutdown)
   */
  deregister(name: string): void {
    this.workflows.delete(name);
  }

  /**
   * Get list of registered workflows
   */
  list(): string[] {
    return Array.from(this.workflows.keys());
  }

  /**
   * Start workflow by name (async, returns handle for monitoring).
   * Use for fire-and-forget or when workflow control is needed.
   */
  async start<TParams, TResult>(
    name: string,
    params: TParams,
    options?: WorkflowStartOptions
  ): Promise<WorkflowHandle<TResult>> {
    const workflow = this.workflows.get(name);
    if (!workflow) {
      throw new Error(`Workflow "${name}" not found. Available: ${this.list().join(', ')}`);
    }

    // DBOS startWorkflow returns handle for monitoring
    const handle = await DBOS.startWorkflow(
      (workflow as any).run.bind(workflow),
      params,
      { workflowID: options?.workflowId }
    );

    return {
      workflowId: handle.workflowID,
      getResult: () => handle.getResult() as Promise<TResult>,
      getStatus: () => handle.getStatus() as Promise<WorkflowStatus>,
    };
  }

  /**
   * Start workflow and wait for result (blocking).
   * Use when result is needed immediately.
   */
  async call<TParams, TResult>(
    name: string,
    params: TParams,
    options?: WorkflowStartOptions
  ): Promise<TResult> {
    const handle = await this.start<TParams, TResult>(name, params, options);
    return handle.getResult();
  }

  /**
   * Get handle to existing workflow by ID.
   * Use for checking status of running workflow.
   */
  async retrieve<TResult>(workflowId: string): Promise<WorkflowHandle<TResult> | null> {
    try {
      const handle = DBOS.retrieveWorkflow(workflowId);
      if (!handle) return null;

      return {
        workflowId,
        getResult: () => handle.getResult() as Promise<TResult>,
        getStatus: () => handle.getStatus() as Promise<WorkflowStatus>,
      };
    } catch {
      return null;
    }
  }
}
