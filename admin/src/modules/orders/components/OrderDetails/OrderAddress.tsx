import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { IAddress } from '@src/entity/Order/Order';
import { Typography } from 'antd';

export const OrderAddress = ({
  address1,
  address2,
  city,
  firstName,
  lastName,
  middleName,
  phone,
  state,
  countryCode,
  email,
  postalCode,
  provinceCode,
}: Omit<IAddress, 'id'>) => {
  return (
    <Box>
      <Flex gap="1" mt="1">
        <Typography.Text>
          {firstName || '-'} {lastName || '-'}{' '}
          {middleName ? `(${middleName})` : ''}
        </Typography.Text>
      </Flex>
      <Flex gap="1" mt="1">
        <Typography.Text>
          {address1 || '-'}
          {address2 ? `, ${address2}` : ''}
        </Typography.Text>
      </Flex>
      <Flex gap="1" mt="1">
        <Typography.Text>{city || '-'}</Typography.Text>
        <Typography.Text>{provinceCode || '-'}</Typography.Text>
        <Typography.Text>{postalCode || '-'}</Typography.Text>
      </Flex>
      <Flex gap="1" mt="1">
        <Typography.Text>{countryCode || '-'}</Typography.Text>
      </Flex>
      <Flex gap="1" mt="1">
        <Typography.Text>{phone || '-'}</Typography.Text>
      </Flex>
      <Flex gap="1" mt="1">
        <Typography.Text>{email || '-'}</Typography.Text>
      </Flex>
    </Box>
  );
};
