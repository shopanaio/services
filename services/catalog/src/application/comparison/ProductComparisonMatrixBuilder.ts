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
      ? `store:${this.storeId}:comparison:locale:${this.locale}:profile:${profile.id}:revision:${profile.revision}`
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
    const optionNames = new Map(
      options.map((option) => [
        option.id,
        localName(
          translations.optionTranslations.filter((row) => row.fieldOptionId === option.id),
          translations.locales,
        ) ?? option.handle,
      ]),
    );
    const matrixGroups = groups.map((group) => ({
      key: stable("group", group.id),
      groupId: group.id,
      name:
        localName(
          translations.groupTranslations.filter((row) => row.groupId === group.id),
          translations.locales,
        ) ?? group.handle,
      rows: fields
        .filter((field) => field.groupId === group.id)
        .map((field) => {
          const cells = input.columns.map((column) =>
            this.cell(
              column,
              field,
              optionNames,
              config,
              selected,
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
              localName(
                translations.fieldTranslations.filter((row) => row.fieldId === field.id),
                translations.locales,
              ) ?? field.handle,
            description: localDescription(
              translations.fieldTranslations.filter((row) => row.fieldId === field.id),
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
    const [groups, fields, translations] = await Promise.all([
      this.repository.comparisonRead.getGroupsByProfileIds([profileId]),
      this.repository.comparisonRead.getFieldsByProfileIds([profileId]),
      this.repository.comparisonRead.getTranslations([profileId]),
    ]);
    const options = await this.repository.comparisonRead.getOptionsByFieldIds(
      fields.map((field) => field.id),
    );
    return { groups, fields, translations, options };
  }
  private cell(
    column: ComparisonMatrixColumn,
    field: ComparisonField,
    optionNames: Map<string, string>,
    config: any,
    selected: any[],
    formatter: ComparisonValueFormatter,
    profile: any,
    sourceOrder: Map<string, number>,
    canonicalOptionOrder: Map<string, number>,
  ): ComparisonMatrixCell {
    const na = config.notApplicable.find(
      (row: any) => row.productId === column.productId && row.fieldId === field.id,
    );
    if (na)
      return {
        status: "NOT_APPLICABLE",
        displayValue: formatter.status("NOT_APPLICABLE", profile),
        canonicalKey: "not-applicable",
      };
    const feature = config.featureBindings.find(
      (row: any) => row.productId === column.productId && row.fieldId === field.id,
    );
    let values: any[] = [];
    if (feature)
      values = config.featureValues.filter(
        (row: any) => row.featureId === feature.featureId && row.fieldId === field.id,
      );
    const option = config.optionBindings.find(
      (row: any) => row.productId === column.productId && row.fieldId === field.id,
    );
    if (option) {
      const selectedValue = selected.find(
        (row: any) => row.variantId === column.variantId && row.optionId === option.optionId,
      )?.optionValueId;
      values = selectedValue
        ? config.optionValues.filter(
            (row: any) =>
              row.optionId === option.optionId &&
              row.optionValueId === selectedValue &&
              row.fieldId === field.id,
          )
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
