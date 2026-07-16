import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { ReviewsNestService } from "./reviews.nest-service.js";
import { workflows } from "./workflows/index.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "reviews" })],
  providers: [ReviewsNestService, ...workflows],
})
export class ReviewsModule {}
