import { Paper } from '@components/paper/Paper';
import { Flex } from '@components/utility/Flex';
import { Box } from '@components/utility/Box';
import { css } from '@emotion/react';
import { Button, Typography, Tabs, Dropdown } from 'antd';
import { WarningOutlined, MoreOutlined } from '@ant-design/icons';
import { IProduct } from '@src/entity/Product/Product';
import { useIntl } from 'react-intl';
import { t as tCommon } from '@src/lang/messages';

// ============================================================================
// Design Tokens
// ============================================================================

const tokens = {
  cardPadding: 24,
  borderRadius: 8,
  typography: {
    label: { size: 12, weight: 500 },
  },
  colors: {
    success: '#52c41a',
    warning: '#faad14',
  },
};

// ============================================================================
// Styles
// ============================================================================

const tabsSectionStyles = css`
  padding: 16px ${tokens.cardPadding}px ${tokens.cardPadding}px;
  border-radius: ${tokens.borderRadius}px;
`;

// ============================================================================
// Sub-components
// ============================================================================

type StatusDotVariant = 'success' | 'warning' | 'error' | 'default';

interface IStatusDotProps {
  variant?: StatusDotVariant;
  size?: number;
}

const StatusDot = ({ variant = 'success', size = 6 }: IStatusDotProps) => {
  const colors: Record<StatusDotVariant, string> = {
    success: tokens.colors.success,
    warning: tokens.colors.warning,
    error: '#ff4d4f',
    default: 'var(--color-gray-5)',
  };

  return (
    <Box
      css={css`
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: ${colors[variant]};
        flex-shrink: 0;
      `}
    />
  );
};

// ============================================================================
// Types
// ============================================================================

interface IProductContentTabsProps {
  product: IProduct;
  onEditSection?: (section: string) => void;
}

// ============================================================================
// Main Component
// ============================================================================

export const ProductContentTabs = ({
  product,
  onEditSection,
}: IProductContentTabsProps) => {
  const { formatMessage } = useIntl();

  const handleEdit = (section: string) => onEditSection?.(section);

  // Description preview extraction
  const getDescriptionPreview = () => {
    if (!product.description) return null;
    try {
      const parsed = JSON.parse(product.description);
      const extractText = (node: any): string => {
        if (node.text) return node.text;
        if (node.content) return node.content.map(extractText).join(' ');
        return '';
      };
      return extractText(parsed).slice(0, 300);
    } catch {
      return typeof product.description === 'string'
        ? product.description.slice(0, 300)
        : null;
    }
  };

  const descriptionPreview = getDescriptionPreview();

  return (
    <Paper css={tabsSectionStyles}>
      <Tabs
        size="small"
        css={css`
          .ant-tabs-nav {
            margin-bottom: 16px !important;
          }
          .ant-tabs-tab {
            padding: 8px 0 !important;
            font-size: 13px;
          }
        `}
        items={[
          {
            key: 'description',
            label: (
              <Flex align="center" gap="2">
                <span>{formatMessage({ id: tCommon('common.description') })}</span>
                <StatusDot variant={descriptionPreview ? 'success' : 'warning'} />
              </Flex>
            ),
            children: descriptionPreview ? (
              <Box>
                {/* Content header */}
                <Flex align="center" justify="flex-end" css={css`margin-bottom: 8px;`}>
                  <Flex gap="3">
                    <Button
                      type="primary"
                      ghost
                      size="small"
                      css={css`
                        height: 24px;
                        font-size: 11px;
                        padding: 0 10px;
                      `}
                    >
                      AI Assist
                    </Button>
                    <Dropdown
                      menu={{
                        items: [{ key: 'edit', label: 'Edit' }],
                        onClick: () => handleEdit('description'),
                      }}
                      trigger={['click']}
                    >
                      <Button size="small" icon={<MoreOutlined />} />
                    </Dropdown>
                  </Flex>
                </Flex>
                <Typography.Paragraph
                  ellipsis={{ rows: 3 }}
                  css={css`
                    margin: 0 !important;
                    font-size: 13px;
                    color: var(--color-gray-8);
                    line-height: 1.6;
                  `}
                >
                  {descriptionPreview}
                  {descriptionPreview.length >= 300 && '...'}
                </Typography.Paragraph>
              </Box>
            ) : (
              <Flex align="center" gap="2" css={css`padding: 16px 0;`}>
                <WarningOutlined css={css`color: var(--color-gray-5);`} />
                <Typography.Text type="secondary" css={css`font-size: 12px;`}>
                  No description added
                </Typography.Text>
                <Button
                  type="link"
                  size="small"
                  onClick={() => handleEdit('description')}
                  css={css`padding: 0; height: auto;`}
                >
                  Add now
                </Button>
              </Flex>
            ),
          },
          {
            key: 'excerpt',
            label: (
              <Flex align="center" gap="2">
                <span>{formatMessage({ id: tCommon('common.excerpt') })}</span>
                <StatusDot variant={product.excerpt ? 'success' : 'default'} />
              </Flex>
            ),
            children: product.excerpt ? (
              <Box>
                {/* Content header */}
                <Flex align="center" justify="flex-end" css={css`margin-bottom: 8px;`}>
                  <Dropdown
                    menu={{
                      items: [{ key: 'edit', label: 'Edit' }],
                      onClick: () => handleEdit('excerpt'),
                    }}
                    trigger={['click']}
                  >
                    <Button size="small" icon={<MoreOutlined />} />
                  </Dropdown>
                </Flex>
                <Typography.Paragraph
                  ellipsis={{ rows: 3 }}
                  css={css`
                    margin: 0 !important;
                    font-size: 13px;
                    color: var(--color-gray-8);
                    line-height: 1.6;
                  `}
                >
                  {product.excerpt}
                </Typography.Paragraph>
              </Box>
            ) : (
              <Flex align="center" gap="2" css={css`padding: 16px 0;`}>
                <WarningOutlined css={css`color: var(--color-gray-5);`} />
                <Typography.Text type="secondary" css={css`font-size: 12px;`}>
                  No excerpt added
                </Typography.Text>
                <Button
                  type="link"
                  size="small"
                  onClick={() => handleEdit('excerpt')}
                  css={css`padding: 0; height: auto;`}
                >
                  Add now
                </Button>
              </Flex>
            ),
          },
        ]}
      />
    </Paper>
  );
};
