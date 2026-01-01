import { buttonHoverCss } from '@components/editor/styles';
import { css } from '@emotion/react';
import { TagColor } from '@src/graphql';
import { Button, Popover } from 'antd';
import { useState, Fragment } from 'react';
import { MdFormatColorText } from 'react-icons/md';

interface IColorDropdownProps {
  onChange: (v: string) => void;
  value: string;
}

export const ColorDropdown = ({ value, onChange }: IColorDropdownProps) => {
  const [open, setOpen] = useState(false);

  const onClickColor = (color: string) => () => {
    onChange(color);
    setOpen(false);
  };

  return (
    <>
      <Popover
        trigger={['click']}
        content={
          <div
            css={css`
              display: grid;
              grid-gap: var(--x2);
              grid-template-columns: repeat(13, var(--x5));
              padding: var(--x4);
            `}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((step) => (
              <Fragment key={step}>
                {[
                  TagColor.Default,
                  TagColor.Blue,
                  TagColor.Cyan,
                  TagColor.Green,
                  TagColor.Red,
                  TagColor.Volcano,
                  TagColor.Orange,
                  TagColor.Gold,
                  TagColor.Yellow,
                  TagColor.Lime,
                  TagColor.Geekblue,
                  TagColor.Purple,
                  TagColor.Magenta,
                ].map((color) => {
                  const value = `var(--color-${color}-${step})`;
                  return (
                    <button
                      onClick={onClickColor(value)}
                      key={step}
                      css={css`
                        width: var(--x5);
                        height: var(--x5);
                        border-radius: 4px;
                        border: none;
                        cursor: pointer;
                      `}
                      style={{
                        backgroundColor: value,
                      }}
                    />
                  );
                })}
              </Fragment>
            ))}
          </div>
        }
        placement="bottomRight"
        open={open}
        onOpenChange={setOpen}
      >
        <Button
          icon={
            <MdFormatColorText
              size={20}
              name="MdFormatColorText"
              {...(value ? { color: value } : {})}
            />
          }
          type="text"
          css={[buttonHoverCss]}
        />
      </Popover>
    </>
  );
};
