import {
  FilterType,
  IFilterSchema,
  enumOperators,
  numberOperators,
  dateOperators,
} from "@/layouts/filters";

export const filterSchema: IFilterSchema[] = [
  {
    key: "provider",
    label: "Provider",
    description: "Filter by storage provider",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "provider",
    options: [
      { label: "S3", value: "S3" },
      { label: "YouTube", value: "YOUTUBE" },
      { label: "Vimeo", value: "VIMEO" },
      { label: "URL", value: "URL" },
      { label: "Local", value: "LOCAL" },
    ],
  },
  {
    key: "mimeType",
    label: "Type",
    description: "Filter by file type",
    type: FilterType.Enum,
    operators: enumOperators,
    payloadKey: "mimeType",
    options: [
      { label: "PNG", value: "image/png" },
      { label: "JPEG", value: "image/jpeg" },
      { label: "GIF", value: "image/gif" },
      { label: "WebP", value: "image/webp" },
      { label: "SVG", value: "image/svg+xml" },
      { label: "MP4", value: "video/mp4" },
      { label: "WebM", value: "video/webm" },
      { label: "PDF", value: "application/pdf" },
    ],
  },
  {
    key: "sizeBytes",
    label: "Size",
    description: "Filter by file size in bytes",
    type: FilterType.Number,
    operators: numberOperators,
    payloadKey: "sizeBytes",
  },
  {
    key: "createdAt",
    label: "Created",
    description: "Filter by creation date",
    type: FilterType.DateRange,
    operators: dateOperators,
    payloadKey: "createdAt",
  },
];
