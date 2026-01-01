import { useSlug } from '@components/forms/slug/useSlug';
import { Flex } from '@components/utility/Flex';
import { Tooltip, Typography } from 'antd';
import { Control, Controller } from 'react-hook-form';
import { MdInfo } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const SlugPreview = ({
  referenceName,
  control,
  info,
}: {
  referenceName?: string;
  control?: Control<any>;
  info?: string;
}) => {
  const { formatMessage } = useIntl();
  const defaultInfo = formatMessage({ id: t('forms.slug.info') });

  useSlug({
    referenceName: referenceName || `title`,
    slugName: 'slug',
    sync: true,
  });

  return (
    <Controller
      {...(control ? { control } : {})}
      name="slug"
      render={({ field }) => {
        return (
          <Flex mt="2" gap="1" align="center">
            <Typography.Text type="secondary" italic>
              {formatMessage({ id: t('forms.slug.label') })}:{' '}
              {field.value || formatMessage({ id: t('common.empty') })}
            </Typography.Text>
            <Tooltip title={info || defaultInfo}>
              <MdInfo color="var(--color-gray-7)" size={16} />
            </Tooltip>
          </Flex>
        );
      }}
    />
  );
};
