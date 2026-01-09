import { createStyles } from "antd-style";

// ============================================================================
// Media Section Styles
// ============================================================================

export const useMediaStyles = createStyles(({ token }) => ({
  mediaGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(8, 1fr)",
    gridGap: 8,
    position: "relative",
    "& > *:nth-child(1)": {
      gridColumnStart: "span 2",
      gridRowStart: "span 2",
    },
  },
  mediaOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "grid",
    gridTemplateColumns: "repeat(8, 1fr)",
    gridGap: 8,
    pointerEvents: "none",
    "& > *:nth-child(1)": {
      gridColumnStart: "span 2",
      gridRowStart: "span 2",
    },
  },
  mediaImage: {
    width: "100%",
    aspectRatio: "1/1",
    objectFit: "cover",
    borderRadius: 4,
  },
  mediaPreview: {
    fontSize: token.fontSizeSM,
  },
  mediaMoreButton: {
    aspectRatio: "1/1",
    background: token.colorBgContainerDisabled,
    borderRadius: 4,
    fontSize: 12,
  },
  mediaFeaturedWrapper: {
    position: "relative",
  },
}));

// ============================================================================
// Inventory Section Styles
// ============================================================================

export const useInventoryStyles = createStyles(({ token }) => ({
  inventoryCard: {
    padding: 12,
    borderRadius: 8,
  },
  inventorySectionLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: 6,
    display: "block",
  },
  tilesGroup: {
    display: "flex",
    gap: 8,
    "& > *": {
      flex: 1,
    },
  },
  inventoryTag: {
    margin: 0,
  },
  noDataContainer: {
    padding: "32px 16px",
    color: token.colorTextSecondary,
  },
  noDataIcon: {
    fontSize: 24,
  },
  warehouseSelect: {
    minWidth: 140,
    "& .ant-select-selector": {
      fontSize: "12px !important",
    },
  },
  colorSuccess: { color: token.colorSuccess },
  colorWarning: { color: token.colorWarning },
  colorError: { color: token.colorError },
  colorInfo: { color: token.colorInfo },
  colorPurple: { color: "#722ed1" },
}));

// ============================================================================
// Variants Table Styles
// ============================================================================

export const useVariantsTableStyles = createStyles(({ token }) => ({
  variantsTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
    "& th, & td": {
      padding: "10px 12px",
      textAlign: "left",
      borderBottom: `1px solid ${token.colorBorderSecondary}`,
      verticalAlign: "middle",
    },
    "& th": {
      fontWeight: 500,
      color: token.colorTextSecondary,
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: "0.3px",
      background: token.colorBgContainer,
      verticalAlign: "middle",
    },
    "& tbody tr:nth-child(even) td": {
      background: token.colorBgLayout,
    },
    "& tr:last-child td": {
      borderBottom: "none",
    },
    "& tr:hover td": {
      background: token.colorBgLayout,
    },
  },
  variantImage: {
    borderRadius: 4,
    objectFit: "cover",
    flexShrink: 0,
  },
  variantImagePlaceholder: {
    width: 40,
    height: 40,
    background: token.colorBgContainerDisabled,
    borderRadius: 4,
    flexShrink: 0,
  },
  variantTitle: {
    fontSize: 13,
  },
  variantOptions: {
    fontSize: 12,
  },
  variantSku: {
    fontFamily: "ui-monospace, SFMono-Regular, monospace",
    fontSize: 11,
    color: token.colorTextSecondary,
  },
  stockIcon: {
    fontSize: 10,
  },
  stockLabel: {
    fontSize: 11,
  },
  priceStrikethrough: {
    fontSize: 12,
    textDecoration: "line-through",
  },
  discountPercent: {
    fontSize: 11,
    color: token.colorError,
  },
  variantsPagination: {
    padding: "8px 0",
    borderTop: `1px solid ${token.colorBorderSecondary}`,
    marginTop: 8,
  },
  variantsPaginationCount: {
    fontSize: 12,
  },
}));

// ============================================================================
// Reviews Section Styles
// ============================================================================

export const useReviewsStyles = createStyles(({ token }) => ({
  reviewsGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 4fr",
    gap: 16,
  },
  reviewsLeft: {
    paddingRight: 12,
    borderRight: `1px solid ${token.colorBorderSecondary}`,
  },
  reviewsAverage: {
    fontSize: 32,
    fontWeight: 600,
    lineHeight: 1,
  },
  reviewsRate: {
    fontSize: 16,
    margin: "4px 0",
  },
  reviewsCount: {
    fontSize: 11,
  },
  reviewBarRow: {
    fontSize: 11,
  },
  reviewStarIcon: {
    fontSize: 12,
    color: "#fadb14",
  },
  reviewProgress: {
    flex: 1,
    margin: 0,
    "& .ant-progress-inner": {
      height: "6px !important",
    },
  },
  reviewCountText: {
    minWidth: 24,
    textAlign: "right",
    fontSize: 11,
  },
}));

// ============================================================================
// Options Section Styles
// ============================================================================

export const useOptionsStyles = createStyles(({ token }) => ({
  optionGroup: {
    padding: token.paddingSM,
    borderRadius: token.borderRadius,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  optionHeader: {
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 13,
  },
  styleTag: {
    margin: 0,
    fontSize: 11,
    "& .anticon": {
      fontSize: 11,
    },
  },
  swatchPreview: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    border: `1px solid ${token.colorBorderSecondary}`,
    overflow: "hidden",
    display: "inline-block",
    flexShrink: 0,
  },
  swatchPreviewImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  swatchPreviewPlaceholder: {
    width: 14,
    height: 14,
    borderRadius: "50%",
    border: `1px solid ${token.colorBorderSecondary}`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: token.colorBgContainerDisabled,
    color: token.colorTextSecondary,
    fontSize: 8,
    flexShrink: 0,
  },
}));

// ============================================================================
// Components Section Styles
// ============================================================================

export const useComponentsStyles = createStyles(({ token }) => ({
  groupCard: {
    flex: 1,
    minWidth: 180,
    padding: 12,
    background: token.colorBgLayout,
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  groupTitle: {
    fontSize: 13,
  },
  groupItemsCount: {
    fontSize: 11,
  },
  avatarRow: {
    margin: "12px 0",
  },
  avatarPlaceholder: {
    background: token.colorBgContainerDisabled,
    color: token.colorTextQuaternary,
  },
  groupTag: {
    margin: 0,
    fontSize: 10,
  },
}));
