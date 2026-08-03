import { Buffer } from "node:buffer";
import { GraphQLError } from "graphql";
import type {
  NavigationMenuRecord,
  PageRecord,
} from "../../../content/repositories/index.js";
import { NavigationMenuResolver } from "./NavigationMenuResolver.js";
import { OnlineStoreType } from "./OnlineStoreType.js";
import { PageResolver } from "./PageResolver.js";

type SortDirection = "ASC" | "DESC";

export interface ConnectionArgs<TWhere, TOrderBy> {
  readonly first?: number | null;
  readonly after?: string | null;
  readonly last?: number | null;
  readonly before?: string | null;
  readonly where?: TWhere | null;
  readonly orderBy?: readonly TOrderBy[] | null;
}

export type PageConnectionArgs = ConnectionArgs<
  {
    readonly handleContains?: string | null;
    readonly isPublished?: boolean | null;
  },
  {
    readonly field: "HANDLE" | "CREATED_AT" | "UPDATED_AT";
    readonly direction: SortDirection;
  }
>;

export type NavigationMenuConnectionArgs = ConnectionArgs<
  {
    readonly handleContains?: string | null;
    readonly nameContains?: string | null;
  },
  {
    readonly field: "HANDLE" | "NAME" | "CREATED_AT" | "UPDATED_AT";
    readonly direction: SortDirection;
  }
>;

interface ConnectionData<T> {
  readonly records: readonly T[];
  readonly cursors: readonly string[];
  readonly totalCount: number;
  readonly pageInfo: {
    readonly hasNextPage: boolean;
    readonly hasPreviousPage: boolean;
    readonly startCursor: string | null;
    readonly endCursor: string | null;
  };
}

export class PageConnectionResolver extends OnlineStoreType<
  PageConnectionArgs,
  ConnectionData<PageRecord>
> {
  protected async $preload() {
    let records = [...(await this.$ctx.repository.page.list(this.scope))];
    const where = this.$props.where;
    if (where?.handleContains) {
      const needle = where.handleContains.toLocaleLowerCase();
      records = records.filter(({ handle }) =>
        handle.toLocaleLowerCase().includes(needle),
      );
    }
    if (where?.isPublished !== null && where?.isPublished !== undefined) {
      const now = new Date().toISOString();
      records = records.filter(({ publishedAt }) =>
        where.isPublished
          ? publishedAt !== null && publishedAt <= now
          : publishedAt === null || publishedAt > now,
      );
    }
    sortRecords(records, this.$props.orderBy, pageValue);
    return paginate(records, this.$props);
  }

  async edges() {
    const data = await this.$data;
    return data.records.map((record, index) => ({
      cursor: data.cursors[index],
      node: new PageResolver(record.id, this.$ctx),
    }));
  }

  async pageInfo() {
    return (await this.$data).pageInfo;
  }

  async totalCount() {
    return (await this.$data).totalCount;
  }
}

export class NavigationMenuConnectionResolver extends OnlineStoreType<
  NavigationMenuConnectionArgs,
  ConnectionData<NavigationMenuRecord>
> {
  protected async $preload() {
    let records = [
      ...(await this.$ctx.repository.navigationMenu.list(this.scope)),
    ];
    const where = this.$props.where;
    if (where?.handleContains) {
      const needle = where.handleContains.toLocaleLowerCase();
      records = records.filter(({ handle }) =>
        handle.toLocaleLowerCase().includes(needle),
      );
    }
    if (where?.nameContains) {
      const needle = where.nameContains.toLocaleLowerCase();
      records = records.filter(({ name }) =>
        name.toLocaleLowerCase().includes(needle),
      );
    }
    sortRecords(records, this.$props.orderBy, navigationMenuValue);
    return paginate(records, this.$props);
  }

  async edges() {
    const data = await this.$data;
    return data.records.map((record, index) => ({
      cursor: data.cursors[index],
      node: new NavigationMenuResolver(record.id, this.$ctx),
    }));
  }

  async pageInfo() {
    return (await this.$data).pageInfo;
  }

  async totalCount() {
    return (await this.$data).totalCount;
  }
}

function paginate<T extends { readonly id: string }>(
  records: readonly T[],
  args: ConnectionArgs<unknown, unknown>,
): ConnectionData<T> {
  if (args.first != null && args.last != null) {
    throw badInput("Use either first or last, not both");
  }
  const requested = args.first ?? args.last ?? 50;
  if (!Number.isInteger(requested) || requested < 0 || requested > 100) {
    throw badInput("Connection size must be an integer between 0 and 100");
  }

  let start = 0;
  let end = records.length;
  if (args.after) {
    const index = records.findIndex(({ id }) => id === decodeCursor(args.after!));
    if (index < 0) throw badInput("The after cursor is invalid");
    start = index + 1;
  }
  if (args.before) {
    const index = records.findIndex(({ id }) => id === decodeCursor(args.before!));
    if (index < 0) throw badInput("The before cursor is invalid");
    end = index;
  }
  if (start > end) throw badInput("The cursor range is invalid");

  if (args.last != null) start = Math.max(start, end - requested);
  else end = Math.min(end, start + requested);

  const page = records.slice(start, end);
  const cursors = page.map(({ id }) => encodeCursor(id));
  return {
    records: page,
    cursors,
    totalCount: records.length,
    pageInfo: {
      hasPreviousPage: start > 0,
      hasNextPage: end < records.length,
      startCursor: cursors[0] ?? null,
      endCursor: cursors.at(-1) ?? null,
    },
  };
}

function sortRecords<T, TOrderBy extends { readonly field: string; readonly direction: SortDirection }>(
  records: T[],
  orderBy: readonly TOrderBy[] | null | undefined,
  value: (record: T, field: TOrderBy["field"]) => string,
): void {
  const orders = orderBy?.length
    ? orderBy
    : ([{ field: "CREATED_AT", direction: "ASC" }] as unknown as readonly TOrderBy[]);
  records.sort((left, right) => {
    for (const order of orders) {
      const comparison = value(left, order.field).localeCompare(
        value(right, order.field),
      );
      if (comparison !== 0) {
        return order.direction === "DESC" ? -comparison : comparison;
      }
    }
    return recordId(left).localeCompare(recordId(right));
  });
}

function pageValue(
  page: PageRecord,
  field: "HANDLE" | "CREATED_AT" | "UPDATED_AT",
): string {
  if (field === "HANDLE") return page.handle;
  if (field === "UPDATED_AT") return page.updatedAt;
  return page.createdAt;
}

function navigationMenuValue(
  menu: NavigationMenuRecord,
  field: "HANDLE" | "NAME" | "CREATED_AT" | "UPDATED_AT",
): string {
  if (field === "HANDLE") return menu.handle;
  if (field === "NAME") return menu.name;
  if (field === "UPDATED_AT") return menu.updatedAt;
  return menu.createdAt;
}

function recordId(value: unknown): string {
  return (value as { readonly id: string }).id;
}

function encodeCursor(id: string): string {
  return Buffer.from(`online-store:${id}`, "utf8").toString("base64");
}

function decodeCursor(cursor: string): string {
  const decoded = Buffer.from(cursor, "base64").toString("utf8");
  if (!decoded.startsWith("online-store:")) throw badInput("Invalid cursor");
  return decoded.slice("online-store:".length);
}

function badInput(message: string): GraphQLError {
  return new GraphQLError(message, { extensions: { code: "BAD_USER_INPUT" } });
}
