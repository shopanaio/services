import { Buffer } from "node:buffer";
import {
  encodeGlobalIdByType,
  GlobalIdEntity,
} from "@shopana/shared-graphql-guid";
import { GraphQLError } from "graphql";
import type {
  CategoryMediaArgs,
  ProductMediaArgs,
  ProductVariantMediaArgs,
} from "./generated/types.js";
import { CatalogType } from "./CatalogType.js";

type PaginationArgs = CategoryMediaArgs | ProductMediaArgs | ProductVariantMediaArgs;
type MediaOwnerType = "category" | "product" | "variant";

export type MediaConnectionInput = PaginationArgs & {
  ownerId: string;
  ownerType: MediaOwnerType;
};

interface MediaConnectionData {
  rows: Array<{ cursor: string; fileId: string }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
  totalCount: number;
}

export class MediaConnectionResolver extends CatalogType<
  MediaConnectionInput,
  MediaConnectionData
> {
  async $preload(): Promise<MediaConnectionData> {
    const allRows = await this.loadRows();
    const { start, end } = connectionBounds(
      allRows.length,
      this.$props,
      this.cursorPrefix(),
    );
    const rows = allRows.slice(start, end).map((row, offset) => ({
      cursor: encodeCursor(this.cursorPrefix(), start + offset),
      fileId: row.fileId,
    }));

    return {
      rows,
      pageInfo: {
        hasNextPage: end < allRows.length,
        hasPreviousPage: start > 0,
        startCursor: rows[0]?.cursor ?? null,
        endCursor: rows.at(-1)?.cursor ?? null,
      },
      totalCount: allRows.length,
    };
  }

  async edges() {
    const rows = (await this.$get("rows")) ?? [];
    return rows.map((row) => ({
      cursor: row.cursor,
      node: mediaReference(row.fileId),
    }));
  }

  async nodes() {
    const rows = (await this.$get("rows")) ?? [];
    return rows.map((row) => mediaReference(row.fileId));
  }

  pageInfo() {
    return this.$get("pageInfo");
  }

  async totalCount() {
    return (await this.$get("totalCount")) ?? 0;
  }

  private async loadRows(): Promise<Array<{ fileId: string }>> {
    switch (this.$props.ownerType) {
      case "product":
        return this.$ctx.loaders.productMedia.load(this.$props.ownerId);
      case "variant":
        return this.$ctx.loaders.variantMedia.load(this.$props.ownerId);
      case "category":
        return this.$ctx.loaders.categoryMedia.load(this.$props.ownerId);
    }
  }

  private cursorPrefix(): string {
    return `${this.$props.ownerType}:${this.$props.ownerId}`;
  }
}

export function mediaReference(fileId: string) {
  return {
    // Catalog currently stores the Media service file ID, not its concrete
    // media kind. MediaImage is the canonical product-media representation.
    __typename: "MediaImage" as const,
    id: encodeGlobalIdByType(fileId, GlobalIdEntity.File),
  };
}

function connectionBounds(
  total: number,
  args: PaginationArgs,
  prefix: string,
): { start: number; end: number } {
  if (args.first != null && args.last != null) {
    throw new GraphQLError("Use either first or last, not both", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }
  if ((args.first ?? 0) < 0 || (args.last ?? 0) < 0) {
    throw new GraphQLError("Connection limits cannot be negative", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }
  if ((args.first ?? 0) > 100 || (args.last ?? 0) > 100) {
    throw new GraphQLError("Media connection limit cannot exceed 100", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }

  let start = args.after ? decodeCursor(args.after, prefix) + 1 : 0;
  let end = args.before ? decodeCursor(args.before, prefix) : total;
  start = Math.min(Math.max(start, 0), total);
  end = Math.min(Math.max(end, start), total);

  if (args.first != null) end = Math.min(end, start + args.first);
  else if (args.last != null) start = Math.max(start, end - args.last);
  else end = Math.min(end, start + 20);
  return { start, end };
}

function encodeCursor(prefix: string, index: number): string {
  return Buffer.from(`catalog-media:${prefix}:${index}`, "utf8").toString(
    "base64url",
  );
}

function decodeCursor(cursor: string, prefix: string): number {
  const decoded = Buffer.from(cursor, "base64url").toString("utf8");
  const marker = `catalog-media:${prefix}:`;
  const index = decoded.startsWith(marker)
    ? Number(decoded.slice(marker.length))
    : Number.NaN;
  if (!Number.isSafeInteger(index) || index < 0) {
    throw new GraphQLError("Invalid media connection cursor", {
      extensions: { code: "BAD_USER_INPUT" },
    });
  }
  return index;
}
