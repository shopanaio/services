import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { IamNestService } from "./iam.nest-service.js";
import { IamBrokerActions } from "./actions/index.js";
import {
  OrganizationCreateSaga,
  OrganizationUpdateSaga,
  OrganizationDeleteSaga,
  UserUpdateProfileSaga,
} from "./sagas/index.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "iam" })],
  providers: [
    IamBrokerActions,
    OrganizationCreateSaga,
    OrganizationUpdateSaga,
    OrganizationDeleteSaga,
    UserUpdateProfileSaga,
    IamNestService,
  ],
})
export class IamModule {}

export {
  APPLICATION_AUTH_EMAIL_DELIVERY_PORT,
  type ApplicationAuthEmailDeliveryPort,
} from "./services/ApplicationAuthEmailDeliveryPort.js";
export {
  APPLICATION_AUTH_RATE_LIMIT_PORT,
  type ApplicationAuthRateLimitPort,
} from "./services/ApplicationAuthRateLimiter.js";
export {
  APPLICATION_AUTH_AUDIT_PORT,
  type ApplicationAuthAuditPort,
  type ApplicationAuthAuditEvent,
} from "./services/ApplicationAuthAuditService.js";
export {
  ApplicationTokenValidationService,
  type ApplicationTokenValidationResult,
  type ApplicationTokenValidationReasonCategory,
  type ValidateApplicationTokenInput,
} from "./services/ApplicationTokenValidationService.js";
export {
  APPLICATION_AUTH_LIVE_STATE_INVALIDATION_PORT,
  type ApplicationAuthLiveStateInvalidationPort,
  type ApplicationAuthLiveStateInvalidationEvent,
} from "./events/application-auth/index.js";
