"use client";

import { Badge, Button, Flex } from "antd";
import { DragOutlined } from "@ant-design/icons";
import { memo } from "react";
import type { RenderColumnProps } from "../dnd";
import type { LegacyFulfillmentColumnView } from "../models/legacy-fulfillment-board-view";
import { useFulfillmentBoardStyles } from "./fulfillment-board.styles";

export const FulfillmentColumn = memo(function FulfillmentColumn({ data, handleProps, children, dragOverlay, disabled, count = 0, onEdit }: RenderColumnProps & { data?: LegacyFulfillmentColumnView; onEdit: (column: LegacyFulfillmentColumnView) => void }) {
  const { styles } = useFulfillmentBoardStyles();
  if (!data) return <div>Column unavailable</div>;
  return <section className={styles.column} aria-label={`${data.title}, ${count} tickets`}>
    <div className={styles.columnHeader} data-testid="board-column-header">
      <Flex align="center">
        <Button data-testid="board-column-drag-handle" {...handleProps?.attributes} {...handleProps?.listeners} disabled={disabled} type="text" icon={<DragOutlined />} aria-label={`Drag ${data.title} column`} />
        <Button data-testid="board-column-title" type="text" onClick={() => onEdit(data)}>{data.title} <Badge count={count} overflowCount={9999} color="blue" showZero /></Button>
      </Flex>
    </div>
    {!dragOverlay ? <div className={styles.columnList} data-testid="board-column">{children}</div> : null}
  </section>;
});
