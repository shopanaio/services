import { createStyles } from "antd-style";
import {
  Button,
  Image,
  Tag,
  Typography,
  Rate,
  Progress,
  Select,
  Dropdown,
  Skeleton,
  Flex,
} from "antd";
import {
  StarFilled,
  MoreOutlined,
  ClockCircleFilled,
  WarningOutlined,
  StopOutlined,
  SortAscendingOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { ReactNode, useState, useMemo, useCallback } from "react";
import { Paper } from "./Paper";
import { PaperHeader } from "./PaperHeader";
import { Tile } from "./Tile";
import { MediaFilePlaceholder } from "./MediaFilePlaceholder";
import { PricingBlock } from "./pricing/PricingBlock";
import { ProductInfoHeader } from "./product-info-header";
import { ProductContentTabs } from "./ProductContentTabs";
import { SeoBlock } from "./seo";
import { IProduct, IMediaFile } from "../mocks/types";
import { weightUnitOptions, dimensionUnitOptions } from "../constants";
import {
  useProductModal,
  useEditMediaModal,
  useEditOptionsModal,
  useEditAttributesModal,
  useEditSeoModal,
  useEditVariantsModal,
  useEditCategoriesModal,
  useEditTagsModal,
  useEditComponentsModal,
  type IEditSeoModalPayload,
} from "../modals";
import { createMockData as createAttributesMockData } from "../modals/EditAttributesModal/mocks";
import { AttributesSection } from "./AttributesSection";

// ============================================================================
// Inventory Types & Mock Data
// ============================================================================

type SyncStatus = "synced" | "stale" | "error" | "syncing";

interface IWarehouseStock {
  warehouseId: string;
  warehouseName: string;
  warehouseCode: string;
  isDefault: boolean;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  totalSKUs: number;
  lowStockSKUs: number;
  outOfStockSKUs: number;
  backorderSKUs: number;
  lastSyncAt: Date;
  syncStatus: SyncStatus;
}

interface IInventoryStats {
  availableQty: number;
  onHandQty: number;
  reservedQty: number;
  totalSKUs: number;
  lowStockSKUs: number;
  lowStockPercent: number;
  outOfStockSKUs: number;
  outOfStockPercent: number;
  backorderSKUs: number;
  pendingOrders: number;
  lastSyncAt: Date;
  syncStatus: SyncStatus;
  changeVs7d: number;
  thresholdType: "safety_stock" | "reorder_point";
}

const getMockWarehouseStock = (): IWarehouseStock[] => {
  const now = new Date();
  return [
    {
      warehouseId: "wh-1",
      warehouseName: "Main Warehouse",
      warehouseCode: "MAIN",
      isDefault: true,
      onHandQty: 756,
      reservedQty: 45,
      availableQty: 711,
      totalSKUs: 45,
      lowStockSKUs: 8,
      outOfStockSKUs: 4,
      backorderSKUs: 2,
      lastSyncAt: new Date(now.getTime() - 3 * 60 * 1000),
      syncStatus: "synced",
    },
    {
      warehouseId: "wh-2",
      warehouseName: "Store #1",
      warehouseCode: "ST1",
      isDefault: false,
      onHandQty: 198,
      reservedQty: 12,
      availableQty: 186,
      totalSKUs: 45,
      lowStockSKUs: 5,
      outOfStockSKUs: 3,
      backorderSKUs: 1,
      lastSyncAt: new Date(now.getTime() - 8 * 60 * 1000),
      syncStatus: "synced",
    },
    {
      warehouseId: "wh-3",
      warehouseName: "Store #2",
      warehouseCode: "ST2",
      isDefault: false,
      onHandQty: 78,
      reservedQty: 8,
      availableQty: 70,
      totalSKUs: 45,
      lowStockSKUs: 3,
      outOfStockSKUs: 2,
      backorderSKUs: 1,
      lastSyncAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      syncStatus: "stale",
    },
  ];
};

const calculateInventoryStats = (
  warehouses: IWarehouseStock[],
  selectedWarehouseId?: string
): IInventoryStats => {
  if (selectedWarehouseId) {
    const wh = warehouses.find((w) => w.warehouseId === selectedWarehouseId);
    if (wh) {
      const lowPct =
        wh.totalSKUs > 0
          ? Math.round((wh.lowStockSKUs / wh.totalSKUs) * 100)
          : 0;
      const outPct =
        wh.totalSKUs > 0
          ? Math.round((wh.outOfStockSKUs / wh.totalSKUs) * 100)
          : 0;
      return {
        availableQty: wh.availableQty,
        onHandQty: wh.onHandQty,
        reservedQty: wh.reservedQty,
        totalSKUs: wh.totalSKUs,
        lowStockSKUs: wh.lowStockSKUs,
        lowStockPercent: lowPct,
        outOfStockSKUs: wh.outOfStockSKUs,
        outOfStockPercent: outPct,
        backorderSKUs: wh.backorderSKUs,
        pendingOrders: wh.reservedQty > 0 ? Math.ceil(wh.reservedQty / 5) : 0,
        lastSyncAt: wh.lastSyncAt,
        syncStatus: wh.syncStatus,
        changeVs7d: -12,
        thresholdType: "safety_stock",
      };
    }
  }

  const totalSKUs = warehouses[0]?.totalSKUs || 0;
  const lowStockSKUs = Math.max(...warehouses.map((w) => w.lowStockSKUs));
  const outOfStockSKUs = Math.max(...warehouses.map((w) => w.outOfStockSKUs));
  const backorderSKUs = warehouses.reduce((sum, w) => sum + w.backorderSKUs, 0);

  const availableQty = warehouses.reduce((sum, w) => sum + w.availableQty, 0);
  const onHandQty = warehouses.reduce((sum, w) => sum + w.onHandQty, 0);
  const reservedQty = warehouses.reduce((sum, w) => sum + w.reservedQty, 0);

  const latestSync = warehouses.reduce(
    (latest, w) => (w.lastSyncAt > latest ? w.lastSyncAt : latest),
    warehouses[0]?.lastSyncAt || new Date()
  );
  const hasStale = warehouses.some((w) => w.syncStatus === "stale");
  const hasError = warehouses.some((w) => w.syncStatus === "error");

  return {
    availableQty,
    onHandQty,
    reservedQty,
    totalSKUs,
    lowStockSKUs,
    lowStockPercent:
      totalSKUs > 0 ? Math.round((lowStockSKUs / totalSKUs) * 100) : 0,
    outOfStockSKUs,
    outOfStockPercent:
      totalSKUs > 0 ? Math.round((outOfStockSKUs / totalSKUs) * 100) : 0,
    backorderSKUs,
    pendingOrders: reservedQty > 0 ? Math.ceil(reservedQty / 5) : 0,
    lastSyncAt: latestSync,
    syncStatus: hasError ? "error" : hasStale ? "stale" : "synced",
    changeVs7d: -12,
    thresholdType: "safety_stock",
  };
};

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
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
  mediaMoreButton: {
    aspectRatio: "1/1",
    background: token.colorBgContainerDisabled,
    borderRadius: 4,
    fontSize: 12,
  },
  // Inventory styles
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
  // Tile overrides for inventory section
  inventoryTile: {
    cursor: "pointer",
  },
  inventoryTilePrimary: {
    flex: 1.5,
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
  // Variants table
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
  // Reviews section
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
  // Options section
  optionTitle: {
    fontSize: 12,
    color: token.colorTextSecondary,
    display: "block",
    marginBottom: 4,
  },
  optionTag: {
    margin: 0,
  },
  // Groups/Components section
  groupBox: {
    padding: "10px 12px",
    background: token.colorBgLayout,
    borderRadius: 6,
  },
  groupTitle: {},
  groupItemsCount: {},
  groupTag: {
    margin: 0,
  },
  groupItems: {
    marginTop: 8,
  },
  groupItemTag: {
    margin: 0,
  },
  // Colors for inventory
  colorSuccess: { color: token.colorSuccess },
  colorWarning: { color: token.colorWarning },
  colorError: { color: token.colorError },
  colorInfo: { color: token.colorInfo },
  colorPurple: { color: "#722ed1" },
}));

