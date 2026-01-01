import { Button, Spin, Tag } from 'antd';
import { css } from '@emotion/react';

import { ChangeEvent, useEffect, useMemo, useRef } from 'react';
import { MdOutlineFileUpload } from 'react-icons/md';
import { TableModal } from '@src/layouts/table/components/TableModal';
import {
  getNameColumn,
  productCoverColumn,
  productPriceColumn,
} from '@components/table/columns';
import { getIconProps } from '@components/styles';
import { LoadingOutlined } from '@ant-design/icons';
import { $csv, CsvUploadStatus } from '@modules/products/store/csv';
import { useStore } from '@reframework/qx';
import { parseCsv } from '@modules/csv/utils/parseCsv';
import { parseShopifyRecords } from '@modules/csv/utils/Shopify/makeRecords';
import { IShopifyRecord, transform } from '@modules/csv/utils/Shopify/fields';
import { useUploadCsvProducts } from '@modules/csv/components/upload';
import { Helmet } from 'react-helmet';

const statusColors = {
  [CsvUploadStatus.IDLE]: 'default',
  [CsvUploadStatus.PENDING]: 'yellow',
  [CsvUploadStatus.SUCCESS]: 'green',
  [CsvUploadStatus.ERROR]: 'red',
  [CsvUploadStatus.CANCELLED]: 'default',
};

export const UploadCsvButton = () => {
  const { products, status: uploadingStatus } = useStore($csv.store);

  const ref = useRef<HTMLInputElement>(null);
  const statusRef = useRef<CsvUploadStatus>(CsvUploadStatus.IDLE);
  const upload = useUploadCsvProducts();

  useEffect(() => {
    statusRef.current = uploadingStatus;
  }, [uploadingStatus]);

  const onClick = () => {
    $csv.setStatus(CsvUploadStatus.IDLE);
    ref?.current?.click();
  };

  const onComplete = (results: IShopifyRecord[]) => {
    $csv.setProducts(parseShopifyRecords(results) as any);
  };

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      parseCsv({
        file,
        transform,
        onComplete,
      });
    }
  };

  const uploadedQty = useMemo(
    () => products.filter((it) => it.status === CsvUploadStatus.SUCCESS).length,
    [products],
  );

  const onSubmit = async () => {
    $csv.setStatus(CsvUploadStatus.PENDING);
    await upload(products);
    $csv.setStatus(CsvUploadStatus.SUCCESS);
  };

  return (
    <>
      <Helmet>
        <title>{`Shopana | Csv ${uploadedQty}/${products.length}`}</title>
      </Helmet>
      <Button
        size="large"
        icon={
          uploadingStatus === CsvUploadStatus.PENDING ? (
            <LoadingOutlined />
          ) : (
            <MdOutlineFileUpload {...getIconProps(16, 3)} />
          )
        }
        onClick={onClick}
      >
        Import .csv
      </Button>
      <input
        ref={ref}
        value=""
        css={css`
          opacity: 0;
          pointer-events: none;
          position: absolute;
          width: 1px;
          height: 1px;
        `}
        type="file"
        onChange={onFileChange}
        accept=".csv"
      />
      <TableModal
        modalType="csv-products"
        width="100%"
        closable={false}
        title={`${products.length} products`}
        onOk={onSubmit}
        okButtonText={
          uploadingStatus === CsvUploadStatus.IDLE
            ? 'Upload'
            : uploadingStatus === CsvUploadStatus.PENDING
            ? 'Uploading...'
            : 'Close'
        }
        okButtonProps={{
          icon: <MdOutlineFileUpload {...getIconProps(16, 3)} />,
          loading: uploadingStatus === CsvUploadStatus.PENDING,
        }}
        tableProps={{
          name: 'csv-products',
          sticky: false,
          virtual: true,
          scroll: { y: window.innerHeight - 250 },
          rowSelection: false,
          data: products,
          columns: [
            {
              key: 'index',
              title: '#',
              dataIndex: 'index',
              render: (_, _r, idx) => idx + 1,
              width: 40,
            },
            productCoverColumn,
            getNameColumn({
              optionsPath: 'options',
              variantsPath: 'variants',
            }),
            productPriceColumn,
            // productGalleryColumn,
            {
              key: 'status',
              title: 'Status',
              dataIndex: 'status',
              render: (status: CsvUploadStatus, record: any) => {
                if (record.isVariant) {
                  return null;
                }

                if (status === CsvUploadStatus.PENDING) {
                  return <Spin />;
                }

                return (
                  <Tag color={statusColors[status]}>{status.toLowerCase()}</Tag>
                );
              },
            },
          ],
        }}
        open={products.length > 0}
      />
    </>
  );
};
