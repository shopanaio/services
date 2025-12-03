import type { Database } from "../infrastructure/db/database";
import { s3Objects } from "./models";

export class S3ObjectRepository {
  constructor(private readonly db: Database) {}
}
