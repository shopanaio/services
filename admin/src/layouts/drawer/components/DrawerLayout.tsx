import { ValidationAlert } from '@components/forms/ValidationAlert';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import {
  DrawerHeader,
  IDrawerHeaderProps,
} from '@src/layouts/drawer/components/DrawerHeader';
import { Tabs, TabsProps } from 'antd';
import { ReactNode } from 'react';
import { FieldErrors } from 'react-hook-form';

interface IDrawerLayoutProps {
  leftColumn: ReactNode;
  rightColumn?: ReactNode;
  headerProps: IDrawerHeaderProps;
  errors: FieldErrors;
  name?: string;
}

export const DrawerLayout = ({
  headerProps,
  leftColumn,
  rightColumn,
  errors,
  name,
}: IDrawerLayoutProps) => {
  return (
    <div
      data-testid={`${name ? `${name}-` : ''}drawer`}
      css={css`
        width: 100%;
        box-sizing: border-box;
      `}
    >
      <DrawerHeader {...{ ...headerProps, name }} />
      <ValidationAlert
        errors={errors}
        css={css`
          padding: 0 var(--x6);
          margin-bottom: var(--x4);
        `}
      />
      <div
        css={css`
          display: grid;
          gap: var(--x4);
          grid-template-columns: 1fr ${rightColumn ? '356px' : ''};
          padding: 0 var(--x6) var(--x6);
          background: var(--bg-gradient);
          overflow-x: auto;
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
  );
};

export const DrawerLayoutWithTabs = ({
  headerProps,
  errors,
  name,
  tabs,
}: IDrawerLayoutProps & {
  tabs: TabsProps['items'];
}) => {
  return (
    <div data-testid={`${name ? `${name}-` : ''}drawer`}>
      <DrawerHeader {...{ ...headerProps, name }} />
      <ValidationAlert
        errors={errors}
        css={css`
          padding: 0 var(--x6);
          margin-bottom: var(--x4);
        `}
      />
      <Tabs items={tabs} />
    </div>
  );
};

export const DrawerLayoutGrid = ({
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
