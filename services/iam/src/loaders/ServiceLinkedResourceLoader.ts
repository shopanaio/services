import DataLoader from "dataloader";
import type { ProtectedResourceRef } from "@shopana/rbac";
import type { ServiceLinkedResourceBinding } from "../repositories/ServiceLinkedResourceRepository.js";
import type { Repository } from "../repositories/Repository.js";

export class ServiceLinkedResourceLoader {
  public readonly serviceLinkedResource: DataLoader<
    ProtectedResourceRef,
    ServiceLinkedResourceBinding | null,
    string
  >;

  constructor(repository: Repository) {
    this.serviceLinkedResource = new DataLoader(
      async (keys) => {
        const records =
          await repository.serviceLinkedResource.findActiveByResources(keys);
        const recordsByKey = new Map(
          records.map((record) => [serviceLinkedResourceKey(record), record])
        );
        return keys.map(
          (key) => recordsByKey.get(serviceLinkedResourceKey(key)) ?? null
        );
      },
      { cacheKeyFn: serviceLinkedResourceKey }
    );
  }
}

export function serviceLinkedResourceKey(input: ProtectedResourceRef): string {
  return `${input.organizationId}:${input.resourceKind}:${input.resourceId}`;
}
