import "reflect-metadata";

export const EVENT_HANDLER_METADATA_KEY = Symbol("broker:eventHandler");

export interface EventHandlerMetadata {
  eventType: string;
  retryPolicy: {
    maxAttempts: number;
    intervalSeconds: number;
    backoffRate: number;
  };
}

export function EventHandler(
  eventType: string,
  options: { retry?: Partial<EventHandlerMetadata["retryPolicy"]> } = {}
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
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
