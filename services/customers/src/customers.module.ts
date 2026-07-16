import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { CustomersNestService } from "./customers.nest-service.js";
import { workflows } from "./workflows/index.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "customers" })],
  providers: [CustomersNestService, ...workflows],
})
export class CustomersModule {}
