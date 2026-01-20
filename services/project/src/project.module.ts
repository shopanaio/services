import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { ProjectNestService } from "./project.nest-service.js";
import { ProjectBrokerActions } from "./ProjectBrokerActions.js";
import { StoreCreateWorkflow } from "./workflows/index.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "project" })],
  providers: [ProjectBrokerActions, StoreCreateWorkflow, ProjectNestService],
})
export class ProjectModule {}
