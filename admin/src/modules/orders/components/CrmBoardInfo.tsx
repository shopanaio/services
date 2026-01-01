import { notify } from '@components/feedback/notification';
import { Box } from '@components/utility/Box';
import { getRefetchQueries } from '@modules/app/components/Apollo';
import { useAppendCrmTicket } from '@modules/orders/hooks/crm';
import { OrderBoardSelect } from '@modules/settings/components/boards/OrderBoardSelect';
import { Button, Dropdown } from 'antd';
import { Controller, useFormContext } from 'react-hook-form';
import { MdCheck, MdClose, MdMoreHoriz, MdPostAdd } from 'react-icons/md';

export const OrderFunnelForm = () => {
  const { appendTicket } = useAppendCrmTicket();

  const formCtx = useFormContext();

  const orderID: ID = formCtx.watch('id');
  const onChange = (columnId: ID) => {
    appendTicket(
      { columnId, orderID },
      {
        refetchQueries: getRefetchQueries(),
        onCompleted: () => {
          notify.success('Order updated');
        },
        onError: () => {
          notify.error('Failed to update order');
        },
      },
    );
  };

  return (
    <>
      <Controller
        name="boardId"
        render={({ field }) => (
          <Box w="308px">
            <OrderBoardSelect value={field.value} onChange={onChange} />
          </Box>
        )}
      />
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            {
              key: '1',
              label: 'Cancel',
              icon: <MdClose />,
            },
            {
              key: '2',
              label: 'Close',
              icon: <MdCheck />,
            },
            {
              key: '3',
              label: 'Archive',
              icon: <MdPostAdd />,
            },
          ],
        }}
      >
        <Button icon={<MdMoreHoriz />} />
      </Dropdown>
    </>
  );
};
