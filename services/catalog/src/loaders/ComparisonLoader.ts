import DataLoader from "dataloader";
import type { Repository } from "../repositories/Repository.js";

export class ComparisonLoader {
  readonly profile;
  readonly localizedProfile;
  readonly groupsByProfile;
  readonly fieldsByProfile;
  readonly optionsByField;
  readonly directProfileByCategory;
  readonly effectiveProfileByCategory;
  readonly effectiveProfileByProduct;
  readonly configurationByProduct;
  readonly group;
  readonly field;
  readonly fieldOption;

  constructor(repository: Repository) {
    this.profile = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.comparisonRead.getByIds(ids);
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    });
    this.localizedProfile = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.comparisonRead.getLocalizedProfiles(ids);
      const map = new Map(rows.map((row) => [row.id, row]));
      return ids.map((id) => map.get(id) ?? null);
    });
    this.groupsByProfile = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.comparisonRead.getGroupsByProfileIds(ids);
      return ids.map((id) => rows.filter((row) => row.profileId === id));
    });
    this.fieldsByProfile = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.comparisonRead.getFieldsByProfileIds(ids);
      return ids.map((id) => rows.filter((row) => row.profileId === id));
    });
    this.optionsByField = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.comparisonRead.getOptionsByFieldIds(ids);
      return ids.map((id) => rows.filter((row) => row.fieldId === id));
    });
    this.directProfileByCategory = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.comparisonRead.getDirectProfilesByCategoryIds(ids);
      const map = new Map(rows.map((row) => [row.categoryId, row.profileId]));
      return ids.map((id) => map.get(id) ?? null);
    });
    this.effectiveProfileByCategory = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.comparisonRead.getEffectiveProfilesByCategoryIds(ids);
      const map = new Map(rows.map((row) => [row.ownerId, row]));
      return ids.map((id) => map.get(id) ?? null);
    });
    this.effectiveProfileByProduct = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.comparisonRead.getEffectiveProfilesByProductIds(ids);
      const map = new Map(rows.map((row) => [row.ownerId, row]));
      return ids.map((id) => map.get(id) ?? null);
    });
    this.configurationByProduct = new DataLoader(async (ids: readonly string[]) => {
      const rows = await repository.comparisonRead.getConfigurationRows(ids);
      return ids.map((id) => ({
        featureBindings: rows.featureBindings.filter((row) => row.productId === id),
        featureValues: rows.featureValues,
        optionBindings: rows.optionBindings.filter((row) => row.productId === id),
        optionValues: rows.optionValues,
        notApplicable: rows.notApplicable.filter((row) => row.productId === id),
      }));
    });
    this.group = new DataLoader(async (ids: readonly string[]) => map(ids, await repository.comparisonRead.getGroupsByIds(ids)));
    this.field = new DataLoader(async (ids: readonly string[]) => map(ids, await repository.comparisonRead.getFieldsByIds(ids)));
    this.fieldOption = new DataLoader(async (ids: readonly string[]) => map(ids, await repository.comparisonRead.getFieldOptionsByIds(ids)));
  }
}
function map<T extends { id: string }>(ids: readonly string[], rows: T[]) { const values = new Map(rows.map((row) => [row.id, row])); return ids.map((id) => values.get(id) ?? null); }
