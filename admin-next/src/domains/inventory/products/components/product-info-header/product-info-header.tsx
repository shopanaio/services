import { createStyles } from "antd-style";
import {
  Avatar,
  Button,
  Tag,
  Typography,
  Dropdown,
  Tooltip,
  Popover,
  Flex,
  Divider,
  Input,
} from "antd";
import {
  CopyOutlined,
  CheckOutlined,
  MoreOutlined,
  ClockCircleFilled,
  StopOutlined,
  LinkOutlined,
  EyeOutlined,
  CheckCircleFilled,
  ShareAltOutlined,
} from "@ant-design/icons";
import { useState, ReactNode } from "react";
import {
  FaTelegramPlane,
  FaWhatsapp,
  FaFacebookF,
  FaLinkedinIn,
  FaViber,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { HiOutlineMail } from "react-icons/hi";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { Tile } from "../tile";
import { PeriodSwitch, PERIODS, type Period } from "../period-switch";
import { IProduct, EntityStatus } from "@/mocks/products/types";
import { useProductEditTitleModal } from "../../modals";

// ============================================================================
// Types
// ============================================================================

interface IKPIData {
  views: number;
  viewsTrend: number;
  orders: number;
  ordersTrend: number;
  conversion: number;
  conversionTrend: number;
  revenue: number;
  revenueTrend: number;
}

interface IProductInfoHeaderProps {
  product: IProduct;
  kpiData?: IKPIData;
}

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  statusTag: {
    margin: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontWeight: 500,
  },
  metaText: {
    fontSize: token.fontSizeSM,
  },
  actionButton: {
    padding: 0,
  },
  productTitle: {},
  divider: {
    marginBlock: token.margin,
  },
  copyableChip: {
    cursor: "pointer",
    margin: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: 0,
  },
  chipLabel: {
    fontSize: token.fontSizeSM,
    textTransform: "uppercase",
    letterSpacing: "0.3px",
    marginRight: 4,
  },
  chipValue: {
    fontSize: 11,
    color: token.colorTextSecondary,
  },
  chipValueMono: {
    fontSize: 11,
    color: token.colorTextSecondary,
    fontFamily: "ui-monospace, SFMono-Regular, monospace",
  },
  chipIcon: {
    fontSize: 9,
    color: token.colorTextTertiary,
  },
  chipIconSuccess: {
    fontSize: 9,
    color: token.colorSuccess,
  },
  userPopover: {
    padding: "4px 0",
  },
  userAvatar: {
    backgroundColor: token.purple2,
    color: token.purple6,
    flexShrink: 0,
  },
  userName: {
    display: "block",
    fontSize: 14,
    lineHeight: 1.4,
  },
  userEmail: {
    fontSize: 12,
  },
  // Tile overrides for header KPIs
  kpiTile: {
    padding: "12px 16px",
    background: token.colorBgElevated,
  },
  kpiTileValue: {
    fontSize: 20,
  },
  // Share popover
  sharePopover: {
    width: 340,
  },
  shareInput: {
    fontFamily: "ui-monospace, SFMono-Regular, monospace",
    fontSize: 12,
  },
}));

// ============================================================================
// Helper Functions
// ============================================================================

const getStatusConfig = (status: EntityStatus) => {
  switch (status) {
    case EntityStatus.PUBLISHED:
      return {
        color: "success" as const,
        icon: <CheckCircleFilled />,
        label: "Published",
        hint: null,
      };
    case EntityStatus.DRAFT:
      return {
        color: "default" as const,
        icon: <ClockCircleFilled />,
        label: "Draft",
        hint: "Not visible on storefront",
      };
    case EntityStatus.ARCHIVED:
      return {
        color: "error" as const,
        icon: <StopOutlined />,
        label: "Archived",
        hint: "Product is archived",
      };
    default:
      return {
        color: "default" as const,
        icon: null,
        label: status,
        hint: null,
      };
  }
};

const formatNumber = (num: number): string => {
  return num.toLocaleString("ru-RU");
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
};

const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};

// ============================================================================
// Sub-components
// ============================================================================

interface ICopyableChipProps {
  label?: string;
  value: string;
  displayValue?: string;
  mono?: boolean;
}

const CopyableChip = ({
  label,
  value,
  displayValue,
  mono,
}: ICopyableChipProps) => {
  const { styles } = useStyles();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Tooltip title={copied ? "Copied!" : undefined}>
      <Tag color="default" onClick={handleCopy} className={styles.copyableChip}>
        {label && (
          <Typography.Text type="secondary" className={styles.chipLabel}>
            {label}
          </Typography.Text>
        )}
        <Typography.Text
          className={mono ? styles.chipValueMono : styles.chipValue}
        >
          {displayValue || value}
        </Typography.Text>
        {copied ? (
          <CheckOutlined className={styles.chipIconSuccess} />
        ) : (
          <CopyOutlined className={styles.chipIcon} />
        )}
      </Tag>
    </Tooltip>
  );
};

