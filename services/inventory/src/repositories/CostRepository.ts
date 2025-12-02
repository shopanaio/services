import type { Database } from "../infrastructure/db/database";
import { productVariantCostHistory, variantCostsCurrent } from "./models";

export class CostRepository {
  constructor(private readonly db: Database) {}
}
