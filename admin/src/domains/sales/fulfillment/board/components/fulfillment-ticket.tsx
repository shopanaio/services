"use client";

import { Avatar, Flex, Typography } from "antd";
import { LuPhone as PhoneOutlined } from "react-icons/lu";
import dayjs from "dayjs";
import { memo } from "react";
import type { RenderItemProps } from "../dnd";
import type { LegacyFulfillmentTicketView } from "../models/legacy-fulfillment-board-view";
import { useDefaultCurrency } from "@/domains/workspace";
import { FulfillmentStatusSummary } from "./fulfillment-status-summary";
import { useFulfillmentBoardStyles } from "./fulfillment-board.styles";

export const FulfillmentTicket = memo(function FulfillmentTicket({ data, dragging, dragOverlay, onOpen }: RenderItemProps & { data?: LegacyFulfillmentTicketView; onOpen: (orderId: string) => void }) {
  const { styles, cx } = useFulfillmentBoardStyles();
  const currency = useDefaultCurrency();
  if (!data) return <div className={styles.ticketSlot}>Ticket unavailable</div>;
  const palette = data.tags[0]?.color ?? "default";
  const paletteClass = ({ blue: styles.ticketBlue, green: styles.ticketGreen, orange: styles.ticketOrange, red: styles.ticketRed, purple: styles.ticketPurple, cyan: styles.ticketCyan, magenta: styles.ticketMagenta, default: styles.ticketDefault })[palette] ?? styles.ticketDefault;
  const customer = [data.customerFirstName, data.customerLastName].filter(Boolean).join(" ") || "Guest customer";
  const address = data.shippingAddress;
  const amount = currency ? new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(Number(data.totalAmount.amount)) : data.totalAmount.amount;
  return (
    <div className={styles.ticketSlot} data-testid="board-ticket-item" data-ticket-number={data.orderNumber}>
      <div className={cx(styles.ticket, dragging && !dragOverlay ? styles.dragging : paletteClass)} role="button" tabIndex={0} onClick={() => onOpen(data.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(data.id); } }}>
        <Flex justify="space-between" align="center" gap={32}>
          <Flex gap={4}><Typography.Text data-testid="order-number" strong>#{data.orderNumber}</Typography.Text><Typography.Text type="secondary">{dayjs(data.createdAt).format("MMMM DD")}</Typography.Text></Flex>
          <FulfillmentStatusSummary payment={data.payment?.status} fulfillments={data.fulfillments.map((item) => item.status)} />
        </Flex>
        <Flex justify="space-between" align="center"><Typography.Text ellipsis>{customer}</Typography.Text><Typography.Text strong={Boolean(data.customerPhone)}><PhoneOutlined /> {data.customerPhone ?? <Typography.Text type="secondary">No phone</Typography.Text>}</Typography.Text></Flex>
        <Typography.Text className={styles.address} type="secondary" ellipsis>{address ? `${address.city || "No city"}, ${address.address1}${address.address2 ? `, ${address.address2}` : ""}` : "No shipping address"}</Typography.Text>
        <Flex justify="space-between" align="center"><Flex gap={8} align="center"><Avatar.Group max={{ count: 3 }} size="small">{data.productsInfo.slice(0, 3).map((item) => <Avatar key={item.id} src={item.thumbnailUrl}>{item.title[0]}</Avatar>)}</Avatar.Group><Typography.Text>{data.productsInfo.length} item{data.productsInfo.length === 1 ? "" : "s"}</Typography.Text></Flex><Typography.Text strong>{amount}</Typography.Text></Flex>
      </div>
    </div>
  );
});
