import { Label } from '@/components/forms/Label';
import { Flex } from '@/components/utility/Flex';
import { Button, Input, Space } from 'antd';
import { Control, Controller, useFormContext } from 'react-hook-form';
import { MdOutlineSync, MdOutlineSyncDisabled } from 'react-icons/md';
import { useState, useEffect, useCallback } from 'react';

// Simple slug generation utility
const toSlug = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

export const Slug = ({
  sync,
  referenceName = 'title',
  control,
  label = 'Slug',
  info = 'URL-friendly identifier for this item',
  disabled,
}: {
  sync?: boolean;
  disabled?: boolean;
  referenceName?: string;
  control?: Control<any>;
  label?: string;
  info?: string;
}) => {
  const { watch, setValue } = useFormContext();
  const [isSyncOn, setIsSyncOn] = useState(sync || false);

  const titleValue = watch(referenceName);

  // Sync slug with title when sync is on
  useEffect(() => {
    if (isSyncOn && titleValue) {
      setValue('slug', toSlug(titleValue), { shouldDirty: true });
    }
  }, [isSyncOn, titleValue, setValue]);

  const onUnlock = useCallback(() => {
    setIsSyncOn(!isSyncOn);
  }, [isSyncOn]);

  const Icon = isSyncOn ? MdOutlineSync : MdOutlineSyncDisabled;

  if (disabled) {
    return null;
  }

  return (
    <Controller
      {...(control ? { control } : {})}
      name="slug"
      render={({ field, fieldState }) => {
        return (
          <Flex direction="column" grow="1">
            <Label required info={info}>
              {label}
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
                placeholder="Enter slug"
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
                onClick={onUnlock}
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
