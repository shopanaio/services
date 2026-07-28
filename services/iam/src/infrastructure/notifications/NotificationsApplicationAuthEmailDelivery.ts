import type { Notifications } from "@shopana/broker-types";
import type { ServiceBroker } from "@shopana/shared-kernel";
import type { Repository } from "../../repositories/Repository.js";
import { IAM_SERVICE_LINKED_RESOURCE_KIND } from "../../service-linked/resources.js";
import type {
  ApplicationAuthEmailDeliveryPort,
  ApplicationAuthEmailDeliveryRequest,
  ApplicationAuthEmailDeliveryResult,
} from "../../services/ApplicationAuthEmailDeliveryPort.js";

export class NotificationsApplicationAuthEmailDelivery
  implements ApplicationAuthEmailDeliveryPort
{
  constructor(
    private readonly broker: ServiceBroker,
    private readonly repository: Repository
  ) {}

  async enqueue(
    request: ApplicationAuthEmailDeliveryRequest
  ): Promise<ApplicationAuthEmailDeliveryResult> {
    if (
      request.deliveryProfileId !== "notifications" ||
      request.templateId !== expectedTemplateId(request.purpose)
    ) {
      return { accepted: false, retryable: false };
    }
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
        recipient: {
          email: request.recipient,
        },
        notification: toNotification(request),
        idempotencyKey: request.idempotencyKey,
      });
      return {
        accepted: result.accepted,
        messageId: result.workflowId,
      };
    } catch {
      return { accepted: false, retryable: true };
    }
  }
}

function expectedTemplateId(
  purpose: ApplicationAuthEmailDeliveryRequest["purpose"]
): string {
  switch (purpose) {
    case "email_verification_link":
      return "customer.auth.email_verification";
    case "email_otp_sign_in":
      return "customer.auth.login_code";
    case "password_reset_link":
      return "customer.auth.password_reset";
  }
}

function toNotification(
  request: ApplicationAuthEmailDeliveryRequest
): Notifications.ApplicationAuthNotificationParams {
  switch (request.purpose) {
    case "email_verification_link":
      return {
        kind: "EMAIL_VERIFICATION",
        url: request.payload.url,
      };
    case "email_otp_sign_in":
      return {
        kind: "EMAIL_OTP_SIGN_IN",
        otp: request.payload.otp,
      };
    case "password_reset_link":
      return {
        kind: "PASSWORD_RESET",
        url: request.payload.url,
      };
  }
}
