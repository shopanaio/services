import type { Database } from "../infrastructure/db/database";

export class UploadSessionRepository {
  constructor(private readonly db: Database) {}
}
