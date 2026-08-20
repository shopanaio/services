import type { ApplicationAuthAdminAuditRepository } from "../../repositories/ApplicationAuthAdminAuditRepository.js";
import type {
  ApplicationAuthAdminAuditPort,
  ApplicationAuthAdminAuditRecord,
} from "../../services/ApplicationAuthAdminAuditPort.js";

/**
 * Local durable adapter. Because the repository uses the ambient IAM
 * TransactionManager, success records commit atomically with their mutation;
 * failure records append in their own transaction after rollback.
 */
export class LocalApplicationAuthAdminAuditAdapter implements ApplicationAuthAdminAuditPort {
  constructor(private readonly repository: ApplicationAuthAdminAuditRepository) {}

  append(record: ApplicationAuthAdminAuditRecord): Promise<void> {
    return this.repository.append(record);
  }
}
