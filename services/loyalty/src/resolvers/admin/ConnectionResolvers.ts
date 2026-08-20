import type { ProgramConnectionInput } from "../../repositories/program/ProgramRepository.js";
import type { AccountConnectionInput } from "../../repositories/account/AccountRepository.js";
import type { TransactionConnectionInput } from "../../repositories/ledger/LedgerRepository.js";
import type { ReservationConnectionInput } from "../../repositories/reservation/ReservationRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class ProgramConnectionResolver extends BaseConnectionResolver<ProgramConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.program.getConnection(this.$props);
  }
  protected createNodeResolver(id: string) {
    return this.resolvers.program(id);
  }
}

export class AccountConnectionResolver extends BaseConnectionResolver<AccountConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.account.getConnection(this.$props);
  }
  protected createNodeResolver(id: string) {
    return this.resolvers.account(id);
  }
}

export class TransactionConnectionResolver extends BaseConnectionResolver<TransactionConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.ledger.getConnection(this.$props);
  }
  protected createNodeResolver(id: string) {
    return this.resolvers.transaction(id);
  }
}

export class ReservationConnectionResolver extends BaseConnectionResolver<ReservationConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.reservation.getConnection(this.$props);
  }
  protected createNodeResolver(id: string) {
    return this.resolvers.reservation(id);
  }
}
