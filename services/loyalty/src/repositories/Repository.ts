import { TransactionManager } from "@shopana/shared-kernel";
import type { Database } from "../infrastructure/db/database.js";
import { AccountRepository } from "./account/AccountRepository.js";
import { BalanceRepository } from "./balance/BalanceRepository.js";
import { EarningRuleRepository } from "./earning-rule/EarningRuleRepository.js";
import { EventRepository } from "./event/EventRepository.js";
import { LedgerRepository } from "./ledger/LedgerRepository.js";
import { ProgramRepository } from "./program/ProgramRepository.js";
import { ReservationRepository } from "./reservation/ReservationRepository.js";
import { RewardRepository } from "./reward/RewardRepository.js";
import { TierRepository } from "./tier/TierRepository.js";
import { MonetaryWalletRepository } from "./wallet/MonetaryWalletRepository.js";
import { ConfigMutationRepository } from "./config-mutation/ConfigMutationRepository.js";

export interface RepositoryConfig {
  db: Database;
}

export class Repository {
  readonly txManager: TransactionManager<Database>;
  readonly program: ProgramRepository;
  readonly earningRule: EarningRuleRepository;
  readonly account: AccountRepository;
  readonly ledger: LedgerRepository;
  readonly reservation: ReservationRepository;
  readonly tier: TierRepository;
  readonly event: EventRepository;
  readonly wallet: MonetaryWalletRepository;
  readonly reward: RewardRepository;
  readonly balance: BalanceRepository;
  readonly configMutation: ConfigMutationRepository;

  private constructor(readonly database: Database) {
    this.txManager = new TransactionManager(database);
    this.program = new ProgramRepository(database, this.txManager);
    this.earningRule = new EarningRuleRepository(database, this.txManager);
    this.account = new AccountRepository(database, this.txManager);
    this.ledger = new LedgerRepository(database, this.txManager);
    this.reservation = new ReservationRepository(database, this.txManager);
    this.tier = new TierRepository(database, this.txManager);
    this.event = new EventRepository(database, this.txManager);
    this.wallet = new MonetaryWalletRepository(database, this.txManager);
    this.reward = new RewardRepository(database, this.txManager);
    this.balance = new BalanceRepository(database, this.txManager);
    this.configMutation = new ConfigMutationRepository(database, this.txManager);
  }

  static async create(config: RepositoryConfig): Promise<Repository> {
    return new Repository(config.db);
  }

  get db(): Database {
    return this.txManager.getConnection() as Database;
  }

  runInTransaction<TResult>(fn: () => Promise<TResult>): Promise<TResult> {
    return this.txManager.run(fn);
  }
}

export type { Database };
