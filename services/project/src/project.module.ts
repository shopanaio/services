import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { ProjectNestService } from "./project.nest-service.js";
import { ProjectBrokerActions } from "./ProjectBrokerActions.js";
import { StoreCreateWorkflow, StoreDeleteWorkflow } from "./workflows/index.js";
import { StoreCreateSaga } from "./sagas/StoreCreateSaga.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "project" })],
  providers: [
    ProjectBrokerActions,
    StoreCreateWorkflow,
    StoreDeleteWorkflow,
    StoreCreateSaga,
    ProjectNestService,
  ],
})
export class ProjectModule {}