interface IUserPopoverProps {
  firstName: string;
  lastName: string;
  email: string;
}

const UserPopoverContent = ({
  firstName,
  lastName,
  email,
}: IUserPopoverProps) => {
  const { styles } = useStyles();

  return (
    <Flex align="center" gap={12} className={styles.userPopover}>
      <Avatar size={40} className={styles.userAvatar}>
        {firstName.charAt(0)}
        {lastName.charAt(0)}
      </Avatar>
      <div>
        <Typography.Text strong className={styles.userName}>
          {firstName} {lastName}
        </Typography.Text>
        <Typography.Text type="secondary" className={styles.userEmail}>
          {email}
        </Typography.Text>
      </div>
    </Flex>
  );
};

interface ISharePopoverProps {
  url: string;
  copied: boolean;
  onCopy: () => void;
}

const socialLinks: {
  key: string;
  icon: ReactNode;
  color: string;
  getUrl: (url: string) => string;
}[] = [
  {
    key: "Telegram",
    icon: <FaTelegramPlane />,
    color: "#26A5E4",
    getUrl: (url) => `https://t.me/share/url?url=${encodeURIComponent(url)}`,
  },
  {
    key: "WhatsApp",
    icon: <FaWhatsapp />,
    color: "#25D366",
    getUrl: (url) => `https://wa.me/?text=${encodeURIComponent(url)}`,
  },
  {
    key: "X",
    icon: <FaXTwitter />,
    color: "#000000",
    getUrl: (url) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`,
  },
  {
    key: "Facebook",
    icon: <FaFacebookF />,
    color: "#1877F2",
    getUrl: (url) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    key: "LinkedIn",
    icon: <FaLinkedinIn />,
    color: "#0A66C2",
    getUrl: (url) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        url
      )}`,
  },
  {
    key: "Viber",
    icon: <FaViber />,
    color: "#7360F2",
    getUrl: (url) => `viber://forward?text=${encodeURIComponent(url)}`,
  },
  {
    key: "Email",
    icon: <HiOutlineMail />,
    color: "#EA4335",
    getUrl: (url) => `mailto:?body=${encodeURIComponent(url)}`,
  },
];

