import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { ListingBrokerActions } from "./actions/index.js";
import { ListingNestService } from "./listing.nest-service.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "listing" })],
  providers: [ListingNestService, ListingBrokerActions],
})
export class ListingModule {}
