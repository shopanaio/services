import { Image, Typography, Flex, Tooltip } from "antd";
import { createStyles } from "antd-style";
import type { CustomCellRendererProps } from "ag-grid-react";
import type { IInventoryListItem } from "../mocks/inventory-list";
import { EditableNumberCell } from "./EditableNumberCell";

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
  cellWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    width: "100%",
    height: "100%",
    paddingRight: 4,
  },
}));

export const ProductCellRenderer = (
  props: CustomCellRendererProps<IInventoryListItem>
) => {
  const { styles } = useStyles();
  const { data } = props;
  if (!data) return null;

  return (
    <Flex align="center" gap="small">
      <Image
        src={data.image}
        alt={data.productName}
        width={40}
        height={40}
        className={styles.productImage}
        preview={false}
      />
      <Flex vertical gap={0}>
        <Typography.Text strong className={styles.productName}>
          {data.productName}
        </Typography.Text>
        {data.variantName && (
          <Typography.Text type="secondary" className={styles.variantName}>
            {data.variantName}
          </Typography.Text>
        )}
      </Flex>
    </Flex>
  );
};

export const ReservedCellRenderer = (
  props: CustomCellRendererProps<IInventoryListItem>
) => {
  const { styles } = useStyles();
  const { value } = props;
  return (
    <div className={styles.cellWrapper}>
      <Tooltip title="Managed by order system">
        <Typography.Text>{value}</Typography.Text>
      </Tooltip>
    </div>
  );
};

export const OnHandCellRenderer = (
  props: CustomCellRendererProps<IInventoryListItem>
) => <EditableNumberCell {...props} field="onHand" />;

export const UnavailableCellRenderer = (
  props: CustomCellRendererProps<IInventoryListItem>
) => <EditableNumberCell {...props} field="unavailable" />;
