import { Injectable, Logger } from '@nestjs/common';
import { DBOS } from '@dbos-inc/dbos-sdk';
import type { WorkflowHandle, DBOSWorkflowStatus } from './types.js';

/**
 * Registry for managing durable workflows.
 *
 * Workflows are registered by name in service's onModuleInit().
 * To start a workflow, get the instance and call its run() method directly,
 * or use DBOS.startWorkflow() for background execution.
 *
 * @example
 * ```typescript
 * // Registration (in onModuleInit)
 * this.workflowRegistry.register('projectCreate', new ProjectCreateWorkflow({
 *   broker: this.broker,
 *   logger: this.logger,
 *   repository: this.repository,
 * }));
 *
 * // Get workflow and call directly (waits for result)
 * const workflow = this.workflowRegistry.get<ProjectCreateWorkflow>('projectCreate');
 * const result = await workflow.run(params);
 *
 * // Or use DBOS.startWorkflow for background execution
 * const handle = await DBOS.startWorkflow(workflow, { workflowID: 'xyz' }).run(params);
 * ```
 */
@Injectable()
export class WorkflowRegistry {
  private readonly logger = new Logger(WorkflowRegistry.name);
  private readonly workflows = new Map<string, unknown>();

  /**
   * Register workflow instance by name.
   * Called in service's onModuleInit().
   */
  register(name: string, workflow: unknown): void {
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
   * Get workflow instance by name
   */
  get<T>(name: string): T {
    const workflow = this.workflows.get(name);
    if (!workflow) {
      throw new Error(`Workflow "${name}" not found. Available: ${this.list().join(', ')}`);
    }
    return workflow as T;
  }

  /**
   * Get list of registered workflows
   */
  list(): string[] {
    return Array.from(this.workflows.keys());
  }

  /**
   * Check if workflow is registered
   */
  has(name: string): boolean {
    return this.workflows.has(name);
  }

  /**
   * Get handle to existing workflow by ID.
   * Use for checking status of running workflow.
   */
  retrieve<TResult>(workflowId: string): WorkflowHandle<TResult> {
    const handle = DBOS.retrieveWorkflow<TResult>(workflowId);

    return {
      workflowId,
      getResult: () => handle.getResult(),
      getStatus: () => handle.getStatus(),
    };
  }
}
