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
  leftColumn: ReactNode;
  rightColumn?: ReactNode;
  headerProps: IModalHeaderProps;
  errors: FieldErrors;
  name?: string;
}

export const ModalLayout = ({
  headerProps,
  leftColumn,
  rightColumn,
  errors,
  name,
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
      `}
    >
      <ModalHeader {...{ ...headerProps, name }} />
      <div
        css={css`
          background: var(--bg-gradient);
          overflow-y: auto;
          flex: 1;
        `}
      >
        <ValidationAlert
          errors={errors}
          css={css`
            padding: 0 var(--x4);
            margin-top: var(--x4);
          `}
        />
        <div
          css={css`
            display: grid;
            gap: var(--x4);
            grid-template-columns: 1fr;
            padding: var(--x4);
            overflow-y: auto;
            flex: 1;
          `}
        >
          <Flex direction="column" gap="4">
            {leftColumn}
          </Flex>
          {rightColumn && (
            <Flex direction="column" gap="4">
              {rightColumn}
            </Flex>
          )}
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
