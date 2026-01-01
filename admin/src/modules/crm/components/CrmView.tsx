import { $drawers } from '@src/layouts/drawers/store/drawers';
import { DrawerTypes } from '@src/layouts/drawers/types';
import { css } from '@emotion/react';
import { ContainerHeight } from '@components/container/ContainerHeight';
import { useCallback, useEffect, useState } from 'react';
import { Button } from 'antd';
import { MdAdd } from 'react-icons/md';
import { getIconProps } from '@components/styles';
import { getLastSortIndex, mapEntryId } from '@src/utils/utils';
import { sanitizeEntries } from '@src/entity/utils';
import { isEqual } from 'lodash';
import { UniqueIdentifier } from '@dnd-kit/core';
import { notify } from '@components/feedback/notification';
import {
  CrmColumnModal,
  ICrmColumnFormValue,
} from '@modules/crm/components/CrmColumnModal';
import { useCrmTickets } from '@modules/crm/hooks/useTickets';
import {
  useMoveCrmTicket,
  useUpdateManyCrmColumns,
} from '@modules/crm/hooks/crm';
import { Boards, Items } from '@components/boards/MultipleContainers';
import { NIL_UUID } from '@src/utils/synthetic-id';
import { ICrmColumn } from '@src/entity/Order/Crm';
import { IRenderItemProps } from '@components/boards/Item/Item';
import { CrmColumnComponent } from '@modules/crm/components/CrmColumn';
import { CrmTicketComponent } from '@modules/crm/components/CrmTicket';
import { IRenderColumnProps } from '@components/boards/Container/Container';
import { CrmLayout } from '@modules/crm/components/CrmLayout';
import { useCreateOrder } from '@modules/orders/hooks/mutations';

const CrmView = () => {
  const [editingEntry, setEditingEntry] = useState<ICrmColumnFormValue | null>(
    null,
  );

  const {
    columnTicketsMapping,
    columns,
    columnsMapping,
    ordersMapping,
    navigation,
    // loading,
    refetch,
  } = useCrmTickets();

  const { updateColumns } = useUpdateManyCrmColumns();
  const { moveTicket } = useMoveCrmTicket();
  const { createOrder } = useCreateOrder();

  const [items, setItems] = useState<Items>({});
  const [containers, setContainers] = useState<UniqueIdentifier[]>([]);

  const onSortContainers = async (nextKeys: UniqueIdentifier[]) => {
    if (isEqual(nextKeys, containers)) {
      return;
    }

    try {
      setContainers(nextKeys);
      await updateColumns(
        nextKeys.map((it, idx) => ({
          id: columnsMapping[it].id,
          sortIndex: idx,
        })),
      );
      notify.success('Column reordered');
    } catch {
      notify.error('Failed to reorder columns');
    } finally {
      refetch();
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
      notify.error('Internal. Failed to sort columns');
      return;
    }

    let prevTicketId = null as ID | null;

    const column = next[targetColumn];
    const targetItemIdx = column.indexOf(targetItem);

    if (targetItemIdx > 0) {
      prevTicketId = ordersMapping[column[targetItemIdx - 1]]?.id;
      if (!prevTicketId) {
        notify.error('Internal. Failed to sort columns');
        return;
      }
    }

    try {
      await moveTicket({
        orderId: ordersMapping[targetItem].id,
        columnId: columnsMapping[targetColumn].id,
        afterOrderId: prevTicketId || NIL_UUID,
      });
      notify.success('Ticket moved');
    } catch {
      notify.error('Failed to move ticket');
    } finally {
      refetch();
    }
  };

  const onEditBoard = useCallback(
    (board: ICrmColumn) => {
      setEditingEntry(board);
    },
    [setEditingEntry],
  );

  const renderItem = useCallback(
    (props: IRenderItemProps) => {
      return (
        <CrmTicketComponent {...props} data={ordersMapping[props.value]} />
      );
    },
    [ordersMapping],
  );

  const renderColumn = useCallback(
    (props: IRenderColumnProps) => {
      return (
        <CrmColumnComponent
          {...props}
          onEdit={onEditBoard}
          data={columnsMapping[props.value]}
        />
      );
    },
    [onEditBoard, columnsMapping],
  );

  useEffect(() => {
    setContainers(columns.map(mapEntryId));
    setItems(
      columns.reduce((acc: Record<number, number[]>, column: ICrmColumn) => {
        return {
          ...acc,
          [column.id]:
            sanitizeEntries(columnTicketsMapping[column.id]?.map(mapEntryId)) ||
            [],
        };
      }, {}),
    );
  }, [columns, columnTicketsMapping]);

  return (
    <>
      <CrmColumnModal
        entry={editingEntry}
        onClose={() => {
          setEditingEntry(null);
        }}
        open={editingEntry !== null}
      />
      <CrmLayout
        navigationProps={{
          ...navigation,
        }}
        headerProps={{
          title: 'Fulfillment',
          count: 0,
          create: () => {
            createOrder().then((id) => {
              if (id) {
                $drawers.addDrawer({
                  entityId: id,
                  type: DrawerTypes.ORDER,
                });
              }
            });
          },
        }}
      >
        <ContainerHeight offsetBottom={0}>
          <div
            css={css`
              margin-left: calc(-1 * var(--x5));
              max-width: 100%;
              min-height: var(--container-height);
              overflow: auto;
              padding-left: var(--x4);
              padding-top: var(--x3);
              display: flex;
            `}
          >
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
              onClick={() => {
                setEditingEntry({
                  id: null,
                  title: '',
                  slug: '',
                  sortIndex: getLastSortIndex(columns),
                  tickets: [],
                });
              }}
              css={css`
                flex-shrink: 0;
                margin-left: var(--x1);
                box-shadow: var(--box-shadow-paper);
                border: none !important;
              `}
              size="large"
              icon={<MdAdd {...getIconProps(20)} />}
            />
          </div>
        </ContainerHeight>
      </CrmLayout>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export default CrmView;
