import { MouseEvent, useCallback, useState } from 'react';
import { css } from '@emotion/react';

import { Button, Input, Popover } from 'antd';
import { Label } from '@components/forms/Label';
import { Box } from '@components/utility/Box';
import { useAttrs, useCommands } from '@remirror/react';
import { LinkExtension } from 'remirror/extensions';
import * as yup from 'yup';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormattedMessage, useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

import {
  CommandButtonBadge,
  CommandButtonIcon,
} from '@components/editor/Remirror/CmdButtonIcon';
import { remirrorStyles } from '@components/editor/Remirror/styes';

const linkSchema = yup.object().shape({
  link: yup.string().url().required(),
});

interface ILinkDropdownProps {}

export const LinkDropdown = ({}: ILinkDropdownProps) => {
  const [open, setOpen] = useState(false);

  const attrs = useAttrs().link();
  const active = !!attrs;

  const { updateLink, selectLink } = useCommands<LinkExtension>();
  // @ts-expect-error
  const enabled = updateLink.enabled();

  const { formatMessage } = useIntl();
  const { reset, handleSubmit, control } = useForm({
    resolver: yupResolver(linkSchema),
    defaultValues: {
      link: '',
    },
  });

  const handleMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault();
  }, []);

  const onSubmit = handleSubmit((data) => {
    updateLink({ href: data.link });
    setOpen(false);
  });

  return (
    <Popover
      trigger={['click']}
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
      content={
        <form
          onSubmit={onSubmit}
          css={css`
            min-width: 300px;
            padding: var(--size-4) var(--size-4) var(--size-5);
            display: flex;
            flex-direction: column;
            gap: var(--size-4);

            & > label > span {
              margin-bottom: var(--size-1);
            }
          `}
        >
          <Box mb="2">
            <Label>
              <FormattedMessage id={t('common.link')} />
            </Label>
            <Controller
              control={control}
              name="link"
              render={({ field, fieldState }) => {
                return (
                  <Input
                    onFocus={(e) => {
                      e.stopPropagation();
                    }}
                    name={field.name}
                    status={fieldState.invalid ? 'error' : undefined}
                    placeholder={formatMessage({ id: t('common.enterLink') })}
                    value={field.value}
                    onChange={field.onChange}
                  />
                );
              }}
            />
          </Box>
          <Button htmlType="submit" type="primary">
            <FormattedMessage id={t('common.apply')} />
          </Button>
        </form>
      }
    >
      <Button
        disabled={!enabled}
        onMouseDown={handleMouseDown}
        type="text"
        css={remirrorStyles.cmdButton(active)}
        onClick={() => {
          reset({ link: (attrs?.href as string) || '' }, { keepDirty: false });
          selectLink();
          setOpen(!open);
        }}
      >
        <CommandButtonBadge icon="link">
          <CommandButtonIcon icon="link" />
        </CommandButtonBadge>
      </Button>
    </Popover>
  );
};
