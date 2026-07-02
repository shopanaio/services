import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { ListingNestService } from "./listing.nest-service.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "listing" })],
  providers: [ListingNestService],
})
export class ListingModule {}
