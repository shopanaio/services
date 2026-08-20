import { decodeGlobalIdByType, GlobalIdEntity } from "@shopana/shared-graphql-guid";
import type { ProgramConnectionInput } from "../../repositories/program/ProgramRepository.js";
import type { AccountConnectionInput } from "../../repositories/account/AccountRepository.js";
import type { TransactionConnectionInput } from "../../repositories/ledger/LedgerRepository.js";
import type { ReservationConnectionInput } from "../../repositories/reservation/ReservationRepository.js";
import type {
  LoyaltyAccountTransactionsArgs,
  LoyaltyQueryAccountsArgs,
  LoyaltyQueryProgramsArgs,
  LoyaltyQueryReservationsArgs,
  LoyaltyQueryTransactionsArgs,
} from "./generated/types.js";

const decodeMany = (ids: readonly string[] | null | undefined, entity: GlobalIdEntity) =>
  ids?.map((id) => decodeGlobalIdByType(id, entity));

const page = (args: {
  first?: number | null;
  after?: string | null;
  last?: number | null;
  before?: string | null;
}) => ({
  first: args.first ?? undefined,
  after: args.after ?? undefined,
  last: args.last ?? undefined,
  before: args.before ?? undefined,
});

export function normalizeProgramConnection(args: LoyaltyQueryProgramsArgs): ProgramConnectionInput {
  return {
    ...page(args),
    where: args.where
      ? {
          ids: decodeMany(args.where.ids, GlobalIdEntity.LoyaltyProgram),
          statuses: args.where.statuses ?? undefined,
          isDefault: args.where.isDefault ?? undefined,
          search: args.where.search ?? undefined,
        }
      : undefined,
  };
}

export function normalizeAccountConnection(args: LoyaltyQueryAccountsArgs): AccountConnectionInput {
  return {
    ...page(args),
    where: args.where
      ? {
          ids: decodeMany(args.where.ids, GlobalIdEntity.LoyaltyAccount),
          programIds: decodeMany(args.where.programIds, GlobalIdEntity.LoyaltyProgram),
          customerIds: decodeMany(args.where.customerIds, GlobalIdEntity.Customer),
          statuses: args.where.statuses ?? undefined,
          minimumAvailablePoints:
            args.where.minimumAvailablePoints == null
              ? undefined
              : BigInt(args.where.minimumAvailablePoints),
          hasDebt: args.where.hasDebt ?? undefined,
          tierIds: decodeMany(args.where.tierIds, GlobalIdEntity.LoyaltyTier),
        }
      : undefined,
  };
}

export function normalizeTransactionConnection(
  args: LoyaltyQueryTransactionsArgs | LoyaltyAccountTransactionsArgs,
  accountId?: string,
): TransactionConnectionInput {
  const where = args.where;
  const accountIds = accountId
    ? [accountId]
    : decodeMany(where?.accountIds, GlobalIdEntity.LoyaltyAccount);
  return {
    ...page(args),
    where:
      where || accountId
        ? {
            ids: decodeMany(where?.ids, GlobalIdEntity.LoyaltyTransaction),
            accountIds,
            programIds: decodeMany(where?.programIds, GlobalIdEntity.LoyaltyProgram),
            kinds: where?.kinds ?? undefined,
            sources: where?.sources ?? undefined,
            sourceId: where?.sourceId ?? undefined,
            orderId: where?.orderId
              ? decodeGlobalIdByType(where.orderId, GlobalIdEntity.Order)
              : undefined,
            checkoutId: where?.checkoutId
              ? decodeGlobalIdByType(where.checkoutId, GlobalIdEntity.Checkout)
              : undefined,
            occurredFrom: where?.occurredFrom ?? undefined,
            occurredTo: where?.occurredTo ?? undefined,
          }
        : undefined,
  };
}

export function normalizeReservationConnection(
  args: LoyaltyQueryReservationsArgs,
): ReservationConnectionInput {
  const where = args.where;
  return {
    ...page(args),
    where: where
      ? {
          ids: decodeMany(where.ids, GlobalIdEntity.LoyaltyReservation),
          accountIds: decodeMany(where.accountIds, GlobalIdEntity.LoyaltyAccount),
          programIds: decodeMany(where.programIds, GlobalIdEntity.LoyaltyProgram),
          checkoutId: where.checkoutId
            ? decodeGlobalIdByType(where.checkoutId, GlobalIdEntity.Checkout)
            : undefined,
          orderId: where.orderId
            ? decodeGlobalIdByType(where.orderId, GlobalIdEntity.Order)
            : undefined,
          statuses: where.statuses ?? undefined,
          expiresBefore: where.expiresBefore ?? undefined,
          createdFrom: where.createdFrom ?? undefined,
          createdTo: where.createdTo ?? undefined,
        }
      : undefined,
  };
}
