import type { Database } from "../infrastructure/db/database";
import { uploadSessions } from "./models";

export class UploadSessionRepository {
  constructor(private readonly db: Database) {}
}
