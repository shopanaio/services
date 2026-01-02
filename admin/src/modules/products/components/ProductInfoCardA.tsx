import { Paper } from '@components/paper/Paper';
import { Flex } from '@components/utility/Flex';
import { Box } from '@components/utility/Box';
import { css } from '@emotion/react';
import {
  Button,
  Image,
  Tag,
  Typography,
  Descriptions,
  Rate,
  Progress,
  Select,
  Dropdown,
  Tooltip,
  Skeleton,
} from 'antd';
import {
  EditOutlined,
  StarFilled,
  MoreOutlined,
  InfoCircleOutlined,
  ClockCircleFilled,
  WarningOutlined,
  StopOutlined,
  ExclamationCircleFilled,
} from '@ant-design/icons';
import { ReactNode, useState, useMemo } from 'react';
import { MediaFilePlaceholder } from '@components/media/control/Placeholder';
import { IProduct } from '@src/entity/Product/Product';
import { useIntl } from 'react-intl';
import { t } from '@modules/products/i18n/messages';
import { t as tCommon } from '@src/lang/messages';
import {
  dimensionUnitOptions,
  weightUniOptions,
} from '@src/defs/constants';
import { PricingBlock } from './pricing/PricingBlock';
import { ProductInfoHeader } from './ProductInfoHeader';

// ============================================================================
// Inventory Types & Mock Data
// ============================================================================

type SyncStatus = 'synced' | 'stale' | 'error' | 'syncing';

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
  thresholdType: 'safety_stock' | 'reorder_point';
}

const getMockWarehouseStock = (): IWarehouseStock[] => {
  const now = new Date();
  return [
    {
      warehouseId: 'wh-1',
      warehouseName: 'Main Warehouse',
      warehouseCode: 'MAIN',
      isDefault: true,
      onHandQty: 756,
      reservedQty: 45,
      availableQty: 711,
      totalSKUs: 45,
      lowStockSKUs: 8,
      outOfStockSKUs: 4,
      backorderSKUs: 2,
      lastSyncAt: new Date(now.getTime() - 3 * 60 * 1000),
      syncStatus: 'synced',
    },
    {
      warehouseId: 'wh-2',
      warehouseName: 'Store #1',
      warehouseCode: 'ST1',
      isDefault: false,
      onHandQty: 198,
      reservedQty: 12,
      availableQty: 186,
      totalSKUs: 45,
      lowStockSKUs: 5,
      outOfStockSKUs: 3,
      backorderSKUs: 1,
      lastSyncAt: new Date(now.getTime() - 8 * 60 * 1000),
      syncStatus: 'synced',
    },
    {
      warehouseId: 'wh-3',
      warehouseName: 'Store #2',
      warehouseCode: 'ST2',
      isDefault: false,
      onHandQty: 78,
      reservedQty: 8,
      availableQty: 70,
      totalSKUs: 45,
      lowStockSKUs: 3,
      outOfStockSKUs: 2,
      backorderSKUs: 1,
      lastSyncAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      syncStatus: 'stale',
    },
  ];
};

const calculateInventoryStats = (
  warehouses: IWarehouseStock[],
  selectedWarehouseId?: string,
): IInventoryStats => {
  if (selectedWarehouseId) {
    const wh = warehouses.find((w) => w.warehouseId === selectedWarehouseId);
    if (wh) {
      const lowPct = wh.totalSKUs > 0 ? Math.round((wh.lowStockSKUs / wh.totalSKUs) * 100) : 0;
      const outPct = wh.totalSKUs > 0 ? Math.round((wh.outOfStockSKUs / wh.totalSKUs) * 100) : 0;
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
        thresholdType: 'safety_stock',
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

  const latestSync = warehouses.reduce((latest, w) =>
    w.lastSyncAt > latest ? w.lastSyncAt : latest, warehouses[0]?.lastSyncAt || new Date());
  const hasStale = warehouses.some((w) => w.syncStatus === 'stale');
  const hasError = warehouses.some((w) => w.syncStatus === 'error');

  return {
    availableQty,
    onHandQty,
    reservedQty,
    totalSKUs,
    lowStockSKUs,
    lowStockPercent: totalSKUs > 0 ? Math.round((lowStockSKUs / totalSKUs) * 100) : 0,
    outOfStockSKUs,
    outOfStockPercent: totalSKUs > 0 ? Math.round((outOfStockSKUs / totalSKUs) * 100) : 0,
    backorderSKUs,
    pendingOrders: reservedQty > 0 ? Math.ceil(reservedQty / 5) : 0,
    lastSyncAt: latestSync,
    syncStatus: hasError ? 'error' : hasStale ? 'stale' : 'synced',
    changeVs7d: -12,
    thresholdType: 'safety_stock',
  };
};

// ============================================================================
// Styles
// ============================================================================

const sectionStyles = css`
  padding: var(--x3);
  min-height: auto;
`;

const sectionHeaderStyles = css`
  margin-bottom: var(--x2);
  padding-bottom: var(--x2);
  border-bottom: 1px solid var(--color-gray-3);
`;

const mediaGridStyles = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, 70px);
  grid-gap: var(--x2);
  position: relative;

  & > *:nth-child(1) {
    grid-column-start: span 2;
    grid-row-start: span 2;
  }
`;

const mediaOverlayStyles = css`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, 70px);
  grid-gap: var(--x2);
  overflow: hidden;
  max-height: 160px;
  pointer-events: none;

  & > *:nth-child(1) {
    grid-column-start: span 2;
    grid-row-start: span 2;
  }
