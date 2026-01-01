/* eslint-disable jsx-a11y/no-autofocus */
import { notify } from '@components/feedback/notification';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { useUpdateAdminNote } from '@modules/orders/hooks/mutations';
import { IOrder } from '@src/entity/Order/Order';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Button, Input, Typography } from 'antd';
import { useState } from 'react';
import { MdEdit } from 'react-icons/md';

export const EditableNote = ({
  order,
  refetch,
}: {
  order: IOrder;
  refetch: () => Promise<void>;
}) => {
  const [loading, setLoading] = useState(false);
  const [value, setValue] = useState<string | null>(null);

  const { updateAdminNote } = useUpdateAdminNote();
  const isEditing = typeof value === 'string';

  const onCancel = () => {
    setValue(null);
  };

  const onEdit = () => {
    setValue(order.adminNote || '');
  };

  const onSubmit = async () => {
    try {
      setLoading(true);
      await updateAdminNote({
        id: order.id,
        adminNote: value?.trim() || '',
      });
      await refetch();
      setValue(null);
      notify.success('Note updated');
    } catch {
      notify.error('Failed to update note');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title="Quick note"
        name="quick-note"
        extra={
          !isEditing ? <Button icon={<MdEdit />} onClick={onEdit} /> : null
        }
      />
      {isEditing ? (
        <>
          <Input.TextArea
            data-testid="quick-note-field"
            autoSize={{ minRows: 2, maxRows: 6 }}
            autoFocus
            value={value || ''}
            onChange={(e) => setValue(e.target.value)}
          />
          <Box mt="2">
            <Typography.Text type="secondary">
              The note is not visible to the customer
            </Typography.Text>
          </Box>
          <Flex mt="4" gap="4">
            <Button
              loading={loading}
              type="primary"
              onClick={onSubmit}
              data-testid="quick-note-submit-button"
            >
              Save
            </Button>
            <Button
              type="default"
              onClick={onCancel}
              data-testid="quick-note-cancel-button"
            >
              Cancel
            </Button>
          </Flex>
        </>
      ) : (
        <Typography.Text
          css={css`
            cursor: pointer;
            white-space: pre-wrap;
            word-break: break-word;
            display: inline-block;
            width: 100%;
          `}
          data-testid="quick-note-text"
          onClick={onEdit}
          {...(order.adminNote
            ? {}
            : {
                type: 'secondary',
                italic: true,
              })}
        >
          {order.adminNote || 'Leave a quick note'}
        </Typography.Text>
      )}
    </DrawerPaper>
  );
};
