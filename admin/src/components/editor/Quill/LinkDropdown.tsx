import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  buttonActiveHoverCss,
  buttonHoverCss,
} from '@components/editor/styles';
import { Button, Input, Popover } from 'antd';
import { MdOutlineLink } from 'react-icons/md';
import { Label } from '@components/forms/Label';
import { Box } from '@components/utility/Box';
import { FormattedMessage, useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface ILinkDropdownProps {
  isActive: boolean;
  onChange: (v: string) => void;
  value: string;
  onSubmit: () => void;
  onOpen: () => void;
}

export const LinkDropdown = ({
  isActive,
  onChange,
  value,
  onSubmit,
  onOpen,
}: ILinkDropdownProps) => {
  const [open, setOpen] = useState(false);
  const { formatMessage } = useIntl();

  return (
    <Popover
      trigger={['click']}
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
      content={
        <div
          onClick={(e) => {
            e.stopPropagation();
          }}
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
            <Input
              onFocus={(e) => {
                e.stopPropagation();
              }}
              placeholder={formatMessage({ id: t('common.enterLink') })}
              value={value}
              onChange={({ target }: React.ChangeEvent<HTMLInputElement>) =>
                onChange(target.value)
              }
            />
          </Box>
          <Button
            block
            type="primary"
            onClick={() => {
              onSubmit();
              setOpen(false);
            }}
          >
            <FormattedMessage id={t('common.apply')} />
          </Button>
        </div>
      }
    >
      <Button
        type="text"
        icon={<MdOutlineLink size={20} />}
        onClick={() => {
          if (!open) {
            onOpen();
          }
          setOpen(!open);
        }}
        css={[isActive ? buttonActiveHoverCss : buttonHoverCss]}
      />
    </Popover>
  );
};
