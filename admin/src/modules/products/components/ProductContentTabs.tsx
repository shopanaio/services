import { Paper } from '@components/paper/Paper';
import { Flex } from '@components/utility/Flex';
import { css } from '@emotion/react';
import { Button, Typography, Tabs, Dropdown } from 'antd';
import { WarningOutlined, MoreOutlined, ThunderboltOutlined } from '@ant-design/icons';
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
  padding: var(--x2) var(--x3) var(--x3);
  border-radius: ${tokens.borderRadius}px;
  min-height: 120px;
`;

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
        type="card"
        size="middle"
        tabBarExtraContent={
          <Flex gap="2">
            <button
              css={css`
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 12px;
                font-size: 13px;
                font-weight: 500;
                border-radius: 6px;
                cursor: pointer;
                background: linear-gradient(#fff, #fff) padding-box,
                  linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #e879f9 100%) border-box;
                border: 1px solid transparent;
                transition: all 0.3s ease;
                span {
                  background: linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #e879f9 100%);
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
                  background-clip: text;
                }
                svg {
                  color: #a855f7;
                }
                &:hover {
                  background: linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #e879f9 100%) padding-box,
                    linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #e879f9 100%) border-box;
                  span {
                    background: #fff;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                  }
                  svg {
                    color: #fff;
                  }
                }
              `}
            >
              <ThunderboltOutlined />
              <span>Write with AI</span>
            </button>
            <Dropdown
              menu={{
                items: [
                  { key: 'description', label: 'Edit description', onClick: () => handleEdit('description') },
                  { key: 'excerpt', label: 'Edit excerpt', onClick: () => handleEdit('excerpt') },
                ],
              }}
              trigger={['click']}
            >
              <Button size="small" icon={<MoreOutlined />} />
            </Dropdown>
          </Flex>
        }
        items={[
          {
            key: 'description',
            label: formatMessage({ id: tCommon('common.description') }),
            children: descriptionPreview ? (
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
            label: formatMessage({ id: tCommon('common.excerpt') }),
            children: product.excerpt ? (
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
