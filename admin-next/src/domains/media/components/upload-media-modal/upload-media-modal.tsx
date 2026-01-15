"use client";

import { useState, useCallback } from "react";
import { Upload, Input, Button, Tabs, message, Progress } from "antd";
import type { UploadFile } from "antd";
import { Paper } from "@/ui-kit/paper";
import {
  CloudUploadOutlined,
  LinkOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
} from "@ant-design/icons";
import {
  ModalLayout,
  ModalHeader,
  useModalStackContext,
} from "@/layouts/modals";
import { useStyles } from "./upload-media-modal.styles";
import { parseMediaUrl } from "./upload-media-modal.utils";
import { useUploadFiles } from "../../hooks";
import type { IUploadMediaModalPayload } from "../../modals";
import type { ApiFile } from "@/graphql/types";

const { Dragger } = Upload;

// ============================================
// Types
// ============================================

export interface UploadedMedia {
  id: string;
  url: string;
  name: string;
  type: "image" | "video" | "youtube";
  thumbnailUrl?: string;
  file?: File;
}

export interface IUploadMediaModalProps {
  onClose: () => void;
  onUpload: (files: ApiFile[]) => void | Promise<void>;
  accept?: string;
  maxSize?: number; // in MB
  maxFiles?: number;
}

// ============================================
// Component
// ============================================

