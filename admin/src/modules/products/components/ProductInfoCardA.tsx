import { Paper } from '@components/paper/Paper';
import { Flex } from '@components/utility/Flex';
import { Box } from '@components/utility/Box';
import { css } from '@emotion/react';
import {
  Button,
  Image,
  Tag,
  Typography,
  Empty,
  Tabs,
  Descriptions,
  Rate,
  Progress,
} from 'antd';
import { EditOutlined, CopyOutlined, StarFilled } from '@ant-design/icons';
import { ReactNode } from 'react';
import { IProduct } from '@src/entity/Product/Product';
import { useIntl } from 'react-intl';
import { t } from '@modules/products/i18n/messages';
import { t as tCommon } from '@src/lang/messages';
import {
  dimensionUnitOptions,
  weightUniOptions,
  stockStatuses,
} from '@src/defs/constants';

// ============================================================================
// Styles
// ============================================================================

const heroStyles = css`
  padding: var(--x4);
  min-height: auto;
`;

const sectionStyles = css`
  padding: var(--x3);
  min-height: auto;
`;

const sectionHeaderStyles = css`
  margin-bottom: var(--x2);
  padding-bottom: var(--x2);
  border-bottom: 1px solid var(--color-gray-3);
`;

const mediaGridStyles = css`
  display: grid;
  grid-template-columns: repeat(auto-fill, 64px);
  grid-gap: var(--x2);

  & > *:first-child {
    grid-column: span 2;
    grid-row: span 2;
  }
`;

const mediaImageStyles = css`
  width: 100%;
  aspect-ratio: 1/1;
  object-fit: cover;
  border-radius: 4px;
`;

const statBoxStyles = css`
  text-align: center;
  padding: var(--x2) var(--x3);
  background: var(--color-gray-1);
  border-radius: 8px;
  flex: 1;
`;

const metaFooterStyles = css`
  padding: var(--x2) var(--x3);
  background: var(--color-gray-2);
  border-radius: 8px;
`;

// ============================================================================
// Sub-components
// ============================================================================

interface ISectionProps {
  title: string;
  name: string;
  children: ReactNode;
  onEdit?: () => void;
}

const Section = ({ title, name, children, onEdit }: ISectionProps) => (
  <Paper css={sectionStyles}>
    <Flex align="center" justify="space-between" css={sectionHeaderStyles}>
      <Typography.Text
        strong
        css={css`
          font-size: 13px;
        `}
      >
        {title}
      </Typography.Text>
      {onEdit && (
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          onClick={onEdit}
          data-testid={`${name}-edit-button`}
          css={css`
            height: 24px;
            padding: 0 8px;
          `}
        />
      )}
    </Flex>
    <div>{children}</div>
  </Paper>
);

interface IStatBoxProps {
  label: string;
  value: ReactNode;
  color?: string;
}

const StatBox = ({ label, value, color }: IStatBoxProps) => (
  <Box css={statBoxStyles}>
    <Typography.Text
      css={css`
        font-size: 18px;
        font-weight: 600;
        display: block;
        ${color ? `color: ${color};` : ''}
      `}
    >
      {value}
    </Typography.Text>
    <Typography.Text
      type="secondary"
      css={css`
        font-size: 11px;
      `}
    >
      {label}
    </Typography.Text>
  </Box>
);

// ============================================================================
// Main Component
// ============================================================================

interface IProductInfoCardAProps {
  product: IProduct;
  onEditSection?: (section: string) => void;
}

