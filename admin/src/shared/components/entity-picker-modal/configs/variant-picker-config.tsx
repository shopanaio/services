"use client";

import { createElement, useMemo } from "react";
import { Flex, Typography } from "antd";
import { CheckCircleOutlined, PictureOutlined } from "@ant-design/icons";
import type { ColDef } from "ag-grid-community";
import type { CustomCellRendererProps } from "ag-grid-react";
import {
  useVariants,
  useWarehouseAssignableVariants,
} from "@/domains/inventory/products/hooks";
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
  ApiWarehouseAssignableVariantOrderByInput,
  ApiWarehouseAssignableVariantWhereInput,
  SortDirection,
  VariantOrderField,
  WarehouseAssignableVariantOrderField,
} from "@/graphql/types";
import {
  VariantOrderField as VariantOrderFieldEnum,
  WarehouseAssignableVariantOrderField as WarehouseAssignableVariantOrderFieldEnum,
} from "@/graphql/types";

interface VariantPickerQueryMeta {
  warehouseId?: string | null;
}

interface VariantPickerEntity extends IPickableEntity {
  variantId: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
  sku: string | null;
  hasStockInWarehouse: boolean;
}

type VariantPickerOrderField =
  | VariantOrderField
  | WarehouseAssignableVariantOrderField;

const variantSortFieldMapping = {
  productTitle: WarehouseAssignableVariantOrderFieldEnum.ProductName,
  sku: WarehouseAssignableVariantOrderFieldEnum.Sku,
} satisfies Record<string, VariantPickerOrderField>;

const useVariantCellStyles = createStyles(({ token }) => ({
  image: {
    borderRadius: token.borderRadiusXS,
    objectFit: "cover" as const,
    flexShrink: 0,
  },
	  title: {
	    lineHeight: 1.25,
	  },
  variantTitle: {
    fontSize: token.fontSizeSM,
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
    productTitle: variant.product.title,
    variantTitle: variantLabel,
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

function buildWarehouseAssignableVariantSearchCondition(
  search: string,
): Partial<ApiWarehouseAssignableVariantWhereInput> {
	  return {
	    _or: [
	      { productName: { _containsi: search } },
	      { sku: { _containsi: search } },
	    ],
	  };
	}

function toVariantOrderBy(
  orderBy?: object[] | null,
): ApiVariantOrderByInput[] | null {
  const mapped = (orderBy ?? [])
    .map((order) => {
      const input = order as { field?: string; direction?: SortDirection };
      if (input.field === WarehouseAssignableVariantOrderFieldEnum.ProductName) {
        return {
          field: VariantOrderFieldEnum.Handle,
          direction: input.direction,
        };
      }
      if (input.field === WarehouseAssignableVariantOrderFieldEnum.Sku) {
        return null;
      }
      return input.field && input.direction
        ? {
            field: input.field as VariantOrderField,
            direction: input.direction,
          }
        : null;
    })
    .filter((order): order is ApiVariantOrderByInput => Boolean(order));

  return mapped.length > 0 ? mapped : null;
}

function toWarehouseAssignableVariantOrderBy(
  orderBy?: object[] | null,
): ApiWarehouseAssignableVariantOrderByInput[] | null {
  const mapped = (orderBy ?? [])
    .map((order) => {
      const input = order as { field?: string; direction?: SortDirection };
      return input.field && input.direction
        ? {
            field: input.field as WarehouseAssignableVariantOrderField,
            direction: input.direction,
          }
        : null;
    })
    .filter(
      (order): order is ApiWarehouseAssignableVariantOrderByInput =>
        Boolean(order),
    );

  return mapped.length > 0 ? mapped : null;
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
  search: string;
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
    search,
  } = options;
  const { warehouseId = null } = (queryMeta ?? {}) as VariantPickerQueryMeta;
  const variantsWhere = useMemo<ApiVariantWhereInput | null>(() => {
    const conditions: ApiVariantWhereInput[] = [];

    if (where) {
      conditions.push(where as ApiVariantWhereInput);
    }

    if (!warehouseId && search.trim()) {
      conditions.push(buildVariantSearchCondition(search.trim()));
    }

    if (excludeIds.length > 0) {
      conditions.push({ id: { _notIn: excludeIds } });
    }

    if (conditions.length === 0) return null;
    if (conditions.length === 1) return conditions[0];

    return { _and: conditions };
  }, [excludeIds, search, warehouseId, where]);
  const warehouseAssignableVariantsWhere =
    useMemo<ApiWarehouseAssignableVariantWhereInput | null>(() => {
      const conditions: ApiWarehouseAssignableVariantWhereInput[] = [];

      if (where) {
        conditions.push(where as ApiWarehouseAssignableVariantWhereInput);
      }

      if (warehouseId && search.trim()) {
        conditions.push(
          buildWarehouseAssignableVariantSearchCondition(search.trim()),
        );
      }

      if (excludeIds.length > 0) {
        conditions.push({ id: { _notIn: excludeIds } });
      }

      if (conditions.length === 0) return null;
      if (conditions.length === 1) return conditions[0];

      return { _and: conditions };
    }, [excludeIds, search, warehouseId, where]);
  const normalVariants = useVariants({
    first,
    after,
    last,
    before,
    where: variantsWhere,
    orderBy: toVariantOrderBy(orderBy),
    skip: Boolean(warehouseId),
  });
  const assignableVariants = useWarehouseAssignableVariants({
    warehouseId: warehouseId ?? "",
    first,
    after,
    last,
    before,
    where: warehouseAssignableVariantsWhere,
    orderBy: toWarehouseAssignableVariantOrderBy(orderBy),
    skip: !warehouseId,
  });
  const { variants, totalCount, pageInfo, loading, error } = warehouseId
    ? assignableVariants
    : normalVariants;

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

function ProductCellRenderer(
  props: CustomCellRendererProps<VariantPickerEntity>,
) {
  const { styles } = useVariantCellStyles();
  const { data } = props;

  if (!data) return null;

  return (
	    <Flex align="center" gap="small">
	      <TableCoverImage
	        src={data.image ?? null}
	        alt={data.productTitle}
	        fallbackIcon={createElement(PictureOutlined)}
	        className={styles.image}
	      />
	      <Flex vertical gap={2}>
	        <Typography.Text strong className={styles.title}>
	          {data.productTitle}
	        </Typography.Text>
        {data.variantTitle ? (
          <Typography.Text type="secondary" className={styles.variantTitle}>
            {data.variantTitle}
          </Typography.Text>
        ) : null}
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
    headerName: "Product",
    colId: "productTitle",
    field: "productTitle",
    cellRenderer: ProductCellRenderer,
    flex: 1,
    minWidth: 300,
  },
  {
    headerName: "SKU",
    colId: "sku",
    field: "sku",
    minWidth: 140,
    valueFormatter: ({ value }) => value || "-",
  },
];

export const variantPickerConfig: IEntityPickerConfig<
  VariantPickerEntity,
  ApiVariantWhereInput | ApiWarehouseAssignableVariantWhereInput,
  VariantPickerOrderField
> = {
  entityType: "variant",
  entityName: "Variant",
  entityNamePlural: "Variants",
  filterSchema: [],
  columns: variantPickerColumns,
  pageConfig: {
    storageKey: "variant-picker-grid-state",
    sortFieldMapping: variantSortFieldMapping,
    defaultPageSize: 20,
  },
  useData: useVariantsPickerData,
  getRowId: (entity) => entity.id,
  isRowDisabled: (entity) => entity.hasStockInWarehouse,
};

registerEntityPickerConfig(variantPickerConfig);
