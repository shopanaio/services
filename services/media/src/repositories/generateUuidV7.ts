import { sql } from "drizzle-orm";
import type { Database } from "../infrastructure/db/database.js";

export async function generateUuidV7(db: Database): Promise<string> {
  const rows = await db.execute<{ id: string }>(sql`SELECT uuidv7() AS id`);
  const id = rows[0]?.id;
  if (!id) throw new Error("PostgreSQL uuidv7() did not return an id");
  return id;
}
