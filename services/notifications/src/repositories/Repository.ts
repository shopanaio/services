import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";
import type { DataProtectionService } from "../infrastructure/secrets/DataProtectionService.js";
import { AuditRepository } from "./audit/AuditRepository.js";
import { DeliveryRepository } from "./deliveries/DeliveryRepository.js";
import { PrivacyRepository } from "./privacy/PrivacyRepository.js";
import { SettingsRepository } from "./settings/SettingsRepository.js";
import { StaffRepository } from "./staff/StaffRepository.js";
import { TemplateRepository } from "./templates/TemplateRepository.js";
import { WebhookRepository } from "./webhooks/WebhookRepository.js";

export class Repository {
  readonly txManager: TransactionManager<Database>;
  readonly settings: SettingsRepository;
  readonly templates: TemplateRepository;
  readonly staff: StaffRepository;
  readonly deliveries: DeliveryRepository;
  readonly privacy: PrivacyRepository;
  readonly webhooks: WebhookRepository;
  readonly audit: AuditRepository;

  private constructor(
    db: Database,
    txManager: TransactionManager<Database>,
    protection: DataProtectionService
  ) {
    this.txManager = txManager;
    this.settings = new SettingsRepository(db, txManager, protection);
    this.templates = new TemplateRepository(db, txManager, protection);
    this.staff = new StaffRepository(db, txManager, protection);
    this.deliveries = new DeliveryRepository(db, txManager, protection);
    this.privacy = new PrivacyRepository(db, txManager, protection);
    this.webhooks = new WebhookRepository(db, txManager, protection);
    this.audit = new AuditRepository(db, txManager, protection);
  }

  static create(input: {
    db: Database;
    protection: DataProtectionService;
  }): Repository {
    return new Repository(
      input.db,
      new TransactionManager(input.db),
      input.protection
    );
  }
}
