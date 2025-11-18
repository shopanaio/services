import type { CallingOptions, ServiceBroker } from 'moleculer';
import type { NestBroker } from '@shopana/shared-kernel';

/**
 * Options that are compatible with Moleculer and Nest brokers.
 */
export type BrokerCallOptions = CallingOptions | { meta?: Record<string, unknown> };

/**
 * Public broker surface shared between Moleculer and Nest orchestrators.
 */
export interface BrokerLike {
  call(action: string, params?: unknown, opts?: BrokerCallOptions): Promise<unknown>;
}

/**
 * Union type that helps consumers express either of the two supported brokers.
 */
export type Broker = ServiceBroker | NestBroker;