`;

const mediaImageStyles = css`
  width: 100%;
  aspect-ratio: 1/1;
  object-fit: cover;
  border-radius: 4px;
`;

const statBoxStyles = css`
  text-align: center;
  padding: var(--x2) var(--x3);
  background: var(--color-gray-1);
  border-radius: 8px;
  flex: 1;
`;

// ============================================================================
// Sub-components
// ============================================================================

interface ISectionProps {
  title: string;
  name: string;
  children: ReactNode;
  onEdit?: () => void;
  extra?: ReactNode;
}

const Section = ({ title, name, children, onEdit, extra }: ISectionProps) => (
  <Paper css={sectionStyles}>
    <Flex align="center" justify="space-between" css={sectionHeaderStyles}>
      <Flex align="center" gap="3" css={css`flex: 1;`}>
        <Typography.Text
          strong
          css={css`
            font-size: 13px;
          `}
        >
          {title}
        </Typography.Text>
        {extra && <Box css={css`flex: 1;`}>{extra}</Box>}
      </Flex>
      {onEdit && (
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={onEdit}
          data-testid={`${name}-edit-button`}
          css={css`
            height: 24px;
            padding: 0 8px;
          `}
        />
      )}
    </Flex>
    <div>{children}</div>
  </Paper>
);

interface IStatBoxProps {
  label: string;
  value: ReactNode;
  color?: string;
}

const StatBox = ({ label, value, color }: IStatBoxProps) => (
  <Box css={statBoxStyles}>
    <Typography.Text
      css={css`
        font-size: 18px;
        font-weight: 600;
        display: block;
        ${color ? `color: ${color};` : ''}
      `}
    >
      {value}
    </Typography.Text>
    <Typography.Text
      type="secondary"
      css={css`
        font-size: 11px;
      `}
    >
      {label}
    </Typography.Text>
  </Box>
);

// ============================================================================
// Inventory Section Components (Enterprise)
// ============================================================================

// Design tokens
const inventoryTokens = {
  cardPadding: 12,
  tileGap: 8,
  borderRadius: 8,
  borderColor: 'var(--color-gray-3)',
  valueFontSize: 20,
  labelFontSize: 11,
  helperFontSize: 10,
  colors: {
    text: 'var(--color-gray-9)',
    success: '#52c41a',
    info: '#1677ff',
    warning: '#faad14',
    danger: '#ff4d4f',
    purple: '#722ed1',
  },
};

// Styles for inventory components
const inventoryCardStyles = css`
  padding: ${inventoryTokens.cardPadding}px;
  border-radius: ${inventoryTokens.borderRadius}px;
`;

const inventoryHeaderStyles = css`
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid ${inventoryTokens.borderColor};
`;

const kpiTileStyles = css`
  padding: 8px 12px;
  background: var(--color-gray-1);
  border-radius: 6px;
  border: 1px solid var(--color-gray-3);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    background: var(--color-gray-2);
    border-color: var(--color-gray-4);
  }

  &.active {
    border-color: var(--color-primary);
    background: var(--color-primary-bg);
  }
`;

const kpiTilePrimaryStyles = css`
  ${kpiTileStyles};
  flex: 1.5;
  border-left: 2px solid ${inventoryTokens.colors.success};
`;

const tilesGroupStyles = css`
  display: flex;
  gap: ${inventoryTokens.tileGap}px;
  & > * {
    flex: 1;
  }
