/**
 * @file Workflow Registry
 * @description Central registry for workflow instances with DBOS execution
 */

import { Injectable, Logger } from "@nestjs/common";
import { DBOS, ConfiguredInstance } from "@dbos-inc/dbos-sdk";
import type { WorkflowHandle } from "../core/types.js";
import type { WorkflowDescriptor, WorkflowRegistrar } from "../workflow/BaseWorkflow.js";
import { buildIdempotencyKey, type IdempotencyContext } from "../idempotency/index.js";

const isWorkflowDescriptor = (value: unknown): value is WorkflowDescriptor => {
  if (!value || typeof value !== "object") {
    return false;
  }
  return "instance" in value && "metadata" in value;
};

@Injectable()
export class WorkflowRegistry implements WorkflowRegistrar {
  private readonly logger = new Logger(WorkflowRegistry.name);
  private readonly workflows = new Map<string, WorkflowDescriptor>();

  /**
   * Register workflow with metadata.
   * Called automatically by BaseWorkflow/BaseSaga during onModuleInit.
   */
  register(qualifiedName: string, descriptor: WorkflowDescriptor): void;
  /**
   * Legacy registration API (instance only).
   * @deprecated Register a descriptor with metadata instead.
   */
  register(qualifiedName: string, workflow: unknown): void;
  register(qualifiedName: string, descriptorOrWorkflow: WorkflowDescriptor | unknown): void {
    if (this.workflows.has(qualifiedName)) {
      throw new Error(`Workflow "${qualifiedName}" already registered`);
    }

    const descriptor = isWorkflowDescriptor(descriptorOrWorkflow)
      ? descriptorOrWorkflow
      : {
          instance: descriptorOrWorkflow,
          metadata: {
            name: qualifiedName.includes(".")
              ? qualifiedName.split(".").slice(1).join(".")
              : qualifiedName,
          },
        };

    this.workflows.set(qualifiedName, descriptor);
    this.logger.debug(`Registered workflow: ${qualifiedName}`);
  }

  /**
   * Deregister workflow (for graceful shutdown).
   */
  deregister(qualifiedName: string): void {
    this.workflows.delete(qualifiedName);
  }

  /**
   * Get workflow descriptor by qualified name.
   * Throws if workflow not found.
   */
  getDescriptor(qualifiedName: string): WorkflowDescriptor {
    const descriptor = this.workflows.get(qualifiedName);
    if (!descriptor) {
      throw new Error(
        `Workflow "${qualifiedName}" not found. Available: ${this.list().join(", ")}`,
      );
    }
    return descriptor;
  }

  /**
   * Get workflow instance by name (legacy API, for backward compatibility).
   * @deprecated Use getDescriptor() for new code.
   */
  get<T>(name: string): T {
    return this.getDescriptor(name).instance as T;
  }

  /**
   * Check if workflow is registered.
   */
  has(qualifiedName: string): boolean {
    return this.workflows.has(qualifiedName);
  }

  /**
   * Get list of registered workflow names.
   */
  list(): string[] {
    return Array.from(this.workflows.keys());
  }

  /**
   * Start workflow with idempotency context.
   * Returns a handle to track workflow status and get result.
   *
   * IMPORTANT: All workflows use a standard `run(params)` entry point method.
   * The @Workflow decorator wraps the method with DBOS.workflow() which
   * expects this convention.
   */
  async start<TParams, TResult>(
    qualifiedName: string,
    params: TParams,
    idempotencyCtx: IdempotencyContext,
  ): Promise<WorkflowHandle<TResult>> {
    const descriptor = this.getDescriptor(qualifiedName);

    // Build deterministic workflow ID from idempotency context
    const workflowID = buildIdempotencyKey(qualifiedName, idempotencyCtx);

    // Cast to ConfiguredInstance with run method for DBOS.startWorkflow().
    // All BaseWorkflow/BaseSaga extend ConfiguredInstance and have a `run` method.
    const workflowInstance = descriptor.instance as ConfiguredInstance & {
      run: (params: TParams) => Promise<TResult>;
    };

    const handle = await DBOS.startWorkflow(workflowInstance, { workflowID }).run(
      params,
    );

    return {
      workflowId: workflowID,
      getResult: () => handle.getResult(),
      getStatus: () => handle.getStatus(),
    };
  }

  /**
   * Execute workflow and wait for result.
   * Convenience method that starts workflow and awaits completion.
   */
  async run<TParams, TResult>(
    qualifiedName: string,
    params: TParams,
    idempotencyCtx: IdempotencyContext,
  ): Promise<TResult> {
    const handle = await this.start<TParams, TResult>(
      qualifiedName,
      params,
      idempotencyCtx,
    );
    return handle.getResult();
  }

  /**
   * Get handle to existing workflow by ID.
   * Used to check status or get result of previously started workflow.
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
