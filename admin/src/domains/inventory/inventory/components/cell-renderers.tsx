import { Typography, Flex } from "antd";
import { PictureOutlined } from "@ant-design/icons";
import { createStyles } from "antd-style";
import type { CustomCellRendererProps } from "ag-grid-react";
import { EditableNumberCell } from "./editable-number-cell";
import { ReservedCell } from "@/shared/components/inventory-cells";
import type { InventoryVariantRow } from "../mappers";
import { getInventoryVariantCellTestId } from "./test-ids";
import { TableCoverImage } from "@/shared/components/table-cover-image";

const useStyles = createStyles(({ token }) => ({
  productImage: {
    borderRadius: token.borderRadiusXS,
    objectFit: "cover",
  },
  productName: {
    lineHeight: 1.3,
  },
  variantName: {
    fontSize: token.fontSizeSM,
  },
}));

export const ProductCellRenderer = (
  props: CustomCellRendererProps<InventoryVariantRow>
) => {
  const { styles } = useStyles();
  const { data } = props;
  if (!data) return null;

  return (
    <Flex
      align="center"
      gap="small"
      data-testid={getInventoryVariantCellTestId(data, "product")}
    >
      <TableCoverImage
        src={data.imageUrl}
        alt={data.productTitle}
        fallbackIcon={<PictureOutlined />}
        className={styles.productImage}
      />
      <Flex vertical gap={0}>
        <Typography.Text
          strong
          className={styles.productName}
          data-testid={getInventoryVariantCellTestId(data, "product-title")}
        >
          {data.productTitle}
        </Typography.Text>
        {(data.variantTitle || data.variantHandle) && (
          <Typography.Text
            type="secondary"
            className={styles.variantName}
            data-testid={getInventoryVariantCellTestId(data, "variant-title")}
          >
            {data.variantTitle ?? data.variantHandle}
          </Typography.Text>
        )}
      </Flex>
    </Flex>
  );
};

export const ReservedCellRenderer = (
  props: CustomCellRendererProps<InventoryVariantRow>
) => {
  const { data, value } = props;
  return (
    <ReservedCell
      value={value as number}
      testId={data ? getInventoryVariantCellTestId(data, "reserved") : undefined}
    />
  );
};

export const OnHandCellRenderer = (
  props: CustomCellRendererProps<InventoryVariantRow>
) => <EditableNumberCell {...props} field="onHand" />;

export const UnavailableCellRenderer = (
  props: CustomCellRendererProps<InventoryVariantRow>
) => <EditableNumberCell {...props} field="unavailable" />;
