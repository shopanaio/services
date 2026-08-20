import { Buffer } from "node:buffer";
import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError } from "@shopana/type-resolver";
import { CatalogType } from "./CatalogType.js";
import type {
  ComparisonField,
  ComparisonFieldOption,
  ComparisonGroup,
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
  private async page() {
    let rows = await this.$ctx.kernel.repository.comparisonRead.getAllProfiles();
    const where = this.$props.where as { handle?: string; enabled?: boolean } | undefined;
    if (where?.handle != null) rows = rows.filter((row) => row.handle === where.handle);
    if (where?.enabled != null) rows = rows.filter((row) => row.enabled === where.enabled);
    const orderBy = this.$props.orderBy as Array<{ field: string; direction: string }> | undefined;
    if (orderBy?.length)
      rows.sort((left, right) => {
        for (const order of orderBy) {
          const key =
            order.field === "CREATED_AT"
              ? "createdAt"
              : order.field === "UPDATED_AT"
                ? "updatedAt"
                : "handle";
          const value = String(left[key]).localeCompare(String(right[key]));
          if (value) return order.direction === "DESC" ? -value : value;
        }
        return left.id.localeCompare(right.id);
      });
    let start =
      typeof this.$props.after === "string" ? locate(rows, decode(this.$props.after)) + 1 : 0;
    let end =
      typeof this.$props.before === "string"
        ? locate(rows, decode(this.$props.before))
        : rows.length;
    if (typeof this.$props.first === "number")
      end = Math.min(end, start + Math.min(Math.max(this.$props.first, 0), 100));
    else if (typeof this.$props.last === "number")
      start = Math.max(start, end - Math.min(Math.max(this.$props.last, 0), 100));
    else end = Math.min(end, start + 20);
    const page = rows.slice(start, end);
    return { rows, page, start, end };
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
    return (await this.page()).rows.length;
  }
  async pageInfo() {
    const { rows, page, start, end } = await this.page();
    return {
      hasNextPage: end < rows.length,
      hasPreviousPage: start > 0,
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
function locate(rows: Array<{ id: string }>, id: string) {
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) throw new Error("Stale comparison profile cursor");
  return index;
}
