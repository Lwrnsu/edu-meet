import ConversationAvatar from "./ConversationAvatar.jsx";

export default function ChatMemberItem({ member, onMessage, messageDisabled, openingChat }) {
  return (
    <li className="communication-chat-member">
      <ConversationAvatar
        type="individual"
        imageUrl={member.avatarUrl}
        size={50}
      />
      <div className="communication-chat-member-copy">
        <span className="communication-chat-member-name">{member.name}</span>
        <span className="communication-chat-member-student-id">
          {member.studentId}
        </span>
      </div>
      {onMessage && (
        <button
          className="communication-chat-member-message"
          type="button"
          aria-label={openingChat ? `Opening chat with ${member.name}` : `Message ${member.name}`}
          disabled={messageDisabled}
          onClick={onMessage}
        >
          {openingChat ? "Opening…" : "Message"}
        </button>
      )}
    </li>
  );
}
