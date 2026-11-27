import MessageAttachment from "./MessageAttachment.jsx";
import MessageText from "./MessageText.jsx";
import pushPinIcon from "../assets/push-pin.png";
import ConversationAvatar from "./ConversationAvatar.jsx";

function getPinnedTimestamp(message) {
  const timestamp = message.timestamp ?? "";
  if (!message.createdAt) {
    return timestamp.toUpperCase();
  }

  const createdAt = new Date(message.createdAt);
  if (Number.isNaN(createdAt.getTime())) {
    return timestamp.toUpperCase();
  }

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
  }).format(createdAt);

  return [weekday, timestamp].filter(Boolean).join(" ").toUpperCase();
}

export default function PinnedMessageItem({ message, onUnpin, isUpdating, onOpenMedia }) {
  const senderName =
    message.senderName ??
    (message.direction === "outgoing" ? "You" : "Group member");

  return (
    <li className={`communication-pinned-message-card${onUnpin ? " communication-pinned-message-card--live" : ""}`}>
      <ConversationAvatar
        type="individual"
        imageUrl={message.avatarUrl}
        size={60}
      />
      <div className="communication-pinned-message-content">
        <span className="communication-pinned-message-sender">
          {senderName}
        </span>
        <div className="communication-message-bubble communication-message-bubble--incoming communication-pinned-message-bubble">
          {message.attachment && <MessageAttachment attachment={message.attachment} onOpenMedia={onOpenMedia} />}
          <MessageText text={message.text} />
        </div>
      </div>
      <time
        className="communication-pinned-message-time"
        dateTime={message.createdAt}
      >
        {getPinnedTimestamp(message)}
      </time>
      {onUnpin ? (
        <button
          className="communication-action-button communication-unpin-button"
          type="button"
          aria-label={`Unpin message: ${message.text || message.attachment?.name}`}
          disabled={isUpdating}
          onClick={() => onUnpin(message.id)}
        >
          Unpin
        </button>
      ) : (
        <img
          className="communication-pinned-message-icon"
          src={pushPinIcon}
          alt=""
          aria-hidden="true"
        />
      )}
    </li>
  );
}
