import type { Database } from "../infrastructure/db/database";
import { itemPricing, variantPricesCurrent } from "./models";

export class PricingRepository {
  constructor(private readonly db: Database) {}
}
