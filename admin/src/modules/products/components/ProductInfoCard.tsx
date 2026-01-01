import { Paper } from '@components/paper/Paper';
import { Flex } from '@components/utility/Flex';
import { Box } from '@components/utility/Box';
import { css } from '@emotion/react';
import { Button, Image, Tag, Typography, Empty, Row, Col } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { ReactNode } from 'react';
import { IProduct } from '@src/entity/Product/Product';
import { useIntl } from 'react-intl';
import { t } from '@modules/products/i18n/messages';
import { t as tCommon } from '@src/lang/messages';
import { dimensionUnitOptions, weightUniOptions, stockStatuses } from '@src/defs/constants';
import { EntityStatus } from '@src/graphql';

const sectionStyles = css`
  padding: var(--x3);
  min-height: auto;
`;

const sectionHeaderStyles = css`
  margin-bottom: var(--x2);
  padding-bottom: var(--x2);
  border-bottom: 1px solid var(--color-gray-3);
`;

const labelStyles = css`
  font-size: 12px;
  color: var(--color-gray-7);
  margin-bottom: 2px;
  display: block;
`;

const valueStyles = css`
  font-size: 13px;
`;

interface IInfoSectionProps {
  title: string;
  name: string;
  children: ReactNode;
  onEdit?: () => void;
  compact?: boolean;
  badge?: number;
}

const InfoSection = ({
  title,
  name,
  children,
  onEdit,
  compact,
  badge,
}: IInfoSectionProps) => (
  <Paper css={sectionStyles}>
    <Flex align="center" justify="space-between" css={sectionHeaderStyles}>
      <Flex align="center" gap="2">
        <Typography.Text strong css={css`font-size: 13px;`}>
          {title}
        </Typography.Text>
        {typeof badge === 'number' && (
          <Tag css={css`margin: 0; font-size: 11px;`}>{badge}</Tag>
        )}
      </Flex>
      {onEdit && (
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={onEdit}
          data-testid={`${name}-edit-button`}
          css={css`height: 24px; padding: 0 8px; font-size: 12px;`}
        />
      )}
    </Flex>
    <div css={compact ? css`font-size: 13px;` : undefined}>{children}</div>
  </Paper>
);

interface IFieldProps {
  label: string;
  children: ReactNode;
}

const Field = ({ label, children }: IFieldProps) => (
  <Box mb="2">
    <Typography.Text css={labelStyles}>{label}</Typography.Text>
    <div css={valueStyles}>{children}</div>
  </Box>
);

interface IProductInfoCardProps {
  product: IProduct;
  onEditSection?: (section: string) => void;
}

const getStatusColor = (status: EntityStatus) => {
  switch (status) {
    case EntityStatus.Published: return 'green';
    case EntityStatus.Draft: return 'default';
    case EntityStatus.Archived: return 'red';
    default: return 'default';
  }
};

const getStatusLabel = (status: EntityStatus) => {
  switch (status) {
    case EntityStatus.Published: return 'Published';
    case EntityStatus.Draft: return 'Draft';
    case EntityStatus.Archived: return 'Archived';
    default: return status;
  }
};