// ============================================================================
// Sub-components
// ============================================================================

interface ISectionProps {
  title: string;
  children: ReactNode;
  onEdit?: () => void;
  extra?: ReactNode;
}

const Section = ({ title, children, onEdit, extra }: ISectionProps) => {
  return (
    <Paper>
      <PaperHeader title={title} extra={extra} onEdit={onEdit} />
      <div>{children}</div>
    </Paper>
  );
};

// ============================================================================
// Inventory Section Components
// ============================================================================

// Note: KPITile replaced with Tile component from ./Tile.tsx

interface IWarehouseSelectProps {
  warehouses: IWarehouseStock[];
  selectedWarehouseId?: string;
  onSelect: (warehouseId?: string) => void;
}

const WarehouseSelect = ({
  warehouses,
  selectedWarehouseId,
  onSelect,
}: IWarehouseSelectProps) => {
  const { styles } = useStyles();

  return (
    <Select
      value={selectedWarehouseId || "all"}
      onChange={(value) => onSelect(value === "all" ? undefined : value)}
      size="small"
      popupMatchSelectWidth={false}
      className={styles.warehouseSelect}
    >
      <Select.Option value="all">All Warehouses</Select.Option>
      {warehouses.map((wh) => (
        <Select.Option key={wh.warehouseId} value={wh.warehouseId}>
          {wh.warehouseName} ({wh.availableQty.toLocaleString()})
        </Select.Option>
      ))}
    </Select>
  );
};

interface IInventoryActionsProps {
  onAction: (action: string) => void;
}

const InventoryActions = ({ onAction }: IInventoryActionsProps) => {
  const items = [{ key: "edit", label: "Edit inventory" }];

  return (
    <Dropdown
      menu={{
        items,
        onClick: ({ key }) => onAction(key),
      }}
      trigger={["click"]}
    >
      <Button size="small" icon={<MoreOutlined />} />
    </Dropdown>
  );
};

