"use client";

import { App, Button } from "antd";
import { LuPlus as PlusOutlined } from "react-icons/lu";
import { useCallback, useEffect, useState } from "react";
import type { UniqueIdentifier } from "@dnd-kit/core";
import isEqual from "lodash/isEqual";
import { Boards, type Items, type RenderColumnProps, type RenderItemProps } from "../dnd";
import { useMoveFulfillmentTicket, useReorderFulfillmentStages } from "../hooks";
import type {
  LegacyFulfillmentBoardView,
  LegacyFulfillmentColumnView,
} from "../models/legacy-fulfillment-board-view";
import { FulfillmentColumn } from "./fulfillment-column";
import { FulfillmentTicket } from "./fulfillment-ticket";
import { useFulfillmentBoardStyles } from "./fulfillment-board.styles";

export function FulfillmentBoard({
  view,
  onRefetch,
  onOpenOrder,
  onEditStage,
  onCreateStage,
}: {
  view: LegacyFulfillmentBoardView;
  onRefetch: () => Promise<unknown>;
  onOpenOrder: (id: string) => void;
  onEditStage: (column: LegacyFulfillmentColumnView) => void;
  onCreateStage: () => void;
}) {
  const { styles } = useFulfillmentBoardStyles();
  const { message } = App.useApp();
  const { moveTicket } = useMoveFulfillmentTicket();
  const { reorderStages } = useReorderFulfillmentStages();
  const [items, setItems] = useState<Items>({});
  const [containers, setContainers] = useState<UniqueIdentifier[]>([]);

  const onSortContainers = async (nextKeys: UniqueIdentifier[]) => {
    if (isEqual(nextKeys, containers)) {
      return;
    }

    try {
      setContainers(nextKeys);
      const result = await reorderStages({
        clientMutationId: crypto.randomUUID(),
        stages: nextKeys.map((it, idx) => ({
          id: view.columnsMapping[String(it)].id,
          expectedVersion: view.columnsMapping[String(it)].version,
          sortIndex: idx,
        })),
      });
      if (!result.stages || result.userErrors.length) {
        throw new Error(result.userErrors[0]?.message ?? "Failed to reorder columns");
      }
      message.success("Column reordered");
    } catch {
      message.error("Failed to reorder columns");
    } finally {
      onRefetch();
    }
  };

  const onSortItems = async (
    next: Items,
    targetColumn: UniqueIdentifier,
    targetItem: UniqueIdentifier,
  ) => {
    setItems(next);

    const nextItems = next[targetColumn];
    if (!nextItems?.length) {
      message.error("Internal. Failed to sort columns");
      return;
    }

    let prevTicketId = null as string | null;

    const column = next[targetColumn];
    const targetItemIdx = column.indexOf(targetItem);

    if (targetItemIdx > 0) {
      prevTicketId = view.ordersMapping[String(column[targetItemIdx - 1])]?.ticketId;
      if (!prevTicketId) {
        message.error("Internal. Failed to sort columns");
        return;
      }
    }

    try {
      const ticket = view.ordersMapping[String(targetItem)];
      const result = await moveTicket({
        clientMutationId: crypto.randomUUID(),
        ticketId: ticket.ticketId,
        expectedVersion: ticket.version,
        sourceStageId: ticket.stageId,
        targetStageId: view.columnsMapping[String(targetColumn)].id,
        afterTicketId: prevTicketId,
      });
      if (!result.ticket || result.userErrors.length) {
        throw new Error(result.userErrors[0]?.message ?? "Failed to move ticket");
      }
      message.success("Ticket moved");
    } catch {
      message.error("Failed to move ticket");
    } finally {
      onRefetch();
    }
  };

  const renderItem = useCallback(
    (props: RenderItemProps) => {
      return (
        <FulfillmentTicket
          {...props}
          data={view.ordersMapping[String(props.value)]}
          onOpen={onOpenOrder}
        />
      );
    },
    [onOpenOrder, view.ordersMapping],
  );

  const renderColumn = useCallback(
    (props: RenderColumnProps) => {
      return (
        <FulfillmentColumn
          {...props}
          onEdit={onEditStage}
          data={view.columnsMapping[String(props.value)]}
        />
      );
    },
    [onEditStage, view.columnsMapping],
  );

  useEffect(() => {
    setContainers(view.columns.map((column) => column.id));
    setItems(
      view.columns.reduce((acc: Items, column) => {
        return {
          ...acc,
          [column.id]: view.columnTicketsMapping[column.id]?.map((ticket) => ticket.id) || [],
        };
      }, {}),
    );
  }, [view.columns, view.columnTicketsMapping]);

  return (
    <div className={styles.row}>
      <Boards
        itemSize={160}
        renderItem={renderItem}
        renderColumn={renderColumn}
        items={items}
        setItems={setItems}
        commitContainers={onSortContainers}
        commitItems={onSortItems}
        containers={containers}
      />
      <Button
        className={styles.add}
        onClick={onCreateStage}
        size="large"
        icon={<PlusOutlined />}
        aria-label="Add fulfillment stage"
      />
    </div>
  );
}
