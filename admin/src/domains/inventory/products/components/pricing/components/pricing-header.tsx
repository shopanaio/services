import { Typography, Button, Dropdown, Flex } from "antd";
import { DownOutlined, MoreOutlined } from "@ant-design/icons";
import { PaperHeader } from "@/ui-kit/paper";
import { ScrollableDropdown } from "./scrollable-dropdown";
import { useStyles } from "../pricing-block.styles";
import type { ApiVariantConnection, ApiVariantPrice } from "@/graphql/types";
import { useVariantPrice } from "../../../utils/price-formatting";

export interface IPricingHeaderProps {
  variants: ApiVariantConnection;
  selectedVariantId: string | null;
  onVariantSelect: (id: string) => void;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  onEditPrices?: () => void;
  isEditPricesLoading?: boolean;
  onViewHistory?: () => void;
}

const VariantPriceLabel = ({
  price,
}: {
  price: ApiVariantPrice | null | undefined;
}) => {
  const formattedPrice = useVariantPrice(price);

  return (
    <Typography.Text style={{ fontWeight: 600, marginLeft: 24 }}>
      {formattedPrice}
    </Typography.Text>
  );
};

export const PricingHeader = ({
  variants,
  selectedVariantId,
  onVariantSelect,
  onLoadMore,
  isLoadingMore,
  onEditPrices,
  isEditPricesLoading = false,
  onViewHistory,
}: IPricingHeaderProps) => {
  const { styles } = useStyles();

  const selectedVariant = variants.edges.find(
    (e) => e.node.id === selectedVariantId
  )?.node;

  const variantMenuItems = variants.edges.map((edge) => ({
    key: edge.node.id,
    label: (
      <Flex
        justify="space-between"
        align="center"
        style={{ width: "100%" }}
        data-testid={`pricing-widget-variant-option-${edge.node.id}`}
      >
        <span>{edge.node.title ?? "Untitled"}</span>
        <VariantPriceLabel price={edge.node.price} />
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
          data-testid="pricing-widget-variant-select-button"
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
          {
            key: "edit",
            label: (
              <span data-testid="pricing-widget-edit-prices-menu-item">
                Edit Prices
              </span>
            ),
            disabled: !onEditPrices || isEditPricesLoading,
            onClick: onEditPrices,
          },
          {
            key: "history",
            label: <span data-testid="pricing-widget-view-history-menu-item">View History</span>,
            disabled: !onViewHistory,
            onClick: onViewHistory,
          },
        ],
      }}
      trigger={["click"]}
    >
      <Button
        size="small"
        icon={<MoreOutlined />}
        data-testid="pricing-widget-actions-button"
      />
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
