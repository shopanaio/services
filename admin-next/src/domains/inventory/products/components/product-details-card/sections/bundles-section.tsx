"use client";

import { Typography, Flex, Tag, Avatar, Empty } from "antd";
import {
  GiftOutlined,
  AppstoreOutlined,
  BuildOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Paper, PaperHeader } from "@/ui-kit/paper";
import { useBundlesSectionStyles } from "../product-details-card.styles";
import type { BundleType, IBundleListItem } from "@/mocks/products/bundles-list";

const BUNDLE_TYPE_CONFIG: Record<
  BundleType,
  { label: string; color: string; icon: React.ReactNode }
> = {
  FIXED: {
    label: "Fixed Bundle",
    color: "blue",
    icon: <GiftOutlined />,
  },
  MULTIPACK: {
    label: "Multipack",
    color: "green",
    icon: <AppstoreOutlined />,
  },
  MIX_AND_MATCH: {
    label: "Mix & Match",
    color: "purple",
    icon: <BuildOutlined />,
  },
};

interface IBundlesSectionProps {
  bundles: IBundleListItem[];
  onBundleClick?: (bundleId: string) => void;
}

export const BundlesSection = ({
  bundles,
  onBundleClick,
}: IBundlesSectionProps) => {
  const { styles } = useBundlesSectionStyles();

  if (!bundles || bundles.length === 0) {
    return (
      <Paper>
        <PaperHeader title="Included in Bundles" icon={<GiftOutlined />} />
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="This product is not included in any bundles"
          style={{ padding: "24px 0" }}
        />
      </Paper>
    );
  }

  return (
    <Paper>
      <PaperHeader
        title="Included in Bundles"
        icon={<GiftOutlined />}
        extra={
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {bundles.length} bundle{bundles.length !== 1 ? "s" : ""}
          </Typography.Text>
        }
      />
      <div className={styles.bundlesGrid}>
        {bundles.map((bundle) => {
          const typeConfig = bundle.bundleType
            ? BUNDLE_TYPE_CONFIG[bundle.bundleType]
            : null;

          return (
            <div
              key={bundle.id}
              className={styles.bundleCard}
              onClick={() => onBundleClick?.(bundle.id)}
              role={onBundleClick ? "button" : undefined}
              tabIndex={onBundleClick ? 0 : undefined}
            >
              <Flex gap={12} align="flex-start">
                <Avatar
                  src={bundle.image}
                  size={48}
                  shape="square"
                  className={styles.bundleAvatar}
                  icon={<GiftOutlined />}
                />
                <Flex vertical gap={4} flex={1} style={{ minWidth: 0 }}>
                  <Flex justify="space-between" align="center" gap={8}>
                    <Typography.Text strong ellipsis className={styles.bundleName}>
                      {bundle.name}
                    </Typography.Text>
                    {onBundleClick && (
                      <RightOutlined className={styles.bundleArrow} />
                    )}
                  </Flex>
                  <Flex gap={6} wrap="wrap">
                    {typeConfig && (
                      <Tag
                        color={typeConfig.color}
                        className={styles.bundleTypeTag}
                        icon={typeConfig.icon}
                      >
                        {typeConfig.label}
                      </Tag>
                    )}
                    {!typeConfig && bundle.bundleType === null && (
                      <Tag className={styles.bundleTypeTag}>Custom</Tag>
                    )}
                    <Tag
                      color={bundle.status === "published" ? "success" : "default"}
                      className={styles.bundleStatusTag}
                    >
                      {bundle.status === "published" ? "Published" : "Draft"}
                    </Tag>
                  </Flex>
                </Flex>
              </Flex>
            </div>
          );
        })}
      </div>
    </Paper>
  );
};
