import { Buffer } from "node:buffer";
import type { Repository } from "../../repositories/Repository.js";
import type { Cache } from "cache-manager";
import type { ComparisonField } from "../../repositories/models/comparison.js";
import { ComparisonValueFormatter } from "./ComparisonValueFormatter.js";
import type { ComparisonMatrix, ComparisonMatrixCell, ComparisonMatrixColumn } from "./types.js";

export class ProductComparisonMatrixBuilder {
  constructor(
    private readonly repository: Repository,
    private readonly locale: string,
    private readonly cache?: Cache,
    private readonly storeId?: string,
  ) {}
  async build(input: {
    profileId: string;
    categoryId: string;
    columns: ComparisonMatrixColumn[];
  }): Promise<ComparisonMatrix | null> {
    const profiles = await this.repository.comparisonRead.getLocalizedProfiles([input.profileId]);
    const profile = profiles[0];
    if (!profile?.enabled) return null;
    const cacheKey = this.storeId
      ? `store:${this.storeId}:comparison:locale:${this.locale}:profile:${profile.id}:updated:${profile.updatedAt}`
      : null;
    const cached = cacheKey ? await this.cache?.get<StaticLayout>(cacheKey) : null;
    const layout = cached ?? (await this.loadLayout(input.profileId));
    if (!cached && cacheKey) await this.cache?.set(cacheKey, layout);
    const { groups, fields, translations, options } = layout;
    const [config, selected] = await Promise.all([
      this.repository.comparisonRead.getConfigurationRows([
        ...new Set(input.columns.map((column) => column.productId)),
      ]),
      this.repository.comparisonRead.getSelectedOptionLinks(
        input.columns.map((column) => column.variantId),
      ),
    ]);
    const [localFeatureValues, localOptionValues] = await Promise.all([
      this.repository.feature.getValuesByIds(
        config.featureValues.map((row: any) => row.featureValueId),
      ),
      this.repository.option.getValuesByIds(
        config.optionValues.map((row: any) => row.optionValueId),
      ),
    ]);
    const sourceOrder = new Map<string, number>([
      ...localFeatureValues.map((row) => [row.id, row.index] as const),
      ...localOptionValues.map((row) => [row.id, row.sortIndex] as const),
    ]);
    const canonicalOptionOrder = new Map(options.map((row) => [row.id, row.sortIndex]));
    const formatter = new ComparisonValueFormatter(this.locale);
    const groupTranslations = groupBy(translations.groupTranslations, (row) => row.groupId);
    const fieldTranslations = groupBy(translations.fieldTranslations, (row) => row.fieldId);
    const optionTranslations = groupBy(translations.optionTranslations, (row) => row.fieldOptionId);
    const optionNames = new Map(
      options.map((option) => [
        option.id,
        localName(optionTranslations.get(option.id) ?? [], translations.locales) ?? option.handle,
      ]),
    );
    const indexes = createCellIndexes(config, selected);
    const fieldsByGroup = groupBy(fields, (field) => field.groupId);
    const matrixGroups = groups.map((group) => ({
      key: stable("group", group.id),
      groupId: group.id,
      name: localName(groupTranslations.get(group.id) ?? [], translations.locales) ?? group.handle,
      rows: (fieldsByGroup.get(group.id) ?? []).map((field) => {
        const cells = input.columns.map((column) =>
          this.cell(
            column,
            field,
            optionNames,
            indexes,
            formatter,
            profile,
            sourceOrder,
            canonicalOptionOrder,
          ),
        );
        return {
          key: stable("row", field.id),
          fieldId: field.id,
          name:
            localName(fieldTranslations.get(field.id) ?? [], translations.locales) ?? field.handle,
          description: localDescription(
            fieldTranslations.get(field.id) ?? [],
            translations.locales,
          ),
          hasDifferences:
            new Set(cells.map((cell) => `${cell.status}:${cell.canonicalKey}`)).size > 1,
          cells,
        };
      }),
    }));
    return {
      key: stable("matrix", `${input.profileId}:${input.categoryId}`),
      profileId: input.profileId,
      categoryId: input.categoryId,
      title: profile.name,
      columns: input.columns,
      groups: matrixGroups,
    };
  }
  private async loadLayout(profileId: string): Promise<StaticLayout> {
    const [groups, fields] = await Promise.all([
      this.repository.comparisonRead.getGroupsByProfileIds([profileId]),
      this.repository.comparisonRead.getFieldsByProfileIds([profileId]),
    ]);
    const options = await this.repository.comparisonRead.getOptionsByFieldIds(
      fields.map((field) => field.id),
    );
    const translations = await this.repository.comparisonRead.getTranslationsByIds({
      groupIds: groups.map((group) => group.id),
      fieldIds: fields.map((field) => field.id),
      optionIds: options.map((option) => option.id),
    });
    return { groups, fields, translations, options };
  }
  private cell(
    column: ComparisonMatrixColumn,
    field: ComparisonField,
    optionNames: Map<string, string>,
    indexes: CellIndexes,
    formatter: ComparisonValueFormatter,
    profile: any,
    sourceOrder: Map<string, number>,
    canonicalOptionOrder: Map<string, number>,
  ): ComparisonMatrixCell {
    if (indexes.notApplicable.has(pair(column.productId, field.id)))
      return {
        status: "NOT_APPLICABLE",
        displayValue: formatter.status("NOT_APPLICABLE", profile),
        canonicalKey: "not-applicable",
      };
    const feature = indexes.featureBindingByProductField.get(pair(column.productId, field.id));
    let values: any[] = [];
    if (feature)
      values = [
        ...(indexes.featureValuesByFeatureField.get(pair(feature.featureId, field.id)) ?? []),
      ];
    const option = indexes.optionBindingByProductField.get(pair(column.productId, field.id));
    if (option) {
      const selectedValue = indexes.selectedValueByVariantOption.get(
        pair(column.variantId, option.optionId),
      );
      values = selectedValue
        ? [
            ...(indexes.optionValuesBySource.get(
              triple(option.optionId, selectedValue, field.id),
            ) ?? []),
          ]
        : [];
    }
    if (!values.length)
      return {
        status: "MISSING",
        displayValue: formatter.status("MISSING", profile),
        canonicalKey: "missing",
      };
    values.sort((a, b) => {
      const leftId = String(a.featureValueId ?? a.optionValueId);
      const rightId = String(b.featureValueId ?? b.optionValueId);
      const local = (sourceOrder.get(leftId) ?? 0) - (sourceOrder.get(rightId) ?? 0);
      if (local) return local;
      const canonicalOrder =
        (canonicalOptionOrder.get(a.fieldOptionId) ?? 0) -
        (canonicalOptionOrder.get(b.fieldOptionId) ?? 0);
      if (canonicalOrder) return canonicalOrder;
      return canonical(a, field.valueType).localeCompare(canonical(b, field.valueType));
    });
    const displays = values.map((value) =>
      formatter.format(
        value,
        field.valueType,
        field.canonicalUnit,
        value.fieldOptionId ? (optionNames.get(value.fieldOptionId) ?? null) : null,
      ),
    );
    const keys = values.map((value) => canonical(value, field.valueType)).sort();
    return {
      status: "VALUE",
      displayValue: field.cardinality === "MULTIPLE" ? formatter.join(displays) : displays[0]!,
      canonicalKey: keys.join("|"),
    };
  }
}
interface StaticLayout {
  groups: Awaited<ReturnType<Repository["comparisonRead"]["getGroupsByProfileIds"]>>;
  fields: Awaited<ReturnType<Repository["comparisonRead"]["getFieldsByProfileIds"]>>;
  translations: Awaited<ReturnType<Repository["comparisonRead"]["getTranslations"]>>;
  options: Awaited<ReturnType<Repository["comparisonRead"]["getOptionsByFieldIds"]>>;
}
interface CellIndexes {
  notApplicable: Set<string>;
  featureBindingByProductField: Map<string, any>;
  optionBindingByProductField: Map<string, any>;
  featureValuesByFeatureField: Map<string, any[]>;
  optionValuesBySource: Map<string, any[]>;
  selectedValueByVariantOption: Map<string, string>;
}
function createCellIndexes(config: any, selected: any[]): CellIndexes {
  return {
    notApplicable: new Set(
      config.notApplicable.map((row: any) => pair(row.productId, row.fieldId)),
    ),
    featureBindingByProductField: new Map(
      config.featureBindings.map((row: any) => [pair(row.productId, row.fieldId), row]),
    ),
    optionBindingByProductField: new Map(
      config.optionBindings.map((row: any) => [pair(row.productId, row.fieldId), row]),
    ),
    featureValuesByFeatureField: groupBy(config.featureValues, (row: any) =>
      pair(row.featureId, row.fieldId),
    ),
    optionValuesBySource: groupBy(config.optionValues, (row: any) =>
      triple(row.optionId, row.optionValueId, row.fieldId),
    ),
    selectedValueByVariantOption: new Map(
      selected.map((row: any) => [pair(row.variantId, row.optionId), row.optionValueId]),
    ),
  };
}
function groupBy<T>(rows: readonly T[], key: (row: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const value = key(row);
    const existing = grouped.get(value);
    if (existing) existing.push(row);
    else grouped.set(value, [row]);
  }
  return grouped;
}
function pair(left: string, right: string) {
  return `${left}:${right}`;
}
function triple(first: string, second: string, third: string) {
  return `${first}:${second}:${third}`;
}
function canonical(value: any, type: string) {
  if (type === "BOOLEAN") return `b:${value.booleanValue}`;
  if (type === "DECIMAL") return `d:${normalizeDecimal(value.decimalValue)}`;
  if (type === "INTEGER") return `i:${value.integerValue}`;
  if (type === "ENUM") return `e:${value.fieldOptionId}`;
  return `t:${String(value.textValue).trim()}`;
}
function normalizeDecimal(value: string) {
  const [whole, fraction = ""] = String(value).split(".");
  return fraction.replace(/0+$/, "") ? `${whole}.${fraction.replace(/0+$/, "")}` : whole;
}
function localName(rows: Array<{ locale: string; name: string }>, locales: string[]) {
  return (
    rows.find((row) => row.locale === locales[0])?.name ??
    rows.find((row) => row.locale === locales[1])?.name
  );
}
function localDescription(
  rows: Array<{ locale: string; description: string | null }>,
  locales: string[],
) {
  return (
    rows.find((row) => row.locale === locales[0])?.description ??
    rows.find((row) => row.locale === locales[1])?.description ??
    null
  );
}
function stable(kind: string, id: string) {
  return Buffer.from(`catalog-comparison:${kind}:${id}`).toString("base64url");
}
