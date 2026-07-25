import { Module } from '@nestjs/common';
import { BrokerModule } from '@shopana/shared-kernel';
import { AppsNestService } from './apps.nest-service';
import { AppBrokerFacadeFactory } from './runtime/AppBrokerFacadeFactory.js';
import { AppRuntimeRegistry } from './runtime/AppRuntimeRegistry.js';
import { AppsRuntimeHost } from './runtime/AppsRuntimeHost.js';
import { AppsRuntimeRouter } from './runtime/AppsRuntimeRouter.js';
import {
  APP_INSTALLATION_CONTEXT_PROVIDER,
  DatabaseAppInstallationContextProvider,
} from './runtime/AppInstallationContextProvider.js';
import { AppSecretResolverFactory } from './runtime/AppSecretResolverFactory.js';
import { AppInstallationsRepository } from './control-plane/AppInstallationsRepository.js';
import { AppInstallationSecretStore } from './control-plane/AppInstallationSecretStore.js';
import { AppLifecycleService } from './control-plane/AppLifecycleService.js';
import { AppInstallationLifecycleWorkflow } from './control-plane/AppInstallationLifecycleWorkflow.js';
import { AppsPlatformActions } from './control-plane/AppsPlatformActions.js';

@Module({
  imports: [BrokerModule.forFeature({ serviceName: 'apps' })],
  providers: [
    AppsNestService,
    AppBrokerFacadeFactory,
    AppRuntimeRegistry,
    AppsRuntimeRouter,
    AppsRuntimeHost,
    AppInstallationsRepository,
    AppInstallationSecretStore,
    DatabaseAppInstallationContextProvider,
    AppSecretResolverFactory,
    AppLifecycleService,
    AppInstallationLifecycleWorkflow,
    AppsPlatformActions,
    {
      provide: APP_INSTALLATION_CONTEXT_PROVIDER,
      useExisting: DatabaseAppInstallationContextProvider,
    },
  ],
  exports: [
    AppRuntimeRegistry,
    AppsRuntimeRouter,
    AppInstallationsRepository,
  ],
})
export class AppsModule {}
