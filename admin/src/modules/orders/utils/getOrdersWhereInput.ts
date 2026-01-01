import { getWhereInput } from '@components/filters/UiFilterWidget/getWhereInput';
import { UiFilter } from '@src/entity/UiFilter';
import { ITableNavigationProps } from '@src/layouts/table/components/Navigation/Navigation';

export const getOrdersWhereInput = (
  props: Pick<
    ITableNavigationProps,
    'localesProps' | 'searchProps' | 'sortProps' | 'filtersProps'
  >,
) => {
  return getWhereInput({
    ...props,
    searchProperties: [
      {
        key: 'orderNumber',
        type: UiFilter.UiFilterType.Integer,
      },
      {
        key: 'note',
        type: UiFilter.UiFilterType.String,
      },
      {
        key: 'customerEmail',
        type: UiFilter.UiFilterType.String,
      },
      {
        key: 'customerPhoneNumber',
        type: UiFilter.UiFilterType.String,
      },
      {
        key: 'customerFirstName',
        type: UiFilter.UiFilterType.String,
      },
      {
        key: 'customerMiddleName',
        type: UiFilter.UiFilterType.String,
      },
      {
        key: 'customerLastName',
        type: UiFilter.UiFilterType.String,
      },
      {
        key: 'shippingAddress.address1',
        type: UiFilter.UiFilterType.String,
      },
      {
        key: 'shippingAddress.address2',
        type: UiFilter.UiFilterType.String,
      },
    ],
  });
};