interface IInventoryHeaderProps {
  warehouses: IWarehouseStock[];
  selectedWarehouseId?: string;
  onWarehouseSelect: (warehouseId?: string) => void;
  onAction: (action: string) => void;
}

const InventoryHeader = ({
  warehouses,
  selectedWarehouseId,
  onWarehouseSelect,
  onAction,
}: IInventoryHeaderProps) => {
  return (
    <PaperHeader
      title="Inventory"
      extra={
        <WarehouseSelect
          warehouses={warehouses}
          selectedWarehouseId={selectedWarehouseId}
          onSelect={onWarehouseSelect}
        />
      }
      actions={<InventoryActions onAction={onAction} />}
    />
  );
};

const InventoryLoadingSkeleton = () => {
  const { styles } = useStyles();

  return (
    <Paper className={styles.inventoryCard}>
      <Flex
        align="center"
        justify="space-between"
        style={{ marginBottom: 8, paddingBottom: 8 }}
      >
        <Flex align="center" gap={12}>
          <Skeleton.Input size="small" active style={{ width: 70 }} />
          <Skeleton.Input size="small" active style={{ width: 140 }} />
        </Flex>
        <Skeleton.Button size="small" active />
      </Flex>
      <Flex vertical gap={12}>
        <Flex gap={12}>
          <Skeleton.Node active style={{ width: "100%", height: 80 }}>
            <div />
          </Skeleton.Node>
          <Skeleton.Node active style={{ width: "100%", height: 80 }}>
            <div />
          </Skeleton.Node>
          <Skeleton.Node active style={{ width: "100%", height: 80 }}>
            <div />
          </Skeleton.Node>
        </Flex>
      </Flex>
    </Paper>
  );
};

const InventoryNoData = () => {
  const { styles } = useStyles();

  return (
    <Paper className={styles.inventoryCard}>
      <Flex
        vertical
        align="center"
        justify="center"
        gap={8}
        className={styles.noDataContainer}
      >
        <StopOutlined className={styles.noDataIcon} />
        <Typography.Text type="secondary">
          No inventory sync for this product
        </Typography.Text>
        <Button size="small" type="link">
          Set up inventory tracking
        </Button>
      </Flex>
    </Paper>
  );
};

interface IInventorySectionProps {
  onEdit?: () => void;
  product?: IProduct;
}

type InventoryState = "loading" | "no_data" | "ready";

const useInventoryData = () => {
  return useMemo(() => getMockWarehouseStock(), []);
};

