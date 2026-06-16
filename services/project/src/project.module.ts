import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { ProjectNestService } from "./project.nest-service.js";
import { ProjectBrokerActions } from "./actions/index.js";
import { sagas } from "./sagas/index.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "project" })],
  providers: [ProjectBrokerActions, ProjectNestService, ...sagas],
})
export class ProjectModule {}
