import type { Database } from "../infrastructure/db/database";

export class BucketRotationLogRepository {
  constructor(private readonly db: Database) {}
}
