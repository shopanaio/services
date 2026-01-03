import { ValidationAlert } from '@components/forms/ValidationAlert';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import {
  ModalHeader,
  IModalHeaderProps,
} from '@src/layouts/modal/components/ModalHeader';
import { Tabs, TabsProps } from 'antd';
import { ReactNode } from 'react';
import { FieldErrors } from 'react-hook-form';

interface IModalLayoutProps {
  children?: ReactNode;
  headerProps: IModalHeaderProps;
  errors: FieldErrors;
  name?: string;
  fullWidth?: boolean;
}

export const ModalLayout = ({
  headerProps,
  children,
  errors,
  name,
  fullWidth,
}: IModalLayoutProps) => {
  return (
    <div
      data-testid={`${name ? `${name}-` : ''}modal`}
      css={css`
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        border-radius: 8px;
        overflow: hidden;
      `}
    >
      <ModalHeader {...{ ...headerProps, name }} />
      <div
        css={css`
          background: var(--color-gray-2);
          overflow-y: auto;
          flex: 1;
        `}
      >
        <div
          css={css`
            margin-inline: auto;
            max-width: ${fullWidth ? 'none' : '800px'};
            display: flex;
            gap: var(--x4);
            flex-direction: column;
            padding-block: var(--x4);
            padding-inline: ${fullWidth ? 'var(--x4)' : '0'};
          `}
        >
          <ValidationAlert
            errors={errors}
            css={css`
              padding: 0 var(--x4);
              margin-top: var(--x4);
            `}
          />

          {children}
        </div>
      </div>
    </div>
  );
};

export const ModalLayoutWithTabs = ({
  headerProps,
  errors,
  name,
  tabs,
}: IModalLayoutProps & {
  tabs: TabsProps['items'];
}) => {
  return (
    <div
      data-testid={`${name ? `${name}-` : ''}modal`}
      css={css`
        height: 100%;
        display: flex;
        flex-direction: column;
      `}
    >
      <ModalHeader {...{ ...headerProps, name }} />
      <ValidationAlert
        errors={errors}
        css={css`
          padding: 0 var(--x6);
          margin-top: var(--x4);
        `}
      />
      <Tabs
        items={tabs}
        css={css`
          flex: 1;
          overflow: hidden;
        `}
      />
    </div>
  );
};

export const ModalLayoutGrid = ({
  children,
  aside,
}: {
  children: ReactNode;
  aside: ReactNode;
}) => {
  return (
    <div
      css={css`
        display: grid;
        gap: var(--x4);
        grid-template-columns: 1fr ${aside ? '356px' : ''};
        background: var(--bg-gradient);
      `}
    >
      <Flex direction="column" gap="4" pb="14">
        {children}
      </Flex>
      {aside && (
        <Flex direction="column" gap="4">
          {aside}
        </Flex>
      )}
    </div>
  );
};
