import { Label } from '@/components/forms/Label';
import { Flex } from '@/components/utility/Flex';
import { DrawerPaper } from '@/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@/layouts/drawer/components/PaperHeader';
import { Typography, Select } from 'antd';
import { Controller } from 'react-hook-form';
import { EntityStatus } from '@/domains/inventory/products/types';
import { entityStatuses } from '@/defs/constants';

const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const EntryStatusAndInfo = ({
  createdAt,
  updatedAt,
  showStatus = true,
}: {
  createdAt?: Date | string;
  updatedAt?: Date | string;
  showStatus?: boolean;
}) => {
  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title="Information"
        name="entry-info"
      />
      {showStatus && (
        <Controller
          name="status"
          render={({ field }) => (
            <Flex direction="column" grow="1">
              <Label required>Status</Label>
              <Select
                value={field.value}
                onChange={field.onChange}
                options={Object.values(entityStatuses).map((status) => ({
                  label: status.label,
                  value: status.value,
                }))}
                style={{ width: '100%' }}
                data-testid="status-select"
              />
            </Flex>
          )}
        />
      )}
      {createdAt && (
        <Flex justify="space-between" mt="4">
          <Label>Created at</Label>
          <Typography.Text>{formatDate(createdAt)}</Typography.Text>
        </Flex>
      )}
      {updatedAt && (
        <Flex justify="space-between" mt="1">
          <Label>Updated at</Label>
          <Typography.Text>{formatDate(updatedAt)}</Typography.Text>
        </Flex>
      )}
    </DrawerPaper>
  );
};
