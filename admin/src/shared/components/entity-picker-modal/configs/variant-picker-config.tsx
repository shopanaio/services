"use client";

import { createElement, useMemo } from "react";
import { Flex, Typography } from "antd";
import { CheckCircleOutlined, PictureOutlined } from "@ant-design/icons";
import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import { useVariants } from "@/domains/inventory/products/hooks";
import { TableCoverImage } from "@/shared/components/table-cover-image";
import { createStyles } from "antd-style";
import { registerEntityPickerConfig } from ".";
import type {
  IEntityPickerConfig,
  IEntityPickerDataResult,
  IPickableEntity,
} from "../types";
import type {
  ApiVariant,
  ApiVariantOrderByInput,
  ApiVariantWhereInput,
  VariantOrderField,
} from "@/graphql/types";
import { VariantOrderField as VariantOrderFieldEnum } from "@/graphql/types";

interface VariantPickerQueryMeta {
  warehouseId?: string | null;
}

interface VariantPickerEntity extends IPickableEntity {
  variantId: string;
  productId: string;
  sku: string | null;
  hasStockInWarehouse: boolean;
}

const variantSortFieldMapping = {
  title: VariantOrderFieldEnum.Handle,
} satisfies Record<string, VariantOrderField>;

const useVariantCellStyles = createStyles(({ token }) => ({
  image: {
    borderRadius: token.borderRadiusXS,
    objectFit: "cover" as const,
    flexShrink: 0,
  },
  title: {
    lineHeight: 1.25,
  },
  tracked: {
    color: token.colorSuccess,
    fontSize: token.fontSizeSM,
    lineHeight: 1.2,
  },
}));

function getPrimaryMediaUrl(variant: ApiVariant): string | null {
  const variantMedia = [...variant.media].sort(
    (a, b) => a.sortIndex - b.sortIndex,
  )[0];
  const productMedia = [...variant.product.media].sort(
    (a, b) => a.sortIndex - b.sortIndex,
  )[0];

  return variantMedia?.file.url ?? productMedia?.file.url ?? null;
}

function getVariantLabel(variant: ApiVariant) {
  return (
    variant.title || (variant.isDefault ? "Default variant" : variant.handle)
  );
}

function transformVariant(
  variant: ApiVariant,
  warehouseId: string | null,
): VariantPickerEntity {
  const inventoryItem = variant.inventoryItem ?? null;
  const hasStockInWarehouse = Boolean(
    warehouseId &&
      inventoryItem?.stock.some((stock) => stock.warehouseId === warehouseId),
  );
  const variantLabel = getVariantLabel(variant);

  return {
    id: variant.id,
    variantId: variant.id,
    productId: variant.product.id,
    title: `${variant.product.title} / ${variantLabel}`,
    image: getPrimaryMediaUrl(variant),
    sku: inventoryItem?.sku ?? null,
    hasStockInWarehouse,
  };
}

function buildVariantSearchCondition(
  search: string,
): Partial<ApiVariantWhereInput> {
  return {
    handle: { _containsi: search },
  };
}

function useVariantsPickerData(options: {
  pageSize: number;
  first?: number;
  after?: string | null;
  last?: number;
  before?: string | null;
  where?: object | null;
  orderBy?: object[] | null;
  excludeIds: string[];
  queryMeta?: unknown;
}): IEntityPickerDataResult<VariantPickerEntity> {
  const {
    pageSize,
    first,
    after,
    last,
    before,
    where,
    orderBy,
    excludeIds,
    queryMeta,
  } = options;
  const { warehouseId = null } = (queryMeta ?? {}) as VariantPickerQueryMeta;
  const variantsWhere = useMemo<ApiVariantWhereInput | null>(() => {
    const conditions: ApiVariantWhereInput[] = [];

    if (where) {
      conditions.push(where as ApiVariantWhereInput);
    }

    if (excludeIds.length > 0) {
      conditions.push({ id: { _notIn: excludeIds } });
    }

    if (conditions.length === 0) return null;
    if (conditions.length === 1) return conditions[0];

    return { _and: conditions };
  }, [excludeIds, where]);
  const { variants, totalCount, pageInfo, loading, error } = useVariants({
    first,
    after,
    last,
    before,
    where: variantsWhere,
    orderBy: orderBy as ApiVariantOrderByInput[] | null,
  });

  const data = useMemo(
    () => variants.map((variant) => transformVariant(variant, warehouseId)),
    [variants, warehouseId],
  );

  return {
    data,
    isLoading: loading,
    error,
    pagination: {
      total: totalCount,
      pageSize,
      hasNext: pageInfo?.hasNextPage ?? false,
      hasPrev: pageInfo?.hasPreviousPage ?? false,
      startCursor: pageInfo?.startCursor ?? null,
      endCursor: pageInfo?.endCursor ?? null,
    },
  };
}

function VariantCellRenderer(
  props: CustomCellRendererProps<VariantPickerEntity>,
) {
  const { styles } = useVariantCellStyles();
  const { data } = props;

  if (!data) return null;

  return (
    <Flex align="center" gap="small">
      <TableCoverImage
        src={data.image ?? null}
        alt={data.title}
        fallbackIcon={createElement(PictureOutlined)}
        className={styles.image}
      />
      <Flex vertical gap={2}>
        <Typography.Text strong className={styles.title}>
          {data.title}
        </Typography.Text>
        {data.hasStockInWarehouse ? (
          <Typography.Text className={styles.tracked}>
            <CheckCircleOutlined /> tracked
          </Typography.Text>
        ) : null}
      </Flex>
    </Flex>
  );
}

const variantPickerColumns: ColDef<VariantPickerEntity>[] = [
  {
    headerName: "Variant",
    field: "title",
    cellRenderer: VariantCellRenderer,
    flex: 1,
    minWidth: 300,
  },
  {
    headerName: "SKU",
    field: "sku",
    minWidth: 140,
    sortable: false,
    valueFormatter: ({ value }) => value || "-",
  },
];

export const variantPickerConfig: IEntityPickerConfig<
  VariantPickerEntity,
  ApiVariantWhereInput,
  VariantOrderField
> = {
  entityType: "variant",
  entityName: "Variant",
  entityNamePlural: "Variants",
  filterSchema: [],
  columns: variantPickerColumns,
  pageConfig: {
    storageKey: "variant-picker-grid-state",
    sortFieldMapping: variantSortFieldMapping,
    buildSearchCondition: buildVariantSearchCondition,
    defaultPageSize: 20,
  },
  useData: useVariantsPickerData,
  getRowId: (entity) => entity.id,
  isRowDisabled: (entity) => entity.hasStockInWarehouse,
};

registerEntityPickerConfig(variantPickerConfig);
