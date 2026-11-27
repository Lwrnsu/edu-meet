import { useState } from "react";

const INLINE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const VIDEO_EXTENSIONS = new Set(["MP4", "WEBM", "MOV", "M4V", "AVI", "MKV", "MPEG", "MPG", "OGV", "3GP", "WMV"]);

export default function MessageAttachment({ attachment, onOpenMedia }) {
  const [failedPreviewUrl, setFailedPreviewUrl] = useState(null);
  const { name, contentType, downloadUrl, previewUrl } = attachment;
  const extension = name.match(/\.([a-z\d]{1,10})$/i)?.[1].toUpperCase();
  const isImage = INLINE_IMAGE_TYPES.has(contentType);
  const isVideo = contentType?.startsWith("video/") || VIDEO_EXTENSIONS.has(extension);
  const isPdf = contentType === "application/pdf" || extension === "PDF";
  const canPreview = isImage && previewUrl && failedPreviewUrl !== previewUrl && onOpenMedia;

  return (
    <div className="communication-message-attachment">
      {canPreview && (
        <button
          className="communication-attachment-preview"
          type="button"
          aria-label={"Open image: " + name}
          onClick={(event) => onOpenMedia(attachment, event.currentTarget)}
        >
          <img src={previewUrl} alt="" loading="lazy" onError={() => setFailedPreviewUrl(previewUrl)} />
        </button>
      )}
      <a className="communication-attachment-download" href={downloadUrl} aria-label={"Download " + name} download>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {isVideo ? (
            <path d="M3 6h18v12H3zM10 9l5 3-5 3z" />
          ) : (
            <>
              <path d="M6 3h8l4 4v14H6zM14 3v5h4" />
              {isPdf ? <path d="M9 14h6m-6 3h6" /> : null}
            </>
          )}
        </svg>
        <span className="communication-attachment-filename">{name}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v12m-4-4 4 4 4-4M4 16v4h16v-4" />
        </svg>
      </a>
    </div>
  );
}
