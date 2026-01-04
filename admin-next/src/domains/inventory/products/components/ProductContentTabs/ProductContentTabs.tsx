import { createStyles } from 'antd-style';
import { Button, Typography, Tabs, Dropdown, Flex } from 'antd';
import { WarningOutlined, MoreOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Paper } from '../Paper';
import { IProduct } from '../../mocks/types';
import { useProductEditDescriptionModal } from '../../modals';

// ============================================================================
// Styles
// ============================================================================

const useStyles = createStyles(({ token }) => ({
  tabsSection: {
    padding: '8px 12px 12px',
    borderRadius: 8,
    minHeight: 120,
  },
  aiButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    fontSize: 13,
    fontWeight: 500,
    borderRadius: 6,
    cursor: 'pointer',
    background: 'linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #e879f9 100%) border-box',
    border: '1px solid transparent',
    transition: 'all 0.3s ease',
    '& span': {
      background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #e879f9 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    },
    '& svg': {
      color: '#a855f7',
    },
    '&:hover': {
      background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #e879f9 100%) padding-box, linear-gradient(135deg, #8b5cf6 0%, #d946ef 50%, #e879f9 100%) border-box',
      '& span': {
        background: '#fff',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      },
      '& svg': {
        color: '#fff',
      },
    },
  },
  contentText: {
    '&&': {
      margin: 0,
      fontSize: 13,
      color: token.colorText,
      lineHeight: 1.6,
    },
  },
  emptyContainer: {
    padding: '16px 0',
  },
  emptyIcon: {
    color: token.colorTextQuaternary,
  },
  emptyText: {
    fontSize: 12,
  },
  addButton: {
    padding: 0,
    height: 'auto',
  },
}));

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
  const { styles } = useStyles();
  const { push: openEditDescriptionModal } = useProductEditDescriptionModal();

  const handleEdit = (section: string) => onEditSection?.(section);

  const handleEditDescription = () => {
    const descriptionText = getDescriptionPreview() || '';
    openEditDescriptionModal({
      description: descriptionText,
      excerpt: product.excerpt || '',
      onSave: (values) => {
        console.log('Save content:', values);
        // TODO: implement actual save logic
      },
    });
  };

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
    <Paper className={styles.tabsSection}>
      <Tabs
        type="card"
        size="middle"
        tabBarExtraContent={
          <Flex gap={8}>
            <button className={styles.aiButton}>
              <ThunderboltOutlined />
              <span>Write with AI</span>
            </button>
            <Dropdown
              menu={{
                items: [
                  { key: 'edit', label: 'Edit', onClick: handleEditDescription },
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
            label: 'Description',
            children: descriptionPreview ? (
              <Typography.Paragraph
                ellipsis={{ rows: 3 }}
                className={styles.contentText}
              >
                {descriptionPreview}
                {descriptionPreview.length >= 300 && '...'}
              </Typography.Paragraph>
            ) : (
              <Flex align="center" gap={8} className={styles.emptyContainer}>
                <WarningOutlined className={styles.emptyIcon} />
                <Typography.Text type="secondary" className={styles.emptyText}>
                  No description added
                </Typography.Text>
                <Button
                  type="link"
                  size="small"
                  onClick={handleEditDescription}
                  className={styles.addButton}
                >
                  Add now
                </Button>
              </Flex>
            ),
          },
          {
            key: 'excerpt',
            label: 'Excerpt',
            children: product.excerpt ? (
              <Typography.Paragraph
                ellipsis={{ rows: 3 }}
                className={styles.contentText}
              >
                {product.excerpt}
              </Typography.Paragraph>
            ) : (
              <Flex align="center" gap={8} className={styles.emptyContainer}>
                <WarningOutlined className={styles.emptyIcon} />
                <Typography.Text type="secondary" className={styles.emptyText}>
                  No excerpt added
                </Typography.Text>
                <Button
                  type="link"
                  size="small"
                  onClick={handleEditDescription}
                  className={styles.addButton}
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
