import { Inject } from '@nestjs/common';

/** @deprecated Use InjectBroker(serviceName) instead */
export const SERVICE_BROKER = Symbol('SERVICE_BROKER');
export const SERVICE_NAME = Symbol('SERVICE_NAME');

/**
 * Creates a unique token for a service broker.
 * Each service must use its own token to avoid conflicts in monolith mode.
 */
export function getBrokerToken(serviceName: string): symbol {
  return Symbol.for(`SERVICE_BROKER_${serviceName}`);
}

/**
 * Decorator to inject the service broker for a specific service.
 * Use this instead of @Inject(SERVICE_BROKER) to ensure correct broker injection.
 *
 * @example
 * constructor(@InjectBroker('iam') private readonly broker: ServiceBroker) {}
 */
export function InjectBroker(serviceName: string): ParameterDecorator {
  return Inject(getBrokerToken(serviceName));
}
