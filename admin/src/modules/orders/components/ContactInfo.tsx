import { Box } from '@components/utility/Box';
import { getCopyableProps } from '@components/utility/Copyable';
import { Flex } from '@components/utility/Flex';
import { ICustomer } from '@src/entity/Customer/Customer';
import { ICustomerDetails } from '@src/entity/Order/Order';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Typography } from 'antd';

const getFullName = (customer: ICustomer | ICustomerDetails) => {
  if (!customer?.firstName && !customer?.lastName) {
    return null;
  }

  return `${customer.firstName || ''} ${customer.lastName || ''}`;
};

export const ContactInfo = ({
  customerDetails,
  customer,
}: {
  customer: ICustomer | null;
  customerDetails: ICustomerDetails;
}) => {
  const isGuest = !customer?.id;
  const fullName = getFullName(customerDetails);
  const { email, phone, note } = customerDetails;

  return (
    <DrawerPaper>
      <DrawerPaperHeader title="Contact info" name="contact" />
      <Flex direction="column" grow="1">
        <Flex direction="column" mb="2">
          <Typography.Text type="secondary">Full Name</Typography.Text>
          {fullName ? (
            <Flex align="center" justify="space-between">
              <Typography.Text
                copyable={getCopyableProps(fullName)}
                data-testid="contact-info-name"
              >
                {fullName}
              </Typography.Text>
            </Flex>
          ) : (
            <Typography.Text data-testid="contact-info-no-name-message">
              No name provided
            </Typography.Text>
          )}
        </Flex>
        <Flex direction="column" mb="2">
          <Typography.Text type="secondary">Email</Typography.Text>
          {email ? (
            <Typography.Text
              copyable={getCopyableProps(email)}
              data-testid="contact-info-email"
            >
              {email}
            </Typography.Text>
          ) : (
            <Typography.Text data-testid="contact-info-no-email-message">
              No email provided
            </Typography.Text>
          )}
        </Flex>
        <Flex direction="column" mb="2">
          <Typography.Text type="secondary">Phone</Typography.Text>
          {phone ? (
            <Typography.Text
              copyable={getCopyableProps(phone)}
              data-testid="contact-info-phone"
            >
              {phone}
            </Typography.Text>
          ) : (
            <Typography.Text data-testid="contact-info-no-phone-message">
              No phone provided
            </Typography.Text>
          )}
        </Flex>
        <Flex direction="column">
          <Typography.Text type="secondary">Note</Typography.Text>
          {note ? (
            <Typography.Text
              copyable={getCopyableProps(note)}
              data-testid="contact-info-note"
            >
              {note}
            </Typography.Text>
          ) : (
            <Typography.Text data-testid="contact-info-no-note-message">
              No note provided
            </Typography.Text>
          )}
        </Flex>
        <Box mt="4" pr="10">
          {!isGuest && (
            <Typography.Text type="secondary">
              The contact information may be different from the customer's
              profile.
            </Typography.Text>
          )}
        </Box>
      </Flex>
    </DrawerPaper>
  );
};
