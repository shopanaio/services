import { DynamicModule, Global, Module } from '@nestjs/common';
import { ActionRegistry } from './ActionRegistry';

export interface BrokerCoreModuleOptions {
  // Reserved for future options
}

@Global()
@Module({})
export class BrokerCoreModule {
  static forRoot(_options?: BrokerCoreModuleOptions): DynamicModule {
    return {
      module: BrokerCoreModule,
      providers: [ActionRegistry],
      exports: [ActionRegistry],
    };
  }
}
