import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { CustomersNestService } from "./customers.nest-service.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "customers" })],
  providers: [CustomersNestService],
})
export class CustomersModule {}
