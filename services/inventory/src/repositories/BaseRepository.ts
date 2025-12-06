import type { Database } from "../infrastructure/db/database";
import { getContext } from "../context/index.js";

/**
 * Base repository class that provides access to database and context
 * All repositories should extend this class to get automatic projectId from context
 */
export abstract class BaseRepository {
  constructor(protected readonly db: Database) {}

  /**
   * Get projectId from async local storage context
   * Throws if context is not available
   */
  protected get projectId(): string {
    return getContext().project.id;
  }
}
