import type { ServiceContext } from "../../context/types.js";
import type { AppInstallationConnectionInput } from "../../repositories/installation/AppInstallationRepository.js";
import type { AppLifecycleOperationConnectionInput } from "../../repositories/lifecycle/AppLifecycleOperationRepository.js";
import type { AppManifestSnapshotConnectionInput } from "../../repositories/manifest/AppManifestSnapshotRepository.js";

const registries = new WeakMap<ServiceContext, ResolverRegistry>();

export function getResolverRegistry(
  context: ServiceContext,
): ResolverRegistry {
  const existing = registries.get(context);
  if (existing) {
    return existing;
  }

  const registry = new ResolverRegistry(context);
  registries.set(context, registry);
  return registry;
}

/**
 * Request-scoped factory for Apps resolver instances.
 *
 * Dynamic imports keep entity relationships from creating eager module
 * cycles while preserving a single construction API across the resolver
 * layer.
 */
export class ResolverRegistry {
  constructor(private readonly context: ServiceContext) {}

  async appDefinition(appCode: string) {
    const { AppDefinitionResolver } = await import(
      "./AppDefinitionResolver.js"
    );
    return new AppDefinitionResolver(appCode, this.context);
  }

  async appInstallation(id: string) {
    const { AppInstallationResolver } = await import(
      "./AppInstallationResolver.js"
    );
    return new AppInstallationResolver(id, this.context);
  }

  async appInstallationConnection(
    input: AppInstallationConnectionInput,
  ) {
    const { AppInstallationConnectionResolver } = await import(
      "./AppInstallationConnectionResolver.js"
    );
    return new AppInstallationConnectionResolver(input, this.context);
  }

  async appCapabilityBinding(id: string) {
    const { AppCapabilityBindingResolver } = await import(
      "./AppCapabilityBindingResolver.js"
    );
    return new AppCapabilityBindingResolver(id, this.context);
  }

  async appLifecycleOperation(id: string) {
    const { AppLifecycleOperationResolver } = await import(
      "./AppLifecycleOperationResolver.js"
    );
    return new AppLifecycleOperationResolver(id, this.context);
  }

  async appLifecycleOperationConnection(
    installationId: string,
    input: AppLifecycleOperationConnectionInput,
  ) {
    const { AppLifecycleOperationConnectionResolver } = await import(
      "./AppLifecycleOperationConnectionResolver.js"
    );
    return new AppLifecycleOperationConnectionResolver(
      { installationId, input },
      this.context,
    );
  }

  async appManifestSnapshot(id: string) {
    const { AppManifestSnapshotResolver } = await import(
      "./AppManifestSnapshotResolver.js"
    );
    return new AppManifestSnapshotResolver(id, this.context);
  }

  async appManifestSnapshotConnection(
    installationId: string,
    input: AppManifestSnapshotConnectionInput,
  ) {
    const { AppManifestSnapshotConnectionResolver } = await import(
      "./AppManifestSnapshotConnectionResolver.js"
    );
    return new AppManifestSnapshotConnectionResolver(
      { installationId, input },
      this.context,
    );
  }
}
