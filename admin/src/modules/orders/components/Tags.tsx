import { notify } from '@components/feedback/notification';
import { Label } from '@components/forms/Label';
import { TagsList } from '@components/forms/TagsGrid';
import { Flex } from '@components/utility/Flex';
import { useUpdateOrderTags } from '@modules/orders/hooks/mutations';
import { TagSelect } from '@modules/tags/components/TagSelect';
import { IOrder } from '@src/entity/Order/Order';
import { ITag } from '@src/entity/Tag/Tag';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { mapEntryId } from '@src/utils/utils';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const OrderTags = ({
  order,
  refetch,
}: {
  order: IOrder;
  refetch: () => Promise<void>;
}) => {
  const intl = useIntl();
  const { tags } = order;
  const [, setLoading] = useState(false);
  const { updateTags } = useUpdateOrderTags();

  const onChange = async (value: ITag[]) => {
    try {
      setLoading(true);
      await updateTags({
        id: order.id,
        tags: value.map(mapEntryId),
      });

      await refetch();
      notify.success(intl.formatMessage({ id: t('orders.tags.updated') }));
    } catch {
      notify.error(intl.formatMessage({ id: t('orders.tags.updateFailed') }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DrawerPaper>
      <DrawerPaperHeader title={intl.formatMessage({ id: t('common.tags') })} name="tags" />
      <Flex direction="column">
        <Label>{intl.formatMessage({ id: t('common.tags') })}</Label>
        <TagSelect value={tags} onChange={onChange} />
        <TagsList value={tags} setValue={onChange as any} sortable />
      </Flex>
    </DrawerPaper>
  );
};
