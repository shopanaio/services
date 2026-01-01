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

export const PageLayout = ({
  headerProps,
  leftColumn,
  rightColumn,
  errors,
  name,
}: IDrawerLayoutProps) => {
  return (
    <div data-testid={`${name}-drawer`}>
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
          grid-template-columns: 1fr ${rightColumn ? '356px' : ''};
          padding: 0 var(--x6) var(--x6);
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
