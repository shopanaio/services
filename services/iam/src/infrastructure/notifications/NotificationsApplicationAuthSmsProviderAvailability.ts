import type { Apps, Notifications } from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import type { Repository } from "../../repositories/Repository.js";
import { IAM_SERVICE_LINKED_RESOURCE_KIND } from "../../service-linked/resources.js";
import type { ApplicationAuthSmsProviderAvailabilityPort } from "../../services/ApplicationAuthSmsProviderAvailabilityPort.js";

export class NotificationsApplicationAuthSmsProviderAvailability
  implements ApplicationAuthSmsProviderAvailabilityPort
{
  constructor(
    private readonly broker: ServiceBroker,
    private readonly repository: Repository
  ) {}

  async isConfiguredForApplication(applicationId: string): Promise<boolean> {
    const [application] = await this.repository.application.getByKeys([
      { id: applicationId },
    ]);
    if (!application || application.status !== "active") return false;

    const binding =
      await this.repository.serviceLinkedResource.findActiveByResource({
        organizationId: application.organizationId,
        resourceKind: IAM_SERVICE_LINKED_RESOURCE_KIND.application,
        resourceId: application.id,
      });
    if (!binding || binding.linkedOwnerType !== "store") return false;

    return this.isConfiguredForStore(binding.linkedOwnerId);
  }

  private async isConfiguredForStore(storeId: string): Promise<boolean> {
    let routes: Apps.CapabilityRoute[];
    try {
      const result = await this.broker.call<Apps.ListCapabilityRoutesResult>(
        "apps.listCapabilityRoutes",
        {
          storeId,
          capability: "notifications",
          operation: "getCapabilities",
        }
      );
      routes = result.routes;
    } catch {
      return false;
    }

    for (const route of routes) {
      try {
        const result = await this.broker.call<Apps.ExecuteCapabilityResult>(
          "apps.executeCapability",
          {
            storeId,
            capability: "notifications",
            operation: "getCapabilities",
            installationId: route.installationId,
          }
        );
        const capabilities =
          result.data as Notifications.NotificationProviderCapabilities;
        if (
          Array.isArray(capabilities?.channels) &&
          capabilities.channels.includes("SMS")
        ) {
          return true;
        }
      } catch {
        // One unavailable provider must not hide another active SMS provider.
      }
    }
    return false;
  }
}

