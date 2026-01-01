import { Label } from '@components/forms/Label';
import { IStatusesRecord, StatusSelect } from '@components/forms/StatusSelect';
import { Flex } from '@components/utility/Flex';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { formatDate } from '@src/utils/date';
import { Typography } from 'antd';
import { FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';

export const EntryStatusAndInfo = ({
  statuses,
  createdAt,
  updatedAt,
}: {
  statuses: IStatusesRecord | null;
  createdAt: Date;
  updatedAt: Date;
}) => {
  return (
    <DrawerPaper>
      <DrawerPaperHeader
        title={<FormattedMessage id={t('settings.information.title')} />}
        name="entry-info"
      />
      {statuses && (
        <Flex direction="column" grow="1">
          <Label required>
            <FormattedMessage id={t('common.status')} />
          </Label>
          <StatusSelect name="status" statuses={statuses} />
        </Flex>
      )}
      {createdAt && (
        <Flex justify="space-between" mt="4">
          <Label>
            <FormattedMessage id={t('table.createdAt')} />
          </Label>
          <Typography.Text>{formatDate(createdAt)}</Typography.Text>
        </Flex>
      )}
      {updatedAt && (
        <Flex justify="space-between" mt="1">
          <Label>
            <FormattedMessage id={t('table.updatedAt')} />
          </Label>
          <Typography.Text>{formatDate(updatedAt)}</Typography.Text>
        </Flex>
      )}
    </DrawerPaper>
  );
};
