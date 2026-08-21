import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { AuditNestService } from "./audit.nest-service.js";
import { AuditEventHandlers } from "./handlers/index.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "audit" })],
  providers: [AuditNestService, AuditEventHandlers],
})
export class AuditModule {}
