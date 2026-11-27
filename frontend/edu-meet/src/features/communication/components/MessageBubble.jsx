import MessageAttachment from "./MessageAttachment.jsx";
import doubleTickIcon from "../assets/double-tick.png";

export default function MessageBubble({ message, isOutgoing, isLast, isPinned, isUpdatingPin, onTogglePin }) {
  const status = message.status === "double-tick" && !message.isLocal;

  return (
    <li className="communication-message-bubble-row" data-message-id={message.id}>
      {isOutgoing && isLast && (
        <div className="communication-message-metadata">
          <time dateTime={message.createdAt}>{message.timestamp}</time>
          {status && (
            <img
              className="communication-message-status"
              src={doubleTickIcon}
              alt=""
              aria-label="Message status"
            />
          )}
        </div>
      )}
      <div
        className={`communication-message-bubble communication-message-bubble--${isOutgoing ? "outgoing" : "incoming"}`}
      >
        {message.attachment && <MessageAttachment attachment={message.attachment} />}
        {message.text && <p className="communication-message-text">{message.text}</p>}
        {onTogglePin && (
          <button
            className="communication-action-button communication-message-pin"
            type="button"
            aria-label={`${isPinned ? "Unpin" : "Pin"} message: ${message.text || message.attachment?.name}`}
            disabled={isUpdatingPin}
            onClick={() => onTogglePin(message.id)}
          >
            {isPinned ? "Unpin" : "Pin"}
          </button>
        )}
      </div>
      {!isOutgoing && isLast && (
        <time
          className="communication-message-metadata"
          dateTime={message.createdAt}
        >
          {message.timestamp}
        </time>
      )}
    </li>
  );
}