export const UploadMediaModal = () => {
  const { styles } = useStyles();
  const { payload, pop } = useModalStackContext();
  const typedPayload = payload as IUploadMediaModalPayload;
  const { uploadFiles, uploadFromUrl, loading: uploading, progress } = useUploadFiles();

  // Props from payload with defaults
  const accept = typedPayload?.accept ?? "image/*,video/*";
  const maxSize = typedPayload?.maxSize ?? 10;
  const maxFiles = typedPayload?.maxFiles ?? 20;
  const onUploadCallback = typedPayload?.onUpload;

  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [urlMedia, setUrlMedia] = useState<UploadedMedia[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Combine all media for preview
  const allMedia: UploadedMedia[] = [
    ...fileList
      .filter((f) => f.originFileObj || f.url)
      .map((f) => ({
        id: f.uid,
        url:
          f.url ||
          (f.originFileObj ? URL.createObjectURL(f.originFileObj) : ""),
        name: f.name,
        type: (f.type?.startsWith("video/") ? "video" : "image") as
          | "image"
          | "video",
        file: f.originFileObj,
      })),
    ...urlMedia,
  ];

  // Handle file upload - upload immediately on select
  const handleUploadChange = useCallback(
    async (info: { fileList: UploadFile[] }) => {
      const { fileList: newFileList } = info;

      // Get new files that haven't been processed yet
      const newFiles = newFileList.filter(
        (f) => f.originFileObj && !fileList.some((existing) => existing.uid === f.uid)
      );

      if (newFiles.length === 0) return;

      // Validate size
      const validFiles: File[] = [];
      for (const f of newFiles) {
        if (f.size && f.size / 1024 / 1024 > maxSize) {
          message.error(`${f.name} exceeds ${maxSize}MB limit`);
          continue;
        }
        if (f.originFileObj) {
          validFiles.push(f.originFileObj);
        }
      }

      if (validFiles.length === 0) return;

      // Upload immediately
      setIsLoading(true);
      try {
        const { files: uploadedFiles, userErrors } = await uploadFiles(validFiles);

        if (userErrors.length > 0) {
          message.error(userErrors[0].message);
        }

        if (uploadedFiles.length > 0) {
          await onUploadCallback?.(uploadedFiles);
          message.success(`Uploaded ${uploadedFiles.length} file(s)`);
          pop();
        }
      } catch {
        message.error("Upload failed");
      } finally {
        setIsLoading(false);
      }
    },
    [maxSize, fileList, uploadFiles, onUploadCallback, pop]
  );

  // Handle URL add
  const handleAddUrl = useCallback(async () => {
    if (!urlInput.trim()) return;

    const trimmedUrl = urlInput.trim();

    // Check for duplicates
    if (urlMedia.some((m) => m.url === trimmedUrl)) {
      message.warning("This URL has already been added");
      return;
    }

    // Check total limit
    if (allMedia.length >= maxFiles) {
      message.warning(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setIsLoading(true);

    try {
      const parsed = await parseMediaUrl(trimmedUrl);

      if (!parsed) {
        message.error(
          "Invalid URL. Please enter a valid image or YouTube URL."
        );
        return;
      }

      const newMedia: UploadedMedia = {
        id: `url-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        url: parsed.url,
        name: parsed.name,
        type: parsed.type,
        thumbnailUrl: parsed.thumbnailUrl,
      };

      setUrlMedia((prev) => [...prev, newMedia]);
      setUrlInput("");
      message.success("Media added successfully");
    } catch {
      message.error("Failed to process URL");
    } finally {
      setIsLoading(false);
    }
  }, [urlInput, urlMedia, allMedia.length, maxFiles]);

  // Handle remove media
  const handleRemoveMedia = useCallback((id: string) => {
    setFileList((prev) => prev.filter((f) => f.uid !== id));
    setUrlMedia((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // Handle save
  const handleSave = useCallback(async () => {
    if (allMedia.length === 0) {
      message.warning("Please add at least one media file");
      return;
    }

    setIsLoading(true);
    try {
      const uploadedFiles: ApiFile[] = [];

      // Upload local files
      const localFiles = fileList
        .filter((f) => f.originFileObj)
        .map((f) => f.originFileObj as File);

      if (localFiles.length > 0) {
        const { files, userErrors } = await uploadFiles(localFiles);
        uploadedFiles.push(...files);

        if (userErrors.length > 0) {
          message.error(userErrors[0].message);
        }
      }

      // Upload URL media
      for (const media of urlMedia) {
        if (media.type === "youtube" || media.type === "image") {
          const { file, userErrors } = await uploadFromUrl(media.url);
          if (file) {
            uploadedFiles.push(file);
          }
          if (userErrors.length > 0) {
            message.error(userErrors[0].message);
          }
        }
      }

      if (uploadedFiles.length > 0) {
        await onUploadCallback?.(uploadedFiles);
        message.success(`Uploaded ${uploadedFiles.length} file(s) successfully`);
        pop();
      } else {
        message.error("No files were uploaded");
      }
    } catch {
      message.error("Failed to upload media");
    } finally {
      setIsLoading(false);
    }
  }, [allMedia.length, fileList, urlMedia, uploadFiles, uploadFromUrl, onUploadCallback, pop]);

  // Custom upload request (don't actually upload, just add to list)
  const customRequest = useCallback(
    (options: { onSuccess?: (body: string) => void }) => {
      setTimeout(() => options.onSuccess?.("ok"), 0);
    },
    []
  );

  // Render preview item
  const renderPreviewItem = (media: UploadedMedia) => {
    const thumbnailUrl = media.thumbnailUrl || media.url;

    return (
      <div key={media.id} className={styles.previewItem}>
        {media.type === "youtube" ? (
          <div className={styles.previewVideo}>
            {media.thumbnailUrl ? (
              <img
                src={media.thumbnailUrl}
                alt={media.name}
                className={styles.previewImage}
              />
            ) : (
              <PlayCircleOutlined style={{ fontSize: 32 }} />
            )}
          </div>
        ) : media.type === "video" ? (
          <div className={styles.previewVideo}>
            <PlayCircleOutlined style={{ fontSize: 32 }} />
          </div>
        ) : (
          <img
            src={thumbnailUrl}
            alt={media.name}
            className={styles.previewImage}
          />
        )}
        <button
          className={styles.previewRemove}
          onClick={() => handleRemoveMedia(media.id)}
          type="button"
        >
          <DeleteOutlined style={{ fontSize: 12 }} />
        </button>
      </div>
    );
  };

  return (
    <ModalLayout
      name="upload-media"
      header={
        <ModalHeader
          name="upload-media"
          title="Upload Media"
          onClose={pop}
          submitButtonProps={{
            children: uploading ? `Uploading... ${progress}%` : "Upload",
            onClick: handleSave,
            loading: isLoading || uploading,
            disabled: allMedia.length === 0,
          }}
        />
      }
    >
      <div className={styles.container}>
        <Paper className={styles.paper}>
          {/* Tabs */}
          <Tabs
            type="card"
            size="small"
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as "upload" | "url")}
            className={styles.tabsContainer}
            items={[
              {
                key: "upload",
                icon: <CloudUploadOutlined />,
                label: "Upload Files",
              },
              {
                key: "url",
                icon: <LinkOutlined />,
                label: "Add from URL",
              },
            ]}
          />

          <div className={styles.tabContent}>
            {/* Upload Tab Content */}
            {activeTab === "upload" && (
              <div className={styles.draggerWrapper}>
                <Dragger
                  className={styles.dragger}
                  multiple
                  accept={accept}
                  fileList={fileList}
                  onChange={handleUploadChange}
                  customRequest={customRequest}
                  showUploadList={false}
                >
                  <CloudUploadOutlined className={styles.uploadIcon} />
                  <p className={styles.uploadTitle}>Drag and drop files here</p>
                  <p className={styles.uploadHint}>
                    or <span className={styles.browseLink}>browse</span> to
                    choose files
                  </p>
                  <p className={styles.uploadFormats}>
                    Images (JPG, PNG, GIF, WebP) or Videos (MP4, WebM)
                  </p>
                </Dragger>
              </div>
            )}

            {/* URL Tab Content */}
            {activeTab === "url" && (
              <div className={styles.urlSection}>
                <div className={styles.urlInputWrapper}>
                  <Input
                    className={styles.urlInput}
                    placeholder="Paste image URL or YouTube link"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onPressEnter={handleAddUrl}
                    prefix={<LinkOutlined />}
                  />
                  <Button
                    className={styles.urlButton}
                    type="primary"
                    onClick={handleAddUrl}
                    loading={isLoading}
                  >
                    Add
                  </Button>
                </div>
                <p className={styles.urlHint}>
                  Direct image links or YouTube videos (youtube.com, youtu.be)
                </p>
              </div>
            )}
          </div>
        </Paper>

        {/* Preview Section */}
        {allMedia.length > 0 && (
          <div className={styles.previewSection}>
            <div className={styles.previewTitle}>
              Added Media ({allMedia.length}/{maxFiles})
            </div>
            <div className={styles.previewGrid}>
              {allMedia.map(renderPreviewItem)}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div style={{ padding: "0 16px" }}>
            <Progress percent={progress} status="active" />
          </div>
        )}

        {/* Footer Info */}
        <div className={styles.footerInfo}>
          <InfoCircleOutlined className={styles.infoIcon} />
          <span>
            First image will be set as the featured media. Drag to reorder after
            upload.
          </span>
        </div>
      </div>
    </ModalLayout>
  );
};
