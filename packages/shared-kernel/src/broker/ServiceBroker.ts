import { Inject, Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { randomUUID } from 'node:crypto';
import { ActionHandler, ActionRegistry } from './ActionRegistry';
import { BROKER_AMQP } from './tokens';

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
    @Optional()
    @Inject(BROKER_AMQP)
    private readonly amqp: AmqpConnection | null,
    private readonly options: ServiceBrokerOptions,
  ) {}

  /**
   * Registers a new action and keeps tracking for cleanup.
   */
  register<TParams = unknown, TResult = unknown>(
    action: string,
    handler: ActionHandler<TParams, TResult>,
  ): void {
    const qualifiedAction = this.qualifyAction(action);
    this.registry.register(qualifiedAction, handler as ActionHandler);
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
   * Emits a service-scoped RabbitMQ event.
   */
  async emit(event: string, payload?: unknown): Promise<void> {
    if (!this.amqp) {
      this.logger.warn(`emit(${event}) ignored: RabbitMQ disabled`);
      return;
    }

    await this.amqp.publish('shopana.events', event, payload ?? {}, {
      persistent: true,
      correlationId: randomUUID(),
      headers: {
        'x-source-service': this.options.serviceName,
      },
    });
  }

  /**
   * Sends a broadcast RabbitMQ event to all listeners.
   */
  async broadcast(event: string, payload?: unknown): Promise<void> {
    if (!this.amqp) {
      this.logger.warn(`broadcast(${event}) ignored: RabbitMQ disabled`);
      return;
    }

    await this.amqp.publish('shopana.broadcast', event, payload ?? {}, {
      headers: {
        'x-source-service': this.options.serviceName,
      },
    });
  }

  /**
   * Returns true when broker can communicate with RabbitMQ.
   */
  isHealthy(): boolean {
    return this.amqp ? this.amqp.connected : true;
  }

  /**
   * Returns health snapshot for observability.
   */
  getHealth() {
    return {
      connected: this.amqp?.connected ?? false,
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

  private qualifyAction(action: string): string {
    return action.includes('.') ? action : `${this.options.serviceName}.${action}`;
  }

  private assertFullyQualified(action: string): string {
    if (!action.includes('.')) {
      throw new Error(`Action "${action}" must include service prefix`);
    }

    return action;
  }
}
