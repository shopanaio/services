import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { IdentityNestService } from "./identity.nest-service.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "identity" })],
  providers: [IdentityNestService],
})
export class IdentityModule {}
