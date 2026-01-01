import { Label } from '@components/forms/Label';
import { Flex } from '@components/utility/Flex';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Input } from 'antd';
import { Controller } from 'react-hook-form';
import { FormattedMessage, useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const Note = ({ disabled }: { disabled?: boolean }) => {
  const { formatMessage } = useIntl();
  return (
    <DrawerPaper>
      <DrawerPaperHeader title={<FormattedMessage id={t('common.note')} />} />
      <Controller
        name="note"
        render={({ field, fieldState }) => {
          return (
            <Flex direction="column" grow="1">
              <Label>
                <FormattedMessage id={t('common.note')} />
              </Label>
              <Input.TextArea
                disabled={disabled}
                value={field.value}
                rows={3}
                data-testid="note-input"
                onChange={field.onChange}
                placeholder={formatMessage({ id: t('common.note') })}
                status={fieldState?.invalid ? 'error' : undefined}
              />
            </Flex>
          );
        }}
      />
    </DrawerPaper>
  );
};
