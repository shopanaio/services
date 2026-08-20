import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";

function groupBy<T>(rows: readonly T[], key: (row: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) grouped.set(key(row), [...(grouped.get(key(row)) ?? []), row]);
  return grouped;
}

export class ProgramLoader {
  readonly program;
  readonly version;
  readonly versionsByProgram;
  readonly earningRule;
  readonly earningRulesByVersion;
  readonly rewardDefinition;
  readonly rewardDefinitionsByVersion;
  readonly tierPolicyByVersion;
  readonly tierPolicy;
  readonly tiersByVersion;

  constructor(repository: Repository) {
    this.program = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.program.getByIds(ids);
      const byId = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
    this.version = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.program.getVersionsByIds(ids);
      const byId = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
    this.versionsByProgram = new DataLoader(async (ids: readonly string[]) => {
      const grouped = groupBy(
        await repository.program.getVersionsByProgramIds(ids),
        (row) => row.programId,
      );
      return ids.map((id) => grouped.get(id) ?? []);
    });
    this.earningRule = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.earningRule.getByIds(ids);
      const byId = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
    this.earningRulesByVersion = new DataLoader(async (ids: readonly string[]) => {
      const grouped = groupBy(
        await repository.earningRule.listForVersions(ids),
        (row) => row.programVersionId,
      );
      return ids.map((id) => grouped.get(id) ?? []);
    });
    this.rewardDefinition = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.reward.getDefinitionsByIds(ids);
      const byId = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
    this.rewardDefinitionsByVersion = new DataLoader(async (ids: readonly string[]) => {
      const grouped = groupBy(
        await repository.reward.listDefinitionsForVersions(ids),
        (row) => row.programVersionId,
      );
      return ids.map((id) => grouped.get(id) ?? []);
    });
    this.tierPolicyByVersion = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.tier.getPoliciesByVersionIds(ids);
      const byVersion = new Map(rows.map((row) => [row.programVersionId, row]));
      return ids.map((id) => byVersion.get(id) ?? null);
    });
    this.tierPolicy = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.tier.getPoliciesByIds(ids);
      const byId = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => byId.get(id) ?? null);
    });
    this.tiersByVersion = new DataLoader(async (ids: readonly string[]) => {
      const grouped = groupBy(
        await repository.tier.listForVersions(ids),
        (row) => row.programVersionId,
      );
      return ids.map((id) => grouped.get(id) ?? []);
    });
  }
}