export const ProductInfoCard = ({ product, onEditSection }: IProductInfoCardProps) => {
  const { formatMessage } = useIntl();

  const handleEdit = (section: string) => onEditSection?.(section);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(price / 100);

  const formatWeight = (weight: number | null, unit: string) => {
    if (!weight) return '-';
    return `${weight} ${weightUniOptions[unit as keyof typeof weightUniOptions]?.label || unit}`;
  };

  const formatDimensions = (l: number | null, w: number | null, h: number | null, unit: string) => {
    if (!l && !w && !h) return '-';
    const u = dimensionUnitOptions[unit as keyof typeof dimensionUnitOptions]?.label || unit;
    return `${l || 0} × ${w || 0} × ${h || 0} ${u}`;
  };

  const getStockInfo = (status: string) => {
    const s = stockStatuses[status as keyof typeof stockStatuses];
    return { label: s?.label || status, color: s?.color || 'default' };
  };

  // Parse description for display
  const getDescriptionPreview = () => {
    if (!product.description) return null;
    try {
      const parsed = JSON.parse(product.description);
      // Extract text from ProseMirror/Remirror JSON
      const extractText = (node: any): string => {
        if (node.text) return node.text;
        if (node.content) return node.content.map(extractText).join(' ');
        return '';
      };
      return extractText(parsed).slice(0, 200);
    } catch {
      return typeof product.description === 'string' ? product.description.slice(0, 200) : null;
    }
  };

  const descriptionPreview = getDescriptionPreview();

  return (
    <Flex direction="column" gap="3" css={css`width: 100%;`}>
      {/* Header: Title + Status */}
      <InfoSection
        title={formatMessage({ id: tCommon('common.title') })}
        name="information"
        onEdit={() => handleEdit('information')}
        compact
      >
        <Row gutter={[16, 8]}>
          <Col span={16}>
            <Field label={formatMessage({ id: tCommon('common.title') })}>
              <Typography.Text strong>{product.title || '-'}</Typography.Text>
            </Field>
          </Col>
          <Col span={8}>
            <Field label={formatMessage({ id: tCommon('common.status') })}>
              <Tag color={getStatusColor(product.status)} css={css`margin: 0;`}>
                {getStatusLabel(product.status)}
              </Tag>
            </Field>
          </Col>
          <Col span={24}>
            <Field label={formatMessage({ id: tCommon('common.slug') })}>
              <Typography.Text code css={css`font-size: 12px;`}>{product.slug}</Typography.Text>
            </Field>
          </Col>
        </Row>
      </InfoSection>

      {/* Description + Excerpt */}
      <Row gutter={12}>
        <Col span={16}>
          <InfoSection
            title={formatMessage({ id: tCommon('common.description') })}
            name="description"
            onEdit={() => handleEdit('information')}
            compact
          >
            {descriptionPreview ? (
              <Typography.Paragraph
                ellipsis={{ rows: 3 }}
                css={css`margin: 0 !important; font-size: 12px; color: var(--color-gray-8);`}
              >
                {descriptionPreview}
                {descriptionPreview.length >= 200 && '...'}
              </Typography.Paragraph>
            ) : (
              <Typography.Text type="secondary" css={css`font-size: 12px;`}>—</Typography.Text>
            )}
          </InfoSection>
        </Col>
        <Col span={8}>
          <InfoSection
            title={formatMessage({ id: tCommon('common.excerpt') })}
            name="excerpt"
            onEdit={() => handleEdit('information')}
            compact
          >
            {product.excerpt ? (
              <Typography.Paragraph
                ellipsis={{ rows: 3 }}
                css={css`margin: 0 !important; font-size: 12px; color: var(--color-gray-8);`}
              >
                {product.excerpt}
              </Typography.Paragraph>
            ) : (
              <Typography.Text type="secondary" css={css`font-size: 12px;`}>—</Typography.Text>
            )}
          </InfoSection>
        </Col>
      </Row>

      {/* Media */}
      <InfoSection
        title={formatMessage({ id: t('product.media.title') })}
        name="media"
        onEdit={() => handleEdit('media')}
        badge={product.gallery?.length || 0}
      >
        {product.cover || product.gallery?.length > 0 ? (
          <Flex gap="2" wrap="wrap">
            {product.cover && (
              <Image
                src={product.cover.url}
                alt={product.title}
                width={64}
                height={64}
                css={css`object-fit: cover; border-radius: 4px;`}
              />
            )}
            {product.gallery?.slice(0, 5).map((media) => (
              <Image
                key={media.id}
                src={media.url}
                alt={media.name || ''}
                width={64}
                height={64}
                css={css`object-fit: cover; border-radius: 4px;`}
              />
            ))}
            {product.gallery?.length > 5 && (
              <Flex
                align="center"
                justify="center"
                css={css`
                  width: 64px;
                  height: 64px;
                  background: var(--color-gray-3);
                  border-radius: 4px;
                  font-size: 12px;
                `}
              >
                +{product.gallery.length - 5}
              </Flex>
            )}
          </Flex>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No media" css={css`.ant-empty-image { height: 40px; }`} />
        )}
      </InfoSection>

      {/* Pricing + Inventory (for simple products) */}
      {!product.isVariableProduct && (
        <Row gutter={12}>
          <Col span={12}>
            <InfoSection
              title={formatMessage({ id: t('product.pricing.title') })}
              name="pricing"
              onEdit={() => handleEdit('pricing')}
              compact
            >
              <Row gutter={[8, 4]}>
                <Col span={12}>
                  <Field label={formatMessage({ id: t('product.pricing.price.label') })}>
                    <Typography.Text strong>{formatPrice(product.price)}</Typography.Text>
                  </Field>
                </Col>
                {product.oldPrice > 0 && (
                  <Col span={12}>
                    <Field label={formatMessage({ id: t('product.pricing.compareAt.label') })}>
                      <Typography.Text delete type="secondary">{formatPrice(product.oldPrice)}</Typography.Text>
                    </Field>
                  </Col>
                )}
                {product.costPrice > 0 && (
                  <Col span={12}>
                    <Field label={formatMessage({ id: t('product.pricing.cost.label') })}>
                      <Typography.Text type="secondary">{formatPrice(product.costPrice)}</Typography.Text>
                    </Field>
                  </Col>
                )}
              </Row>
            </InfoSection>
          </Col>
          <Col span={12}>
            <InfoSection
              title={formatMessage({ id: t('product.inventory.title') })}
              name="inventory"
              onEdit={() => handleEdit('inventory')}
              compact
            >
              <Row gutter={[8, 4]}>
                <Col span={12}>
                  <Field label="SKU">
                    <Typography.Text code css={css`font-size: 11px;`}>{product.sku || '-'}</Typography.Text>
                  </Field>
                </Col>
                <Col span={12}>
                  <Field label="Stock">
                    <Tag color={getStockInfo(product.stockStatus).color} css={css`margin: 0; font-size: 11px;`}>
                      {getStockInfo(product.stockStatus).label}
                    </Tag>
                  </Field>
                </Col>
              </Row>
            </InfoSection>
          </Col>
        </Row>
      )}

      {/* Parameters (for simple products) */}
      {!product.isVariableProduct && (
        <InfoSection
          title={formatMessage({ id: t('product.parameters.title') })}
          name="shipping"
          onEdit={() => handleEdit('shipping')}
          compact
        >
          <Row gutter={[16, 4]}>
            <Col span={8}>
              <Field label={formatMessage({ id: t('products.filters.weight.label') })}>
                {formatWeight(product.weight, product.weightUnit)}
              </Field>
            </Col>
            <Col span={8}>
              <Field label="Dimensions">
                {formatDimensions(product.length, product.width, product.height, product.dimensionUnit)}
              </Field>
            </Col>
            <Col span={8}>
              <Field label="Shipping">
                <Tag color={product.requiresShipping ? 'blue' : 'default'} css={css`margin: 0; font-size: 11px;`}>
                  {product.requiresShipping ? 'Required' : 'Not required'}
                </Tag>
              </Field>
            </Col>
          </Row>
        </InfoSection>
      )}

      {/* Attributes/Features */}
      {product.attributes?.length > 0 && (
        <InfoSection
          title="Attributes"
          name="attributes"
          onEdit={() => handleEdit('attributes')}
          badge={product.attributes.length}
          compact
        >
          <Flex direction="column" gap="2">
            {product.attributes.map((attr) => (
              <Flex key={attr.id} gap="2" align="flex-start">
                <Typography.Text css={css`font-size: 12px; min-width: 80px; color: var(--color-gray-7);`}>
                  {attr.title}:
                </Typography.Text>
                <Flex gap="1" wrap="wrap">
                  {attr.features?.map((f) => (
                    <Tag key={f.id} css={css`margin: 0; font-size: 11px;`}>{f.title}</Tag>
                  ))}
                </Flex>
              </Flex>
            ))}
          </Flex>
        </InfoSection>
      )}

      {/* Options (for variable products) */}
      {product.isVariableProduct && product.options?.length > 0 && (
        <InfoSection
          title={formatMessage({ id: t('products.options.title') })}
          name="options"
          onEdit={() => handleEdit('options')}
          badge={product.options.length}
          compact
        >
          <Flex direction="column" gap="2">
            {product.options.map((option) => (
              <Flex key={option.id} gap="2" align="flex-start">
                <Typography.Text css={css`font-size: 12px; min-width: 80px; color: var(--color-gray-7);`}>
                  {option.title}:
                </Typography.Text>
                <Flex gap="1" wrap="wrap">
                  {option.features?.map((f) => (
                    <Tag key={f.id} css={css`margin: 0; font-size: 11px;`}>{f.title}</Tag>
                  ))}
                </Flex>
              </Flex>
            ))}
          </Flex>
        </InfoSection>
      )}

      {/* Variants (for variable products) */}
      {product.isVariableProduct && (
        <InfoSection
          title={formatMessage({ id: t('products.variants.title') })}
          name="variants"
          onEdit={() => handleEdit('variants')}
          badge={product.variants?.length || 0}
          compact
        >
          <Row gutter={[16, 8]}>
            <Col span={6}>
              <Field label="Total">
                <Typography.Text strong css={css`font-size: 16px;`}>
                  {product.variants?.length || 0}
                </Typography.Text>
              </Field>
            </Col>
            <Col span={6}>
              <Field label="In Stock">
                <Typography.Text css={css`color: var(--color-success);`}>
                  {product.variants?.filter(v => v.stockStatus === 'IN_STOCK').length || 0}
                </Typography.Text>
              </Field>
            </Col>
            <Col span={6}>
              <Field label="Out of Stock">
                <Typography.Text css={css`color: var(--color-error);`}>
                  {product.variants?.filter(v => v.stockStatus === 'OUT_OF_STOCK').length || 0}
                </Typography.Text>
              </Field>
            </Col>
            <Col span={6}>
              <Field label="Price Range">
                {product.variants?.length > 0 ? (
                  <Typography.Text css={css`font-size: 12px;`}>
                    {formatPrice(Math.min(...product.variants.map(v => v.price)))}
                    {Math.min(...product.variants.map(v => v.price)) !== Math.max(...product.variants.map(v => v.price)) && (
                      <> — {formatPrice(Math.max(...product.variants.map(v => v.price)))}</>
                    )}
                  </Typography.Text>
                ) : (
                  <Typography.Text type="secondary">—</Typography.Text>
                )}
              </Field>
            </Col>
          </Row>
        </InfoSection>
      )}

      {/* Groups/Components */}
      {product.groups?.length > 0 && (
        <InfoSection
          title="Components"
          name="groups"
          onEdit={() => handleEdit('groups')}
          badge={product.groups.length}
          compact
        >
          <Flex direction="column" gap="2">
            {product.groups.map((group) => (
              <Box
                key={group.id}
                css={css`
                  padding: 8px;
                  background: var(--color-gray-2);
                  border-radius: 4px;
                `}
              >
                <Flex justify="space-between" align="center" mb="1">
                  <Typography.Text strong css={css`font-size: 12px;`}>{group.title}</Typography.Text>
                  <Flex gap="1">
                    {group.isRequired && <Tag color="red" css={css`margin: 0; font-size: 10px;`}>Required</Tag>}
                    {group.isMultiple && <Tag color="blue" css={css`margin: 0; font-size: 10px;`}>Multiple</Tag>}
                  </Flex>
                </Flex>
                <Typography.Text type="secondary" css={css`font-size: 11px;`}>
                  {group.items?.length || 0} products
                </Typography.Text>
              </Box>
            ))}
          </Flex>
        </InfoSection>
      )}

      {/* Categories + Tags */}
      <Row gutter={12}>
        <Col span={12}>
          <InfoSection
            title={formatMessage({ id: tCommon('common.categories') })}
            name="categories"
            onEdit={() => handleEdit('categories')}
            badge={product.categories?.length}
            compact
          >
            {product.categories?.length > 0 ? (
              <Flex direction="column" gap="1">
                {product.primaryCategory && (
                  <Flex gap="1" align="center">
                    <Typography.Text css={css`font-size: 11px; color: var(--color-gray-6);`}>Primary:</Typography.Text>
                    <Tag color="geekblue" css={css`margin: 0; font-size: 11px;`}>{product.primaryCategory.title}</Tag>
                  </Flex>
                )}
                <Flex gap="1" wrap="wrap">
                  {product.categories.map((cat) => (
                    <Tag key={cat.id} color="blue" css={css`margin: 0; font-size: 11px;`}>{cat.title}</Tag>
                  ))}
                </Flex>
              </Flex>
            ) : (
              <Typography.Text type="secondary" css={css`font-size: 12px;`}>—</Typography.Text>
            )}
          </InfoSection>
        </Col>
        <Col span={12}>
          <InfoSection
            title={formatMessage({ id: tCommon('common.tags') })}
            name="tags"
            onEdit={() => handleEdit('tags')}
            badge={product.tags?.length}
            compact
          >
            {product.tags?.length > 0 ? (
              <Flex gap="1" wrap="wrap">
                {product.tags.map((tag) => (
                  <Tag key={tag.id} css={css`margin: 0; font-size: 11px;`}>{tag.title}</Tag>
                ))}
              </Flex>
            ) : (
              <Typography.Text type="secondary" css={css`font-size: 12px;`}>—</Typography.Text>
            )}
          </InfoSection>
        </Col>
      </Row>

      {/* SEO */}
      <InfoSection
        title={formatMessage({ id: tCommon('common.seo') })}
        name="seo"
        onEdit={() => handleEdit('seo')}
        compact
      >
        <Row gutter={[16, 8]}>
          <Col span={24}>
            <Field label={formatMessage({ id: tCommon('common.seoTitle') })}>
              {product.seoTitle ? (
                <Typography.Text css={css`font-size: 12px;`}>{product.seoTitle}</Typography.Text>
              ) : (
                <Typography.Text type="secondary">—</Typography.Text>
              )}
            </Field>
          </Col>
          <Col span={24}>
            <Field label={formatMessage({ id: tCommon('common.seoDescription') })}>
              {product.seoDescription ? (
                <Typography.Paragraph
                  ellipsis={{ rows: 2 }}
                  css={css`margin: 0 !important; font-size: 12px;`}
                >
                  {product.seoDescription}
                </Typography.Paragraph>
              ) : (
                <Typography.Text type="secondary">—</Typography.Text>
              )}
            </Field>
          </Col>
        </Row>
      </InfoSection>

      {/* Metadata (compact footer) */}
      <Paper css={css`padding: var(--x2) var(--x3); background: var(--color-gray-2);`}>
        <Flex justify="space-between" align="center" css={css`font-size: 11px; color: var(--color-gray-7);`}>
          <span>ID: <Typography.Text code copyable css={css`font-size: 10px;`}>{product.id}</Typography.Text></span>
          <span>Created: {product.createdAt.toLocaleDateString()}</span>
          <span>Updated: {product.updatedAt.toLocaleDateString()}</span>
        </Flex>
      </Paper>
    </Flex>
  );
};
