/**
 * @file Base Saga Class
 * @description Abstract base class for sagas with automatic compensation
 */

import { Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { ConfiguredInstance } from "@dbos-inc/dbos-sdk";
import "reflect-metadata";
import { SAGA_DEFINITION_KEY } from "./decorators.js";
import type { SagaResult } from "../core/types.js";
import type { WorkflowRegistrar, WorkflowDescriptor } from "../workflow/BaseWorkflow.js";

/**
 * Base class for sagas with automatic compensation.
 *
 * Sagas are long-running workflows that coordinate multiple steps.
 * If a step fails, previously completed steps are compensated in reverse order.
 *
 * Compensation methods follow naming convention: `compensate${PascalCase(stepMethod)}`
 *
 * @example
 * class OrderSaga extends BaseSaga<OrderInput, OrderResult> {
 *   constructor(registry: WorkflowRegistry, serviceName: string) {
 *     super(registry, serviceName);
 *   }
 *
 *   @Saga("createOrder")
 *   async run(input: OrderInput): Promise<SagaResult<OrderResult>> {
 *     const reservation = await this.reserveInventory(input);
 *     const payment = await this.processPayment(input, reservation);
 *     return { orderId: payment.orderId };
 *   }
 *
 *   @SagaStep()
 *   private async reserveInventory(input: OrderInput) {
 *     // Reserve inventory
 *   }
 *
 *   // Compensation method - called if later step fails
 *   private async compensateReserveInventory(input: OrderInput) {
 *     // Release inventory reservation
 *   }
 *
 *   @SagaStep()
 *   private async processPayment(input: OrderInput, reservation: Reservation) {
 *     // Process payment
 *   }
 *
 *   private async compensateProcessPayment(input: OrderInput, reservation: Reservation) {
 *     // Refund payment
 *   }
 * }
 */
export abstract class BaseSaga<TInput, TOutput>
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

  /** Saga entry point - must be decorated with @Saga("name") */
  abstract run(input: TInput): Promise<SagaResult<TOutput>>;

  onModuleInit(): void {
    this.registerSaga();
  }

  onModuleDestroy(): void {
    this.deregisterSaga();
  }

  private registerSaga(): void {
    const sagaMeta = Reflect.getMetadata(SAGA_DEFINITION_KEY, this.constructor);
    if (!sagaMeta) {
      throw new Error(
        `@Saga decorator missing on ${this.constructor.name}.run()`,
      );
    }

    const qualifiedName = this.qualifyName(sagaMeta.name);

    const descriptor: WorkflowDescriptor = {
      instance: this,
      metadata: { name: sagaMeta.name },
    };

    this.registrar.register(qualifiedName, descriptor);
    this.logger.debug(`Registered saga: ${qualifiedName}`);
  }

  private deregisterSaga(): void {
    const sagaMeta = Reflect.getMetadata(SAGA_DEFINITION_KEY, this.constructor);
    if (sagaMeta) {
      const qualifiedName = this.qualifyName(sagaMeta.name);
      this.registrar.deregister(qualifiedName);
    }
  }

  protected qualifyName(name: string): string {
    return name.includes(".") ? name : `${this.serviceName}.${name}`;
  }
}
