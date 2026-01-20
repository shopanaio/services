import { Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfiguredInstance } from "@dbos-inc/dbos-sdk";
import { WorkflowRegistry } from "../workflow/WorkflowRegistry.js";
import { ServiceBroker } from "./ServiceBroker.js";
import {
  WORKFLOW_METADATA_KEY,
  type WorkflowMetadata,
} from "../decorators/Workflow.js";
import "reflect-metadata";

/**
 * Services required by BrokerWorkflows.
 */
export interface WorkflowServices {
  /** Service broker for inter-service calls */
  broker: ServiceBroker;
  /** Workflow registry for registration */
  workflow: WorkflowRegistry;
  /** Optional repository access */
  repository?: unknown;
  /** Optional logger */
  logger?: Logger;
}

/**
 * Base class for services that register broker workflows.
 * Extends ConfiguredInstance for DBOS decorator support (@Workflow, @Step).
 */
export abstract class BrokerWorkflows
  extends ConfiguredInstance
  implements OnModuleInit, OnModuleDestroy
{
  protected readonly logger: Logger;
  protected readonly services: WorkflowServices;
  private readonly registeredWorkflows: string[] = [];

  constructor(name: string, services: WorkflowServices) {
    super(name);
    this.services = services;
    this.logger = services.logger ?? new Logger(this.constructor.name);
  }

  /** Access to service broker */
  protected get broker(): ServiceBroker {
    return this.services.broker;
  }

  /** Access to workflow registry */
  protected get workflowRegistry(): WorkflowRegistry {
    return this.services.workflow;
  }

  /** Access to repositories (type depends on service) */
  protected get repository(): unknown {
    return this.services.repository;
  }

  /**
   * Called by NestJS when the module initializes.
   * Scans for @Workflow decorated methods and registers them.
   */
  onModuleInit(): void {
    this.registerWorkflows();
  }

  /**
   * Called by NestJS when the module is destroyed.
   * Deregisters all workflows for graceful shutdown.
   */
  onModuleDestroy(): void {
    for (const workflowName of this.registeredWorkflows) {
      this.workflowRegistry.deregister(workflowName);
    }
    this.registeredWorkflows.length = 0;
  }

  /**
   * Scans the class instance for methods decorated with @Workflow and registers them.
   */
  private registerWorkflows(): void {
    const prototype = Object.getPrototypeOf(this);
    const methodNames = this.getMethodNames(prototype);

    for (const methodName of methodNames) {
      const metadata = Reflect.getMetadata(
        WORKFLOW_METADATA_KEY,
        prototype,
        methodName,
      ) as WorkflowMetadata | undefined;

      if (metadata) {
        const qualifiedName = this.broker.qualifyAction(metadata.name);

        this.workflowRegistry.register(qualifiedName, {
          instance: this,
          metadata,
        });

        this.registeredWorkflows.push(qualifiedName);
      }
    }

    if (this.registeredWorkflows.length > 0) {
      this.logger.debug(
        `Registered workflows: ${this.registeredWorkflows.join(", ")}`,
      );
    }
  }

  /**
   * Gets all method names from a prototype, excluding constructor.
   */
  private getMethodNames(prototype: object): string[] {
    const methods: string[] = [];
    let currentProto = prototype;

    while (currentProto && currentProto !== Object.prototype) {
      const names = Object.getOwnPropertyNames(currentProto).filter((name) => {
        if (name === "constructor") return false;
        const descriptor = Object.getOwnPropertyDescriptor(currentProto, name);
        return descriptor && typeof descriptor.value === "function";
      });

      methods.push(...names);
      currentProto = Object.getPrototypeOf(currentProto);
    }

    return [...new Set(methods)];
  }
}
