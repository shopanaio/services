import { Logger, OnModuleInit } from "@nestjs/common";
import { ServiceBroker } from "./ServiceBroker.js";
import {
  BATCH_EVENT_HANDLER_METADATA_KEY,
  EVENT_HANDLER_METADATA_KEY,
  type BatchEventHandlerMetadata,
  type EventHandlerMetadata,
} from "../decorators/EventHandler.js";
import "reflect-metadata";
import type { BrokerCallContext } from "./BrokerCallContext.js";

const BATCH_EVENT_ACTION_SUFFIX = ":batch";

export abstract class EventHandlers implements OnModuleInit {
  protected readonly logger: Logger;

  constructor(protected readonly broker: ServiceBroker) {
    this.logger = new Logger(this.constructor.name);
  }

  onModuleInit(): void {
    this.registerEventHandlers();
  }

  private registerEventHandlers(): void {
    const prototype = Object.getPrototypeOf(this);
    const methodNames = this.getMethodNames(prototype);
    const registeredHandlers: string[] = [];
    const registeredBatchHandlers: string[] = [];

    for (const methodName of methodNames) {
      const metadata = Reflect.getMetadata(
        EVENT_HANDLER_METADATA_KEY,
        prototype,
        methodName
      ) as EventHandlerMetadata | undefined;

      if (metadata) {
        const method = (this as Record<string, unknown>)[methodName] as (
          params: unknown,
          context: BrokerCallContext
        ) => Promise<unknown>;

        const boundMethod = method.bind(this);
        this.broker.register(metadata.eventType, boundMethod, {
          retryPolicy: metadata.retryPolicy,
        });
        registeredHandlers.push(metadata.eventType);
      }

      const batchMetadata = Reflect.getMetadata(
        BATCH_EVENT_HANDLER_METADATA_KEY,
        prototype,
        methodName
      ) as BatchEventHandlerMetadata | undefined;

      if (batchMetadata) {
        const method = (this as Record<string, unknown>)[methodName] as (
          params: unknown,
          context: BrokerCallContext
        ) => Promise<unknown>;

        const boundMethod = method.bind(this);
        this.broker.register(
          `${batchMetadata.eventType}${BATCH_EVENT_ACTION_SUFFIX}`,
          boundMethod,
          {
            retryPolicy: batchMetadata.retryPolicy,
          }
        );
        registeredBatchHandlers.push(batchMetadata.eventType);
      }
    }

    if (registeredHandlers.length > 0) {
      this.logger.debug(
        `Registered event handlers: ${registeredHandlers.join(", ")}`
      );
    }

    if (registeredBatchHandlers.length > 0) {
      this.logger.debug(
        `Registered batch event handlers: ${registeredBatchHandlers.join(", ")}`
      );
    }
  }

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
