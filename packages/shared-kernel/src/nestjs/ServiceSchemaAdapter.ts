import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { ServiceSchema } from 'moleculer';
import { NestBroker } from './NestBroker';
import type { Logger } from '../types';

/**
 * Wraps a Moleculer ServiceSchema into a Nest provider so existing services can stay unchanged.
 */
export function createNestServiceAdapter(schema: ServiceSchema) {
  @Injectable()
  class ServiceAdapter implements OnModuleInit, OnModuleDestroy {
    public logger: Logger;
    public broker: NestBroker;

    // Maintain expected Moleculer service properties
    public kernel?: unknown;
    public db?: unknown;
    public graphqlServer?: unknown;
    public pluginManager?: unknown;
    public app?: unknown;
    public storageGateway?: unknown;

    constructor(@Inject('NEST_BROKER') broker: NestBroker) {
      this.broker = broker;
      this.logger = broker.logger;

      if (schema.methods) {
        Object.entries(schema.methods).forEach(([name, fn]) => {
          (this as Record<string, unknown>)[name] = fn.bind(this);
        });
      }

      if (schema.created) {
        if (typeof schema.created === 'function') {
          (schema.created as any).call(this);
        } else if (Array.isArray(schema.created)) {
          schema.created.forEach((fn) => (fn as any).call(this));
        }
      }

      broker.registerService(schema, this as unknown as Record<string, unknown>);
    }

    /**
     * Map Moleculer's started hook to NestJS module initialization.
     */
    async onModuleInit(): Promise<void> {
      try {
        if (schema.started) {
          if (typeof schema.started === 'function') {
            await (schema.started as any).call(this);
          } else if (Array.isArray(schema.started)) {
            for (const fn of schema.started) {
              await (fn as any).call(this);
            }
          }
        }
      } catch (error) {
        this.logger.error(`Fatal error in ${schema.name} service startup:`, error);
        await this.broker.stop(`${schema.name} service failed to start`);
      }
    }

    /**
     * Map Moleculer's stopped hook to NestJS module destruction.
     */
    async onModuleDestroy(): Promise<void> {
      if (schema.stopped) {
        if (typeof schema.stopped === 'function') {
          await (schema.stopped as any).call(this);
        } else if (Array.isArray(schema.stopped)) {
          for (const fn of schema.stopped) {
            await (fn as any).call(this);
          }
        }
      }
    }
  }

  Object.defineProperty(ServiceAdapter, 'name', {
    value: `${schema.name ?? 'Anonymous'}ServiceAdapter`,
    writable: false,
  });

  return ServiceAdapter;
}