export const ProductInfoCardA = ({
  product,
  onEditSection,
}: IProductInfoCardAProps) => {
  const { formatMessage } = useIntl();

  const handleEdit = (section: string) => onEditSection?.(section);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
    }).format(price / 100);

  const formatWeight = (weight: number | null, unit: string) => {
    if (!weight) return '—';
    return `${weight} ${
      weightUniOptions[unit as keyof typeof weightUniOptions]?.label || unit
    }`;
  };

  const formatDimensions = (
    l: number | null,
    w: number | null,
    h: number | null,
    unit: string,
  ) => {
    if (!l && !w && !h) return '—';
    const u =
      dimensionUnitOptions[unit as keyof typeof dimensionUnitOptions]?.label ||
      unit;
    return `${l || 0} × ${w || 0} × ${h || 0} ${u}`;
  };

  const getStockInfo = (status: string) => {
    const s = stockStatuses[status as keyof typeof stockStatuses];
    return { label: s?.label || status, color: s?.color || 'default' };
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

  const variantsInStock =
    product.variants?.filter((v) => v.stockStatus === 'IN_STOCK').length || 0;
  const variantsOutOfStock =
    product.variants?.filter((v) => v.stockStatus === 'OUT_OF_STOCK').length ||
    0;

  const descriptionPreview = getDescriptionPreview();

  return (
    <Flex
      direction="column"
      gap="3"
      css={css`
        width: 100%;
      `}
    >
      {/* ================================================================== */}
      {/* HERO SECTION */}
      {/* ================================================================== */}
      <Paper css={heroStyles}>
        <Flex direction="column" gap="2">
          {/* Title + Status */}
          <Flex align="flex-start" justify="space-between" gap="3">
            <Box>
              <Typography.Title
                level={4}
                css={css`
                  margin: 0 0 4px 0 !important;
                `}
              >
                {product.title || 'Untitled Product'}
              </Typography.Title>
              <Flex align="center" gap="2">
                <Typography.Text
                  code
                  css={css`
                    font-size: 11px;
                  `}
                >
                  {product.sku || '—'}
                </Typography.Text>
                <Typography.Text
                  type="secondary"
                  css={css`
                    font-size: 12px;
                  `}
                >
                  {product.slug}
                </Typography.Text>
              </Flex>
            </Box>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit('information')}
            />
          </Flex>
        </Flex>
      </Paper>

      {/* ================================================================== */}
      {/* CONTENT (Description / Excerpt / SEO) */}
      {/* ================================================================== */}
      <Paper css={sectionStyles}>
        <Tabs
          size="small"
          tabBarExtraContent={
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit('information')}
              data-testid="content-edit-button"
              css={css`
                height: 24px;
                padding: 0 8px;
              `}
            />
          }
          css={css`
            .ant-tabs-nav {
              margin-bottom: var(--x2) !important;
            }
          `}
          items={[
            {
              key: 'description',
              label: formatMessage({ id: tCommon('common.description') }),
              children: descriptionPreview ? (
                <Typography.Paragraph
                  ellipsis={{ rows: 4 }}
                  css={css`
                    margin: 0 !important;
                    font-size: 13px;
                    color: var(--color-gray-8);
                  `}
                >
                  {descriptionPreview}
                  {descriptionPreview.length >= 300 && '...'}
                </Typography.Paragraph>
              ) : (
                <Typography.Text
                  type="secondary"
                  css={css`
                    font-size: 13px;
                  `}
                >
                  —
                </Typography.Text>
              ),
            },
            {
              key: 'excerpt',
              label: formatMessage({ id: tCommon('common.excerpt') }),
              children: product.excerpt ? (
                <Typography.Paragraph
                  ellipsis={{ rows: 4 }}
                  css={css`
                    margin: 0 !important;
                    font-size: 13px;
                    color: var(--color-gray-8);
                  `}
                >
                  {product.excerpt}
                </Typography.Paragraph>
              ) : (
                <Typography.Text
                  type="secondary"
                  css={css`
                    font-size: 13px;
                  `}
                >
                  —
                </Typography.Text>
              ),
            },
            {
              key: 'seo',
              label: formatMessage({ id: tCommon('common.seo') }),
              children: (
                <Flex direction="column" gap="2">
                  <Box>
                    <Typography.Text
                      css={css`
                        font-size: 11px;
                        color: var(--color-gray-6);
                        display: block;
                      `}
                    >
                      {formatMessage({ id: tCommon('common.seoTitle') })}
                    </Typography.Text>
                    <Typography.Text
                      css={css`
                        font-size: 13px;
                      `}
                    >
                      {product.seoTitle || '—'}
                    </Typography.Text>
                  </Box>
                  <Box>
                    <Typography.Text
                      css={css`
                        font-size: 11px;
                        color: var(--color-gray-6);
                        display: block;
                      `}
                    >
                      {formatMessage({ id: tCommon('common.seoDescription') })}
                    </Typography.Text>
                    <Typography.Paragraph
                      ellipsis={{ rows: 2 }}
                      css={css`
                        margin: 0 !important;
                        font-size: 13px;
                      `}
                    >
                      {product.seoDescription || '—'}
                    </Typography.Paragraph>
                  </Box>
                </Flex>
              ),
            },
          ]}
        />
      </Paper>

      {/* ================================================================== */}
      {/* MEDIA SECTION */}
      {/* ================================================================== */}
      <Section
        title={formatMessage({ id: t('product.media.title') })}
        name="media"
        onEdit={() => handleEdit('media')}
      >
        {product.cover || product.gallery?.length > 0 ? (
          <div css={mediaGridStyles}>
            {product.cover && (
              <Image
                src={product.cover.url}
                alt={product.title}
                css={mediaImageStyles}
              />
            )}
            {product.gallery
              ?.slice(0, product.cover ? 5 : 6)
              .map((media) => (
                <Image
                  key={media.id}
                  src={media.url}
                  alt={media.name || ''}
                  css={mediaImageStyles}
                />
              ))}
            {product.gallery?.length > (product.cover ? 5 : 6) && (
              <Flex
                align="center"
                justify="center"
                css={css`
                  aspect-ratio: 1/1;
                  background: var(--color-gray-3);
                  border-radius: 4px;
                  font-size: 12px;
                `}
              >
                +{product.gallery.length - (product.cover ? 5 : 6)}
              </Flex>
            )}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No media"
            css={css`
              .ant-empty-image {
                height: 40px;
              }
            `}
          />
        )}
      </Section>

      {/* ================================================================== */}
      {/* CATEGORIES & TAGS */}
      {/* ================================================================== */}
      <Flex gap="3">
        <Box
          css={css`
            flex: 1;
          `}
        >
          <Section
            title={formatMessage({ id: t('product.categories.title') })}
            name="categories"
            onEdit={() => handleEdit('categories')}
          >
            {product.primaryCategory || product.categories?.length > 0 ? (
              <Flex gap="1" wrap="wrap">
                {product.primaryCategory && (
                  <Tag color="blue-inverse">
                    {product.primaryCategory.title}
                  </Tag>
                )}
                {product.categories
                  ?.filter((cat) => cat.id !== product.primaryCategory?.id)
                  .map((cat) => (
                    <Tag key={cat.id} color="blue">
                      {cat.title}
                    </Tag>
                  ))}
              </Flex>
            ) : (
              <Typography.Text
                type="secondary"
                css={css`
                  font-size: 12px;
                `}
              >
                {formatMessage({ id: t('product.categories.empty') })}
              </Typography.Text>
            )}
          </Section>
        </Box>
        <Box
          css={css`
            flex: 1;
          `}
        >
          <Section
            title={formatMessage({ id: t('product.tags.title') })}
            name="tags"
            onEdit={() => handleEdit('tags')}
          >
            {product.tags?.length > 0 ? (
              <Flex gap="1" wrap="wrap">
                {product.tags.map((tag) => (
                  <Tag key={tag.id}>{tag.title}</Tag>
                ))}
              </Flex>
            ) : (
              <Typography.Text
                type="secondary"
                css={css`
                  font-size: 12px;
                `}
              >
                {formatMessage({ id: t('product.tags.empty') })}
              </Typography.Text>
            )}
          </Section>
        </Box>
      </Flex>

      {/* ================================================================== */}
      {/* PRICING */}
      {/* ================================================================== */}
      <Section
        title={formatMessage({ id: t('product.pricing.title') })}
        name="pricing"
        onEdit={() => handleEdit('pricing')}
      >
        {!product.isVariableProduct ? (
          <Flex gap="4" align="center">
            <Box>
              <Typography.Text
                css={css`
                  font-size: 11px;
                  color: var(--color-gray-6);
                  display: block;
                `}
              >
                {formatMessage({ id: t('product.pricing.price.label') })}
              </Typography.Text>
              <Typography.Text
                strong
                css={css`
                  font-size: 20px;
                `}
              >
                {formatPrice(product.price)}
              </Typography.Text>
            </Box>
            {product.oldPrice > 0 && (
              <Box>
                <Typography.Text
                  css={css`
                    font-size: 11px;
                    color: var(--color-gray-6);
                    display: block;
                  `}
                >
                  {formatMessage({ id: t('product.pricing.compareAt.label') })}
                </Typography.Text>
                <Typography.Text
                  delete
                  type="secondary"
                  css={css`
                    font-size: 16px;
                  `}
                >
                  {formatPrice(product.oldPrice)}
                </Typography.Text>
              </Box>
            )}
            {product.costPrice > 0 && (
              <Box>
                <Typography.Text
                  css={css`
                    font-size: 11px;
                    color: var(--color-gray-6);
                    display: block;
                  `}
                >
                  {formatMessage({ id: t('product.pricing.cost.label') })}
                </Typography.Text>
                <Typography.Text
                  type="secondary"
                  css={css`
                    font-size: 16px;
                  `}
                >
                  {formatPrice(product.costPrice)}
                </Typography.Text>
              </Box>
            )}
            <Box
              css={css`
                margin-left: auto;
              `}
            >
              <Tag
                color={getStockInfo(product.stockStatus).color}
                css={css`
                  margin: 0;
                `}
              >
                {getStockInfo(product.stockStatus).label}
              </Tag>
            </Box>
          </Flex>
        ) : (
          <Flex gap="4" align="center">
            <Box>
              <Typography.Text
                css={css`
                  font-size: 11px;
                  color: var(--color-gray-6);
                  display: block;
                `}
              >
                Price Range
              </Typography.Text>
              <Typography.Text
                strong
                css={css`
                  font-size: 20px;
                `}
              >
                {product.variants?.length > 0 ? (
                  <>
                    {formatPrice(
                      Math.min(...product.variants.map((v) => v.price)),
                    )}
                    {Math.min(...product.variants.map((v) => v.price)) !==
                      Math.max(...product.variants.map((v) => v.price)) && (
                      <>
                        {' '}
                        —{' '}
                        {formatPrice(
                          Math.max(...product.variants.map((v) => v.price)),
                        )}
                      </>
                    )}
                  </>
                ) : (
                  '—'
                )}
              </Typography.Text>
            </Box>
          </Flex>
        )}
      </Section>

      {/* ================================================================== */}
      {/* INVENTORY */}
      {/* ================================================================== */}
      <Section
        title="Inventory"
        name="inventory"
        onEdit={() => handleEdit('inventory')}
      >
        {product.isVariableProduct ? (
          <Flex gap="4" align="center">
            <Box>
              <Typography.Text
                css={css`
                  font-size: 11px;
                  color: var(--color-gray-6);
                  display: block;
                `}
              >
                Total Variants
              </Typography.Text>
              <Typography.Text
                strong
                css={css`
                  font-size: 18px;
                `}
              >
                {product.variants?.length || 0}
              </Typography.Text>
            </Box>
            <Box>
              <Typography.Text
                css={css`
                  font-size: 11px;
                  color: var(--color-gray-6);
                  display: block;
                `}
              >
                In Stock
              </Typography.Text>
              <Typography.Text
                strong
                css={css`
                  font-size: 18px;
                  color: var(--color-success);
                `}
              >
                {variantsInStock}
              </Typography.Text>
            </Box>
            <Box>
              <Typography.Text
                css={css`
                  font-size: 11px;
                  color: var(--color-gray-6);
                  display: block;
                `}
              >
                Out of Stock
              </Typography.Text>
              <Typography.Text
                strong
                css={css`
                  font-size: 18px;
                  color: var(--color-error);
                `}
              >
                {variantsOutOfStock}
              </Typography.Text>
            </Box>
          </Flex>
        ) : (
          <Flex gap="4" align="center">
            <Box>
              <Typography.Text
                css={css`
                  font-size: 11px;
                  color: var(--color-gray-6);
                  display: block;
                `}
              >
                Stock Status
              </Typography.Text>
              <Tag
                color={getStockInfo(product.stockStatus).color}
                css={css`
                  margin: 0;
                `}
              >
                {getStockInfo(product.stockStatus).label}
              </Tag>
            </Box>
          </Flex>
        )}
      </Section>

      {/* ================================================================== */}
      {/* COLLECTIONS & REVIEWS */}
      {/* ================================================================== */}
      <Flex gap="3">
        <Box
          css={css`
            flex: 1;
          `}
        >
          <Section
            title="Collections"
            name="collections"
            onEdit={() => handleEdit('collections')}
          >
            <Typography.Text
              type="secondary"
              css={css`
                font-size: 12px;
              `}
            >
              No collections assigned
            </Typography.Text>
          </Section>
        </Box>
        <Box
          css={css`
            flex: 1;
          `}
        >
          <Section
            title="Reviews"
            name="reviews"
            onEdit={() => handleEdit('reviews')}
          >
            <Flex gap="4">
              {/* Left side - Average rating */}
              <Flex
                direction="column"
                align="center"
                justify="center"
                css={css`
                  min-width: 100px;
                  padding-right: var(--x3);
                  border-right: 1px solid var(--color-gray-3);
                `}
              >
                <Typography.Text
                  css={css`
                    font-size: 32px;
                    font-weight: 600;
                    line-height: 1;
                  `}
                >
                  4.2
                </Typography.Text>
                <Rate
                  disabled
                  allowHalf
                  defaultValue={4.2}
                  css={css`
                    font-size: 12px;
                    margin: 4px 0;
                  `}
                />
                <Typography.Text
                  type="secondary"
                  css={css`
                    font-size: 11px;
                  `}
                >
                  128 reviews
                </Typography.Text>
              </Flex>

              {/* Right side - Rating breakdown */}
              <Flex
                direction="column"
                gap="1"
                css={css`
                  flex: 1;
                `}
              >
                {[
                  { stars: 5, count: 89, percent: 70 },
                  { stars: 4, count: 24, percent: 19 },
                  { stars: 3, count: 8, percent: 6 },
                  { stars: 2, count: 4, percent: 3 },
                  { stars: 1, count: 3, percent: 2 },
                ].map((item) => (
                  <Flex
                    key={item.stars}
                    align="center"
                    gap="2"
                    css={css`
                      font-size: 11px;
                    `}
                  >
                    <Flex
                      align="center"
                      gap="1"
                      css={css`
                        min-width: 28px;
                      `}
                    >
                      <span>{item.stars}</span>
                      <StarFilled
                        css={css`
                          font-size: 10px;
                          color: #fadb14;
                        `}
                      />
                    </Flex>
                    <Progress
                      percent={item.percent}
                      showInfo={false}
                      strokeColor="#fadb14"
                      trailColor="var(--color-gray-3)"
                      size="small"
                      css={css`
                        flex: 1;
                        margin: 0;
                        .ant-progress-inner {
                          height: 6px !important;
                        }
                      `}
                    />
                    <Typography.Text
                      type="secondary"
                      css={css`
                        min-width: 24px;
                        text-align: right;
                        font-size: 11px;
                      `}
                    >
                      {item.count}
                    </Typography.Text>
                  </Flex>
                ))}
              </Flex>
            </Flex>
          </Section>
        </Box>
      </Flex>

      {/* ================================================================== */}
      {/* OPTIONS (variable products) */}
      {/* ================================================================== */}
      {product.isVariableProduct && product.options?.length > 0 && (
        <Section
          title={formatMessage({ id: t('products.options.title') })}
          name="options"
          onEdit={() => handleEdit('options')}
        >
          <Flex direction="column" gap="2">
            {product.options.map((option) => (
              <Box key={option.id}>
                <Typography.Text
                  css={css`
                    font-size: 12px;
                    color: var(--color-gray-7);
                    display: block;
                    margin-bottom: 4px;
                  `}
                >
                  {option.title}
                </Typography.Text>
                <Flex gap="1" wrap="wrap">
                  {option.features?.map((f) => (
                    <Tag
                      key={f.id}
                      css={css`
                        margin: 0;
                      `}
                    >
                      {f.title}
                    </Tag>
                  ))}
                </Flex>
              </Box>
            ))}
          </Flex>
        </Section>
      )}

      {/* ================================================================== */}
      {/* SHIPPING */}
      {/* ================================================================== */}
      {!product.isVariableProduct && (
        <Section
          title={formatMessage({ id: t('product.parameters.title') })}
          name="shipping"
          onEdit={() => handleEdit('shipping')}
        >
          <Flex gap="3">
            <StatBox
              label={formatMessage({ id: t('products.filters.weight.label') })}
              value={formatWeight(product.weight, product.weightUnit)}
            />
            <StatBox
              label="Dimensions"
              value={formatDimensions(
                product.length,
                product.width,
                product.height,
                product.dimensionUnit,
              )}
            />
            <StatBox
              label="Shipping"
              value={
                <Tag
                  color={product.requiresShipping ? 'blue' : 'default'}
                  css={css`
                    margin: 0;
                  `}
                >
                  {product.requiresShipping ? 'Required' : 'Not required'}
                </Tag>
              }
            />
          </Flex>
        </Section>
      )}

      {/* ================================================================== */}
      {/* ATTRIBUTES */}
      {/* ================================================================== */}
      {product.attributes?.length > 0 && (
        <Section
          title="Attributes"
          name="attributes"
          onEdit={() => handleEdit('attributes')}
        >
          <Descriptions
            size="small"
            column={1}
            bordered
            colon={false}
            css={css`
              .ant-descriptions-item {
                padding-bottom: 4px !important;
              }
              .ant-descriptions-item-label {
                color: var(--color-gray-7);
                font-size: 12px;
                min-width: 120px;
              }
              .ant-descriptions-item-content {
                font-size: 13px;
              }
            `}
          >
            {product.attributes.map((attr) => (
              <Descriptions.Item key={attr.id} label={attr.title}>
                {attr.features?.map((f) => f.title).join(', ') || '—'}
              </Descriptions.Item>
            ))}
          </Descriptions>
        </Section>
      )}

      {/* ================================================================== */}
      {/* GROUPS/COMPONENTS */}
      {/* ================================================================== */}
      {product.groups?.length > 0 && (
        <Section
          title="Components"
          name="groups"
          onEdit={() => handleEdit('groups')}
        >
          <Flex direction="column" gap="2">
            {product.groups.map((group) => (
              <Box
                key={group.id}
                css={css`
                  padding: 10px 12px;
                  background: var(--color-gray-1);
                  border-radius: 6px;
                `}
              >
                <Flex justify="space-between" align="center">
                  <Typography.Text
                    strong
                    css={css`
                      font-size: 13px;
                    `}
                  >
                    {group.title}
                  </Typography.Text>
                  <Flex gap="1">
                    {group.isRequired && (
                      <Tag
                        color="red"
                        css={css`
                          margin: 0;
                          font-size: 10px;
                        `}
                      >
                        Required
                      </Tag>
                    )}
                    {group.isMultiple && (
                      <Tag
                        color="blue"
                        css={css`
                          margin: 0;
                          font-size: 10px;
                        `}
                      >
                        Multiple
                      </Tag>
                    )}
                    <Typography.Text
                      type="secondary"
                      css={css`
                        font-size: 11px;
                      `}
                    >
                      {group.items?.length || 0} items
                    </Typography.Text>
                  </Flex>
                </Flex>
              </Box>
            ))}
          </Flex>
        </Section>
      )}

      {/* ================================================================== */}
      {/* METADATA FOOTER */}
      {/* ================================================================== */}
      <Box css={metaFooterStyles}>
        <Flex
          justify="space-between"
          align="center"
          css={css`
            font-size: 11px;
            color: var(--color-gray-7);
          `}
        >
          <Flex align="center" gap="1">
            <span>ID:</span>
            <Typography.Text
              code
              copyable={{
                icon: (
                  <CopyOutlined
                    css={css`
                      font-size: 10px;
                    `}
                  />
                ),
              }}
              css={css`
                font-size: 10px;
              `}
            >
              {product.id}
            </Typography.Text>
          </Flex>
          <span>Created: {product.createdAt.toLocaleDateString()}</span>
          <span>Updated: {product.updatedAt.toLocaleDateString()}</span>
        </Flex>
      </Box>
    </Flex>
  );
};
