"use client";

import { createStyles } from "antd-style";

export const useListingPreviewStyles = createStyles(({ css, token }) => ({
  modalBody: css`
    background: ${token.colorBgContainer};
  `,
  root: css`
    width: min(1180px, calc(100vw - 48px));
    height: min(760px, calc(100vh - 160px));
    max-width: 100%;
    display: flex;
    flex-direction: column;
    padding: 20px 24px 24px;
    overflow: hidden;
    box-sizing: border-box;

    @media (max-width: 720px) {
      width: 100%;
      height: auto;
      min-height: calc(100vh - 96px);
      padding: 16px;
    }
  `,
  previewHeader: css`
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 16px;
    align-items: end;
    padding-bottom: 16px;
    border-bottom: 1px solid ${token.colorBorderSecondary};

    @media (max-width: 720px) {
      grid-template-columns: 1fr;
      align-items: start;
    }
  `,
  categoryPath: css`
    color: ${token.colorTextTertiary};
    font-size: 12px;
    line-height: 20px;
    margin-bottom: 2px;
  `,
  categoryTitle: css`
    margin: 0 !important;
  `,
  toolbar: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;

    @media (max-width: 720px) {
      justify-content: flex-start;
    }
  `,
  selectedFilters: css`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    padding: 12px 0 0;
    min-height: 12px;
  `,
  content: css`
    display: grid;
    grid-template-columns: 268px minmax(0, 1fr);
    gap: 20px;
    min-height: 0;
    flex: 1;
    padding-top: 16px;

    @media (max-width: 860px) {
      grid-template-columns: 1fr;
      overflow-y: auto;
    }
  `,
  desktopFacets: css`
    min-height: 0;
    overflow-y: auto;
    border-right: 1px solid ${token.colorBorderSecondary};
    padding-right: 16px;

    @media (max-width: 860px) {
      display: none;
    }
  `,
  mobileFilters: css`
    display: none;

    @media (max-width: 860px) {
      display: block;
    }
  `,
  productPane: css`
    display: flex;
    min-width: 0;
    min-height: 0;
    flex-direction: column;
    gap: 12px;
  `,
  resultBar: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 32px;
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
    min-height: 0;
    overflow-y: auto;
    padding-right: 2px;

    @media (max-width: 1120px) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    @media (max-width: 720px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      overflow: visible;
    }

    @media (max-width: 420px) {
      grid-template-columns: 1fr;
    }
  `,
  card: css`
    border: 1px solid ${token.colorBorderSecondary};
    border-radius: 8px;
    overflow: hidden;
    background: ${token.colorBgContainer};
    min-width: 0;
  `,
  imageWrap: css`
    aspect-ratio: 1 / 1;
    background: ${token.colorFillAlter};
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  `,
  image: css`
    width: 100%;
    height: 100%;
    object-fit: cover;
  `,
  cardBody: css`
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  `,
  productTitle: css`
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 40px;
  `,
  facetGroup: css`
    padding: 0 0 16px;
    margin-bottom: 16px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  facetValue: css`
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    min-height: 28px;
  `,
  rangeRow: css`
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 8px;
  `,
  pagination: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding-top: 4px;
  `,
}));
