import type { Database } from "../infrastructure/db/database";
import { bucketRotationLog } from "./models";

export class BucketRotationLogRepository {
  constructor(private readonly db: Database) {}
}
