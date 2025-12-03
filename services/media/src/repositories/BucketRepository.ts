import type { Database } from "../infrastructure/db/database";
import { buckets } from "./models";

export class BucketRepository {
  constructor(private readonly db: Database) {}
}