const InventorySection = ({ onEdit, product }: IInventorySectionProps) => {
  const { styles } = useStyles();
  const warehouses = useInventoryData();
  const { push: pushEditVariantsModal } = useEditVariantsModal();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<
    string | undefined
  >();
  const [activeKPI, setActiveKPI] = useState<string | undefined>();
  const [inventoryState] = useState<InventoryState>("ready");

  const stats = useMemo(
    () => calculateInventoryStats(warehouses, selectedWarehouseId),
    [warehouses, selectedWarehouseId]
  );

  const handleAction = (action: string) => {
    console.log("Inventory action:", action);
    if (action === "edit" && product) {
      pushEditVariantsModal({
        initialTab: "inventory",
        variants:
          product.variants?.map((v) => ({
            id: v.id,
            title: v.title,
            sku: v.sku,
            stock: Math.floor(Math.random() * 100),
            weight: v.weight,
            weightUnit: v.weightUnit,
            barcode: null,
            options: v.options?.map((opt) => ({
              title: opt.title,
              group: {
                slug: opt.group.slug,
                title: opt.group.title,
              },
            })),
          })) || [],
        lowStockThreshold: 10,
        // Inventory-only mode: show only inventory columns, no settings button
        availableColumns: [
          "sku",
          "barcode",
          "onHand",
          "unavailable",
          "reserved",
          "available",
        ],
        showColumnSettings: false,
        onSave: (
          updated: Array<{
            id: string;
            sku: string | null;
            stock: number;
            barcode: string | null;
            price: number;
            compareAtPrice: number | null;
            costPrice: number | null;
            weight: number | null;
            weightUnit: string;
            length: number | null;
            width: number | null;
            height: number | null;
            dimensionUnit: string;
          }>
        ) => {
          console.log("Saved inventory:", updated);
        },
      });
    } else if (
      action === "adjust" ||
      action === "transfer" ||
      action === "reserve"
    ) {
      onEdit?.();
    }
  };

  const handleKPIClick = (kpi: string) => {
    setActiveKPI(activeKPI === kpi ? undefined : kpi);
  };

  if (inventoryState === "loading") {
    return <InventoryLoadingSkeleton />;
  }

  if (inventoryState === "no_data") {
    return <InventoryNoData />;
  }

  return (
    <Paper className={styles.inventoryCard}>
      <InventoryHeader
        warehouses={warehouses}
        selectedWarehouseId={selectedWarehouseId}
        onWarehouseSelect={setSelectedWarehouseId}
        onAction={handleAction}
      />

      {/* Section A: Quantity */}
      <Typography.Text
        type="secondary"
        className={styles.inventorySectionLabel}
      >
        Quantity
      </Typography.Text>
      <div className={styles.tilesGroup}>
        <Tile
          label="Available"
          tooltip="Units available for sale (On Hand minus Reserved)"
          value={stats.availableQty.toLocaleString()}
          secondary={`across ${stats.totalSKUs} SKUs`}
          isPrimary
          badge={
            <Tag
              color="success"
              className={styles.inventoryTag}
              variant="outlined"
            >
              Sellable
            </Tag>
          }
          active={activeKPI === "available"}
          onClick={() => handleKPIClick("available")}
        />
        <Tile
          label="On Hand"
          tooltip="Total physical units in warehouse"
          value={stats.onHandQty.toLocaleString()}
          secondary={
            stats.changeVs7d !== 0
              ? `${stats.changeVs7d > 0 ? "+" : ""}${stats.changeVs7d} vs 7d`
              : undefined
          }
          variant="success"
          active={activeKPI === "onhand"}
          onClick={() => handleKPIClick("onhand")}
        />
        <Tile
          label="Reserved"
          tooltip="Units allocated to pending orders"
          value={stats.reservedQty.toLocaleString()}
          secondary={
            stats.pendingOrders > 0
              ? `${stats.pendingOrders} orders`
              : undefined
          }
          variant={stats.reservedQty > 0 ? "info" : "default"}
          badge={
            stats.reservedQty > 0 ? (
              <Tag
                color="blue"
                className={styles.inventoryTag}
                variant="outlined"
              >
                Reserved
              </Tag>
            ) : undefined
          }
          active={activeKPI === "reserved"}
          onClick={() => handleKPIClick("reserved")}
        />
      </div>

      {/* Section B: Health */}
      <Typography.Text
        type="secondary"
        className={styles.inventorySectionLabel}
        style={{ margin: "12px 0 6px" }}
      >
        Health
      </Typography.Text>
      <div className={styles.tilesGroup}>
        <Tile
          label="Low Stock"
          tooltip={`SKUs below ${
            stats.thresholdType === "safety_stock"
              ? "safety stock"
              : "reorder point"
          } threshold`}
          value={`${stats.lowStockSKUs} SKUs`}
          secondary={`${stats.lowStockPercent}% of catalog`}
          variant={stats.lowStockSKUs > 0 ? "warning" : "default"}
          badge={
            stats.lowStockSKUs > 0 ? (
              <WarningOutlined
                className={styles.colorWarning}
                style={{ fontSize: 11 }}
              />
            ) : undefined
          }
          active={activeKPI === "lowstock"}
          onClick={() => handleKPIClick("lowstock")}
        />
        <Tile
          label="Out of Stock"
          tooltip="SKUs with zero available units"
          value={`${stats.outOfStockSKUs} SKUs`}
          secondary={`${stats.outOfStockPercent}% of catalog`}
          variant={stats.outOfStockSKUs > 0 ? "danger" : "default"}
          badge={
            stats.outOfStockSKUs > 0 ? (
              <StopOutlined
                className={styles.colorError}
                style={{ fontSize: 11 }}
              />
            ) : undefined
          }
          active={activeKPI === "outofstock"}
          onClick={() => handleKPIClick("outofstock")}
        />
        {stats.backorderSKUs > 0 && (
          <Tile
            label="Backorder"
            tooltip="SKUs with incoming stock expected"
            value={`${stats.backorderSKUs} SKUs`}
            secondary="ETA avg 5d"
            variant="purple"
            badge={
              <ClockCircleFilled
                className={styles.colorPurple}
                style={{ fontSize: 11 }}
              />
            }
            active={activeKPI === "backorder"}
            onClick={() => handleKPIClick("backorder")}
          />
        )}
      </div>
    </Paper>
  );
};

// ============================================================================
// Main Component
// ============================================================================

interface IProductInfoCardAProps {
  product: IProduct;
  onEditSection?: (section: string) => void;
}

