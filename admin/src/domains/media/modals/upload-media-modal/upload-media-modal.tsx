"use client";

import { useState, useCallback } from "react";
import { Upload, Input, Button, Tabs, message, Progress } from "antd";
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
import { useUploadFiles } from "@/domains/media/hooks";
import type { IUploadMediaModalPayload } from "@/domains/media/modals";
import { FileProvider, type ApiFile } from "@/graphql/types";

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
  videoId?: string;
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
  const { uploadFiles, uploadFromUrl, createExternal, loading: uploading, progress } = useUploadFiles();

  // Props from payload with defaults
  const accept = typedPayload?.accept ?? "image/*,video/*";
  const maxSize = typedPayload?.maxSize ?? 10;
  const maxFiles = typedPayload?.maxFiles ?? 20;
  const onUploadCallback = typedPayload?.onUpload;

  const [activeTab, setActiveTab] = useState<"upload" | "url">("upload");
  const [urlInput, setUrlInput] = useState("");
  const [urlMedia, setUrlMedia] = useState<UploadedMedia[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Handle file upload - process all files once when last file is reached
  const handleBeforeUpload = useCallback(
    async (file: File, fileList: File[]) => {
      // Process all files only once (when we hit the last file)
      if (file === fileList[fileList.length - 1]) {
        // Validate size
        const validFiles: File[] = [];
        for (const f of fileList) {
          if (f.size / 1024 / 1024 > maxSize) {
            message.error(`${f.name} exceeds ${maxSize}MB limit`);
            continue;
          }
          validFiles.push(f);
        }

        if (validFiles.length === 0) return false;

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
      }
      return false;
    },
    [maxSize, uploadFiles, onUploadCallback, pop]
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
    if (urlMedia.length >= maxFiles) {
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
        videoId: parsed.videoId,
      };

      setUrlMedia((prev) => [...prev, newMedia]);
      setUrlInput("");
      message.success("Media added successfully");
    } catch {
      message.error("Failed to process URL");
    } finally {
      setIsLoading(false);
    }
  }, [urlInput, urlMedia, maxFiles]);

  // Handle remove URL media
  const handleRemoveMedia = useCallback((id: string) => {
    setUrlMedia((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // Handle save (for URL media only - file uploads happen immediately)
  const handleSave = useCallback(async () => {
    if (urlMedia.length === 0) {
      message.warning("Please add at least one media URL");
      return;
    }

    setIsLoading(true);
    try {
      const uploadedFiles: ApiFile[] = [];

      // Upload URL media
      for (const media of urlMedia) {
        if (media.type === "youtube" && media.videoId) {
          // Use createExternal for YouTube videos (stores reference, no download)
          const { file, userErrors } = await createExternal({
            provider: FileProvider.Youtube,
            externalId: media.videoId,
            url: media.url,
            thumbnailUrl: media.thumbnailUrl,
            originalName: media.name,
          });
          if (file) {
            uploadedFiles.push(file);
          }
          if (userErrors.length > 0) {
            message.error(userErrors[0].message);
          }
        } else if (media.type === "image") {
          // Use uploadFromUrl for images (downloads and uploads to S3)
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
  }, [urlMedia, uploadFromUrl, createExternal, onUploadCallback, pop]);

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
            disabled: urlMedia.length === 0 && activeTab === "url",
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
                  data-testid="upload-media-file-dragger"
                  className={styles.dragger}
                  multiple
                  accept={accept}
                  beforeUpload={handleBeforeUpload}
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

        {/* Preview Section (URL media only - file uploads happen immediately) */}
        {urlMedia.length > 0 && (
          <div className={styles.previewSection}>
            <div className={styles.previewTitle}>
              Added URLs ({urlMedia.length}/{maxFiles})
            </div>
            <div className={styles.previewGrid}>
              {urlMedia.map(renderPreviewItem)}
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
