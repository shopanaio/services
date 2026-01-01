import { Label } from '@components/forms/Label';
import { useSlug } from '@components/forms/slug/useSlug';
import { Flex } from '@components/utility/Flex';
import { Button, Input, Space } from 'antd';
import { Control, Controller } from 'react-hook-form';
import { MdOutlineSync, MdOutlineSyncDisabled } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

export const Slug = ({
  sync,
  referenceName,
  control,
  label,
  info,
}: {
  sync?: boolean;
  disabled?: boolean;
  referenceName?: string;
  control?: Control<any>;
  label?: string;
  info?: string;
}) => {
  const { formatMessage } = useIntl();
  const { isSyncOn, onUnlock } = useSlug({
    referenceName: referenceName || `title`,
    slugName: 'slug',
    sync,
  });

  const defaultLabel = formatMessage({ id: t('forms.slug.label') });
  const defaultInfo = formatMessage({ id: t('forms.slug.info') });

  const Icon = isSyncOn ? MdOutlineSync : MdOutlineSyncDisabled;

  return (
    <Controller
      {...(control ? { control } : {})}
      name="slug"
      render={({ field, fieldState }) => {
        return (
          <Flex direction="column" grow="1">
            <Label required info={info || defaultInfo}>
              {label || defaultLabel}
            </Label>
            <Space.Compact>
              <Input
                data-testid="slug-input"
                readOnly={isSyncOn}
                style={{
                  color: isSyncOn
                    ? 'var(--color-blue-7)'
                    : 'var(--color-gray-7)',
                  borderColor: isSyncOn ? 'var(--color-blue-3)' : undefined,
                  outlineColor: isSyncOn ? 'var(--color-blue-3)' : undefined,
                  backgroundColor: isSyncOn
                    ? 'var(--color-blue-1)'
                    : 'var(--color-gray-3)',
                }}
                ref={field.ref}
                value={field.value}
                onChange={(e) => {
                  if (!/^[A-Za-z0-9_-]*$/.test(e.target.value)) {
                    return;
                  }
                  field.onChange(e);
                }}
                placeholder={formatMessage({ id: t('forms.slug.placeholder') })}
                status={fieldState?.invalid ? 'error' : undefined}
                maxLength={255}
                showCount={{
                  formatter: ({ count, maxLength }) => {
                    return `${count} / ${maxLength}`;
                  },
                }}
              />
              <Button
                icon={
                  <Icon
                    size={20}
                    color={
                      isSyncOn ? 'var(--color-blue-7)' : 'var(--color-gray-9)'
                    }
                  />
                }
                role="button"
                onClick={() => onUnlock(field.value)}
                danger={fieldState?.invalid}
                data-testid="slug-lock-button"
                style={{
                  borderColor: isSyncOn ? 'var(--color-blue-3)' : undefined,
                  backgroundColor: isSyncOn
                    ? 'var(--color-blue-1)'
                    : 'var(--color-gray-3)',
                }}
              />
            </Space.Compact>
          </Flex>
        );
      }}
    />
  );
};