export const ProductInfoCardA = ({
  product,
  onEditSection,
}: IProductInfoCardAProps) => {
  const { styles } = useStyles();
  const { push: openProductModal } = useProductModal();
  const { push: openEditMediaModal } = useEditMediaModal();
  const { push: openEditOptionsModal } = useEditOptionsModal();
  const { push: openEditAttributesModal } = useEditAttributesModal();
  const { push: openEditSeoModal } = useEditSeoModal();
  const { push: openEditVariantsModal } = useEditVariantsModal();
  const { push: openEditCategoriesModal } = useEditCategoriesModal();
  const { push: openEditTagsModal } = useEditTagsModal();
  const { push: openEditComponentsModal } = useEditComponentsModal();

  const handleEdit = (section: string) => onEditSection?.(section);

  const handleEditMedia = useCallback(() => {
    openEditMediaModal({
      productId: product.id,
      cover: product.cover,
      gallery: product.gallery,
      onSave: (media: { cover: IMediaFile | null; gallery: IMediaFile[] }) => {
        console.log("Saved media:", media);
        // TODO: Implement actual save logic
      },
    });
  }, [product.id, product.cover, product.gallery, openEditMediaModal]);

  const handleOpenProductModal = useCallback(() => {
    openProductModal({ entityId: product.id });
  }, [product.id, openProductModal]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
    }).format(price / 100);

  const formatWeight = (weight: number | null, unit: string) => {
    if (!weight) return "—";
    return `${weight} ${
      weightUnitOptions[unit as keyof typeof weightUnitOptions]?.label || unit
    }`;
  };

  const formatDimensions = (
    l: number | null,
    w: number | null,
    h: number | null,
    unit: string
  ) => {
    if (!l && !w && !h) return "—";
    const u =
      dimensionUnitOptions[unit as keyof typeof dimensionUnitOptions]?.label ||
      unit;
    return `${l || 0} × ${w || 0} × ${h || 0} ${u}`;
  };

  return (
    <Flex vertical gap={12} style={{ width: "100%" }}>
      {/* PRODUCT INFORMATION */}
      <ProductInfoHeader
        product={product}
        onViewStorefront={() =>
          window.open(`/products/${product.slug}`, "_blank")
        }
        onPreview={() => console.log("Preview")}
        onShare={() => console.log("Share")}
      />

      {/* CONTENT TABS */}
      <ProductContentTabs product={product} />

      {/* PRICING */}
      <PricingBlock
        title="Pricing"
        price={product.price}
        compareAtPrice={product.oldPrice}
        costPrice={product.costPrice}
        variants={
          product.isVariableProduct
            ? product.variants?.map((v) => ({
                id: v.id,
                title:
                  v.options?.map((o) => o.title).join(" / ") || v.sku || v.id,
                price: v.price,
                compareAtPrice: v.oldPrice || null,
                costPrice: v.costPrice || null,
                options: v.options?.map((opt) => ({
                  title: opt.title,
                  group: {
                    slug: opt.group.slug,
                    title: opt.group.title,
                  },
                })),
              }))
            : undefined
        }
        priceSource="manual"
        targetMargin={35}
        onViewLog={() => console.log("View price log")}
        onMoreAction={(action) => console.log("Pricing action:", action)}
        formatPrice={formatPrice}
      />

      {/* MEDIA SECTION */}
      <Section title="Media" onEdit={handleEditMedia}>
        {(() => {
          const showMore = product.gallery.length > 13;
          const gallerySlice = product.gallery.slice(0, showMore ? 12 : 13);
          const overlayItemsCount = gallerySlice.length + (showMore ? 1 : 0);

          return (
            <div className={styles.mediaGrid}>
              {gallerySlice.map((media) => (
                <Image
                  key={media.id}
                  src={media.url}
                  alt={media.name || ""}
                  className={styles.mediaImage}
                />
              ))}
              {showMore && (
                <Flex
                  align="center"
                  justify="center"
                  className={styles.mediaMoreButton}
                >
                  +{product.gallery.length - 12}
                </Flex>
              )}
              <div className={styles.mediaOverlay}>
                {Array.from({ length: overlayItemsCount }).map((_, idx) => (
                  <div key={`spacer-${idx}`} style={{ aspectRatio: "1/1" }} />
                ))}
                {Array.from({ length: 13 - gallerySlice.length }).map(
                  (_, idx) => (
                    <MediaFilePlaceholder key={`placeholder-${idx}`} />
                  )
                )}
              </div>
            </div>
          );
        })()}
      </Section>

      {/* INVENTORY */}
      <InventorySection
        onEdit={() => handleEdit("inventory")}
        product={product}
      />

      {/* CATEGORIES & TAGS */}
      <Flex gap={12}>
        <div style={{ flex: 1 }}>
          <Section
            title="Categories"
            onEdit={() => {
              openEditCategoriesModal({
                productId: product.id,
                primaryCategoryId: product.primaryCategory?.id ?? null,
                categoryIds: product.categories?.map((c) => c.id) || [],
                onSave: () => {
                  console.log("Saved categories:");
                  // TODO: Implement actual save logic
                },
              });
            }}
          >
            {product.primaryCategory || product.categories?.length > 0 ? (
              <Flex gap={4} wrap="wrap">
                {product.primaryCategory && (
                  <Tag color="blue-inverse">
                    {product.primaryCategory.title}
                  </Tag>
                )}
                {product.categories
                  ?.filter((cat) => cat.id !== product.primaryCategory?.id)
                  .map((cat) => (
                    <Tag key={cat.id} color="blue">
                      {cat.title}
                    </Tag>
                  ))}
              </Flex>
            ) : (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                No categories assigned
              </Typography.Text>
            )}
          </Section>
        </div>
        <div style={{ flex: 1 }}>
          <Section
            title="Tags"
            onEdit={() => {
              openEditTagsModal({
                productId: product.id,
                selectedTagIds: product.tags?.map((t) => t.id) || [],
                onSave: (data) => {
                  console.log("Saved tags:", data);
                  // TODO: Implement actual save logic
                },
              });
            }}
          >
            {product.tags?.length > 0 ? (
              <Flex gap={4} wrap="wrap">
                {product.tags.map((tag) => (
                  <Tag key={tag.id} variant="outlined">
                    {tag.title}
                  </Tag>
                ))}
              </Flex>
            ) : (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                No tags assigned
              </Typography.Text>
            )}
          </Section>
        </div>
      </Flex>

      {/* REVIEWS */}
      <Section title="Reviews" onEdit={() => handleEdit("reviews")}>
        <div className={styles.reviewsGrid}>
          {/* Left side - Average rating */}
          <Flex
            vertical
            align="center"
            justify="center"
            className={styles.reviewsLeft}
          >
            <Typography.Text className={styles.reviewsAverage}>
              4.2
            </Typography.Text>
            <Rate
              disabled
              allowHalf
              defaultValue={4.2}
              className={styles.reviewsRate}
            />
            <Typography.Text type="secondary" className={styles.reviewsCount}>
              128 reviews
            </Typography.Text>
          </Flex>

          {/* Right side - Rating breakdown */}
          <Flex vertical gap={4}>
            {[
              { stars: 5, count: 89, percent: 70 },
              { stars: 4, count: 24, percent: 19 },
              { stars: 3, count: 8, percent: 6 },
              { stars: 2, count: 4, percent: 3 },
              { stars: 1, count: 3, percent: 2 },
            ].map((item) => (
              <Flex
                key={item.stars}
                align="center"
                gap={8}
                className={styles.reviewBarRow}
              >
                <Flex align="center" gap={4} style={{ minWidth: 28 }}>
                  <span>{item.stars}</span>
                  <StarFilled className={styles.reviewStarIcon} />
                </Flex>
                <Progress
                  percent={item.percent}
                  showInfo={false}
                  strokeWidth={4}
                  strokeColor="#1677ff"
                  trailColor="var(--ant-color-fill-tertiary)"
                  size="small"
                  className={styles.reviewProgress}
                />
                <Typography.Text
                  type="secondary"
                  className={styles.reviewCountText}
                >
                  {item.count}
                </Typography.Text>
              </Flex>
            ))}
          </Flex>
        </div>
      </Section>

      {/* ATTRIBUTES */}
      <AttributesSection
        data={createAttributesMockData()}
        onEdit={() => openEditAttributesModal({ productId: product.id })}
      />

      {/* OPTIONS (variable products) */}
      {product.isVariableProduct && product.options?.length > 0 && (
        <Section
          title="Options"
          onEdit={() => openEditOptionsModal({ productId: product.id })}
        >
          <Flex vertical gap={8}>
            {product.options.map((option) => (
              <div key={option.id}>
                <Typography.Text className={styles.optionTitle}>
                  {option.title}
                </Typography.Text>
                <Flex gap={4} wrap="wrap">
                  {option.features?.map((f) => (
                    <Tag
                      key={f.id}
                      className={styles.optionTag}
                      variant="outlined"
                    >
                      {f.title}
                    </Tag>
                  ))}
                </Flex>
              </div>
            ))}
          </Flex>
        </Section>
      )}

      {/* VARIANTS TABLE (variable products) */}
      {product.isVariableProduct && product.variants?.length > 0 && (
        <Section
          title="Variants"
          onEdit={() => {
            openEditVariantsModal({
              productId: product.id,
              variants:
                product.variants?.map((v) => ({
                  id: v.id,
                  title:
                    v.title ||
                    v.options?.map((o) => o.title).join(" / ") ||
                    v.sku ||
                    v.id,
                  imageUrl: v.gallery?.[0]?.url || null,
                  // Inventory
                  sku: v.sku,
                  stock: Math.floor(Math.random() * 100), // TODO: get actual stock
                  barcode: null,
                  // Pricing
                  price: v.price,
                  compareAtPrice: v.oldPrice || null,
                  costPrice: v.costPrice || null,
                  // Shipping
                  weight: v.weight,
                  weightUnit: v.weightUnit,
                  length: v.length,
                  width: v.width,
                  height: v.height,
                  dimensionUnit: v.dimensionUnit,
                  // Options
                  options: v.options?.map((opt) => ({
                    title: opt.title,
                    group: {
                      slug: opt.group.slug,
                      title: opt.group.title,
                    },
                  })),
                })) || [],
              onSave: (
                updated: Array<{
                  id: string;
                  sku: string | null;
                  stock: number;
                  barcode: string | null;
                  price: number;
                  compareAtPrice: number | null;
                  costPrice: number | null;
                  weight: number | null;
                  weightUnit: string;
                  length: number | null;
                  width: number | null;
                  height: number | null;
                  dimensionUnit: string;
                }>
              ) => {
                console.log("Saved variants:", updated);
              },
            });
          }}
          extra={
            <Dropdown
              menu={{
                items: [
                  { key: "name_asc", label: "Name A → Z" },
                  { key: "name_desc", label: "Name Z → A" },
                  { type: "divider" },
                  { key: "price_asc", label: "Price: Low → High" },
                  { key: "price_desc", label: "Price: High → Low" },
                  { type: "divider" },
                  { key: "stock_asc", label: "Stock: Low → High" },
                  { key: "stock_desc", label: "Stock: High → Low" },
                  { type: "divider" },
                  { key: "created_desc", label: "Newest first" },
                  { key: "created_asc", label: "Oldest first" },
                ],
                onClick: ({ key }) => console.log("Sort variants:", key),
              }}
              trigger={["click"]}
            >
              <Button size="small" icon={<SortAscendingOutlined />}>
                Sort
              </Button>
            </Dropdown>
          }
        >
          <div
            style={{ overflowX: "auto", margin: "0 -12px", padding: "0 12px" }}
          >
            <table className={styles.variantsTable}>
              <thead>
                <tr>
                  <th>Variant</th>
                  <th>Pricing</th>
                  <th>Inventory</th>
                  <th>Attributes</th>
                  <th style={{ width: 48 }} />
                </tr>
              </thead>
              <tbody>
                {product.variants.map((variant) => {
                  const discountPercent =
                    variant.oldPrice && variant.oldPrice > variant.price
                      ? Math.round((1 - variant.price / variant.oldPrice) * 100)
                      : 0;

                  const stockStatusConfig: Record<
                    string,
                    { icon: string; color: string; label: string }
                  > = {
                    IN_STOCK: {
                      icon: "●",
                      color: "#52c41a",
                      label: "In Stock",
                    },
                    LOW_STOCK: {
                      icon: "○",
                      color: "#faad14",
                      label: "Low Stock",
                    },
                    OUT_OF_STOCK: {
                      icon: "✕",
                      color: "#ff4d4f",
                      label: "Out of Stock",
                    },
                    ON_BACKORDER: {
                      icon: "◐",
                      color: "#722ed1",
                      label: "Backorder",
                    },
                  };
                  const stockConfig = stockStatusConfig[
                    variant.stockStatus
                  ] || {
                    icon: "○",
                    color: "var(--ant-color-border)",
                    label: variant.stockStatus || "N/A",
                  };

                  return (
                    <tr key={variant.id}>
                      {/* VARIANT */}
                      <td>
                        <Flex align="flex-start" gap={8}>
                          {variant.gallery?.[0] ? (
                            <Image
                              src={variant.gallery[0].url}
                              alt=""
                              width={40}
                              height={40}
                              className={styles.variantImage}
                              preview={false}
                            />
                          ) : (
                            <div className={styles.variantImagePlaceholder} />
                          )}
                          <Flex vertical>
                            <Typography.Text
                              strong
                              className={styles.variantTitle}
                            >
                              {variant.title || variant.sku || "—"}
                            </Typography.Text>
                            {variant.options?.length > 0 && (
                              <Typography.Text
                                type="secondary"
                                className={styles.variantOptions}
                              >
                                {variant.options
                                  .map((o) => o.title)
                                  .join(" / ")}
                              </Typography.Text>
                            )}
                          </Flex>
                        </Flex>
                      </td>

                      {/* PRICING */}
                      <td>
                        <Flex vertical gap={0}>
                          <Typography.Text>
                            {formatPrice(variant.price)}
                          </Typography.Text>
                          {variant.oldPrice > 0 &&
                            variant.oldPrice !== variant.price && (
                              <Flex align="center" gap={4}>
                                <Typography.Text
                                  type="secondary"
                                  className={styles.priceStrikethrough}
                                >
                                  {formatPrice(variant.oldPrice)}
                                </Typography.Text>
                                {discountPercent > 0 && (
                                  <Typography.Text
                                    className={styles.discountPercent}
                                  >
                                    -{discountPercent}%
                                  </Typography.Text>
                                )}
                              </Flex>
                            )}
                        </Flex>
                      </td>

                      {/* INVENTORY */}
                      <td>
                        <Flex vertical>
                          <Typography.Text className={styles.variantSku}>
                            {variant.sku || "—"}
                          </Typography.Text>
                          <Flex align="center" gap={4}>
                            <span
                              className={styles.stockIcon}
                              style={{ color: stockConfig.color }}
                            >
                              {stockConfig.icon}
                            </span>
                            <Typography.Text
                              className={styles.stockLabel}
                              style={{ color: stockConfig.color }}
                            >
                              {stockConfig.label}
                            </Typography.Text>
                          </Flex>
                        </Flex>
                      </td>

                      {/* ATTRIBUTES */}
                      <td>
                        <Flex vertical>
                          <Typography.Text style={{ fontSize: 12 }}>
                            {variant.weight
                              ? `${variant.weight} ${
                                  weightUnitOptions[
                                    variant.weightUnit as keyof typeof weightUnitOptions
                                  ]?.label ||
                                  variant.weightUnit ||
                                  ""
                                }`
                              : "—"}
                          </Typography.Text>
                          <Typography.Text
                            type="secondary"
                            style={{ fontSize: 11 }}
                          >
                            {variant.length || variant.width || variant.height
                              ? `${variant.length || 0} × ${
                                  variant.width || 0
                                } × ${variant.height || 0} ${
                                  dimensionUnitOptions[
                                    variant.dimensionUnit as keyof typeof dimensionUnitOptions
                                  ]?.label ||
                                  variant.dimensionUnit ||
                                  ""
                                }`
                              : "—"}
                          </Typography.Text>
                        </Flex>
                      </td>

                      {/* ACTIONS */}
                      <td style={{ textAlign: "center" }}>
                        <Dropdown
                          menu={{
                            items: [
                              { key: "edit", label: "Edit" },
                              { key: "duplicate", label: "Duplicate" },
                              { type: "divider" },
                              { key: "delete", label: "Delete", danger: true },
                            ],
                            onClick: ({ key }) => {
                              console.log("Variant action:", key, variant.id);
                            },
                          }}
                          trigger={["click"]}
                        >
                          <Button
                            size="small"
                            type="text"
                            icon={<MoreOutlined />}
                          />
                        </Dropdown>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <Flex
            justify="space-between"
            align="center"
            className={styles.variantsPagination}
          >
            <Typography.Text
              type="secondary"
              className={styles.variantsPaginationCount}
            >
              {product.variants.length} variants
            </Typography.Text>
            <Flex gap={4}>
              <Button
                size="small"
                type="text"
                icon={<LeftOutlined />}
                disabled
              />
              <Button size="small" type="text" icon={<RightOutlined />} />
            </Flex>
          </Flex>
        </Section>
      )}

      {/* SHIPPING */}
      {!product.isVariableProduct && (
        <Section
          title="Shipping & Dimensions"
          onEdit={() => handleEdit("shipping")}
        >
          <Flex gap={8}>
            <Tile
              label="Weight"
              value={formatWeight(product.weight, product.weightUnit)}
              variant="success"
              centered
            />
            <Tile
              label="Dimensions"
              value={formatDimensions(
                product.length,
                product.width,
                product.height,
                product.dimensionUnit
              )}
              variant="info"
              centered
            />
            <Tile
              label="Shipping"
              value={product.requiresShipping ? "Required" : "Not required"}
              variant={product.requiresShipping ? "purple" : "default"}
              badge={
                <Tag
                  color={product.requiresShipping ? "blue" : "default"}
                  style={{ margin: 0 }}
                  variant="outlined"
                >
                  {product.requiresShipping ? "Active" : "Disabled"}
                </Tag>
              }
              centered
            />
          </Flex>
        </Section>
      )}

      {/* GROUPS/COMPONENTS */}
      {product.groups?.length > 0 && (
        <Section
          title="Components"
          onEdit={() => openEditComponentsModal({ productId: product.id })}
        >
          <Flex vertical gap={8}>
            {product.groups.map((group) => (
              <div key={group.id} className={styles.groupBox}>
                <Flex justify="space-between" align="center">
                  <Typography.Text strong className={styles.groupTitle}>
                    {group.title}
                  </Typography.Text>
                  <Flex gap={4}>
                    {group.isRequired && (
                      <Tag color="red" className={styles.groupTag}>
                        Required
                      </Tag>
                    )}
                    {group.isMultiple && (
                      <Tag
                        color="blue"
                        className={styles.groupTag}
                        variant="outlined"
                      >
                        Multiple
                      </Tag>
                    )}
                    <Typography.Text
                      type="secondary"
                      className={styles.groupItemsCount}
                    >
                      {group.items?.length || 0} items
                    </Typography.Text>
                  </Flex>
                </Flex>
                {group.items?.length > 0 && (
                  <Flex gap={4} wrap="wrap" className={styles.groupItems}>
                    {group.items.map((item) => (
                      <Tag key={item.id} className={styles.groupItemTag}>
                        {item.product?.options
                          ?.map((o) => o.title)
                          .join(" / ") ||
                          item.product?.sku ||
                          "—"}
                      </Tag>
                    ))}
                  </Flex>
                )}
              </div>
            ))}
          </Flex>
        </Section>
      )}

      {/* SEO */}
      <SeoBlock
        data={{
          seoTitle: product.seoTitle,
          seoDescription: product.seoDescription,
          title: product.title,
          excerpt: product.excerpt,
          slug: product.slug,
        }}
        onEdit={() =>
          openEditSeoModal({
            productId: product.id,
            productTitle: product.title,
            productSlug: product.slug,
            seoTitle: product.seoTitle,
            seoDescription: product.seoDescription,
            onSave: (
              values: Parameters<NonNullable<IEditSeoModalPayload["onSave"]>>[0]
            ) => {
              console.log("Saved SEO:", values);
              // TODO: Implement actual save logic
            },
          })
        }
      />

      {/* OPEN IN MODAL (TEST) */}
      <Button onClick={handleOpenProductModal}>Open in stacked modal</Button>
    </Flex>
  );
};
