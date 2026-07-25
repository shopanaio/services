import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { AppsNestService } from './apps.nest-service';
import { AppBrokerFacadeFactory } from './runtime/AppBrokerFacadeFactory.js';
import { AppRuntimeRegistry } from './runtime/AppRuntimeRegistry.js';
import { AppsRuntimeHost } from './runtime/AppsRuntimeHost.js';
import { AppsRuntimeRouter } from './runtime/AppsRuntimeRouter.js';
import {
  APP_INSTALLATION_CONTEXT_PROVIDER,
  UnavailableAppInstallationContextProvider,
} from './runtime/AppInstallationContextProvider.js';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'apps' })],
  providers: [
    AppsNestService,
    AppBrokerFacadeFactory,
    AppRuntimeRegistry,
    AppsRuntimeRouter,
    AppsRuntimeHost,
    UnavailableAppInstallationContextProvider,
    {
      provide: APP_INSTALLATION_CONTEXT_PROVIDER,
      useExisting: UnavailableAppInstallationContextProvider,
    },
  ],
  exports: [AppRuntimeRegistry, AppsRuntimeRouter],
})
export class AppsModule {}
