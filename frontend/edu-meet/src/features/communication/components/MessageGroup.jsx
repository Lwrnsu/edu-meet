import ConversationAvatar from "./ConversationAvatar.jsx";
import MessageBubble from "./MessageBubble.jsx";

export default function MessageGroup({
  group,
  pinnedMessageIds,
  openMessageMenuId,
  onOpenMessageMenu,
  onCloseMessageMenu,
  onTogglePin,
}) {
  const isOutgoing = group.direction === "outgoing";
  const firstMessage = group.messages[0];
  const lastMessage = group.messages[group.messages.length - 1];
  const avatarUrl = lastMessage.avatarUrl ?? firstMessage.avatarUrl;

  return (
    <li
      className={`communication-message-group communication-message-group--${isOutgoing ? "outgoing" : "incoming"}`}
    >
      <div className="communication-message-group-layout">
        {!isOutgoing && (
          <div className="communication-message-avatar-column">
            <ConversationAvatar
              type="individual"
              imageUrl={avatarUrl}
              size={48}
            />
          </div>
        )}
        <div className="communication-message-group-content">
          {!isOutgoing && firstMessage.senderName && (
            <p className="communication-message-sender">
              {firstMessage.senderName}
            </p>
          )}
          <ol
            className="communication-message-bubbles"
            aria-label={
              isOutgoing
                ? "Outgoing messages"
                : `Messages from ${firstMessage.senderName ?? "sender"}`
            }
          >
            {group.messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOutgoing={isOutgoing}
                isLast={index === group.messages.length - 1}
                isPinned={pinnedMessageIds.includes(message.id)}
                openMessageMenuId={openMessageMenuId}
                onOpenMessageMenu={onOpenMessageMenu}
                onCloseMessageMenu={onCloseMessageMenu}
                onTogglePin={onTogglePin}
              />
            ))}
          </ol>
        </div>
      </div>
    </li>
  );
}