`;

// Warehouse Select
interface IWarehouseSelectProps {
  warehouses: IWarehouseStock[];
  selectedWarehouseId?: string;
  onSelect: (warehouseId?: string) => void;
}

const WarehouseSelect = ({
  warehouses,
  selectedWarehouseId,
  onSelect,
}: IWarehouseSelectProps) => (
  <Select
    value={selectedWarehouseId || 'all'}
    onChange={(value) => onSelect(value === 'all' ? undefined : value)}
    size="small"
    popupMatchSelectWidth={false}
    css={css`
      min-width: 140px;
      .ant-select-selector {
        font-size: 12px !important;
      }
    `}
  >
    <Select.Option value="all">All Warehouses</Select.Option>
    {warehouses.map((wh) => (
      <Select.Option key={wh.warehouseId} value={wh.warehouseId}>
        {wh.warehouseName} ({wh.availableQty.toLocaleString()})
      </Select.Option>
    ))}
  </Select>
);

// Actions Dropdown
interface IInventoryActionsProps {
  onAction: (action: string) => void;
}

const InventoryActions = ({ onAction }: IInventoryActionsProps) => {
  const items = [
    { key: 'adjust', label: 'Adjust stock' },
    { key: 'transfer', label: 'Transfer' },
    { key: 'reserve', label: 'Reserve' },
    { key: 'recount', label: 'Recount' },
    { type: 'divider' as const },
    { key: 'export', label: 'Export' },
  ];

  return (
    <Dropdown
      menu={{
        items,
        onClick: ({ key }) => onAction(key),
      }}
      trigger={['click']}
    >
      <Button size="small" icon={<MoreOutlined />}>
        Actions
      </Button>
    </Dropdown>
  );
};

// KPI Tile Component
type KPIVariant = 'default' | 'primary' | 'warning' | 'danger' | 'info' | 'purple';

interface IKPITileProps {
  label: string;
  tooltip?: string;
  value: ReactNode;
  secondary?: ReactNode;
  variant?: KPIVariant;
  badge?: ReactNode;
  active?: boolean;
  onClick?: () => void;
  isPrimary?: boolean;
}

const getVariantStyles = (variant: KPIVariant) => {
  const colors: Record<KPIVariant, { border?: string; badge?: string }> = {
    default: {},
    primary: { border: inventoryTokens.colors.success, badge: inventoryTokens.colors.success },
    warning: { border: inventoryTokens.colors.warning, badge: inventoryTokens.colors.warning },
    danger: { border: inventoryTokens.colors.danger, badge: inventoryTokens.colors.danger },
    info: { border: inventoryTokens.colors.info, badge: inventoryTokens.colors.info },
    purple: { border: inventoryTokens.colors.purple, badge: inventoryTokens.colors.purple },
  };
  return colors[variant];
};

const KPITile = ({
  label,
  tooltip,
  value,
  secondary,
  variant = 'default',
  badge,
  active,
  onClick,
  isPrimary,
}: IKPITileProps) => {
  const variantStyles = getVariantStyles(variant);

  return (
    <Box
      css={css`
        ${isPrimary ? kpiTilePrimaryStyles : kpiTileStyles};
        ${variantStyles.border && !isPrimary ? `border-left: 2px solid ${variantStyles.border};` : ''}
        ${active ? 'border-color: var(--color-primary); background: var(--color-primary-bg);' : ''}
      `}
      onClick={onClick}
    >
      {/* Top: Label + Tooltip + Badge */}
      <Flex align="center" gap="1" css={css`margin-bottom: 2px;`}>
        <Typography.Text
          css={css`
            font-size: ${inventoryTokens.labelFontSize}px;
            font-weight: 500;
            color: var(--color-gray-7);
            text-transform: uppercase;
            letter-spacing: 0.3px;
          `}
        >
          {label}
        </Typography.Text>
        {tooltip && (
          <Tooltip title={tooltip}>
            <InfoCircleOutlined
              css={css`
                font-size: 10px;
                color: var(--color-gray-5);
                cursor: help;
              `}
            />
          </Tooltip>
        )}
        {badge && (
          <Box css={css`margin-left: auto;`}>
            {badge}
          </Box>
        )}
      </Flex>

      {/* Middle: Value */}
      <Typography.Text
        css={css`
          font-size: ${isPrimary ? inventoryTokens.valueFontSize : 18}px;
          font-weight: 600;
          display: block;
          line-height: 1.2;
          color: ${inventoryTokens.colors.text};
        `}
      >
        {value}
      </Typography.Text>

      {/* Bottom: Secondary info */}
      {secondary && (
        <Typography.Text
          css={css`
            font-size: ${inventoryTokens.helperFontSize}px;
            color: var(--color-gray-6);
            display: block;
            margin-top: 2px;
          `}
        >
          {secondary}
        </Typography.Text>
      )}
    </Box>
  );
};

// Inventory Section Header
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
}: IInventoryHeaderProps) => (
  <Flex align="center" justify="space-between" css={inventoryHeaderStyles}>
    <Flex align="center" gap="3">
      <Typography.Text strong css={css`font-size: 13px;`}>
        Inventory
      </Typography.Text>
      <WarehouseSelect
        warehouses={warehouses}
        selectedWarehouseId={selectedWarehouseId}
        onSelect={onWarehouseSelect}
      />
    </Flex>
    <InventoryActions onAction={onAction} />
  </Flex>
);

// Loading State
const InventoryLoadingSkeleton = () => (
  <Paper css={inventoryCardStyles}>
    <Flex align="center" justify="space-between" css={inventoryHeaderStyles}>
      <Flex align="center" gap="3">
        <Skeleton.Input size="small" active style={{ width: 70 }} />
        <Skeleton.Input size="small" active style={{ width: 140 }} />
        <Skeleton.Input size="small" active style={{ width: 100 }} />
      </Flex>
      <Skeleton.Button size="small" active />
    </Flex>
    <Flex direction="column" gap="3">
      <Flex gap="3">
        <Skeleton.Node active style={{ width: '100%', height: 80 }}>
          <div />
        </Skeleton.Node>
        <Skeleton.Node active style={{ width: '100%', height: 80 }}>
          <div />
        </Skeleton.Node>
        <Skeleton.Node active style={{ width: '100%', height: 80 }}>
          <div />
        </Skeleton.Node>
      </Flex>
    </Flex>
  </Paper>
);

// Empty/No Data State
const InventoryNoData = () => (
  <Paper css={inventoryCardStyles}>
    <Flex
      direction="column"
      align="center"
      justify="center"
      gap="2"
      css={css`padding: 32px 16px; color: var(--color-gray-6);`}
    >
      <StopOutlined css={css`font-size: 24px;`} />
      <Typography.Text type="secondary">No inventory sync for this product</Typography.Text>
      <Button size="small" type="link">Set up inventory tracking</Button>
    </Flex>
  </Paper>
);

// Main Inventory Section
interface IInventorySectionProps {
  onEdit?: () => void;
}

type InventoryState = 'loading' | 'no_data' | 'ready';

const useInventoryData = () => {
  return useMemo(() => getMockWarehouseStock(), []);
};

const InventorySection = ({ onEdit }: IInventorySectionProps) => {
  const warehouses = useInventoryData();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | undefined>();
  const [activeKPI, setActiveKPI] = useState<string | undefined>();

  // Simulate different states (in real app would come from API)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [inventoryState] = useState<InventoryState>('ready');

  const stats = useMemo(
    () => calculateInventoryStats(warehouses, selectedWarehouseId),
    [warehouses, selectedWarehouseId],
  );

  const handleAction = (action: string) => {
    console.log('Inventory action:', action);
    if (action === 'adjust' || action === 'transfer' || action === 'reserve') {
      onEdit?.();
    }
  };

  const handleKPIClick = (kpi: string) => {
    setActiveKPI(activeKPI === kpi ? undefined : kpi);
    // In real app, this would filter a table below
  };

  if (inventoryState === 'loading') {
    return <InventoryLoadingSkeleton />;
  }

  if (inventoryState === 'no_data') {
    return <InventoryNoData />;
  }

  return (
    <Paper css={inventoryCardStyles}>
      {/* Header */}
      <InventoryHeader
        warehouses={warehouses}
        selectedWarehouseId={selectedWarehouseId}
        onWarehouseSelect={setSelectedWarehouseId}
        onAction={handleAction}
      />


      {/* Section A: Quantity */}
      <Typography.Text
        type="secondary"
        css={css`font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; display: block;`}
      >
        Quantity
      </Typography.Text>
      <Box css={tilesGroupStyles}>
        <KPITile
          label="Available"
          tooltip="Units available for sale (On Hand minus Reserved)"
          value={stats.availableQty.toLocaleString()}
          secondary={`across ${stats.totalSKUs} SKUs`}
          variant="primary"
          isPrimary
          badge={<Tag color="success" css={css`margin: 0; font-size: 9px; line-height: 14px; padding: 0 4px;`}>Sellable</Tag>}
          active={activeKPI === 'available'}
          onClick={() => handleKPIClick('available')}
        />
        <KPITile
          label="On Hand"
          tooltip="Total physical units in warehouse"
          value={stats.onHandQty.toLocaleString()}
          secondary={stats.changeVs7d !== 0 ? `${stats.changeVs7d > 0 ? '+' : ''}${stats.changeVs7d} vs 7d` : undefined}
          active={activeKPI === 'onhand'}
          onClick={() => handleKPIClick('onhand')}
        />
        <KPITile
          label="Reserved"
          tooltip="Units allocated to pending orders"
          value={stats.reservedQty.toLocaleString()}
          secondary={stats.pendingOrders > 0 ? `${stats.pendingOrders} orders` : undefined}
          variant={stats.reservedQty > 0 ? 'info' : 'default'}
          badge={stats.reservedQty > 0 ? <Tag color="blue" css={css`margin: 0; font-size: 9px; line-height: 14px; padding: 0 4px;`}>Reserved</Tag> : undefined}
          active={activeKPI === 'reserved'}
          onClick={() => handleKPIClick('reserved')}
        />
      </Box>

      {/* Section B: Health */}
      <Typography.Text
        type="secondary"
        css={css`font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin: 12px 0 6px; display: block;`}
      >
        Health
      </Typography.Text>
      <Box css={tilesGroupStyles}>
        <KPITile
          label="Low Stock"
          tooltip={`SKUs below ${stats.thresholdType === 'safety_stock' ? 'safety stock' : 'reorder point'} threshold`}
          value={`${stats.lowStockSKUs} SKUs`}
          secondary={`${stats.lowStockPercent}% of catalog`}
          variant={stats.lowStockSKUs > 0 ? 'warning' : 'default'}
          badge={
            stats.lowStockSKUs > 0 ? (
              <WarningOutlined css={css`color: ${inventoryTokens.colors.warning}; font-size: 11px;`} />
            ) : undefined
          }
          active={activeKPI === 'lowstock'}
          onClick={() => handleKPIClick('lowstock')}
        />
        <KPITile
          label="Out of Stock"
          tooltip="SKUs with zero available units"
          value={`${stats.outOfStockSKUs} SKUs`}
          secondary={`${stats.outOfStockPercent}% of catalog`}
          variant={stats.outOfStockSKUs > 0 ? 'danger' : 'default'}
          badge={
            stats.outOfStockSKUs > 0 ? (
              <StopOutlined css={css`color: ${inventoryTokens.colors.danger}; font-size: 11px;`} />
            ) : undefined
          }
          active={activeKPI === 'outofstock'}
          onClick={() => handleKPIClick('outofstock')}
        />
        {stats.backorderSKUs > 0 && (
          <KPITile
            label="Backorder"
            tooltip="SKUs with incoming stock expected"
            value={`${stats.backorderSKUs} SKUs`}
            secondary="ETA avg 5d"
            variant="purple"
            badge={<ClockCircleFilled css={css`color: ${inventoryTokens.colors.purple}; font-size: 11px;`} />}
            active={activeKPI === 'backorder'}
            onClick={() => handleKPIClick('backorder')}
          />
        )}
      </Box>
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
  const { formatMessage } = useIntl();

  const handleEdit = (section: string) => onEditSection?.(section);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(price / 100);

  const formatWeight = (weight: number | null, unit: string) => {
    if (!weight) return '—';
    return `${weight} ${
      weightUniOptions[unit as keyof typeof weightUniOptions]?.label || unit
    }`;
  };

  const formatDimensions = (
    l: number | null,
    w: number | null,
    h: number | null,
    unit: string,
  ) => {
    if (!l && !w && !h) return '—';
    const u =
      dimensionUnitOptions[unit as keyof typeof dimensionUnitOptions]?.label ||
      unit;
    return `${l || 0} × ${w || 0} × ${h || 0} ${u}`;
  };

  return (
    <Flex
      direction="column"
      gap="3"
      css={css`
        width: 100%;
      `}
    >
      {/* ================================================================== */}
      {/* PRODUCT INFORMATION - Enterprise CMS Style */}
      {/* ================================================================== */}
      <ProductInfoHeader
        product={product}
        onEditSection={handleEdit}
        onViewStorefront={() => window.open(`/products/${product.slug}`, '_blank')}
        onPreview={() => console.log('Preview')}
        onShare={() => console.log('Share')}
      />

      {/* ================================================================== */}
      {/* PRICING (Enterprise Block) */}
      {/* ================================================================== */}
      <PricingBlock
        title={formatMessage({ id: t('product.pricing.title') })}
        price={product.price}
        compareAtPrice={product.oldPrice}
        costPrice={product.costPrice}
        variants={
          product.isVariableProduct
            ? product.variants?.map((v) => ({
                id: v.id,
                title: v.options?.map((o) => o.title).join(' / ') || v.sku || v.id,
                price: v.price,
                compareAtPrice: v.oldPrice || null,
                costPrice: v.costPrice || null,
              }))
            : undefined
        }
        priceSource="manual"
        targetMargin={35}
        onViewLog={() => console.log('View price log')}
        onMoreAction={(action) => console.log('Pricing action:', action)}
        formatPrice={formatPrice}
      />

      {/* ================================================================== */}
      {/* MEDIA SECTION */}
      {/* ================================================================== */}
      <Section
        title={formatMessage({ id: t('product.media.title') })}
        name="media"
        onEdit={() => handleEdit('media')}
      >
        {(() => {
          const gallerySlice = product.gallery?.slice(0, product.cover ? 5 : 6) || [];
          const hasMore = (product.gallery?.length || 0) > (product.cover ? 5 : 6);
          const overlayItemsCount = (product.cover ? 1 : 0) + gallerySlice.length + (hasMore ? 1 : 0);

          return (
            <div css={mediaGridStyles}>
              {product.cover && (
                <Image
                  src={product.cover.url}
                  alt={product.title}
                  css={mediaImageStyles}
                />
              )}
              {gallerySlice.map((media) => (
                <Image
                  key={media.id}
                  src={media.url}
                  alt={media.name || ''}
                  css={mediaImageStyles}
                />
              ))}
              {hasMore && (
                <Flex
                  align="center"
                  justify="center"
                  css={css`
                    aspect-ratio: 1/1;
                    background: var(--color-gray-3);
                    border-radius: 4px;
                    font-size: 12px;
                  `}
                >
                  +{product.gallery.length - (product.cover ? 5 : 6)}
                </Flex>
              )}
              <Box css={mediaOverlayStyles}>
                {Array.from({ length: overlayItemsCount }).map((_, idx) => (
                  <div
                    key={`spacer-${idx}`}
                    css={css`
                      aspect-ratio: 1/1;
                    `}
                  />
                ))}
                {Array.from({ length: 20 }).map((_, idx) => (
                  <MediaFilePlaceholder key={`placeholder-${idx}`} />
                ))}
              </Box>
            </div>
          );
        })()}
      </Section>

      {/* ================================================================== */}
      {/* INVENTORY */}
      {/* ================================================================== */}
      <InventorySection onEdit={() => handleEdit('inventory')} />

      {/* ================================================================== */}
      {/* CATEGORIES & TAGS */}
      {/* ================================================================== */}
      <Flex gap="3">
        <Box
          css={css`
            flex: 1;
          `}
        >
          <Section
            title={formatMessage({ id: t('product.categories.title') })}
            name="categories"
            onEdit={() => handleEdit('categories')}
          >
            {product.primaryCategory || product.categories?.length > 0 ? (
              <Flex gap="1" wrap="wrap">
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
              <Typography.Text
                type="secondary"
                css={css`
                  font-size: 12px;
                `}
              >
                {formatMessage({ id: t('product.categories.empty') })}
              </Typography.Text>
            )}
          </Section>
        </Box>
        <Box
          css={css`
            flex: 1;
          `}
        >
          <Section
            title={formatMessage({ id: t('product.tags.title') })}
            name="tags"
            onEdit={() => handleEdit('tags')}
          >
            {product.tags?.length > 0 ? (
              <Flex gap="1" wrap="wrap">
                {product.tags.map((tag) => (
                  <Tag key={tag.id}>{tag.title}</Tag>
                ))}
              </Flex>
            ) : (
              <Typography.Text
                type="secondary"
                css={css`
                  font-size: 12px;
                `}
              >
                {formatMessage({ id: t('product.tags.empty') })}
              </Typography.Text>
            )}
          </Section>
        </Box>
      </Flex>

      {/* ================================================================== */}
      {/* COLLECTIONS & REVIEWS */}
      {/* ================================================================== */}
      <Flex gap="3">
        <Box
          css={css`
            flex: 1;
          `}
        >
          <Section
            title="Collections"
            name="collections"
            onEdit={() => handleEdit('collections')}
          >
            <Typography.Text
              type="secondary"
              css={css`
                font-size: 12px;
              `}
            >
              No collections assigned
            </Typography.Text>
          </Section>
        </Box>
        <Box
          css={css`
            flex: 1;
          `}
        >
          <Section
            title="Reviews"
            name="reviews"
            onEdit={() => handleEdit('reviews')}
          >
            <Flex gap="4">
              {/* Left side - Average rating */}
              <Flex
                direction="column"
                align="center"
                justify="center"
                css={css`
                  min-width: 100px;
                  padding-right: var(--x3);
                  border-right: 1px solid var(--color-gray-3);
                `}
              >
                <Typography.Text
                  css={css`
                    font-size: 32px;
                    font-weight: 600;
                    line-height: 1;
                  `}
                >
                  4.2
                </Typography.Text>
                <Rate
                  disabled
                  allowHalf
                  defaultValue={4.2}
                  css={css`
                    font-size: 12px;
                    margin: 4px 0;
                  `}
                />
                <Typography.Text
                  type="secondary"
                  css={css`
                    font-size: 11px;
                  `}
                >
                  128 reviews
                </Typography.Text>
              </Flex>

              {/* Right side - Rating breakdown */}
              <Flex
                direction="column"
                gap="1"
                css={css`
                  flex: 1;
                `}
              >
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
                    gap="2"
                    css={css`
                      font-size: 11px;
                    `}
                  >
                    <Flex
                      align="center"
                      gap="1"
                      css={css`
                        min-width: 28px;
                      `}
                    >
                      <span>{item.stars}</span>
                      <StarFilled
                        css={css`
                          font-size: 10px;
                          color: #fadb14;
                        `}
                      />
                    </Flex>
                    <Progress
                      percent={item.percent}
                      showInfo={false}
                      strokeColor="#fadb14"
                      trailColor="var(--color-gray-3)"
                      size="small"
                      css={css`
                        flex: 1;
                        margin: 0;
                        .ant-progress-inner {
                          height: 6px !important;
                        }
                      `}
                    />
                    <Typography.Text
                      type="secondary"
                      css={css`
                        min-width: 24px;
                        text-align: right;
                        font-size: 11px;
                      `}
                    >
                      {item.count}
                    </Typography.Text>
                  </Flex>
                ))}
              </Flex>
            </Flex>
          </Section>
        </Box>
      </Flex>

      {/* ================================================================== */}
      {/* OPTIONS (variable products) */}
      {/* ================================================================== */}
      {product.isVariableProduct && product.options?.length > 0 && (
        <Section
          title={formatMessage({ id: t('products.options.title') })}
          name="options"
          onEdit={() => handleEdit('options')}
        >
          <Flex direction="column" gap="2">
            {product.options.map((option) => (
              <Box key={option.id}>
                <Typography.Text
                  css={css`
                    font-size: 12px;
                    color: var(--color-gray-7);
                    display: block;
                    margin-bottom: 4px;
                  `}
                >
                  {option.title}
                </Typography.Text>
                <Flex gap="1" wrap="wrap">
                  {option.features?.map((f) => (
                    <Tag
                      key={f.id}
                      css={css`
                        margin: 0;
                      `}
                    >
                      {f.title}
                    </Tag>
                  ))}
                </Flex>
              </Box>
            ))}
          </Flex>
        </Section>
      )}

      {/* ================================================================== */}
      {/* SHIPPING */}
      {/* ================================================================== */}
      {!product.isVariableProduct && (
        <Section
          title={formatMessage({ id: t('product.parameters.title') })}
          name="shipping"
          onEdit={() => handleEdit('shipping')}
        >
          <Flex gap="3">
            <StatBox
              label={formatMessage({ id: t('products.filters.weight.label') })}
              value={formatWeight(product.weight, product.weightUnit)}
            />
            <StatBox
              label="Dimensions"
              value={formatDimensions(
                product.length,
                product.width,
                product.height,
                product.dimensionUnit,
              )}
            />
            <StatBox
              label="Shipping"
              value={
                <Tag
                  color={product.requiresShipping ? 'blue' : 'default'}
                  css={css`
                    margin: 0;
                  `}
                >
                  {product.requiresShipping ? 'Required' : 'Not required'}
                </Tag>
              }
            />
          </Flex>
        </Section>
      )}

      {/* ================================================================== */}
      {/* ATTRIBUTES */}
      {/* ================================================================== */}
      {product.attributes?.length > 0 && (
        <Section
          title="Attributes"
          name="attributes"
          onEdit={() => handleEdit('attributes')}
        >
          <Descriptions
            size="small"
            column={1}
            bordered
            colon={false}
            css={css`
              .ant-descriptions-item {
                padding-bottom: 4px !important;
              }
              .ant-descriptions-item-label {
                color: var(--color-gray-7);
                font-size: 12px;
                min-width: 120px;
              }
              .ant-descriptions-item-content {
                font-size: 13px;
              }
            `}
          >
            {product.attributes.map((attr) => (
              <Descriptions.Item key={attr.id} label={attr.title}>
                {attr.features?.map((f) => f.title).join(', ') || '—'}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Section>
      )}

      {/* ================================================================== */}
      {/* GROUPS/COMPONENTS */}
      {/* ================================================================== */}
      {product.groups?.length > 0 && (
        <Section
          title="Components"
          name="groups"
          onEdit={() => handleEdit('groups')}
        >
          <Flex direction="column" gap="2">
            {product.groups.map((group) => (
              <Box
                key={group.id}
                css={css`
                  padding: 10px 12px;
                  background: var(--color-gray-1);
                  border-radius: 6px;
                `}
              >
                <Flex justify="space-between" align="center">
                  <Typography.Text
                    strong
                    css={css`
                      font-size: 13px;
                    `}
                  >
                    {group.title}
                  </Typography.Text>
                  <Flex gap="1">
                    {group.isRequired && (
                      <Tag
                        color="red"
                        css={css`
                          margin: 0;
                          font-size: 10px;
                        `}
                      >
                        Required
                      </Tag>
                    )}
                    {group.isMultiple && (
                      <Tag
                        color="blue"
                        css={css`
                          margin: 0;
                          font-size: 10px;
                        `}
                      >
                        Multiple
                      </Tag>
                    )}
                    <Typography.Text
                      type="secondary"
                      css={css`
                        font-size: 11px;
                      `}
                    >
                      {group.items?.length || 0} items
                    </Typography.Text>
                  </Flex>
                </Flex>
              </Box>
            ))}
          </Flex>
        </Section>
      )}

      {/* ================================================================== */}
      {/* SEO */}
      {/* ================================================================== */}
      <Section
        title={formatMessage({ id: tCommon('common.seo') })}
        name="seo"
        onEdit={() => handleEdit('seo')}
        extra={
          (() => {
            const seoIssuesCount = (!product.seoTitle ? 1 : 0) + (!product.seoDescription ? 1 : 0);
            return seoIssuesCount > 0 ? (
              <Flex align="center" gap="1">
                <ExclamationCircleFilled css={css`color: #ff4d4f; font-size: 12px;`} />
                <Typography.Text css={css`font-size: 11px; color: #ff4d4f;`}>
                  {seoIssuesCount} {seoIssuesCount === 1 ? 'issue' : 'issues'}
                </Typography.Text>
              </Flex>
            ) : null;
          })()
        }
      >
        <Box
          css={css`
            background: var(--color-gray-1);
            border-radius: 6px;
            padding: 12px 16px;
          `}
        >
          {/* Google Preview */}
          <Typography.Text
            type="secondary"
            css={css`font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;`}
          >
            Search preview
          </Typography.Text>
          <Box css={css`margin-top: 8px;`}>
            <Typography.Text
              css={css`
                font-size: 16px;
                color: #1a0dab;
                display: block;
                line-height: 1.3;
                &:hover { text-decoration: underline; }
              `}
            >
              {product.seoTitle || product.title || 'Untitled Product'}
            </Typography.Text>
            <Typography.Text
              css={css`
                font-size: 12px;
                color: #006621;
                display: block;
                margin-top: 2px;
              `}
            >
              yourstore.com › products › {product.slug}
            </Typography.Text>
            <Typography.Text
              type="secondary"
              css={css`
                margin-top: 4px;
                font-size: 13px;
                display: block;
                line-height: 1.5;
              `}
            >
              {product.seoDescription || product.excerpt || 'No description available for this product.'}
            </Typography.Text>
          </Box>

          {/* Configure button if no custom SEO */}
          {!product.seoTitle && !product.seoDescription && (
            <Flex
              align="center"
              gap="2"
              css={css`
                margin-top: 12px;
                padding-top: 12px;
                border-top: 1px solid var(--color-gray-3);
              `}
            >
              <WarningOutlined css={css`color: #faad14; font-size: 12px;`} />
              <Typography.Text type="secondary" css={css`font-size: 11px;`}>
                Using auto-generated SEO data
              </Typography.Text>
            </Flex>
          )}
        </Box>
      </Section>
    </Flex>
  );
};
