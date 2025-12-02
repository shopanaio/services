import type { Database } from "../infrastructure/db/database";
import { productFeature, productFeatureValue } from "./models";

export class FeatureRepository {
  constructor(private readonly db: Database) {}
}
