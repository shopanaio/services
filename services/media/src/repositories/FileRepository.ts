import type { Database } from "../infrastructure/db/database";
import { files } from "./models";

export class FileRepository {
  constructor(private readonly db: Database) {}
}
