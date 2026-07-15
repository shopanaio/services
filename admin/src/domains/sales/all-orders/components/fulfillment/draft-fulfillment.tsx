"use client";
import { useCallback, useState } from "react";
import { App, Avatar, Button, Dropdown, Flex, Table, Typography } from "antd";
import { MoreOutlined, PlusOutlined } from "@ant-design/icons";
import { useProductPicker } from "@/shared/components/entity-picker-modal";
import type { IPickableEntity } from "@/shared/components/entity-picker-modal/types";
import { OrderPaper, OrderPaperHeader } from "../legacy/order-paper";
import { OrderPrice } from "../money/price";
import { useAddOrderItem, useDeleteOrderItem } from "../../hooks";
import type { ApiOrder, ApiOrderItem } from "../../graphql/operation-types";
import { QuantityPopover } from "../items/item-edit-popover";

export function DraftFulfillment({ order, refetch }: { order: ApiOrder; refetch: () => Promise<unknown> }) {
  const { message, modal } = App.useApp();
  const addMutation = useAddOrderItem();
  const deleteMutation = useDeleteOrderItem();
  const [loading, setLoading] = useState(false);
  const onConfirm = useCallback(async (products: IPickableEntity[]) => {
    const newProducts = products.filter((product) => !order.orderItems.some((item) => item.product.id === product.id));
    if (!newProducts.length) return void message.error("No new products selected");
    setLoading(true);
    let version = order.version;
    for (const product of newProducts) {
      const result = await addMutation.addOrderItem({ id: order.id, expectedVersion: version, item: { productId: product.id, title: product.title, price: 0, quantity: 1 } });
      if (!result.order) { message.error(result.userErrors[0]?.message ?? "Failed to add product"); break; }
      version = result.order.version;
    }
    await refetch(); setLoading(false);
  }, [addMutation, message, order, refetch]);
  const { openPicker } = useProductPicker({ selectionMode: "multi", initialSelection: order.orderItems.map((item) => item.product.id), onConfirm });
  const remove = async (item: ApiOrderItem) => { const confirmed = await modal.confirm({ icon: null, title: "Delete product?", content: "This item will be removed from the order.", okText: "Yes", cancelText: "No" }); if (!confirmed) return; const result = await deleteMutation.deleteOrderItem({ id: order.id, expectedVersion: order.version, itemId: item.id }); if (!result.order) return void message.error(result.userErrors[0]?.message ?? "Failed to delete product"); await refetch(); message.success("Product deleted"); };
  const columns = [
    { title: "Product", key: "product", render: (_: unknown, item: ApiOrderItem) => <Flex align="center" gap="small"><Avatar shape="square">{item.product.title[0]}</Avatar><Flex vertical><Typography.Text>{item.product.title}</Typography.Text><Typography.Text type="secondary">{item.product.sku ?? "No SKU"}</Typography.Text></Flex></Flex> },
    { title: "Quantity", key: "quantity", width: 115, render: (_: unknown, item: ApiOrderItem) => <QuantityPopover orderId={order.id} expectedVersion={order.version} item={item} refetch={refetch}><Typography.Text strong>{item.quantity}</Typography.Text></QuantityPopover> },
    { title: "Unit price", key: "price", width: 115, render: (_: unknown, item: ApiOrderItem) => <OrderPrice amount={item.price} /> },
    { title: "Total", key: "total", width: 115, render: (_: unknown, item: ApiOrderItem) => <Typography.Text strong><OrderPrice amount={item.totalAmount} /></Typography.Text> },
    { title: "", key: "actions", width: 50, align: "right" as const, render: (_: unknown, item: ApiOrderItem) => <Dropdown trigger={["click"]} placement="bottomRight" menu={{ items: [{ key: "delete", label: "Delete", danger: true, onClick: () => void remove(item) }] }}><Button type="text" loading={loading || deleteMutation.loading} icon={<MoreOutlined />} /></Dropdown> },
  ];
  return <OrderPaper><OrderPaperHeader name="order-items" title="Products" extra={<Button loading={loading} icon={<PlusOutlined />} onClick={openPicker}>Add products</Button>} /><Table<ApiOrderItem> tableLayout="fixed" rowKey="id" pagination={false} columns={columns} dataSource={order.orderItems} locale={{ emptyText: <Typography.Text type="secondary">No products</Typography.Text> }} /></OrderPaper>;
}
