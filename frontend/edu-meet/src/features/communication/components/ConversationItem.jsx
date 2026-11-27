import ConversationAvatar from "./ConversationAvatar.jsx";

export default function ConversationItem({
  conversation,
  isSelected,
  onSelect,
}) {
  return (
    <button
      className={`communication-conversation-item${isSelected ? " communication-conversation-item--selected" : ""}`}
      type="button"
      aria-pressed={isSelected}
      onClick={() => onSelect(conversation.id)}
    >
      <ConversationAvatar
        type={conversation.type}
        imageUrl={conversation.avatarUrl}
      />
      <span className="communication-conversation-copy">
        <span className="communication-conversation-name">
          {conversation.name}
        </span>
        <span className="communication-conversation-preview">
          {conversation.preview}
        </span>
      </span>
    </button>
  );
}
