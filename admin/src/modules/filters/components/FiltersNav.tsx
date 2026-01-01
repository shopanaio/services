import { ConfirmSaving } from '@components/forms/ConfirmSaving';
import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { DrawerPaper } from '@src/layouts/drawer/components/DrawerPaper';
import { DrawerPaperHeader } from '@src/layouts/drawer/components/PaperHeader';
import { Typography } from 'antd';

interface IFiltersNavProps {
  onOpen?: (id: any, shouldSave: boolean) => void;
  activeId?: any;
  isDirty?: boolean;
}

export const FiltersNav = ({ onOpen, activeId, isDirty }: IFiltersNavProps) => {
  return (
    <DrawerPaper>
      <DrawerPaperHeader title="Filters & Sort" />
      <Box>
        {[{ id: 'filters', title: 'Filters' }].map((it, idx) => {
          const handleOk = (shouldSave: boolean) => {
            onOpen?.(it.id, shouldSave);
          };

          return (
            <ConfirmSaving key={idx} onOk={handleOk} disabled={!isDirty}>
              <Flex
                key={idx}
                gap="4"
                py="1"
                px="4"
                h="40px"
                data-testid={`filters-nav-item-${idx}`}
                align="center"
                onClick={() => !isDirty && handleOk(false)}
                css={css`
                  cursor: pointer;
                  border-radius: var(--radius-base);
                  margin-bottom: 1px;
                  &:hover span {
                    text-decoration: underline;
                  }
                `}
                style={{
                  ...(activeId === it.id
                    ? { backgroundColor: 'var(--color-geekblue-1)' }
                    : {}),
                }}
              >
                <Typography.Text
                  ellipsis
                  style={{
                    ...(activeId === it.id
                      ? { color: 'var(--color-primary)' }
                      : {}),
                  }}
                >
                  {it.title}
                </Typography.Text>
              </Flex>
            </ConfirmSaving>
          );
        })}
      </Box>
    </DrawerPaper>
  );
};
