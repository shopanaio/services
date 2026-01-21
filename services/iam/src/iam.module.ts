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
