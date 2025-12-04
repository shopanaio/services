import type { ServiceBroker } from '@shopana/shared-kernel';

/**
 * Options for broker calls.
 */
export type BrokerCallOptions = { meta?: Record<string, unknown> };

/**
 * Public broker interface for service communication.
 */
export interface BrokerLike {
  call(action: string, params?: unknown, opts?: BrokerCallOptions): Promise<unknown>;
}

/**
 * Broker type alias for ServiceBroker.
 */
export type Broker = ServiceBroker;
