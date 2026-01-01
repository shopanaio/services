import { Label } from '@components/forms/Label';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { OrderBySelect } from '@modules/categories/components/Products/OrderBySelect';
import { ListingSort } from '@src/graphql';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Switch, Typography } from 'antd';
import { FormattedMessage, useIntl } from 'react-intl';
import { t } from '@src/lang/messages';
import { Controller, useFormContext } from 'react-hook-form';

export const ListingSortSettings = () => {
  const methods = useFormContext();
  const { formatMessage } = useIntl();

  const listingOrderBy: ListingSort = methods.watch('listingOrderBy');
  const hasStatusOrder: boolean = methods.watch('listingOrderByStatus');

  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title={<FormattedMessage id={t('category.listingSettings.title')} />}
        name="listing-settings"
      />
      <Box>
        <Flex gap="2" direction="column">
          <Controller
            name="listingOrderBy"
            render={({ field }) => {
              return (
                <Flex direction="column">
                  <Label
                    info={formatMessage({
                      id: t('category.listingSettings.primarySortOrder.info'),
                    })}
                  >
                    <FormattedMessage
                      id={t('category.listingSettings.primarySortOrder.label')}
                    />
                  </Label>
                  <OrderBySelect
                    value={listingOrderBy}
                    onChange={field.onChange}
                    hasCustom
                    hasStatusOrder={hasStatusOrder}
                  />
                </Flex>
              );
            }}
          />
        </Flex>
        <Flex gap="2" direction="column" mt="4">
          <Controller
            name="listingOrderByStatus"
            render={({ field: { value, onChange } }) => (
              <Flex direction="column">
                <Label>
                  <Flex gap="2" align="center">
                    <Switch
                      size="small"
                      data-testid="availability-sort-switch"
                      checked={value}
                      onChange={onChange}
                    />
                    <Typography.Text>
                      <FormattedMessage
                        id={t(
                          'category.listingSettings.prioritizeAvailable.label',
                        )}
                      />
                    </Typography.Text>
                  </Flex>
                </Label>
                <Typography.Text type="secondary">
                  <FormattedMessage
                    id={t('category.listingSettings.prioritizeAvailable.info')}
                  />
                </Typography.Text>
              </Flex>
            )}
          />
        </Flex>
      </Box>
    </DrawerPaper>
  );
};
