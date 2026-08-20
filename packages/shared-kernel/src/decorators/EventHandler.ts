import "reflect-metadata";

export const EVENT_HANDLER_METADATA_KEY = Symbol("broker:eventHandler");
export const BATCH_EVENT_HANDLER_METADATA_KEY = Symbol("broker:batchEventHandler");
export const CATCH_ALL_EVENT_TYPE = "*";

export interface EventHandlerMetadata {
  eventType: string;
  retryPolicy: {
    maxAttempts: number;
    intervalSeconds: number;
    backoffRate: number;
  };
}

export type BatchEventHandlerMetadata = EventHandlerMetadata;

export interface EventHandlerOptions {
  retry?: Partial<EventHandlerMetadata["retryPolicy"]>;
}

export function EventHandler(
  eventType: string,
  options: EventHandlerOptions = {},
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const metadata: EventHandlerMetadata = {
      eventType,
      retryPolicy: {
        maxAttempts: options.retry?.maxAttempts ?? 3,
        intervalSeconds: options.retry?.intervalSeconds ?? 1,
        backoffRate: options.retry?.backoffRate ?? 2,
      },
    };

    Reflect.defineMetadata(EVENT_HANDLER_METADATA_KEY, metadata, target, propertyKey);
    return descriptor;
  };
}

export function CatchAllEventHandler(options: EventHandlerOptions = {}): MethodDecorator {
  return EventHandler(CATCH_ALL_EVENT_TYPE, options);
}

export function BatchEventHandler(
  eventType: string,
  options: EventHandlerOptions = {},
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const metadata: BatchEventHandlerMetadata = {
      eventType,
      retryPolicy: {
        maxAttempts: options.retry?.maxAttempts ?? 3,
        intervalSeconds: options.retry?.intervalSeconds ?? 1,
        backoffRate: options.retry?.backoffRate ?? 2,
      },
    };

    Reflect.defineMetadata(BATCH_EVENT_HANDLER_METADATA_KEY, metadata, target, propertyKey);
    return descriptor;
  };
}
