import { BaseRepository } from "./BaseRepository.js";

/**
 * Persistence boundary for the immutable audit projection.
 * Query and ingestion methods are intentionally added with the business implementation.
 */
export class AuditEntryRepository extends BaseRepository {}