const SharePopoverContent = ({ url, copied, onCopy }: ISharePopoverProps) => {
  const { styles } = useStyles();

  return (
    <Flex vertical gap={12} className={styles.sharePopover}>
      <Flex wrap="wrap" justify="space-between" gap={8}>
        {socialLinks.map((social) => (
          <Tooltip key={social.key} title={social.key}>
            <Button
              type="text"
              shape="circle"
              size="large"
              href={social.getUrl(url)}
              target="_blank"
              icon={social.icon}
              style={{ color: social.color, fontSize: 20 }}
            />
          </Tooltip>
        ))}
      </Flex>
      <Input.Search
        value={url}
        readOnly
        size="small"
        className={styles.shareInput}
        enterButton={
          <Button
            size="small"
            icon={copied ? <CheckOutlined /> : <CopyOutlined />}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        }
        onSearch={onCopy}
      />
    </Flex>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ProductInfoHeader = ({
  product,
  kpiData,
}: IProductInfoHeaderProps) => {
  const { styles } = useStyles();
  const [kpiPeriod, setKpiPeriod] = useState<Period>("7d");
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const { push: openEditTitleModal } = useProductEditTitleModal();

  const storefrontUrl = `${window.location.origin}/products/${product.slug}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  };

  const handleOpenStorefront = () => {
    window.open(storefrontUrl, "_blank");
  };

  const handleCopyStorefrontLink = () => {
    navigator.clipboard.writeText(storefrontUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 1500);
  };

  const statusConfig = getStatusConfig(product.status);

  const handleEditTitle = () => {
    openEditTitleModal({
      title: product.title,
      handle: product.slug,
      onSave: (values: { title: string; handle: string }) => {
        console.log("Save title:", values);
        // TODO: implement actual save logic
      },
    });
  };

  const kpi: IKPIData = kpiData || {
    views: 2847,
    viewsTrend: 8,
    orders: 156,
    ordersTrend: -2,
    conversion: 5.5,
    conversionTrend: 0.4,
    revenue: product.price * 156,
    revenueTrend: 12,
  };

  const statusTitle = (
    <Flex align="center" gap={8}>
      <Tooltip title={statusConfig.hint}>
        <Tag
          color={statusConfig.color}
          icon={statusConfig.icon}
          className={styles.statusTag}
        >
          {statusConfig.label}
        </Tag>
      </Tooltip>
      {product.status === EntityStatus.PUBLISHED && (
        <Typography.Text type="secondary" className={styles.metaText}>
          {product.updatedAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
          <span style={{ marginLeft: 4 }}>by</span>
          <Popover
            content={
              <UserPopoverContent
                firstName="Admin"
                lastName="User"
                email="admin@shopana.io"
              />
            }
            placement="bottom"
            arrow={false}
          >
            <Button
              variant="text"
              color="primary"
              style={{
                padding: 0,
                height: "auto",
                marginLeft: 4,
                fontSize: "inherit",
              }}
            >
              Admin
            </Button>
          </Popover>
        </Typography.Text>
      )}
    </Flex>
  );

  const topBarActions = (
    <Flex align="center" gap={12}>
      <Flex align="center" gap={8}>
        <Button
          variant="text"
          color="default"
          size="small"
          icon={linkCopied ? <CheckOutlined /> : <LinkOutlined />}
          onClick={handleCopyLink}
          className={styles.actionButton}
        />
        <Button
          variant="text"
          color="default"
          size="small"
          icon={<EyeOutlined />}
          onClick={handleOpenStorefront}
          className={styles.actionButton}
        />
        <Popover
          content={
            <SharePopoverContent
              url={storefrontUrl}
              copied={shareCopied}
              onCopy={handleCopyStorefrontLink}
            />
          }
          trigger="click"
          placement="bottomRight"
          arrow={false}
        >
          <Button
            size="small"
            variant="text"
            color="default"
            icon={<ShareAltOutlined />}
            className={styles.actionButton}
          />
        </Popover>
      </Flex>
      <Dropdown
        menu={{
          items: [
            { key: "edit", label: "Edit title", onClick: handleEditTitle },
            { type: "divider" as const },
            { key: "duplicate", label: "Duplicate product" },
            { key: "export", label: "Export" },
            { type: "divider" as const },
            { key: "archive", label: "Archive", danger: true },
          ],
        }}
        trigger={["click"]}
      >
        <Button size="small" icon={<MoreOutlined />} />
      </Dropdown>
    </Flex>
  );

  return (
    <Paper>
      {/* TOP BAR */}
      <PaperHeader title={statusTitle} actions={topBarActions} />

      {/* TITLE SECTION */}
      <Flex vertical gap={8}>
        <Typography.Title
          level={3}
          ellipsis={{ rows: 2, tooltip: product.title }}
          className={styles.productTitle}
          style={{ margin: 0 }}
        >
          {product.title || "Untitled Product"}
        </Typography.Title>

        <Flex align="center" gap={12}>
          <CopyableChip label="/" value={product.slug} />
          <CopyableChip
            label="ID"
            value={product.id}
            displayValue={product.id.slice(0, 8)}
            mono
          />
          {product.sku && <CopyableChip label="SKU" value={product.sku} mono />}
        </Flex>
      </Flex>

      <Divider className={styles.divider} />

      {/* KPI PANEL */}
      <div>
        <div style={{ marginBottom: 12 }}>
          <PeriodSwitch
            periods={PERIODS}
            value={kpiPeriod}
            onChange={setKpiPeriod}
            showCompare
            compareEnabled={compareEnabled}
            onCompareChange={setCompareEnabled}
          />
        </div>

        <Flex gap={12}>
          <Tile
            label="Views"
            value={formatNumber(kpi.views)}
            trend={compareEnabled ? kpi.viewsTrend : undefined}
            tooltip="Total page views"
            className={styles.kpiTile}
          />
          <Tile
            label="Orders"
            value={formatNumber(kpi.orders)}
            trend={compareEnabled ? kpi.ordersTrend : undefined}
            tooltip="Orders containing this product"
            className={styles.kpiTile}
          />
          <Tile
            label="Conversion"
            value={formatPercent(kpi.conversion)}
            trend={compareEnabled ? kpi.conversionTrend : undefined}
            trendSuffix=" pp"
            tooltip="Add to cart conversion rate"
            className={styles.kpiTile}
          />
          <Tile
            label="Revenue"
            value={formatCurrency(kpi.revenue)}
            trend={compareEnabled ? kpi.revenueTrend : undefined}
            tooltip="Total revenue from this product"
            className={styles.kpiTile}
          />
        </Flex>
      </div>
    </Paper>
  );
};
