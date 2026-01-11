import { Typography, Button, Dropdown, Flex } from "antd";
import { DownOutlined, MoreOutlined } from "@ant-design/icons";
import { useProductPriceHistoryModal } from "../../../modals";
import { PaperHeader } from "@/ui-kit/paper";
import { ScrollableDropdown } from "./scrollable-dropdown";
import { useStyles } from "../pricing-block.styles";
import type { IPricingHeaderProps } from "../types";

export const PricingHeader = ({
  productId,
  variants,
  selectedVariantId,
  onVariantSelect,
  onLoadMore,
  isLoadingMore,
  formatPrice,
}: IPricingHeaderProps) => {
  const { styles } = useStyles();
  const { push: pushPriceHistory } = useProductPriceHistoryModal();

  const selectedVariant = variants.edges.find(
    (e) => e.node.id === selectedVariantId
  )?.node;

  const variantMenuItems = variants.edges.map((edge) => ({
    key: edge.node.id,
    label: (
      <Flex justify="space-between" align="center" style={{ width: "100%" }}>
        <span>{edge.node.title ?? "Untitled"}</span>
        <Typography.Text style={{ fontWeight: 600, marginLeft: 24 }}>
          {formatPrice(edge.node.price?.amountMinor ?? 0)}
        </Typography.Text>
      </Flex>
    ),
  }));

  const variantSelect =
    variants.edges.length > 1 ? (
      <ScrollableDropdown
        menu={{
          items: variantMenuItems,
          selectedKeys: selectedVariantId ? [selectedVariantId] : [],
          onClick: ({ key }) => onVariantSelect(key as string),
        }}
        trigger={["click"]}
        hasNextPage={variants.pageInfo.hasNextPage}
        isLoadingMore={isLoadingMore}
        onLoadMore={onLoadMore}
      >
        <Button
          size="small"
          className={styles.headerSelect}
          variant="text"
          color="default"
        >
          <Flex align="center" gap={4}>
            <span>{selectedVariant?.title || "Select variant"}</span>
            <DownOutlined style={{ fontSize: 10, marginLeft: 4 }} />
          </Flex>
        </Button>
      </ScrollableDropdown>
    ) : undefined;

  const actionsMenu = (
    <Dropdown
      menu={{
        items: [
          { key: "edit", label: "Edit Prices" },
          {
            key: "history",
            label: "View History",
            onClick: () => pushPriceHistory({ productId }),
          },
        ],
      }}
      trigger={["click"]}
    >
      <Button size="small" icon={<MoreOutlined />} />
    </Dropdown>
  );

  const actions = (
    <Flex align="center" gap={12}>
      {variantSelect}
      {actionsMenu}
    </Flex>
  );

  return <PaperHeader title="Pricing" actions={actions} />;
};
