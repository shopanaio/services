import { Logger, OnModuleInit } from "@nestjs/common";
import { ServiceBroker } from "./ServiceBroker.js";
import {
  EVENT_HANDLER_METADATA_KEY,
  type EventHandlerMetadata,
} from "../decorators/EventHandler.js";
import "reflect-metadata";

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

    for (const methodName of methodNames) {
      const metadata = Reflect.getMetadata(
        EVENT_HANDLER_METADATA_KEY,
        prototype,
        methodName
      ) as EventHandlerMetadata | undefined;

      if (metadata) {
        const method = (this as Record<string, unknown>)[methodName] as (
          params: unknown
        ) => Promise<unknown>;

        const boundMethod = method.bind(this);
        this.broker.register(metadata.eventType, boundMethod, {
          retryPolicy: metadata.retryPolicy,
        });
        registeredHandlers.push(metadata.eventType);
      }
    }

    if (registeredHandlers.length > 0) {
      this.logger.debug(
        `Registered event handlers: ${registeredHandlers.join(", ")}`
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
