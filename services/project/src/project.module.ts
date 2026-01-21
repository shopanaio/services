import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { ProjectNestService } from "./project.nest-service.js";
import { ProjectBrokerActions } from "./ProjectBrokerActions.js";
import { StoreCreateSaga, StoreDeleteSaga } from "./sagas/index.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "project" })],
  providers: [
    ProjectBrokerActions,
    StoreCreateSaga,
    StoreDeleteSaga,
    ProjectNestService,
  ],
})
export class ProjectModule {}
