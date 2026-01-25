"use client";

import { Typography, Flex, Tag, Avatar } from "antd";
import { GiftOutlined } from "@ant-design/icons";
import { PaperHeader } from "@/ui-kit/paper";
import { useBundleModal } from "@/domains/promos/bundles/modals";
import { useBundlesSectionStyles } from "../product-details-card.styles";
import type { BundleType, IBundleListItem } from "@/mocks/products/bundles-list";

const BUNDLE_TYPE_CONFIG: Record<BundleType, { label: string; color: string }> = {
  FIXED: { label: "Fixed", color: "blue" },
  MULTIPACK: { label: "Multipack", color: "green" },
  MIX_AND_MATCH: { label: "Mix & Match", color: "purple" },
};

interface IBundlesSectionProps {
  bundles: IBundleListItem[];
}

export const BundlesSection = ({ bundles }: IBundlesSectionProps) => {
  const { styles } = useBundlesSectionStyles();
  const { push: openBundleModal } = useBundleModal();

  if (!bundles || bundles.length === 0) {
    return null;
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.inner}>
        <PaperHeader
          title="Included in Bundles"
          icon={
            <Avatar
              size="small"
              shape="square"
              icon={<GiftOutlined style={{ color: "#d946ef" }} />}
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(217,70,239,0.15) 100%)",
              }}
            />
          }
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
                onClick={() => openBundleModal({ entityId: bundle.id })}
              >
                <Flex gap={10} align="center">
                  <Avatar
                    src={bundle.image}
                    size={40}
                    shape="square"
                    className={styles.bundleAvatar}
                    icon={<GiftOutlined />}
                  />
                  <Flex vertical gap={4} flex={1} style={{ minWidth: 0 }}>
                    <Typography.Text strong ellipsis className={styles.bundleName}>
                      {bundle.name}
                    </Typography.Text>
                    <Flex gap={4} wrap="wrap">
                      {typeConfig && (
                        <Tag color={typeConfig.color} className={styles.bundleTypeTag}>
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
      </div>
    </div>
  );
};
