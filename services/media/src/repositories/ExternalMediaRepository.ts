import type { Database } from "../infrastructure/db/database";
import { externalMedia } from "./models";

export class ExternalMediaRepository {
  constructor(private readonly db: Database) {}
}
