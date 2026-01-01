import { Box } from '@components/utility/Box';
import { ICustomer } from '@src/entity/Customer/Customer';
import { Tag } from 'antd';

export const CustomerTag = ({
  entry,
  onClose,
}: {
  entry?: ICustomer | null;
  onClose: () => void;
}) => {
  if (!entry) {
    return null;
  }

  return (
    <Box mt="2">
      <Tag closable onClose={onClose} color="blue">
        {entry?.firstName} {entry?.lastName}
      </Tag>
    </Box>
  );
};
