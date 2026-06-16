/**
 * @file Base Workflow Class
 * @description Abstract base class for durable workflows
 */

import { Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfiguredInstance } from "@dbos-inc/dbos-sdk";
import "reflect-metadata";
import { WORKFLOW_METADATA_KEY, type WorkflowMetadata } from "./decorators.js";

/**
 * Descriptor for a registered workflow.
 * Contains the workflow instance and metadata for execution.
 */
export interface WorkflowDescriptor {
  /** Workflow instance (extends ConfiguredInstance) */
  instance: unknown;
  /** Workflow metadata from @Workflow decorator */
  metadata: {
    name: string;
    idempotencyStrategy?: "client" | "workflow" | "content";
  };
}

/**
 * Interface for workflow registration.
 * Allows BaseWorkflow to register itself without depending on a specific registry implementation.
 */
export interface WorkflowRegistrar {
  register(qualifiedName: string, descriptor: WorkflowDescriptor): void;
  deregister(qualifiedName: string): void;
}

/**
 * Base class for durable workflows.
 *
 * Provides:
 * - Automatic registration with WorkflowRegistry on module init
 * - Automatic deregistration on module destroy
 * - Logger instance
 *
 * @example
 * class MyWorkflow extends BaseWorkflow<MyInput, MyOutput> {
 *   constructor(registry: WorkflowRegistry, serviceName: string) {
 *     super(registry, serviceName);
 *   }
 *
 *   @Workflow("myWorkflow")
 *   async run(input: MyInput): Promise<MyOutput> {
 *     // workflow implementation
 *   }
 * }
 */
export abstract class BaseWorkflow<TInput, TOutput>
  extends ConfiguredInstance
  implements OnModuleInit, OnModuleDestroy
{
  protected readonly logger: Logger;

  constructor(
    protected readonly registrar: WorkflowRegistrar,
    protected readonly serviceName: string,
  ) {
    super(new.target.name);
    this.logger = new Logger(this.constructor.name);
  }

  /** Workflow entry point - must be decorated with @Workflow("name") */
  abstract run(input: TInput): Promise<TOutput>;

  onModuleInit(): void {
    this.registerWorkflow();
  }

  onModuleDestroy(): void {
    this.deregisterWorkflow();
  }

  private getWorkflowMetadata(): WorkflowMetadata | undefined {
    // Check on the prototype for method decorators
    return Reflect.getMetadata(WORKFLOW_METADATA_KEY, this, "run");
  }

  private registerWorkflow(): void {
    const metadata = this.getWorkflowMetadata();
    if (!metadata) {
      throw new Error(
        `@Workflow decorator missing on ${this.constructor.name}.run()`,
      );
    }

    const qualifiedName = this.qualifyName(metadata.name);

    this.registrar.register(qualifiedName, {
      instance: this,
      metadata,
    });

    this.logger.debug(`Registered workflow: ${qualifiedName}`);
  }

  private deregisterWorkflow(): void {
    const metadata = this.getWorkflowMetadata();
    if (metadata) {
      const qualifiedName = this.qualifyName(metadata.name);
      this.registrar.deregister(qualifiedName);
    }
  }

  protected qualifyName(name: string): string {
    return name.includes(".") ? name : `${this.serviceName}.${name}`;
  }
}
