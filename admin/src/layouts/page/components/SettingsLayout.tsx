import { ValidationAlert } from '@components/forms/ValidationAlert';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import {
  IPageHeaderProps,
  PageHeader,
} from '@src/layouts/page/components/PageHeader';
import { ReactNode } from 'react';
import { FieldErrors } from 'react-hook-form';

interface IDrawerLayoutProps {
  leftColumn: ReactNode;
  rightColumn: ReactNode;
  headerProps: IPageHeaderProps;
  errors: FieldErrors;
  name?: string;
}

export const SettingsLayout = ({
  headerProps,
  leftColumn,
  rightColumn,
  errors,
  name,
}: IDrawerLayoutProps) => {
  return (
    <div
      data-testid={`${name}-page`}
      css={css`
        /* padding: 0 100px; */
        max-width: 1000px;
        margin: 0 auto;
      `}
    >
      <PageHeader {...{ ...headerProps, name }} />
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
          grid-template-columns: ${rightColumn ? '300px' : ''} 1fr;
          width: 100%;
        `}
      >
        {rightColumn && (
          <Flex direction="column" gap="4">
            {rightColumn}
          </Flex>
        )}
        <Flex direction="column" gap="4">
          {leftColumn}
        </Flex>
      </div>
    </div>
  );
};
