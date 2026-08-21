"use client";
import { forwardRef, useEffect, useState, type HTMLAttributes, type ReactNode } from "react";
import { Button, Flex, Input, InputNumber, Popover, Select, Space, Typography } from "antd";
import {
  LuPencil as EditOutlined,
  LuChevronLeft as LeftOutlined,
  LuChevronRight as RightOutlined,
} from "react-icons/lu";
import { useUpdateOrderItem } from "../../hooks";
import type { ApiOrderItem } from "../../graphql/operation-types";

const Trigger = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { open: boolean }>(
  function Trigger({ children, open, onMouseEnter, onMouseLeave, style, ...props }, ref) {
    const [hover, setHover] = useState(false);
    return (
      <div
        ref={ref}
        {...props}
        role="button"
        tabIndex={0}
        style={{
          cursor: "pointer",
          minWidth: 80,
          display: "flex",
          gap: 4,
          alignItems: "center",
          ...style,
        }}
        onMouseEnter={(event) => {
          setHover(true);
          onMouseEnter?.(event);
        }}
        onMouseLeave={(event) => {
          setHover(false);
          onMouseLeave?.(event);
        }}
      >
        {children}
        <EditOutlined style={{ opacity: hover || open ? 1 : 0 }} />
      </div>
    );
  },
);

export function QuantityPopover({
  orderId,

  item,
  refetch,
  children,
}: {
  orderId: string;

  item: ApiOrderItem;
  refetch: () => Promise<unknown>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(item.quantity);
  const mutation = useUpdateOrderItem();
  useEffect(() => setValue(item.quantity || 1), [item.quantity, open]);
  const save = async () => {
    const result = await mutation.updateOrderItem({
      id: orderId,

      itemId: item.id,
      quantity: value,
    });
    if (result.order) {
      await refetch();
      setOpen(false);
    }
  };
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottom"
      content={
        <Flex vertical gap="small">
          <Typography.Text strong>Quantity</Typography.Text>
          <Space.Compact>
            <Button
              icon={<LeftOutlined />}
              onClick={() => setValue((current) => Math.max(1, current - 1))}
            />
            <Input value={value} readOnly style={{ width: 100, textAlign: "center" }} />
            <Button icon={<RightOutlined />} onClick={() => setValue((current) => current + 1)} />
          </Space.Compact>
          <Flex gap="small">
            <Button block onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button block type="primary" loading={mutation.loading} onClick={save}>
              Save
            </Button>
          </Flex>
        </Flex>
      }
    >
      <Trigger open={open}>{children}</Trigger>
    </Popover>
  );
}

export function WeightPopover({
  orderId,

  item,
  refetch,
  children,
}: {
  orderId: string;

  item: ApiOrderItem;
  refetch: () => Promise<unknown>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(item.weight?.value ?? 0);
  const [unit, setUnit] = useState(item.weight?.unit ?? "g");
  const mutation = useUpdateOrderItem();
  useEffect(() => {
    setValue(item.weight?.value ?? 0);
    setUnit(item.weight?.unit ?? "g");
  }, [item.weight, open]);
  const normalized = unit === "kg" ? value * 1000 : unit === "lb" ? value * 453.592 : value;
  const save = async () => {
    const result = await mutation.updateOrderItem({
      id: orderId,

      itemId: item.id,
      weight: normalized,
    });
    if (result.order) {
      await refetch();
      setOpen(false);
    }
  };
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottom"
      content={
        <Flex vertical gap="small">
          <Typography.Text strong>Weight</Typography.Text>
          <Space.Compact>
            <InputNumber
              min={0}
              value={value}
              onChange={(next) => setValue(next ?? 0)}
              style={{ width: 130 }}
            />
            <Select
              value={unit}
              onChange={setUnit}
              options={[
                { value: "g", label: "g" },
                { value: "kg", label: "kg" },
                { value: "lb", label: "lb" },
              ]}
            />
          </Space.Compact>
          <Flex gap="small">
            <Button block onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button block type="primary" loading={mutation.loading} onClick={save}>
              Save
            </Button>
          </Flex>
        </Flex>
      }
    >
      <Trigger open={open}>{children}</Trigger>
    </Popover>
  );
}

export function CostPricePopover({
  orderId,

  item,
  refetch,
  children,
}: {
  orderId: string;

  item: ApiOrderItem;
  refetch: () => Promise<unknown>;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(item.productCostPrice ?? 0);
  const mutation = useUpdateOrderItem();
  useEffect(() => setValue(item.productCostPrice ?? 0), [item.productCostPrice, open]);
  const save = async () => {
    const result = await mutation.updateOrderItem({
      id: orderId,

      itemId: item.id,
      costPrice: value,
    });
    if (result.order) {
      await refetch();
      setOpen(false);
    }
  };
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottom"
      content={
        <Flex vertical gap="small">
          <Typography.Text strong>Cost price</Typography.Text>
          <InputNumber
            min={0}
            value={value}
            onChange={(next) => setValue(next ?? 0)}
            style={{ width: 200 }}
          />
          <Flex gap="small">
            <Button block onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button block type="primary" loading={mutation.loading} onClick={save}>
              Save
            </Button>
          </Flex>
        </Flex>
      }
    >
      <Trigger open={open}>{children}</Trigger>
    </Popover>
  );
}
