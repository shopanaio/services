import {
  FolderOutlined,
  FolderOpenOutlined,
  RightOutlined,
  DownOutlined,
} from "@ant-design/icons";
import { Avatar } from "antd";
import type { ICellRendererParams } from "ag-grid-community";
import { useStyles } from "../edit-groups-modal.styles";
import type { ITableRow } from "../types";
import type { ApiProduct, ApiVariant } from "@/graphql/types";

export interface INameCellRendererParams
  extends ICellRendererParams<ITableRow> {
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  allRows: ITableRow[];
}

// Helper to get image URL from variant
const getVariantImageUrl = (variant?: ApiVariant): string | null => {
  if (!variant) return null;
  const mediaItem = variant.media?.[0];
  return mediaItem?.file?.url ?? null;
};

// Helper to get image URL from product
const getProductImageUrl = (product?: ApiProduct): string | null => {
  if (!product) return null;

  const variant = product.variants.edges.find((edge) => edge.node.isDefault)?.node
    ?? product.variants.edges[0]?.node;

  return getVariantImageUrl(variant);
};

export const NameCellRenderer = (params: INameCellRendererParams) => {
  const { styles } = useStyles();
  const data = params.data;
  if (!data) return null;

  const { expandedIds, onToggleExpand, allRows } = params;
  // Only groups can have children (items)
  const hasChildren =
    data.type === "group" && allRows.some((r) => r.parentId === data.id);
  const isExpanded = expandedIds.has(data.id);

  const indent = data.level * 24;

  // Render group row
  if (data.type === "group") {
    return (
      <div className={styles.nameCell}>
        <span className={styles.indent} style={{ width: indent }} />

        {hasChildren ? (
          <span
            className={styles.expandIcon}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(data.id);
            }}
          >
            {isExpanded ? <DownOutlined /> : <RightOutlined />}
          </span>
        ) : (
          <span className={styles.expandIconPlaceholder} />
        )}

        {isExpanded ? (
          <FolderOpenOutlined className={styles.groupIcon} />
        ) : (
          <FolderOutlined className={styles.groupIcon} />
        )}
        <span>{data.name}</span>
      </div>
    );
  }

  // Render item row (product or variant)
  if (data.itemType === "VARIANT") {
    const variant = data.assignedVariant;
    const productTitle = variant?.product?.title;
    const variantTitle =
      data.title ||
      variant?.title ||
      variant?.inventoryItem?.sku ||
      "Unknown Variant";
    const imageUrl = getVariantImageUrl(variant);

    return (
      <div className={styles.nameCell}>
        <span className={styles.indent} style={{ width: indent }} />
        <span className={styles.expandIconPlaceholder} />
        <Avatar src={imageUrl} shape="square" size={28} />
        <div className={styles.productInfo}>
          {productTitle ? (
            <>
              <span className={styles.productTitle}>{productTitle}</span>
              <span className={styles.variantTitle}>{variantTitle}</span>
            </>
          ) : (
            <span className={styles.productTitle}>{variantTitle}</span>
          )}
        </div>
      </div>
    );
  }

  // Product item
  const product = data.assignedProduct;
  const title = data.title || product?.title || "Unknown Product";
  const imageUrl = getProductImageUrl(product);

  return (
    <div className={styles.nameCell}>
      <span className={styles.indent} style={{ width: indent }} />
      <span className={styles.expandIconPlaceholder} />
      <Avatar src={imageUrl} shape="square" size={28} />
      <span className={styles.productTitle}>{title}</span>
    </div>
  );
};
