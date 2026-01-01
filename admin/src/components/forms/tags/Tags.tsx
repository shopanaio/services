import { Helper } from '@components/forms/Helper';
import { Label } from '@components/forms/Label';
import { TagsList } from '@components/forms/TagsGrid';
import { Box } from '@components/utility/Box';
import { TagSelect } from '@modules/tags/components/TagSelect';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Controller } from 'react-hook-form';
import { FormattedMessage } from 'react-intl';
import { t } from '@src/lang/messages';

export const Tags = ({ disabled }: { disabled?: boolean }) => {
  return (
    <Controller
      name="tags"
      render={({ field, fieldState }) => (
        <DrawerPaper>
          <DrawerPaperHeader
            title={<FormattedMessage id={t('common.tags')} />}
            badgeCount={field.value?.length || 0}
            showZero={false}
            name="tags"
          />
          <Box w="100%">
            <Label htmlFor="tags-field">
              <FormattedMessage id={t('common.tags')} />
            </Label>
            <TagSelect
              disabled={disabled}
              value={field.value}
              onChange={field.onChange}
              data-testid="tags-field"
            />
            <Helper>{fieldState.error?.message}</Helper>
            <TagsList value={field.value} setValue={field.onChange} />
          </Box>
        </DrawerPaper>
      )}
    />
  );
};

export const TagsControl = ({ disabled }: { disabled?: boolean }) => {
  return (
    <Controller
      name="tags"
      render={({ field, fieldState }) => (
        <Box>
          <Label htmlFor="tags-field">
            <FormattedMessage id={t('common.tags')} />
          </Label>
          <TagSelect
            disabled={disabled}
            value={field.value}
            onChange={field.onChange}
            data-testid="tags-field"
          />
          <Helper>{fieldState.error?.message}</Helper>
          <TagsList value={field.value} setValue={field.onChange} />
        </Box>
      )}
    />
  );
};
