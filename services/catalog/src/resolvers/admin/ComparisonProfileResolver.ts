import { Buffer } from "node:buffer";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import { CatalogType } from "./CatalogType.js";
import type {
  ComparisonField,
  ComparisonFieldOption,
  ComparisonGroup,
  ComparisonProfile,
} from "../../repositories/models/comparison.js";
import type { LocalizedComparisonProfile } from "../../repositories/comparison/comparison-types.js";

export class ComparisonProfileResolver extends CatalogType<string, LocalizedComparisonProfile> {
  readonly __typename = "ComparisonProfile";
  async $preload() {
    const value = await this.$ctx.loaders.localizedComparisonProfile.load(this.$props);
    if (!value) throw new PreloadNotFoundError("Comparison profile not found");
    return value;
  }
  id() {
    return this.encodeId(this.$props, GlobalIdEntity.ComparisonProfile);
  }
  handle() {
    return this.$get("handle");
  }
  enabled() {
    return this.$get("enabled");
  }
  revision() {
    return this.$get("revision");
  }
  name() {
    return this.$get("name");
  }
  missingLabel() {
    return this.$get("missingLabel");
  }
  notApplicableLabel() {
    return this.$get("notApplicableLabel");
  }
  unavailableLabel() {
    return this.$get("unavailableLabel");
  }
  createdAt() {
    return this.$get("createdAt");
  }
  updatedAt() {
    return this.$get("updatedAt");
  }
  async groups() {
    const rows = await this.$ctx.loaders.comparisonGroupsByProfile.load(this.$props);
    return rows.map((row: ComparisonGroup) => new ComparisonGroupResolver(row, this.$ctx));
  }
}

export class ComparisonGroupResolver extends CatalogType<ComparisonGroup> {
  readonly __typename = "ComparisonGroup";
  id() {
    return this.encodeId(this.$props.id, GlobalIdEntity.ComparisonGroup);
  }
  handle() {
    return this.$props.handle;
  }
  sortIndex() {
    return this.$props.sortIndex;
  }
  async name() {
    const translations = await this.$ctx.kernel.repository.comparisonRead.getTranslations([
      this.$props.profileId,
    ]);
    const row = localized(
      translations.groupTranslations.filter((item) => item.groupId === this.$props.id),
      translations.locales,
    );
    return row?.name ?? this.$props.handle;
  }
  async fields() {
    const rows = await this.$ctx.loaders.comparisonFieldsByProfile.load(this.$props.profileId);
    return rows
      .filter((row: ComparisonField) => row.groupId === this.$props.id)
      .map((row: ComparisonField) => new ComparisonFieldResolver(row, this.$ctx));
  }
}

export class ComparisonFieldResolver extends CatalogType<ComparisonField> {
  readonly __typename = "ComparisonField";
  id() {
    return this.encodeId(this.$props.id, GlobalIdEntity.ComparisonField);
  }
  handle() {
    return this.$props.handle;
  }
  valueType() {
    return this.$props.valueType;
  }
  cardinality() {
    return this.$props.cardinality;
  }
  canonicalUnit() {
    return this.$props.canonicalUnit;
  }
  sortIndex() {
    return this.$props.sortIndex;
  }
  featured() {
    return this.$props.featured;
  }
  private async translation() {
    const translations = await this.$ctx.kernel.repository.comparisonRead.getTranslations([
      this.$props.profileId,
    ]);
    return localized(
      translations.fieldTranslations.filter((item) => item.fieldId === this.$props.id),
      translations.locales,
    );
  }
  async name() {
    return (await this.translation())?.name ?? this.$props.handle;
  }
  async description() {
    return (await this.translation())?.description ?? null;
  }
  async options() {
    const rows = await this.$ctx.loaders.comparisonOptionsByField.load(this.$props.id);
    return rows.map(
      (row: ComparisonFieldOption) =>
        new ComparisonFieldOptionResolver({ row, profileId: this.$props.profileId }, this.$ctx),
    );
  }
}

export class ComparisonFieldOptionResolver extends CatalogType<{
  row: ComparisonFieldOption;
  profileId: string;
}> {
  readonly __typename = "ComparisonFieldOption";
  id() {
    return this.encodeId(this.$props.row.id, GlobalIdEntity.ComparisonFieldOption);
  }
  handle() {
    return this.$props.row.handle;
  }
  sortIndex() {
    return this.$props.row.sortIndex;
  }
  async name() {
    const translations = await this.$ctx.kernel.repository.comparisonRead.getTranslations([
      this.$props.profileId,
    ]);
    const row = localized(
      translations.optionTranslations.filter((item) => item.fieldOptionId === this.$props.row.id),
      translations.locales,
    );
    return row?.name ?? this.$props.row.handle;
  }
}

export class ComparisonProfileConnectionResolver extends CatalogType<Record<string, unknown>> {
  private pagePromise?: Promise<{
    page: ComparisonProfile[];
    totalCount: number;
    pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean };
  }>;

  private async page() {
    this.pagePromise ??= this.$ctx.kernel.repository.comparisonRead.getProfileConnection({
      first: typeof this.$props.first === "number" ? this.$props.first : undefined,
      afterId: typeof this.$props.after === "string" ? decode(this.$props.after) : undefined,
      last: typeof this.$props.last === "number" ? this.$props.last : undefined,
      beforeId: typeof this.$props.before === "string" ? decode(this.$props.before) : undefined,
      where: this.$props.where as { handle?: string; enabled?: boolean } | undefined,
      orderBy: this.$props.orderBy as
        | Array<{
            field: "HANDLE" | "CREATED_AT" | "UPDATED_AT";
            direction: "ASC" | "DESC";
          }>
        | undefined,
    });
    return this.pagePromise;
  }
  async edges() {
    const { page } = await this.page();
    return page.map((row) => ({
      cursor: encode(row.id),
      node: new ComparisonProfileResolver(row.id, this.$ctx),
    }));
  }
  async nodes() {
    const { page } = await this.page();
    return page.map((row) => new ComparisonProfileResolver(row.id, this.$ctx));
  }
  async totalCount() {
    return (await this.page()).totalCount;
  }
  async pageInfo() {
    const { page, pageInfo } = await this.page();
    return {
      ...pageInfo,
      startCursor: page[0] ? encode(page[0].id) : null,
      endCursor: page.at(-1) ? encode(page.at(-1)!.id) : null,
    };
  }
}

function localized<T extends { locale: string }>(rows: T[], locales: string[]) {
  return (
    rows.find((row) => row.locale === locales[0]) ?? rows.find((row) => row.locale === locales[1])
  );
}
function encode(id: string) {
  return Buffer.from(`comparison-profile:v1:${id}`).toString("base64url");
}
function decode(cursor: string) {
  const value = Buffer.from(cursor, "base64url").toString("utf8");
  const match = /^comparison-profile:v1:([0-9a-f-]+)$/.exec(value);
  if (!match) throw new Error("Invalid comparison profile cursor");
  return match[1]!;
}
