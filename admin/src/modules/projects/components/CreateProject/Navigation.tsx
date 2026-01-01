import { Box } from '@components/utility/Box';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { Button } from 'antd';
import { MdOutlineArrowBack } from 'react-icons/md';
import { useIntl } from 'react-intl';
import { t } from '@src/lang/messages';

interface INextProps {
  onClick?: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

interface INavigationProps {
  onPrev?: () => void;
  nextProps: INextProps;
}

export const Navigation = ({ onPrev, nextProps }: INavigationProps) => {
  const { formatMessage } = useIntl();
  return (
    <Flex justify="space-between">
      <Box>
        {onPrev && (
          <Button
            data-testid="back-button"
            onClick={onPrev}
            icon={
              <MdOutlineArrowBack
                css={css`
                  transform: translateY(3px);
                `}
                size={16}
              />
            }
          >
            {formatMessage({ id: t('projects.navigation.back') })}
          </Button>
        )}
      </Box>
      {nextProps && (
        <Button
          data-testid="next-button"
          onClick={nextProps.onClick}
          disabled={nextProps.disabled}
          css={css`
            min-width: 80px;
          `}
          type="primary"
        >
          {nextProps.children || formatMessage({ id: t('projects.navigation.next') })}
        </Button>
      )}
    </Flex>
  );
};
