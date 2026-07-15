import { Module } from "@nestjs/common";
import { BrokerModule } from "@shopana/shared-kernel";
import { ReviewsNestService } from "./reviews.nest-service.js";

@Module({
  imports: [BrokerModule.forFeature({ serviceName: "reviews" })],
  providers: [ReviewsNestService],
})
export class ReviewsModule {}
