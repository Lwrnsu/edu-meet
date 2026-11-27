export default function MessageAttachment({ attachment }) {
  return (
    <div className="communication-message-attachment">
      {attachment.previewUrl && (
        <img src={attachment.previewUrl} alt={attachment.name} loading="lazy" />
      )}
      <a href={attachment.downloadUrl} aria-label={`Download ${attachment.name}`} download>
        {attachment.name}
      </a>
    </div>
  );
}
