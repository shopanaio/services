import type { Notifications } from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import type { Repository } from "../../repositories/Repository.js";
import { IAM_SERVICE_LINKED_RESOURCE_KIND } from "../../service-linked/resources.js";
import type {
  ApplicationAuthSmsDeliveryPort,
  ApplicationAuthSmsDeliveryRequest,
  ApplicationAuthSmsDeliveryResult,
} from "../../services/ApplicationAuthSmsDeliveryPort.js";

export class NotificationsApplicationAuthSmsDelivery
  implements ApplicationAuthSmsDeliveryPort
{
  constructor(
    private readonly broker: ServiceBroker,
    private readonly repository: Repository
  ) {}

  async enqueue(
    request: ApplicationAuthSmsDeliveryRequest
  ): Promise<ApplicationAuthSmsDeliveryResult> {
    const [application] = await this.repository.application.getByKeys([
      { id: request.applicationId },
    ]);
    if (!application || application.status !== "active") {
      return { accepted: false, retryable: false };
    }
    const binding =
      await this.repository.serviceLinkedResource.findActiveByResource({
        organizationId: application.organizationId,
        resourceKind: IAM_SERVICE_LINKED_RESOURCE_KIND.application,
        resourceId: application.id,
      });
    if (!binding || binding.linkedOwnerType !== "store") {
      return { accepted: false, retryable: false };
    }
    try {
      const result = await this.broker.call<
        Notifications.EnqueueNotificationResult,
        Notifications.EnqueueApplicationAuthNotificationParams
      >("notifications.enqueueApplicationAuth", {
        applicationId: application.id,
        storeId: binding.linkedOwnerId,
        organizationId: application.organizationId,
        recipient: { phone: request.recipient },
        notification: { kind: "PHONE_OTP_SIGN_IN", otp: request.otp },
        idempotencyKey: request.idempotencyKey,
      });
      return { accepted: result.accepted, messageId: result.workflowId };
    } catch {
      return { accepted: false, retryable: true };
    }
  }
}
